package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MemberActiveRuleTest {

    private MemberActiveRule rule;
    private Member member;

    @BeforeEach
    void setUp() {
        rule = new MemberActiveRule();
        member = new Member();
    }

    @Test
    @DisplayName("Should pass when member is ACTIVE")
    void shouldPassWhenMemberActive() {
        // Arrange
        member.setStatus(Member.MemberStatus.ACTIVE);
        EligibilityContext context = EligibilityContext.builder().member(member).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should fail when member is INACTIVE")
    void shouldFailWhenMemberInactive() {
        // Arrange
        member.setStatus(Member.MemberStatus.TERMINATED);
        EligibilityContext context = EligibilityContext.builder().member(member).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.MEMBER_INACTIVE, result.getReason());
    }

    @Test
    @DisplayName("Should fail when member is SUSPENDED")
    void shouldFailWhenMemberSuspended() {
        // Arrange
        member.setStatus(Member.MemberStatus.SUSPENDED);
        EligibilityContext context = EligibilityContext.builder().member(member).build();

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.MEMBER_SUSPENDED, result.getReason());
    }
}
