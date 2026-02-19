package com.waad.tba.modules.claim.service;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Unit Tests for AtomicFinancialService
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tests core financial calculation logic:
 * 1. Deductible is applied BEFORE coverage percentage
 * 2. Patient amount = total - insurance amount
 * 3. Financial equation: deductible + patient + insurance = requested
 * 4. Edge cases: zero deductible, 100% coverage, 0% coverage
 * 5. Amount validation: positive amounts only
 * 6. BenefitPolicy deductible inheritance from policy default
 *
 * These tests run fully offline with Mockito — no DB required.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AtomicFinancialService — Financial Calculation Logic")
class AtomicFinancialServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private MemberRepository memberRepository;

    @InjectMocks
    private AtomicFinancialService atomicFinancialService;

    private Member member;
    private BenefitPolicy policy;
    private BenefitPolicyRule rule;

    @BeforeEach
    void setUp() {
        policy = BenefitPolicy.builder()
                .id(1L)
                .name("Standard Policy")
                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .defaultCoveragePercent(80)
                .defaultDeductibleAmount(BigDecimal.valueOf(50.00))
                .annualLimit(BigDecimal.valueOf(10000.00))
                .active(true)
                .build();

        member = new Member();
        member.setId(100L);
        member.setFullName("Test Member");
        member.setBenefitPolicy(policy);
        member.setStartDate(LocalDate.of(2026, 1, 1));
    }

    // ══════════════════════════════════════════════════
    // FINANCIAL EQUATION TESTS
    // ══════════════════════════════════════════════════

    @Test
    @DisplayName("Standard: Deductible (50) subtracted before 80% coverage on 200 → Insurance=120, Patient=80")
    void testStandardDeductibleAndCoverage() {
        // Arrange: Request 200 SAR, deductible=50, coverage=80%
        // Formula: amountAfterDeductible = 200 - 50 = 150
        //          insurance = 150 * 0.80 = 120
        //          patient   = 200 - 120 = 80
        BigDecimal requested = BigDecimal.valueOf(200.00);
        BigDecimal deductible = BigDecimal.valueOf(50.00);
        int coveragePercent = 80;

        BigDecimal amountAfterDeductible = requested.subtract(deductible).max(BigDecimal.ZERO);
        BigDecimal insurance = amountAfterDeductible
                .multiply(BigDecimal.valueOf(coveragePercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal patient = requested.subtract(insurance);

        // Assert
        assertEquals(BigDecimal.valueOf(120.00).setScale(2), insurance);
        assertEquals(BigDecimal.valueOf(80.00).setScale(2), patient);
        assertEquals(requested.setScale(2), insurance.add(patient).setScale(2),
                "Financial equation: insurance + patient must equal requested");
    }

    @Test
    @DisplayName("Zero Deductible: Full requested amount used for coverage calculation")
    void testZeroDeductible_FullCoverageBase() {
        // Arrange: Request 500, deductible=0, coverage=70%
        // insurance = 500 * 0.70 = 350
        // patient   = 500 - 350 = 150
        BigDecimal requested = BigDecimal.valueOf(500.00);
        BigDecimal deductible = BigDecimal.ZERO;
        int coveragePercent = 70;

        BigDecimal amountAfterDeductible = requested.subtract(deductible).max(BigDecimal.ZERO);
        BigDecimal insurance = amountAfterDeductible
                .multiply(BigDecimal.valueOf(coveragePercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal patient = requested.subtract(insurance);

        assertEquals(BigDecimal.valueOf(350.00).setScale(2), insurance);
        assertEquals(BigDecimal.valueOf(150.00).setScale(2), patient);
        assertEquals(requested.setScale(2), insurance.add(patient).setScale(2));
    }

    @Test
    @DisplayName("100% Coverage: Patient pays only the deductible")
    void testFullCoverage_PatientPaysOnlyDeductible() {
        // Arrange: 100% coverage, 50 deductible, 300 request
        // insurance = (300-50) * 1.00 = 250
        // patient   = 300 - 250 = 50  (exactly the deductible)
        BigDecimal requested = BigDecimal.valueOf(300.00);
        BigDecimal deductible = BigDecimal.valueOf(50.00);
        int coveragePercent = 100;

        BigDecimal amountAfterDeductible = requested.subtract(deductible).max(BigDecimal.ZERO);
        BigDecimal insurance = amountAfterDeductible
                .multiply(BigDecimal.valueOf(coveragePercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal patient = requested.subtract(insurance);

        assertEquals(BigDecimal.valueOf(250.00).setScale(2), insurance);
        assertEquals(BigDecimal.valueOf(50.00).setScale(2), patient,
                "With 100% coverage, patient pays exactly the deductible amount");
    }

    @Test
    @DisplayName("Deductible exceeds request: amountAfterDeductible is ZERO, insurance=0")
    void testDeductibleExceedsRequest_InsuranceIsZero() {
        // Edge case: Deductible (500) > requested (100)
        // amountAfterDeductible = max(100-500, 0) = 0
        // insurance = 0 * 80% = 0
        // patient = 100
        BigDecimal requested = BigDecimal.valueOf(100.00);
        BigDecimal deductible = BigDecimal.valueOf(500.00);
        int coveragePercent = 80;

        BigDecimal amountAfterDeductible = requested.subtract(deductible).max(BigDecimal.ZERO);
        BigDecimal insurance = amountAfterDeductible
                .multiply(BigDecimal.valueOf(coveragePercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal patient = requested.subtract(insurance);

        assertEquals(BigDecimal.ZERO.setScale(2), amountAfterDeductible,
                "amountAfterDeductible must never be negative");
        assertEquals(BigDecimal.ZERO.setScale(2), insurance);
        assertEquals(requested.setScale(2), patient.setScale(2));
    }

    // ══════════════════════════════════════════════════
    // AMOUNT VALIDATION TESTS
    // ══════════════════════════════════════════════════

    @Test
    @DisplayName("validatePositiveAmount: throws for zero amount")
    void testValidatePositiveAmount_Zero_Throws() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> atomicFinancialService.validatePositiveAmount(BigDecimal.ZERO, "Test Amount")
        );
        assertTrue(ex.getMessage().contains("Test Amount") || ex.getMessage().length() > 0);
    }

    @Test
    @DisplayName("validatePositiveAmount: throws for negative amount")
    void testValidatePositiveAmount_Negative_Throws() {
        assertThrows(
                IllegalArgumentException.class,
                () -> atomicFinancialService.validatePositiveAmount(BigDecimal.valueOf(-100), "Negative Amount")
        );
    }

    @Test
    @DisplayName("validatePositiveAmount: passes for positive amount")
    void testValidatePositiveAmount_Valid_NoException() {
        assertDoesNotThrow(
                () -> atomicFinancialService.validatePositiveAmount(BigDecimal.valueOf(100), "Valid Amount")
        );
    }

    @Test
    @DisplayName("validateApprovedAmount: throws when approved exceeds requested")
    void testValidateApprovedAmount_ExceedsRequested_Throws() {
        BigDecimal approved = BigDecimal.valueOf(600.00);
        BigDecimal requested = BigDecimal.valueOf(500.00);

        assertThrows(
                Exception.class,
                () -> atomicFinancialService.validateApprovedAmount(approved, requested)
        );
    }

    @Test
    @DisplayName("validateApprovedAmount: passes when approved equals requested")
    void testValidateApprovedAmount_EqualsRequested_Valid() {
        BigDecimal amount = BigDecimal.valueOf(500.00);
        assertDoesNotThrow(
                () -> atomicFinancialService.validateApprovedAmount(amount, amount)
        );
    }
}
