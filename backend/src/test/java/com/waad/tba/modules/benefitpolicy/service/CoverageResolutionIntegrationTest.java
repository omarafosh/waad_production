package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.entity.CoverageRuleConfig;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.benefitpolicy.repository.CoverageRuleConfigRepository;
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
public class CoverageResolutionIntegrationTest {

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

    @Autowired
    private CoverageRuleConfigRepository configRepository;

    @Autowired
    private CoveragePriorityService priorityService;

    private BenefitPolicy testPolicy;
    private MedicalService testService;
    private MedicalCategory testCategory;

    @BeforeEach
    void setUp() {
        // 1. Create Data
        testCategory = categoryRepository.save(MedicalCategory.builder().name("Test Category").code("TCAT").active(true).build());
        testService = serviceRepository.save(MedicalService.builder().name("Test Service").code("TSRV").categoryId(testCategory.getId()).active(true).build());
        testPolicy = policyRepository.save(BenefitPolicy.builder().name("Test Policy").active(true).status(BenefitPolicy.BenefitPolicyStatus.ACTIVE).defaultCoveragePercent(80).build());
        
        // 2. Clear configs to ensure fresh state for test
        configRepository.deleteAll();
        priorityService.refreshCache();
    }

    @Test
    void testServicePriorityOverCategoryByDefault() {
        // Create Category Rule (60%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalCategory(testCategory)
                .coveragePercent(60)
                .active(true)
                .build());

        // Create Service Rule (90%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalService(testService)
                .coveragePercent(90)
                .active(true)
                .build());

        // Default weights (if not in DB, fallback logic applies)
        // SERVICE_ANY_ENCOUNTER (10) vs CATEGORY_ANY_ENCOUNTER (30)
        // Service should win.
        
        Optional<BenefitPolicyCoverageService.CoverageInfo> coverage = coverageService.getCoverageForService(null /* Not used in repo call */, testService.getId(), VisitType.OUTPATIENT);
        
        assertTrue(coverage.isPresent());
        assertEquals(90, coverage.get().getCoveragePercent(), "Service rule should take priority by default");
    }

    @Test
    void testDynamicPriorityChange() {
        // Create Category Rule (60%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalCategory(testCategory)
                .coveragePercent(60)
                .active(true)
                .build());

        // Create Service Rule (90%)
        ruleRepository.save(BenefitPolicyRule.builder()
                .benefitPolicy(testPolicy)
                .medicalService(testService)
                .coveragePercent(90)
                .active(true)
                .build());

        // Manually flip priorities in config
        // Set CATEGORY_ANY_ENCOUNTER to weight 5 (Higher priority than Service weight 10)
        configRepository.save(CoverageRuleConfig.builder()
                .ruleKey("CATEGORY_ANY_ENCOUNTER")
                .priorityWeight(5)
                .build());
        
        configRepository.save(CoverageRuleConfig.builder()
                .ruleKey("SERVICE_ANY_ENCOUNTER")
                .priorityWeight(10)
                .build());

        priorityService.refreshCache();

        Optional<BenefitPolicyCoverageService.CoverageInfo> coverage = coverageService.getCoverageForService(null, testService.getId(), VisitType.OUTPATIENT);
        
        assertTrue(coverage.isPresent());
        assertEquals(60, coverage.get().getCoveragePercent(), "Category rule should now take priority because of config weight change");
    }
}
