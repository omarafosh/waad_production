package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.visit.entity.VisitType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BenefitPolicyCoverageServiceTest {

    @Mock
    private BenefitPolicyRuleRepository benefitPolicyRuleRepository;

    @Mock
    private MedicalServiceRepository serviceRepository;

    @InjectMocks
    private BenefitPolicyCoverageService coverageService;

    private Member member;
    private BenefitPolicy policy;
    private MedicalService service;
    private MedicalCategory category;

    @BeforeEach
    void setUp() {
        policy = BenefitPolicy.builder().id(1L).name("Test Policy").status(BenefitPolicy.BenefitPolicyStatus.ACTIVE).active(true).startDate(LocalDate.now().minusDays(10)).endDate(LocalDate.now().plusDays(10)).defaultCoveragePercent(50).build();
        member = Member.builder().id(100L).benefitPolicy(policy).startDate(LocalDate.now().minusDays(20)).build();
        category = MedicalCategory.builder().id(20L).name("General Category").build();
        service = MedicalService.builder().id(50L).name("Test Service").categoryId(20L).build();
    }

    @Test
    void testGetCoverage_ServiceSpecificEncounter_ShouldWin() {
        // Setup rules
        BenefitPolicyRule specificRule = BenefitPolicyRule.builder().id(1L).coveragePercent(90).active(true).build();
        
        when(serviceRepository.findById(50L)).thenReturn(Optional.of(service));
        when(benefitPolicyRuleRepository.findActiveByServiceAndEncounter(eq(1L), eq(50L), eq(VisitType.OUTPATIENT)))
                .thenReturn(Optional.of(specificRule));

        // Execute
        var result = coverageService.getCoverageForService(member, 50L, VisitType.OUTPATIENT);

        // Verify
        assertTrue(result.isPresent());
        assertEquals(90, result.get().getCoveragePercent());
    }

    @Test
    void testGetCoverage_ServiceHighLevel_ShouldWinOverCategory() {
        // Setup rules
        BenefitPolicyRule serviceRule = BenefitPolicyRule.builder().id(2L).coveragePercent(80).active(true).build();
        
        when(serviceRepository.findById(50L)).thenReturn(Optional.of(service));
        when(benefitPolicyRuleRepository.findActiveByServiceAndEncounter(any(), any(), any())).thenReturn(Optional.empty());
        when(benefitPolicyRuleRepository.findActiveByServiceGeneral(eq(1L), eq(50L)))
                .thenReturn(Optional.of(serviceRule));

        // Execute
        var result = coverageService.getCoverageForService(member, 50L, VisitType.OUTPATIENT);

        // Verify
        assertTrue(result.isPresent());
        assertEquals(80, result.get().getCoveragePercent());
    }

    @Test
    void testGetCoverage_CategorySpecificEncounter_ShouldWinOverCategoryGeneral() {
        // Setup rules
        BenefitPolicyRule categoryEncounterRule = BenefitPolicyRule.builder().id(3L).coveragePercent(70).active(true).build();
        
        when(serviceRepository.findById(50L)).thenReturn(Optional.of(service));
        when(benefitPolicyRuleRepository.findActiveByServiceAndEncounter(any(), any(), any())).thenReturn(Optional.empty());
        when(benefitPolicyRuleRepository.findActiveByServiceGeneral(any(), any())).thenReturn(Optional.empty());
        when(benefitPolicyRuleRepository.findActiveByCategoryAndEncounter(eq(1L), eq(20L), eq(VisitType.OUTPATIENT)))
                .thenReturn(Optional.of(categoryEncounterRule));

        // Execute
        var result = coverageService.getCoverageForService(member, 50L, VisitType.OUTPATIENT);

        // Verify
        assertTrue(result.isPresent());
        assertEquals(70, result.get().getCoveragePercent());
    }

    @Test
    void testGetCoverage_NoRule_ShouldReturnPolicyDefault() {
        // Setup no rules
        when(serviceRepository.findById(50L)).thenReturn(Optional.of(service));
        when(benefitPolicyRuleRepository.findActiveByServiceAndEncounter(any(), any(), any())).thenReturn(Optional.empty());
        when(benefitPolicyRuleRepository.findActiveByServiceGeneral(any(), any())).thenReturn(Optional.empty());
        when(benefitPolicyRuleRepository.findActiveByCategoryAndEncounter(any(), any(), any())).thenReturn(Optional.empty());
        when(benefitPolicyRuleRepository.findActiveByCategoryGeneral(any(), any())).thenReturn(Optional.empty());

        // Execute
        var result = coverageService.getCoverageForService(member, 50L, VisitType.OUTPATIENT);

        // Verify (Policy Default is 50%)
        assertTrue(result.isPresent());
        assertEquals(50, result.get().getCoveragePercent());
        assertEquals("POLICY_DEFAULT", result.get().getRuleType());
    }
}
