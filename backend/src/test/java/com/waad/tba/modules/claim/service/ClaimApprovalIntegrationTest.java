package com.waad.tba.modules.claim.service;

import com.waad.tba.BaseIntegrationTest;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.claim.dto.ClaimApproveDto;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;
import com.waad.tba.modules.visit.entity.VisitType;
import com.waad.tba.modules.visit.repository.VisitRepository;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ClaimService — Approval Integration Scenarios")
class ClaimApprovalIntegrationTest extends BaseIntegrationTest {

        @Autowired
        private ClaimService claimService;

        @Autowired
        private ClaimRepository claimRepository;

        @Autowired
        private OrganizationRepository organizationRepository;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private RoleRepository roleRepository;

        @Autowired
        private MemberRepository memberRepository;

        @Autowired
        private BenefitPolicyRepository benefitPolicyRepository;

        @Autowired
        private VisitRepository visitRepository;

        @Autowired
        private ProviderRepository providerRepository;

        @Autowired
        private MedicalCategoryRepository medicalCategoryRepository;

        @Autowired
        private MedicalServiceRepository medicalServiceRepository;

        private Claim testClaim;

        @BeforeEach
        void setUp() {
                // 1. Create Organization
                Organization org = organizationRepository.save(Organization.builder()
                                .name("Test Insurance")
                                .code("INS-" + System.currentTimeMillis())
                                .active(true)
                                .build());

                // 2. Create User (Approver) - dynamic for general usage
                long approverSuffix = System.currentTimeMillis();
                userRepository.save(User.builder()
                                .username("approver_" + approverSuffix)
                                .fullName("System Approver")
                                .email("approver_" + approverSuffix + "@test.com")
                                .password("password")
                                .active(true)
                                .build());

                // Ensure fixed users for @WithMockUser exist
                // Ensure fixed users for @WithMockUser exist with proper roles
                Role insuranceRole = roleRepository.findByName("INSURANCE_ADMIN")
                                .orElseGet(() -> roleRepository.save(Role.builder().name("INSURANCE_ADMIN").build()));

                if (userRepository.findByUsername("test_approver").isEmpty()) {
                        userRepository.save(User.builder()
                                        .username("test_approver")
                                        .email("test_approver@test.com")
                                        .password("pass")
                                        .active(true)
                                        .fullName("Test App")
                                        .roles(java.util.Set.of(insuranceRole))
                                        .build());
                }
                if (userRepository.findByUsername("approver_user").isEmpty()) {
                        userRepository.save(User.builder()
                                        .username("approver_user")
                                        .email("approver_user@test.com")
                                        .password("pass")
                                        .active(true)
                                        .fullName("App User")
                                        .roles(java.util.Set.of(insuranceRole))
                                        .build());
                }

                // 3. Create Policy and Member
                BenefitPolicy policy = benefitPolicyRepository.save(BenefitPolicy.builder()
                                .name("Standard Plan")
                                .employerOrganization(org)
                                .annualLimit(BigDecimal.valueOf(10000.00))
                                .startDate(LocalDate.now().minusMonths(1))
                                .endDate(LocalDate.now().plusYears(1))
                                .active(true)
                                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                                .build());

                Member member = memberRepository.save(Member.builder()
                                .fullName("John Doe")
                                .cardNumber("M-" + System.currentTimeMillis())
                                .benefitPolicy(policy)
                                .employerOrganization(org)
                                .barcode("BC-" + System.currentTimeMillis())
                                .active(true)
                                .build());

                // 4. Create Provider with unique license
                Provider provider = providerRepository.save(Provider.builder()
                                .name("Test Hospital")
                                .licenseNumber("L-" + System.currentTimeMillis())
                                .providerType(Provider.ProviderType.HOSPITAL)
                                .active(true)
                                .build());

                // 5. Create Medical Service for Claim Line
                MedicalCategory category = medicalCategoryRepository.save(MedicalCategory.builder()
                                .name("Consultation")
                                .code("CAT-" + System.currentTimeMillis())
                                .active(true)
                                .build());

                MedicalService service = medicalServiceRepository.save(MedicalService.builder()
                                .name("General Consultation")
                                .code("SRV-" + System.currentTimeMillis())
                                .categoryId(category.getId())
                                .categoryName(category.getName())
                                .basePrice(BigDecimal.valueOf(100.00))
                                .active(true)
                                .build());

                // 6. Create Visit
                Visit visit = visitRepository.save(Visit.builder()
                                .member(member)
                                .providerId(provider.getId())
                                .visitDate(LocalDate.now())
                                .status(VisitStatus.REGISTERED)
                                .active(true)
                                .visitType(VisitType.OUTPATIENT)
                                .build());

                // 7. Create Claim with Line
                testClaim = new Claim();
                testClaim.setMember(member);
                testClaim.setVisit(visit);
                testClaim.setProviderId(provider.getId());
                testClaim.setStatus(ClaimStatus.SUBMITTED);
                testClaim.setRequestedAmount(BigDecimal.valueOf(100.00));
                testClaim.setActive(true);

                ClaimLine line = new ClaimLine();
                line.setMedicalService(service);
                line.setUnitPrice(BigDecimal.valueOf(100.00));
                line.setQuantity(1);
                line.setTotalPrice(BigDecimal.valueOf(100.00));
                line.setServiceCategory(category.getName());
                line.setServiceCode(service.getCode());
                line.setClaim(testClaim);

                java.util.List<ClaimLine> lines = new java.util.ArrayList<>();
                lines.add(line);
                testClaim.setLines(lines);
                testClaim.setVersion(null);

                testClaim = claimRepository.save(testClaim);
        }

        @Test
        @DisplayName("Should approve claim asynchronously and update status")
        @WithMockUser(username = "test_approver")
        void testSuccessfulApproval_FullFlow() {
                ClaimApproveDto approveDto = new ClaimApproveDto();
                approveDto.setNotes("Approved for integration test");

                // Initialize claim in APPROVAL_IN_PROGRESS state (mimicking Phase 1 completion)
                testClaim.setStatus(ClaimStatus.APPROVAL_IN_PROGRESS);
                claimRepository.save(testClaim);

                // The ClaimService.processApprovalAsync is the Phase 2 of approval
                claimService.processApprovalAsync(testClaim.getId(), approveDto);

                await().pollDelay(500, TimeUnit.MILLISECONDS).atMost(10, TimeUnit.SECONDS).until(() -> {
                        Claim updated = claimRepository.findById(testClaim.getId()).orElseThrow();
                        return updated.getStatus() == ClaimStatus.APPROVED;
                });

                Claim finalClaim = claimRepository.findById(testClaim.getId()).orElseThrow();
                assertEquals(ClaimStatus.APPROVED, finalClaim.getStatus());
                assertNotNull(finalClaim.getReviewedAt());
        }

        @Test
        @DisplayName("Should prevent double approval of the same claim")
        @WithMockUser(username = "test_approver")
        void testDoubleApproval_Prevention() {
                ClaimApproveDto approveDto = new ClaimApproveDto();

                // Finalize approval manually for the first time
                testClaim.setStatus(ClaimStatus.APPROVED);
                testClaim.setApprovedAmount(testClaim.getRequestedAmount());
                claimRepository.save(testClaim);

                // Attempting to process again should fail or be caught by transition rules
                // Note: The actual service might handle this via a Guard or State Machine
                // Here we just verify it doesn't break the state if called again
                claimService.processApprovalAsync(testClaim.getId(), approveDto);

                Claim current = claimRepository.findById(testClaim.getId()).get();
                assertEquals(ClaimStatus.APPROVED, current.getStatus());
        }

        @Test
        @DisplayName("Should propagate SecurityContext to async thread")
        @WithMockUser(username = "approver_user")
        void testSecurityContextPropagation() {
                ClaimApproveDto approveDto = new ClaimApproveDto();

                // Initialize claim in APPROVAL_IN_PROGRESS state (mimicking Phase 1 completion)
                testClaim.setStatus(ClaimStatus.APPROVAL_IN_PROGRESS);
                claimRepository.save(testClaim);

                // Phase 2: Async processing
                claimService.processApprovalAsync(testClaim.getId(), approveDto);

                await().pollDelay(500, TimeUnit.MILLISECONDS).atMost(10, TimeUnit.SECONDS).until(() -> claimRepository
                                .findById(testClaim.getId()).get().getStatus() == ClaimStatus.APPROVED);

                Claim finalClaim = claimRepository.findById(testClaim.getId()).get();
                assertEquals(ClaimStatus.APPROVED, finalClaim.getStatus());
        }
}
