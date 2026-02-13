package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.CoverageDistribution;
import com.waad.tba.modules.benefitpolicy.enums.DistributionType;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.CoverageDistributionRepository;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class CoverageDistributionTest {

    @Autowired
    private BenefitPolicyCoverageService coverageService;

    @Autowired
    private BenefitPolicyRepository policyRepository;

    @Autowired
    private CoverageDistributionRepository distributionRepository;

    @Autowired
    private MedicalCategoryRepository categoryRepository;

    @Autowired
    private MedicalServiceRepository serviceRepository;

    @Autowired
    private ClaimRepository claimRepository;

    private Member testMember;
    private BenefitPolicy segregatedPolicy;
    private MedicalCategory dentalCategory;
    private MedicalService extractionService;

    @BeforeEach
    void setUp() {
        // Create Taxonomy
        dentalCategory = categoryRepository.save(MedicalCategory.builder().name("Dental").code("DENT").active(true).build());
        extractionService = serviceRepository.save(MedicalService.builder()
                .name("Tooth Extraction")
                .code("EXT001")
                .categoryId(dentalCategory.getId())
                .active(true)
                .build());

        // Create Segregated Policy
        segregatedPolicy = policyRepository.save(BenefitPolicy.builder()
                .name("Segregated Test Policy")
                .distributionType(DistributionType.DISTRIBUTED)
                .annualLimit(new BigDecimal("50000"))
                .active(true)
                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                .build());

        // Create Member
        testMember = Member.builder()
                .civilId("1234567890")
                .fullName("Test Member")
                .benefitPolicy(segregatedPolicy)
                .startDate(LocalDate.of(2024, 1, 1))
                .active(true)
                .build();
        // Note: Member needs to be saved but usually requires a repository I haven't injected here.
        // Assuming testMember is just used as a DTO-like entity for service calls in this context.
    }

    @Test
    void testDistributedLimitExceeded() {
        // 1. Set a limit for Dental Category: 500
        distributionRepository.save(CoverageDistribution.builder()
                .benefitPolicy(segregatedPolicy)
                .medicalCategory(dentalCategory)
                .limitAmount(new BigDecimal("500"))
                .active(true)
                .build());

        // 2. Mock a claim line for 600
        ClaimLine heavyLine = ClaimLine.builder()
                .medicalService(extractionService)
                .serviceCategoryId(dentalCategory.getId())
                .unitPrice(new BigDecimal("600"))
                .quantity(1)
                .totalPrice(new BigDecimal("600"))
                .build();

        // 3. Validate - should throw exception
        assertThrows(BusinessRuleException.class, () -> {
            coverageService.validateAmountLimits(
                testMember, segregatedPolicy, new BigDecimal("600"), List.of(heavyLine), LocalDate.now());
        }, "Should throw exception due to Dental limit (500) being exceeded by 600");
    }

    @Test
    void testDistributedLimitWithinRange() {
        // 1. Set a limit for Dental Category: 1000
        distributionRepository.save(CoverageDistribution.builder()
                .benefitPolicy(segregatedPolicy)
                .medicalCategory(dentalCategory)
                .limitAmount(new BigDecimal("1000"))
                .active(true)
                .build());

        // 2. Mock a claim line for 600
        ClaimLine partialLine = ClaimLine.builder()
                .medicalService(extractionService)
                .serviceCategoryId(dentalCategory.getId())
                .unitPrice(new BigDecimal("600"))
                .quantity(1)
                .totalPrice(new BigDecimal("600"))
                .build();

        // 3. Validate - should pass
        assertDoesNotThrow(() -> {
            coverageService.validateAmountLimits(
                testMember, segregatedPolicy, new BigDecimal("600"), List.of(partialLine), LocalDate.now());
        });
    }

    @Test
    void testServiceLimitPriorityOverCategory() {
        // 1. Category limit: 1000, Extraction Service limit: 300
        distributionRepository.save(CoverageDistribution.builder()
                .benefitPolicy(segregatedPolicy)
                .medicalCategory(dentalCategory)
                .limitAmount(new BigDecimal("1000"))
                .active(true)
                .build());

        distributionRepository.save(CoverageDistribution.builder()
                .benefitPolicy(segregatedPolicy)
                .medicalService(extractionService)
                .limitAmount(new BigDecimal("300"))
                .active(true)
                .build());

        // 2. Mock a claim line for 400 (Violates service limit but fits category)
        ClaimLine serviceLine = ClaimLine.builder()
                .medicalService(extractionService)
                .serviceCategoryId(dentalCategory.getId())
                .unitPrice(new BigDecimal("400"))
                .quantity(1)
                .totalPrice(new BigDecimal("400"))
                .build();

        // 3. Validate - should throw exception (Service limit wins)
        assertThrows(BusinessRuleException.class, () -> {
            coverageService.validateAmountLimits(
                testMember, segregatedPolicy, new BigDecimal("400"), List.of(serviceLine), LocalDate.now());
        }, "Service-specific limit (300) should take priority over Category limit (1000)");
    }
}
