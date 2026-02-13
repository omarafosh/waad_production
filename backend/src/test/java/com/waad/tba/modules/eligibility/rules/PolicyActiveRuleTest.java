package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.junit.jupiter.api.Assertions.*;

class PolicyActiveRuleTest {

    private PolicyActiveRule rule;
    private BenefitPolicy policy;

    @BeforeEach
    void setUp() {
        rule = new PolicyActiveRule();
        policy = new BenefitPolicy();
        policy.setActive(true);
        policy.setName("Test Policy");
    }

    @Test
    @DisplayName("Should pass when policy is ACTIVE")
    void shouldPassWhenPolicyActive() {
        // Arrange
        policy.setStatus(BenefitPolicy.BenefitPolicyStatus.ACTIVE);
        EligibilityContext context = EligibilityContext.builder().benefitPolicy(policy).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should fail when policy is NOT active (active=false)")
    void shouldFailWhenActiveFlagFalse() {
        // Arrange
        policy.setActive(false);
        policy.setStatus(BenefitPolicy.BenefitPolicyStatus.ACTIVE);
        EligibilityContext context = EligibilityContext.builder().benefitPolicy(policy).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.POLICY_INACTIVE, result.getReason());
    }

    @ParameterizedTest
    @EnumSource(value = BenefitPolicy.BenefitPolicyStatus.class, names = {"SUSPENDED", "EXPIRED", "CANCELLED", "DRAFT"})
    @DisplayName("Should fail for non-active statuses")
    void shouldFailForNonActiveStatuses(BenefitPolicy.BenefitPolicyStatus status) {
        // Arrange
        policy.setStatus(status);
        EligibilityContext context = EligibilityContext.builder().benefitPolicy(policy).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertNotNull(result.getReason());
    }
}
