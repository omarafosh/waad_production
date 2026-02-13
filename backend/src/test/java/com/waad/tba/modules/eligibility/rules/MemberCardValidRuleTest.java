package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.junit.jupiter.api.Assertions.*;

class MemberCardValidRuleTest {

    private MemberCardValidRule rule;
    private Member member;

    @BeforeEach
    void setUp() {
        rule = new MemberCardValidRule();
        member = new Member();
    }

    @Test
    @DisplayName("Should pass when card status is ACTIVE")
    void shouldPassWhenCardActive() {
        // Arrange
        member.setCardStatus(Member.CardStatus.ACTIVE);
        EligibilityContext context = EligibilityContext.builder().member(member).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should pass with message when card status is NULL")
    void shouldPassWhenCardStatusNull() {
        // Arrange
        member.setCardStatus(null);
        EligibilityContext context = EligibilityContext.builder().member(member).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
        assertNotNull(result.getMessage());
    }

    @ParameterizedTest
    @EnumSource(value = Member.CardStatus.class, names = {"BLOCKED", "EXPIRED", "INACTIVE"})
    @DisplayName("Should fail for invalid card statuses")
    void shouldFailForInvalidCardStatuses(Member.CardStatus status) {
        // Arrange
        member.setCardStatus(status);
        EligibilityContext context = EligibilityContext.builder().member(member).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertNotNull(result.getReason());
    }
}
