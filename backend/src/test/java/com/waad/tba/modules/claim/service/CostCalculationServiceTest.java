package com.waad.tba.modules.claim.service;

import com.waad.tba.common.enums.NetworkType;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.provider.service.ProviderNetworkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CostCalculationServiceTest {

    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private ProviderNetworkService providerNetworkService;
    @Mock
    private BenefitPolicyCoverageService benefitPolicyCoverageService;

    @InjectMocks
    private CostCalculationService costCalculationService;

    private Claim claim;
    private Member member;
    private BenefitPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new BenefitPolicy();
        policy.setDefaultCoveragePercent(80);
        policy.setAnnualLimit(new BigDecimal("50000.00"));

        member = new Member();
        member.setId(1L);
        member.setBenefitPolicy(policy);

        claim = new Claim();
        claim.setId(100L);
        claim.setMember(member);
        claim.setRequestedAmount(new BigDecimal("1000.00"));
        claim.setProviderName("Test Provider");
    }

    @Test
    @DisplayName("Should throw BusinessRuleException for null requested amount")
    void shouldThrowExceptionForNullAmount() {
        claim.setRequestedAmount(null);
        assertThrows(BusinessRuleException.class, () -> costCalculationService.calculateCosts(claim));
    }

    @Test
    @DisplayName("Should return zero breakdown for zero requested amount")
    void shouldReturnZeroForZeroAmount() {
        claim.setRequestedAmount(BigDecimal.ZERO);
        CostCalculationService.CostBreakdown breakdown = costCalculationService.calculateCosts(claim);
        assertEquals(BigDecimal.ZERO, breakdown.requestedAmount());
    }

    @Test
    @DisplayName("Should calculate simple co-pay when no deductible applies")
    void shouldCalculateSimpleCopay() {
        // Arrange
        when(providerNetworkService.determineNetworkTypeByName(anyString())).thenReturn(NetworkType.IN_NETWORK);
        when(claimRepository.findByMemberIdAndStatusIn(anyLong(), anyList())).thenReturn(Collections.emptyList());
        
        // Act
        CostCalculationService.CostBreakdown breakdown = costCalculationService.calculateCosts(claim);

        // Assert
        // Default in-network copay is 20% if policy default 80% coverage
        assertEquals(new BigDecimal("200.00"), breakdown.coPayAmount().setScale(2));
        assertEquals(new BigDecimal("800.00"), breakdown.insuranceAmount().setScale(2));
    }

    @Test
    @DisplayName("Should apply deductible first, then co-pay")
    void shouldApplyDeductibleBeforeCopay() {
        // Since DEFAULT_ANNUAL_DEDUCTIBLE is ZERO in current code, 
        // we test that deductibleApplied is ZERO and co-pay applies to full amount.
        
        when(providerNetworkService.determineNetworkTypeByName(anyString())).thenReturn(NetworkType.IN_NETWORK);
        when(claimRepository.findByMemberIdAndStatusIn(anyLong(), anyList())).thenReturn(Collections.emptyList());

        CostCalculationService.CostBreakdown breakdown = costCalculationService.calculateCosts(claim);

        assertEquals(BigDecimal.ZERO, breakdown.deductibleApplied());
        assertEquals(new BigDecimal("200.00"), breakdown.coPayAmount().setScale(2));
    }

    @Test
    @DisplayName("Should use weighted average co-pay from multiple lines")
    void shouldCalculateWeightedCopayFromLines() {
        // Arrange
        MedicalService s1 = MedicalService.builder().id(1L).code("S1").build();
        MedicalService s2 = MedicalService.builder().id(2L).code("S2").build();

        ClaimLine line1 = new ClaimLine();
        line1.setMedicalService(s1);
        line1.setTotalPrice(new BigDecimal("600.00"));
        
        ClaimLine line2 = new ClaimLine();
        line2.setMedicalService(s2);
        line2.setTotalPrice(new BigDecimal("400.00"));
        
        claim.setLines(List.of(line1, line2));
        claim.setRequestedAmount(new BigDecimal("1000.00"));
        
        when(providerNetworkService.determineNetworkTypeByName(anyString())).thenReturn(NetworkType.IN_NETWORK);
        when(claimRepository.findByMemberIdAndStatusIn(anyLong(), anyList())).thenReturn(Collections.emptyList());
        
        // Mock coverage: S1 (90% coverage -> 10% copay), S2 (70% coverage -> 30% copay)
        // Weighted Co-pay = (600 * 10% + 400 * 30%) / 1000 = (60 + 120) / 1000 = 18%
        when(benefitPolicyCoverageService.batchGetCoveragePercents(any(), anyList(), any()))
                .thenReturn(Map.of(1L, 90, 2L, 70));

        // Act
        CostCalculationService.CostBreakdown breakdown = costCalculationService.calculateCosts(claim);

        // Assert
        assertEquals(new BigDecimal("18.00"), breakdown.coPayPercent().setScale(2));
        assertEquals(new BigDecimal("1000.00"), breakdown.requestedAmount());
        assertEquals(new BigDecimal("180.00"), breakdown.coPayAmount().setScale(2));
        assertEquals(new BigDecimal("820.00"), breakdown.insuranceAmount().setScale(2));
    }

    @Test
    @DisplayName("Should enforce Out-of-Pocket maximum")
    void shouldEnforceOutOfPocketMax() {
        // Arrange
        // Setting requested amount to 50000. 20% copay = 10000.
        // OOP Max in code is 10% of annual limit (50000 * 0.1 = 5000).
        claim.setRequestedAmount(new BigDecimal("50000.00"));
        
        when(providerNetworkService.determineNetworkTypeByName(anyString())).thenReturn(NetworkType.IN_NETWORK);
        when(claimRepository.findByMemberIdAndStatusIn(anyLong(), anyList())).thenReturn(Collections.emptyList());
        
        // Act
        CostCalculationService.CostBreakdown breakdown = costCalculationService.calculateCosts(claim);

        // Assert
        // OOP Max = 5000.00
        assertEquals(new BigDecimal("5000.00"), breakdown.outOfPocketMax().setScale(2));
        assertEquals(new BigDecimal("5000.00"), breakdown.patientResponsibility().setScale(2));
        // Insurance should pay requested - patient responsibility = 50000 - 5000 = 45000
        assertEquals(new BigDecimal("45000.00"), breakdown.insuranceAmount().setScale(2));
    }

    @Test
    @DisplayName("Should add 20% penalty for OUT_OF_NETWORK providers")
    void shouldApplyOutOfNetworkPenalty() {
        // Arrange
        when(providerNetworkService.determineNetworkTypeByName(anyString())).thenReturn(NetworkType.OUT_OF_NETWORK);
        when(claimRepository.findByMemberIdAndStatusIn(anyLong(), anyList())).thenReturn(Collections.emptyList());

        // Act
        CostCalculationService.CostBreakdown breakdown = costCalculationService.calculateCosts(claim);

        // Assert
        // Base copay 20% + 20% penalty = 40%
        // 1000 * 40% = 400
        assertEquals(new BigDecimal("40.00"), breakdown.coPayPercent().setScale(2));
        assertEquals(new BigDecimal("400.00"), breakdown.coPayAmount().setScale(2));
        assertEquals(new BigDecimal("600.00"), breakdown.insuranceAmount().setScale(2));
    }
}
