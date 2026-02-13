package com.waad.tba.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

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
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
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

@Component
@Profile("!test") // Do not run in test environment
@RequiredArgsConstructor
@Slf4j
public class ModulesDataSeeder implements CommandLineRunner {

    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final MedicalServiceRepository medicalServiceRepository;
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
        MedicalCategory consultationsCat = createCategory("Consultations", "استشارات", "CAT-CONS");
        MedicalCategory diagnosticsCat = createCategory("Diagnostics", "تشخيص وأشعة", "CAT-DIAG");

        // 1. Create Organizations
        Organization insuranceOrg = createOrg("Gulf Insurance Group", "GIG", "INSURANCE_COMPANY");
        Organization employerOrg = createOrg("Tech Solutions Ltd", "TECH-SOL", "EMPLOYER");

        // 2. Medical Services
        MedicalService consultation = createService("GP Consultation", "استشارة عامة", "GP-001", consultationsCat.getId());
        MedicalService xRay = createService("Chest X-Ray", "أشعة صدر", "IMG-001", diagnosticsCat.getId());
        MedicalService bloodTest = createService("CBC Blood Test", "تحليل دم شامل", "LAB-001", diagnosticsCat.getId());

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

    private MedicalCategory createCategory(String nameEn, String name, String code) {
        if (medicalCategoryRepository.existsByCode(code)) return medicalCategoryRepository.findByCode(code).get();
        return medicalCategoryRepository.save(MedicalCategory.builder()
                .name(name)
                .code(code)
                .active(true)
                .build());
    }

    private MedicalService createService(String nameEn, String nameAr, String code, Long categoryId) {
        if (medicalServiceRepository.existsByCode(code)) return medicalServiceRepository.findByCode(code).get();
        return medicalServiceRepository.save(MedicalService.builder()
                .name(nameAr).code(code)
                .categoryId(categoryId)
                .active(true).build());
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
    
    // Quick fix: Assuming logic for policy/rules creation
    private void createRule(BenefitPolicy policy, MedicalService service, double coverage, double copay) {
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
                //.insuranceOrganization(insurance) // Relationship check required
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

    private PreAuthorization createPreAuth(Visit visit, Provider provider, List<MedicalService> services) {
        MedicalService service = services.get(0);
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

    private void createClaim(Visit visit, PreAuthorization preAuth, Provider provider, MedicalService service) {
        Claim claim = Claim.builder()
                .visit(visit)
                .preAuthorization(preAuth) // Optional if preAuth is linked
                .member(visit.getMember())
                .providerId(provider.getId())
                .providerName(provider.getName())
                .status(ClaimStatus.SUBMITTED)
                .requestedAmount(new BigDecimal("150.00"))
                .serviceDate(LocalDate.now())
                .build();
        
        ClaimLine line = ClaimLine.builder()
                .medicalService(service)
                .quantity(1)
                .unitPrice(new BigDecimal("150.00"))
                .build();
        
        claim.addLine(line);
        claimRepository.save(claim);
    }
}
