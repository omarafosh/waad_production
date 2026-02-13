package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BenefitAnnualLimitRuleTest {

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private BenefitAnnualLimitRule rule;

    private EligibilityContext context;
    private BenefitPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new BenefitPolicy();
        policy.setStartDate(LocalDate.now().minusMonths(6));
        policy.setEndDate(LocalDate.now().plusMonths(6));
        policy.setAnnualLimit(new BigDecimal("10000.00"));

        Member member = new Member();
        member.setId(1L);

        context = EligibilityContext.builder()
                .memberId(1L)
                .member(member)
                .benefitPolicy(policy)
                .build();
    }

    @Test
    @DisplayName("Should pass when no annual limit is defined")
    void shouldPassWhenNoLimitDefined() {
        // Arrange
        policy.setAnnualLimit(BigDecimal.ZERO);

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should pass when spent amount is within limit")
    void shouldPassWhenWithinLimit() {
        // Arrange
        setupMockQuery(new BigDecimal("5000.00"));

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should fail when spent amount exceeds limit")
    void shouldFailWhenExceedsLimit() {
        // Arrange
        setupMockQuery(new BigDecimal("10001.00"));

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.COVERAGE_LIMIT_EXHAUSTED, result.getReason());
    }

    @Test
    @DisplayName("Should fail when spent amount is exactly equal to limit")
    void shouldFailWhenEqualToLimit() {
        // Arrange
        setupMockQuery(new BigDecimal("10000.00"));

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.COVERAGE_LIMIT_EXHAUSTED, result.getReason());
    }

    private void setupMockQuery(BigDecimal mockSpentAmount) {
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(mockSpentAmount);
    }
}
