package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

class WaitingPeriodRuleTest {

    private WaitingPeriodRule rule;
    private Member member;
    private LocalDate serviceDate;

    @BeforeEach
    void setUp() {
        rule = new WaitingPeriodRule();
        member = new Member();
        serviceDate = LocalDate.now();
    }

    @Test
    @DisplayName("Should pass when no waiting period is required")
    void shouldPassWhenNoWaitingPeriod() {
        // Arrange
        EligibilityContext context = EligibilityContext.builder()
                .member(member)
                .serviceDate(serviceDate)
                .build(); // Effective waiting period will be null

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should pass when waiting period is satisfied")
    void shouldPassWhenWaitingPeriodSatisfied() {
        // Arrange: Enrolled 100 days ago, 90 day waiting period
        LocalDate enrollmentDate = serviceDate.minusDays(100);
        member.setStartDate(enrollmentDate);
        
        BenefitPolicy policy = new BenefitPolicy();
        policy.setDefaultWaitingPeriodDays(90);

        EligibilityContext context = EligibilityContext.builder()
                .member(member)
                .benefitPolicy(policy)
                .serviceDate(serviceDate)
                .build();
        
        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
        assertTrue(result.getMessage().contains("Waiting period satisfied"));
    }

    @Test
    @DisplayName("Should fail when waiting period is NOT satisfied")
    void shouldFailWhenWaitingPeriodNotSatisfied() {
        // Arrange: Enrolled 5 days ago, 90 day waiting period
        LocalDate enrollmentDate = serviceDate.minusDays(5);
        member.setStartDate(enrollmentDate);
        
        BenefitPolicy policy = new BenefitPolicy();
        policy.setDefaultWaitingPeriodDays(90);

        EligibilityContext context = EligibilityContext.builder()
                .member(member)
                .benefitPolicy(policy)
                .serviceDate(serviceDate)
                .build();
        
        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.WAITING_PERIOD_NOT_SATISFIED, result.getReason());
    }

    @Test
    @DisplayName("Should fail when service date is before enrollment date")
    void shouldFailWhenServiceDateBeforeEnrollment() {
        // Arrange: Service date is before enrollment (Invalid case)
        LocalDate enrollmentDate = serviceDate.plusDays(10);
        member.setStartDate(enrollmentDate);
        
        BenefitPolicy policy = new BenefitPolicy();
        policy.setDefaultWaitingPeriodDays(30);

        EligibilityContext context = EligibilityContext.builder()
                .member(member)
                .benefitPolicy(policy)
                .serviceDate(serviceDate)
                .build();
        
        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.SERVICE_DATE_BEFORE_COVERAGE, result.getReason());
    }
}
