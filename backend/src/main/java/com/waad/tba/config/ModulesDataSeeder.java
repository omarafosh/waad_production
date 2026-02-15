package com.waad.tba.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.Member.Gender;
import com.waad.tba.modules.member.entity.Member.MemberType;
import com.waad.tba.modules.member.entity.Member.Relationship;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.service.BarcodeGeneratorService;
import com.waad.tba.modules.member.service.CardNumberGeneratorService;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization.PreAuthStatus;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.entity.Provider.ProviderType;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;
import com.waad.tba.modules.visit.entity.VisitType;
import com.waad.tba.modules.visit.repository.VisitRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// @Component // Disabled as requested by user to stop seeding trial data
@Profile("!test") // Do not run in test environment
@RequiredArgsConstructor
@Slf4j
public class ModulesDataSeeder implements CommandLineRunner {

    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final EnterpriseMedicalServiceRepository medicalServiceRepository;
    private final ProviderRepository providerRepository;
    private final ProviderContractRepository providerContractRepository;
    private final MemberRepository memberRepository;
    private final VisitRepository visitRepository;
    private final PreAuthorizationRepository preAuthorizationRepository;
    private final ClaimRepository claimRepository;
    private final BenefitPolicyRuleRepository benefitPolicyRuleRepository;
    
    private final MedicalCategoryRepository medicalCategoryRepository;
    private final BarcodeGeneratorService barcodeGenerator;
    private final CardNumberGeneratorService cardNumberGenerator;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (organizationRepository.count() > 1) { // > 1 because V003 creates WAAD TPA
            log.info("System already seeded. Skipping ModulesDataSeeder.");
            return;
        }

        log.info("🚀 Seeding System Data...");

        // 0. Base Taxonomy
        String consultationsCat = "Consultations";
        String diagnosticsCat = "Diagnostics";

        // 1. Create Organizations
        Organization insuranceOrg = createOrg("Gulf Insurance Group", "GIG", "INSURANCE_COMPANY");
        Organization employerOrg = createOrg("Tech Solutions Ltd", "TECH-SOL", "EMPLOYER");

        // 2. Medical Services
        EnterpriseMedicalService consultation = createService("GP Consultation", "استشارة عامة", "GP-001", consultationsCat);
        EnterpriseMedicalService xRay = createService("Chest X-Ray", "أشعة صدر", "IMG-001", diagnosticsCat);
        EnterpriseMedicalService bloodTest = createService("CBC Blood Test", "تحليل دم شامل", "LAB-001", diagnosticsCat);

        // 3. Benefit Policy
        BenefitPolicy policy = createPolicy(insuranceOrg, employerOrg);
        createRule(policy, consultation, 100.0, 0.0); // 100% Coverage, 0 Copay
        createRule(policy, xRay, 90.0, 10.0);       // 90% Coverage, 10% Copay

        // 4. Providers & Contracts
        Provider hospital = createProvider("Al-Amal Hospital", "مستشفى الأمل", ProviderType.HOSPITAL);
        createContract(hospital, insuranceOrg);

        Provider clinic = createProvider("Care Clinic", "عيادة الرعاية", ProviderType.CLINIC);
        createContract(clinic, insuranceOrg);

        // 5. Members
        Member principal = createPrincipal(employerOrg, insuranceOrg, policy);
        createDependent(principal);

        // 6. Clinical Flow (Visit -> PreAuth -> Claim)
        Visit visit = createVisit(principal, hospital);
        PreAuthorization preAuth = createPreAuth(visit, hospital, medicalServiceRepository.findAll()); // Use all services for demo
        createClaim(visit, preAuth, hospital, consultation);

        log.info("✅ System Data Seeding Completed Successfully.");
    }

    private Organization createOrg(String name, String code, String type) {
        return organizationRepository.save(Organization.builder()
                .name(name)
                .code(code)
                .active(true)
                .build());
    }

    private EnterpriseMedicalService createService(String nameEn, String nameAr, String code, String category) {
        return medicalServiceRepository.findByCode(code)
                .orElseGet(() -> medicalServiceRepository.save(EnterpriseMedicalService.builder()
                        .nameAr(nameAr)
                        .nameEn(nameEn)
                        .code(code)
                        .category(category)
                        .serviceType(EnterpriseMedicalService.ServiceType.OPD)
                        .isMaster(true)
                        .status(EnterpriseMedicalService.ServiceStatus.ACTIVE)
                        .build()));
    }

    private BenefitPolicy createPolicy(Organization insurance, Organization employer) {
        return benefitPolicyRepository.save(BenefitPolicy.builder()
                .name("Standard Corporate Policy")
                .insuranceOrganization(insurance)
                .employerOrganization(employer)
                .policyCode("POL-2026-001")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusMonths(11))
                .annualLimit(new BigDecimal("50000"))
                .active(true)
                .build());
    }
    
    private void createRule(BenefitPolicy policy, EnterpriseMedicalService service, double coverage, double copay) {
         benefitPolicyRuleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(policy)
                .medicalService(service)
                .coveragePercent((int) coverage)
                .requiresPreApproval(false)
                .active(true)
                .build());
    }

    private Provider createProvider(String nameEn, String nameAr, ProviderType type) {
        return providerRepository.save(Provider.builder()
                .name(nameAr) // Use Arabic name as primary
                .providerType(type)
                .licenseNumber("LIC-" + System.currentTimeMillis())
                .active(true)
                .build());
    }

    private void createContract(Provider provider, Organization insurance) {
        providerContractRepository.save(ProviderContract.builder()
                .provider(provider)
                .contractCode("CON-" + provider.getId() + "-" + System.currentTimeMillis())
                .startDate(LocalDate.now().minusMonths(1))
                .active(true)
                .build());
    }

    private Member createPrincipal(Organization employer, Organization insurance, BenefitPolicy policy) {
        Member member = Member.builder()
                .fullName("Ahmed Mohamed")
                .employerOrganization(employer)
                .insuranceOrganization(insurance)
                .benefitPolicy(policy)
                .gender(Gender.MALE)
                .status(Member.MemberStatus.ACTIVE)
                .barcode(barcodeGenerator.generateUniqueBarcodeForPrincipal())
                .build();
        member.setCardNumber(cardNumberGenerator.generateSmartCardNumber(member));
        return memberRepository.save(member);
    }

    private void createDependent(Member principal) {
        Member dep = Member.builder()
                .fullName("Sarah Ahmed")
                .parent(principal)
                .relationship(Relationship.DAUGHTER)
                .employerOrganization(principal.getEmployerOrganization())
                .insuranceOrganization(principal.getInsuranceOrganization())
                .benefitPolicy(principal.getBenefitPolicy())
                .gender(Gender.FEMALE)
                .status(Member.MemberStatus.ACTIVE)
                .build();
        dep.setCardNumber(cardNumberGenerator.generateSmartCardNumber(dep));
        memberRepository.save(dep);
    }

    private Visit createVisit(Member member, Provider provider) {
        return visitRepository.save(Visit.builder()
                .member(member)
                .providerId(provider.getId())
                .visitDate(LocalDate.now())
                .status(VisitStatus.REGISTERED)
                .visitType(VisitType.OUTPATIENT)
                .build());
    }

    private PreAuthorization createPreAuth(Visit visit, Provider provider, List<EnterpriseMedicalService> services) {
        EnterpriseMedicalService service = services.get(0);
        return preAuthorizationRepository.save(PreAuthorization.builder()
                .visit(visit)
                .memberId(visit.getMember().getId())
                .providerId(provider.getId())
                .medicalService(service)
                .contractPrice(new BigDecimal("150.00")) // Dummy contract price
                .status(PreAuthStatus.APPROVED)
                .requestDate(LocalDate.now())
                .expectedServiceDate(LocalDate.now().plusDays(1))
                .build());
    }

    private void createClaim(Visit visit, PreAuthorization preAuth, Provider provider, EnterpriseMedicalService service) {
        log.info("📝 Creating sample claim for visit: {}", visit.getId());
        
        // 1. Create the line first
        ClaimLine line = ClaimLine.builder()
                .medicalService(service)
                .quantity(1)
                .unitPrice(new BigDecimal("150.00"))
                .serviceCode(service.getCode())
                .serviceName(service.getNameAr())
                .serviceCategory(service.getCategory())
                .requiresPA(false)
                .build();

        // 2. Create the claim with the line explicitly in the list
        Claim claim = Claim.builder()
                .visit(visit)
                .preAuthorization(preAuth)
                .member(visit.getMember())
                .providerId(provider.getId())
                .providerName(provider.getName())
                .status(ClaimStatus.SUBMITTED)
                .requestedAmount(new BigDecimal("150.00"))
                .serviceDate(LocalDate.now())
                .lines(new java.util.ArrayList<>(java.util.Collections.singletonList(line)))
                .active(true)
                .build();
        
        // 3. Ensure bidirectional link (Required for JPA)
        line.setClaim(claim);
        
        claimRepository.save(claim);
        log.info("✅ Sample claim created with ID: {}", claim.getId());
    }
}
