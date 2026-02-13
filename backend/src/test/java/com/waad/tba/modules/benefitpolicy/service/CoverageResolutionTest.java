package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.visit.entity.VisitType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class CoverageResolutionTest {

    @Autowired
    private BenefitPolicyCoverageService coverageService;

    @Autowired
    private BenefitPolicyRepository policyRepository;

    @Autowired
    private BenefitPolicyRuleRepository ruleRepository;

    @Autowired
    private MedicalServiceRepository serviceRepository;

    @Autowired
    private MedicalCategoryRepository categoryRepository;

    private BenefitPolicy testPolicy;
    private MedicalService testService;
    private MedicalCategory testCategory;

    @BeforeEach
    void setUp() {
        testCategory = categoryRepository.save(MedicalCategory.builder().name("General Medicine").code("GEN").active(true).build());
        testService = serviceRepository.save(MedicalService.builder()
                .name("Consultation")
                .code("CONS01")
                .categoryId(testCategory.getId())
                .active(true)
                .build());
        
        testPolicy = policyRepository.save(BenefitPolicy.builder()
                .name("Core Test Policy")
                .active(true)
                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                .defaultCoveragePercent(80)
                .build());
    }

    @Test
    void testPolicyDefaultFallback() {
        // No rules defined, should fallback to policy default
        Optional<BenefitPolicyCoverageService.CoverageInfo> coverage = coverageService.getCoverageForService(null, testService.getId(), VisitType.OUTPATIENT);
        
        assertTrue(coverage.isPresent());
        assertEquals(80, coverage.get().getCoveragePercent(), "Should use policy default (80%) when no rules found");
    }

    @Test
    void testCategoryRulePriority() {
        // Add a category rule for 70%
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalCategory(testCategory)
                .coveragePercent(70)
                .active(true)
                .build());

        Optional<BenefitPolicyCoverageService.CoverageInfo> coverage = coverageService.getCoverageForService(null, testService.getId(), VisitType.OUTPATIENT);
        
        assertTrue(coverage.isPresent());
        assertEquals(70, coverage.get().getCoveragePercent(), "Should use category rule (70%) instead of policy default");
    }

    @Test
    void testServiceRulePriorityOverCategory() {
        // Add Category rule (70%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalCategory(testCategory)
                .coveragePercent(70)
                .active(true)
                .build());

        // Add Service rule (95%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalService(testService)
                .coveragePercent(95)
                .active(true)
                .build());

        Optional<BenefitPolicyCoverageService.CoverageInfo> coverage = coverageService.getCoverageForService(null, testService.getId(), VisitType.OUTPATIENT);
        
        assertTrue(coverage.isPresent());
        assertEquals(95, coverage.get().getCoveragePercent(), "Specific service rule (95%) should win over category rule");
    }

    @Test
    void testEncounterTypePrecision() {
        // Add general Service rule (95%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalService(testService)
                .coveragePercent(95)
                .active(true)
                .build());

        // Add INPATIENT specific rule (100%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalService(testService)
                .encounterType(VisitType.INPATIENT)
                .coveragePercent(100)
                .active(true)
                .build());

        // Check OUTPATIENT (should get 95%)
        Optional<BenefitPolicyCoverageService.CoverageInfo> outCoverage = coverageService.getCoverageForService(null, testService.getId(), VisitType.OUTPATIENT);
        assertEquals(95, outCoverage.get().getCoveragePercent());

        // Check INPATIENT (should get 100%)
        Optional<BenefitPolicyCoverageService.CoverageInfo> inCoverage = coverageService.getCoverageForService(null, testService.getId(), VisitType.INPATIENT);
        assertEquals(100, inCoverage.get().getCoveragePercent(), "More specific encounter type rule should win");
    }
}
