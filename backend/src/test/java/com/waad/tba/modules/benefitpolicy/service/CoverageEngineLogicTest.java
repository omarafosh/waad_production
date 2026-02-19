package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.error.ErrorCode;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.benefitpolicy.repository.CoverageDistributionRepository;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.visit.entity.VisitType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CoverageEngineLogicTest {

    @Mock
    private BenefitPolicyRepository policyRepository;
    @Mock
    private BenefitPolicyRuleRepository ruleRepository;
    @Mock
    private MedicalServiceRepository serviceRepository;
    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private CoveragePriorityService priorityService;
    @Mock
    private com.waad.tba.modules.medicalpackage.MedicalPackageRepository packageRepository;
    @Mock
    private CoverageDistributionRepository distributionRepository;

    @InjectMocks
    private BenefitPolicyCoverageService coverageService;

    private Member member;
    private BenefitPolicy policy;

    @BeforeEach
    void setUp() {
        policy = BenefitPolicy.builder()
                .id(1L)
                .name("Standard Plan")
                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .defaultCoveragePercent(80)
                .defaultDeductibleAmount(BigDecimal.valueOf(10.00))
                .annualLimit(BigDecimal.valueOf(5000.00))
                .active(true)
                .build();

        member = new Member();
        member.setId(100L);
        member.setFullName("Ahmed Test");
        member.setBenefitPolicy(policy);
        member.setStartDate(LocalDate.of(2026, 1, 1));
    }

    @Test
    @DisplayName("Should throw POLICY_NOT_ACTIVE when policy is expired")
    void testPolicyExpiration() {
        LocalDate serviceDate = LocalDate.of(2027, 1, 1);

        BusinessRuleException exception = assertThrows(BusinessRuleException.class, () -> {
            coverageService.validateMemberHasActivePolicy(member, serviceDate);
        });

        assertEquals(ErrorCode.POLICY_NOT_ACTIVE, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("not effective"));
    }

    @Test
    @DisplayName("Should throw WAITING_PERIOD_NOT_MET when member is in waiting period")
    void testWaitingPeriodSatisfied() {
        policy.setDefaultWaitingPeriodDays(30);
        LocalDate serviceDate = LocalDate.of(2026, 1, 15); // Only 14 days since enrollment

        BusinessRuleException exception = assertThrows(BusinessRuleException.class, () -> {
            coverageService.validateWaitingPeriods(member, policy, null, serviceDate, VisitType.OUTPATIENT);
        });

        assertEquals(ErrorCode.WAITING_PERIOD_NOT_MET, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("Waiting period"));
    }

    @Test
    @DisplayName("Should calculate financial amounts correctly: Amount - Deductible * Coverage %")
    void testFinancialCalculationLogic() {
        // Setup: Policy has 80% coverage and 10.00 deductible
        // Request: 110.00 service
        // Expect:
        // Amount After Deductible = 110 - 10 = 100
        // Covered (80%) = 100 * 0.8 = 80
        // Patient = Total - Covered = 110 - 80 = 30

        BigDecimal requestedAmount = BigDecimal.valueOf(110.00);
        LocalDate serviceDate = LocalDate.of(2026, 6, 1);

        // Mocking dependencies for validateServiceCoverageForInput
        MedicalService service = new MedicalService();
        service.setId(10L);
        service.setCode("SERV001");
        service.setNameEn("Consultation");
        service.setCategoryName("General");

        when(serviceRepository.findById(10L)).thenReturn(java.util.Optional.of(service));

        BenefitPolicyRule rule = BenefitPolicyRule.builder()
                .id(50L)
                .benefitPolicy(policy)
                .medicalService(service)
                .coveragePercent(80)
                .deductibleAmount(BigDecimal.valueOf(10.00))
                .active(true)
                .build();

        // Mock findBestMatchingRule internal call via repository
        when(ruleRepository.findApplicableRulesForService(
                policy.getId(), 10L, java.util.Collections.singletonList(-1L), "General", VisitType.OUTPATIENT))
                .thenReturn(java.util.Collections.singletonList(rule));

        // Mock package lookup (empty)
        when(packageRepository.findActivePackagesForService(10L)).thenReturn(new java.util.ArrayList<>());

        BenefitPolicyCoverageService.ServiceCoverageInput input = BenefitPolicyCoverageService.ServiceCoverageInput
                .builder()
                .serviceId(10L)
                .serviceName("Consultation")
                .amount(requestedAmount)
                .build();

        java.util.List<BenefitPolicyCoverageService.ServiceCoverageInput> items = new java.util.ArrayList<>();
        items.add(input);

        // Execute
        BenefitPolicyCoverageService.ClaimCoverageResult result = coverageService.validateClaimCoverage(
                member, items, serviceDate, VisitType.OUTPATIENT);

        // Verify
        assertTrue(result.isValid());
        assertEquals(0, result.getErrors().size());
        assertEquals(requestedAmount, result.getTotalRequestedAmount());
        assertEquals(BigDecimal.valueOf(80.00).setScale(2), result.getTotalCoveredAmount());
        assertEquals(BigDecimal.valueOf(30.00).setScale(2), result.getTotalPatientAmount());

        BenefitPolicyCoverageService.ServiceCoverageResult serviceResult = result.getServiceResults().get(0);
        assertEquals(BigDecimal.valueOf(10.00), serviceResult.getDeductibleAmount());
        assertEquals(80, serviceResult.getCoveragePercent());
    }

    @Test
    @DisplayName("Should throw COVERAGE_LIMIT_EXCEEDED when requested amount exceeds annual limit")
    void testAnnualLimitExceeded() {
        policy.setAnnualLimit(BigDecimal.valueOf(100.00));
        BigDecimal requestedAmount = BigDecimal.valueOf(150.00);

        // Mock claimed amount for year (0)
        when(claimRepository.findByMemberId(member.getId())).thenReturn(new java.util.ArrayList<>());

        BusinessRuleException exception = assertThrows(BusinessRuleException.class, () -> {
            coverageService.validateAmountLimits(member, policy, requestedAmount, null, LocalDate.of(2026, 1, 1));
        });

        assertEquals(ErrorCode.COVERAGE_LIMIT_EXCEEDED, exception.getErrorCode());
    }
}
