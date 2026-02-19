package com.waad.tba.modules.claim.service;

import com.waad.tba.BaseIntegrationTest;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.claim.dto.ClaimApproveDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Integration Tests for ClaimApprovalService
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Verifies:
 * 1. Full Async Approval lifecycle (From SUBMITTED to APPROVED)
 * 2. SecurityContext propagation to @Async thread
 * 3. Fallback to approverId when SecurityContext is missing (Critical fix)
 * 4. Double approval prevention
 *
 * Uses Real PostgreSQL via Testcontainers (BaseIntegrationTest).
 */
@DisplayName("ClaimApprovalService — Integration Scenarios")
class ClaimApprovalIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ClaimApprovalService claimApprovalService;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProviderRepository providerRepository;

    @Autowired
    private VisitRepository visitRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private BenefitPolicyRepository benefitPolicyRepository;

    @Autowired
    private MedicalServiceRepository medicalServiceRepository;

    @Autowired
    private MedicalCategoryRepository medicalCategoryRepository;

    private User testUser;
    private Claim testClaim;

    @BeforeEach
    void setUp() {
        // We rely on unique names/codes to avoid conflicts if deleteAll fails
        // Alternatively, use a more surgical cleanup if needed.

        // 1. Create Organization (Employer)
        Organization employer = organizationRepository.save(Organization.builder()
                .name("Test Employer")
                .code("ORG-" + System.currentTimeMillis())
                .active(true)
                .build());

        // 2. Create User
        testUser = userRepository.save(User.builder()
                .username("approver_test_" + System.currentTimeMillis())
                .password("pass")
                .fullName("Test Approver")
                .email("approver_" + System.currentTimeMillis() + "@test.com")
                .active(true)
                .build());

        // 3. Create Policy & Member
        BenefitPolicy policy = benefitPolicyRepository.save(BenefitPolicy.builder()
                .name("Test Policy")
                .employerOrganization(employer)
                .annualLimit(BigDecimal.valueOf(100000))
                .defaultCoveragePercent(80)
                .defaultDeductibleAmount(BigDecimal.TEN)
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().plusDays(355))
                .active(true)
                .build());

        Member member = memberRepository.save(Member.builder()
                .fullName("Test Member")
                .cardNumber("MB-" + System.currentTimeMillis())
                .barcode("WAD-" + LocalDate.now().getYear() + "-" + System.currentTimeMillis())
                .civilId("CID-" + System.currentTimeMillis())
                .employerOrganization(employer)
                .benefitPolicy(policy)
                .startDate(LocalDate.now().minusDays(10))
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
        Claim claim = new Claim();
        claim.setMember(member);
        claim.setVisit(visit);
        claim.setProviderId(provider.getId());
        claim.setStatus(ClaimStatus.SUBMITTED);
        claim.setRequestedAmount(BigDecimal.valueOf(100.00));
        claim.setActive(true);

        ClaimLine line = ClaimLine.builder()
                .medicalService(service)
                .unitPrice(BigDecimal.valueOf(100.00))
                .quantity(1)
                .totalPrice(BigDecimal.valueOf(100.00))
                .serviceCategory(category.getName())
                .serviceCode(service.getCode())
                .build();
        
        claim.addLine(line);

        testClaim = claimRepository.save(claim);
    }

    @Test
    @DisplayName("Successful Approval Flow: SUBMITTED -> APPROVAL_IN_PROGRESS -> APPROVED")
    @WithMockUser(username = "approver_test", roles = "SUPER_ADMIN")
    void testSuccessfulApproval_FullFlow() {
        // Arrange
        ClaimApproveDto approveDto = new ClaimApproveDto();
        approveDto.setApprovedAmount(BigDecimal.valueOf(100.00));
        approveDto.setNotes("Approve test");

        // Act - Step 1: Request Approval (Async trigger)
        ClaimViewDto initialResponse = claimApprovalService.requestApproval(testClaim.getId(), approveDto);

        // Assert Step 1: Immediate response should be APPROVAL_IN_PROGRESS
        assertEquals(ClaimStatus.APPROVAL_IN_PROGRESS, initialResponse.getStatus());

        // Assert Step 2: Async process should finish and transition to APPROVED
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            Claim updatedClaim = claimRepository.findById(testClaim.getId()).orElseThrow();
            assertEquals(ClaimStatus.APPROVED, updatedClaim.getStatus());
            assertNotNull(updatedClaim.getActualCompletionDate());
            assertEquals(0, BigDecimal.valueOf(100.00).compareTo(updatedClaim.getApprovedAmount()));
        });
    }

    @Test
    @DisplayName("Double Approval Prevention: Second request should fail but not break first process")
    @WithMockUser(username = "approver_test", roles = "SUPER_ADMIN")
    void testDoubleApproval_Prevention() {
        // Arrange
        ClaimApproveDto approveDto = new ClaimApproveDto();
        approveDto.setApprovedAmount(BigDecimal.valueOf(100.00));

        // Act 1: First request
        claimApprovalService.requestApproval(testClaim.getId(), approveDto);

        // Act 2: Second request immediately
        assertThrows(IllegalStateException.class, () -> {
            claimApprovalService.requestApproval(testClaim.getId(), approveDto);
        }, "Should throw because status is now APPROVAL_IN_PROGRESS");
    }

    @Test
    @DisplayName("Async Security Fix: Should approve even if SecurityContext is null in worker thread (using approverId fallback)")
    void testAsyncApproval_WithSecurityContextFallback() {
        // NOTE: No @WithMockUser here, manually calling processApprovalAsync with
        // explicit approverId
        // This simulates the scenario where the SecurityContext is lost in the Async
        // thread
        // but our fix (passing approverId) saves it.

        ClaimApproveDto approveDto = new ClaimApproveDto();
        approveDto.setApprovedAmount(BigDecimal.valueOf(50.00));

        // Simulating the transition that happens in requestApproval
        testClaim.setStatus(ClaimStatus.APPROVAL_IN_PROGRESS);
        claimRepository.save(testClaim);

        // Act: Manually call processApprovalAsync (which is usually called by
        // requestApproval)
        // Passing testUser.getId() as the fallback approverId
        claimApprovalService.processApprovalAsync(testClaim.getId(), approveDto, testUser.getId());

        // Assert: It should eventually transition to APPROVED because it can find the
        // user via userRepository.findById(approverId)
        await().atMost(5, TimeUnit.SECONDS).untilAsserted(() -> {
            Claim updatedClaim = claimRepository.findById(testClaim.getId()).orElseThrow();
            assertEquals(ClaimStatus.APPROVED, updatedClaim.getStatus());
            // Verify and track approver
            // Assuming there's an approver field, let's check updatedBy or similar
            // If the entity tracks the approver, we'd check it here.
        });
    }

    @Test
    @DisplayName("SecurityContext Propagation: Should approve via SecurityContext when DelegatingSecurityContextTaskExecutor works")
    @WithMockUser(username = "approver_test", authorities = "CLAIM_APPROVE")
    void testSecurityContextPropagation() {
        // This tests that our DelegatingSecurityContextTaskExecutor is correctly
        // configured.
        // requestApproval will trigger processApprovalAsync.
        // Inside processApprovalAsync, it calls authorizationService.getCurrentUser().

        ClaimApproveDto approveDto = new ClaimApproveDto();
        approveDto.setApprovedAmount(BigDecimal.valueOf(10.00));

        claimApprovalService.requestApproval(testClaim.getId(), approveDto);

        await().atMost(5, TimeUnit.SECONDS).untilAsserted(() -> {
            Claim updatedClaim = claimRepository.findById(testClaim.getId()).orElseThrow();
            assertEquals(ClaimStatus.APPROVED, updatedClaim.getStatus());
        });
    }
}
