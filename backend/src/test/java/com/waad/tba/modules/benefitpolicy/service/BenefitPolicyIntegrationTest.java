package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyCreateDto;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyResponseDto;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@Transactional
public class BenefitPolicyIntegrationTest {

    @Autowired
    private BenefitPolicyService benefitPolicyService;

    @Autowired
    private BenefitPolicyRepository benefitPolicyRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private Organization testEmployer;

    @BeforeEach
    void setUp() {
        // Create a test employer
        testEmployer = organizationRepository.save(Organization.builder()
                .name("Integration Test Employer")
                .code("TEST-EMP-" + System.currentTimeMillis())
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Should create a valid benefit policy")
    @WithMockUser(username = "admin", roles = "SUPER_ADMIN")
    void createPolicy_Success() {
        BenefitPolicyCreateDto dto = new BenefitPolicyCreateDto();
        dto.setName("Standard Policy 2026");
        dto.setEmployerOrgId(testEmployer.getId());
        dto.setStartDate(LocalDate.now());
        dto.setEndDate(LocalDate.now().plusYears(1));
        dto.setAnnualLimit(BigDecimal.valueOf(10000));
        dto.setDefaultCoveragePercent(80);
        dto.setStatus("DRAFT");

        BenefitPolicyResponseDto response = benefitPolicyService.create(dto);

        assertNotNull(response.getId());
        assertEquals("Standard Policy 2026", response.getName());
        assertEquals(BenefitPolicy.BenefitPolicyStatus.DRAFT, response.getStatus());
        assertNotNull(response.getPolicyCode());
    }

    @Test
    @DisplayName("Should validate dates (Start < End)")
    @WithMockUser(username = "admin", roles = "SUPER_ADMIN")
    void createPolicy_InvalidDates_ShouldThrow() {
        BenefitPolicyCreateDto dto = new BenefitPolicyCreateDto();
        dto.setName("Invalid Dates Policy");
        dto.setEmployerOrgId(testEmployer.getId());
        dto.setStartDate(LocalDate.now().plusDays(10));
        dto.setEndDate(LocalDate.now()); // End before start
        dto.setAnnualLimit(BigDecimal.valueOf(5000));

        assertThrows(BusinessRuleException.class, () -> benefitPolicyService.create(dto));
    }

    @Test
    @DisplayName("Activation should deactivate other active policies for same employer")
    @WithMockUser(username = "admin", roles = "SUPER_ADMIN")
    void activation_ShouldHandleOverlapping() {
        // 1. Create and Activate Policy A
        BenefitPolicy policyA = benefitPolicyRepository.save(BenefitPolicy.builder()
                .name("Policy A")
                .employerOrganization(testEmployer)
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusMonths(5))
                .annualLimit(BigDecimal.valueOf(10000))
                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                .active(true)
                .build());

        // 2. Create Policy B (Draft)
        BenefitPolicy policyB = benefitPolicyRepository.save(BenefitPolicy.builder()
                .name("Policy B")
                .employerOrganization(testEmployer)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .annualLimit(BigDecimal.valueOf(20000))
                .status(BenefitPolicy.BenefitPolicyStatus.DRAFT)
                .active(true)
                .build());

        // 3. Activate Policy B via Service
        benefitPolicyService.activate(policyB.getId());

        // 4. Verify Policy A is now DRAFT (or Inactive) depending on logic
        // Service says: "Convert old ACTIVE to DRAFT"
        BenefitPolicy updatedA = benefitPolicyRepository.findById(policyA.getId()).orElseThrow();
        assertEquals(BenefitPolicy.BenefitPolicyStatus.DRAFT, updatedA.getStatus(),
                "Previous active policy should be moved to DRAFT");

        BenefitPolicy updatedB = benefitPolicyRepository.findById(policyB.getId()).orElseThrow();
        assertEquals(BenefitPolicy.BenefitPolicyStatus.ACTIVE, updatedB.getStatus(), "New policy should be ACTIVE");
    }

    @Test
    @DisplayName("Soft delete should mark logic deleted")
    @WithMockUser(username = "admin", roles = "SUPER_ADMIN")
    void delete_ShouldSoftDelete() {
        // 1. Create Policy
        BenefitPolicy policy = benefitPolicyRepository.save(BenefitPolicy.builder()
                .name("To Be Deleted")
                .employerOrganization(testEmployer)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .annualLimit(BigDecimal.valueOf(1000))
                .status(BenefitPolicy.BenefitPolicyStatus.DRAFT)
                .active(true)
                .build());

        // 2. Delete
        benefitPolicyService.delete(policy.getId());

        // Flush and clear context to ensure DB view is updated and @SQLRestriction
        // applies
        entityManager.flush();
        entityManager.clear();

        // 3. Verify
        // Should not be found via standard methods that filter by active=true
        boolean exists = benefitPolicyRepository.findById(policy.getId()).isPresent();
        assertFalse(exists, "Soft deleted policy should not be found by standard findById");
    }
}
