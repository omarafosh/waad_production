package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.common.entity.Organization;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderPartnershipRuleTest {

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private ProviderPartnershipRule rule;

    private EligibilityContext context;
    private Member member;
    private Provider provider;

    @BeforeEach
    void setUp() {
        Organization insuranceOrg = new Organization();
        insuranceOrg.setId(10L);

        member = new Member();
        member.setId(1L);
        member.setInsuranceOrganization(insuranceOrg);

        provider = new Provider();
        provider.setId(100L);

        context = EligibilityContext.builder()
                .member(member)
                .provider(provider)
                .build();
    }

    @Test
    @DisplayName("Should pass when active partnership exists")
    void shouldPassWhenPartnershipExists() {
        // Arrange
        setupMockQuery(1L);

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertTrue(result.isPassed());
    }

    @Test
    @DisplayName("Should fail when NO active partnership exists")
    void shouldFailWhenNoPartnership() {
        // Arrange
        setupMockQuery(0L);

        // Act
        RuleResult result = rule.evaluate(context);

        // Assert
        assertFalse(result.isPassed());
        assertEquals(EligibilityReason.POLICY_INACTIVE, result.getReason());
    }

    private void setupMockQuery(Long count) {
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(count);
    }
}
