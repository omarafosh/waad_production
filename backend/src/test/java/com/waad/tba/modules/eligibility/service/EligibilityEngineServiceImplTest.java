package com.waad.tba.modules.eligibility.service;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.eligibility.domain.*;
import com.waad.tba.modules.eligibility.domain.EligibilityResult.EligibilityStatus;
import com.waad.tba.modules.eligibility.dto.EligibilityCheckRequest;
import com.waad.tba.modules.eligibility.repository.EligibilityCheckRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.modules.rbac.util.SecurityConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EligibilityEngineServiceImplTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private ProviderRepository providerRepository;
    @Mock
    private EligibilityCheckRepository eligibilityCheckRepository;
    @Mock
    private AuthorizationService authorizationService;

    @Mock
    private EligibilityRule fastRule; // Priority 1
    @Mock
    private EligibilityRule slowRule; // Priority 10

    private EligibilityEngineServiceImpl eligibilityEngineService;

    @BeforeEach
    void setUp() {
        // Setup rules with priorities
        when(fastRule.getPriority()).thenReturn(1);
        when(fastRule.getRuleCode()).thenReturn("FAST_RULE");
        when(fastRule.isApplicable(any())).thenReturn(true);
        when(fastRule.isHardRule()).thenReturn(true);

        when(slowRule.getPriority()).thenReturn(10);
        when(slowRule.getRuleCode()).thenReturn("SLOW_RULE");
        when(slowRule.isApplicable(any())).thenReturn(true);

        List<EligibilityRule> rules = Arrays.asList(slowRule, fastRule); // Order doesn't matter, engine should sort
        
        eligibilityEngineService = new EligibilityEngineServiceImpl(
                memberRepository,
                providerRepository,
                eligibilityCheckRepository,
                authorizationService,
                rules
        );
    }

    @Test
    @DisplayName("Should pass eligibility when all rules pass")
    void shouldPassWhenAllRulesPass() {
        // Arrange
        EligibilityCheckRequest request = createBasicRequest();
        setupMocksForRequest(request);

        when(fastRule.evaluate(any())).thenReturn(RuleResult.pass());
        when(slowRule.evaluate(any())).thenReturn(RuleResult.pass());

        // Act
        EligibilityResult result = eligibilityEngineService.checkEligibility(request);

        // Assert
        assertTrue(result.isEligible(), "Result should be eligible");
        assertEquals(EligibilityStatus.ELIGIBLE, result.getStatus());
        verify(fastRule).evaluate(any());
        verify(slowRule).evaluate(any());
        verify(eligibilityCheckRepository).save(any());
    }

    @Test
    @DisplayName("Should stop evaluation on hard failure")
    void shouldStopOnHardFailure() {
        // Arrange
        EligibilityCheckRequest request = createBasicRequest();
        setupMocksForRequest(request);

        // Fast rule (Priority 1) fails hard
        when(fastRule.evaluate(any())).thenReturn(RuleResult.fail(EligibilityReason.MEMBER_INACTIVE, "Member is dead"));

        // Act
        EligibilityResult result = eligibilityEngineService.checkEligibility(request);

        // Assert
        assertFalse(result.isEligible());
        assertEquals(EligibilityStatus.NOT_ELIGIBLE, result.getStatus());
        verify(fastRule).evaluate(any());
        verify(slowRule, never()).evaluate(any()); // Priority 10 should NEVER be called
    }

    @Test
    @DisplayName("Should continue evaluation on soft failure (Warning)")
    void shouldContinueOnSoftFailure() {
        // Arrange
        EligibilityCheckRequest request = createBasicRequest();
        setupMocksForRequest(request);

        // Fast rule (Priority 1) returns a warning (Soft Failure)
        when(fastRule.evaluate(any())).thenReturn(RuleResult.pass("Warning: Card expires soon"));
        when(slowRule.evaluate(any())).thenReturn(RuleResult.pass());

        // Act
        EligibilityResult result = eligibilityEngineService.checkEligibility(request);

        // Assert
        assertTrue(result.isEligible());
        assertEquals(EligibilityStatus.ELIGIBLE, result.getStatus());
        verify(fastRule).evaluate(any());
        verify(slowRule).evaluate(any());
    }

    private EligibilityCheckRequest createBasicRequest() {
        EligibilityCheckRequest request = new EligibilityCheckRequest();
        request.setMemberId(1L);
        request.setProviderId(100L);
        request.setServiceDate(LocalDate.now());
        request.setServiceCode("CONSULTATION");
        return request;
    }

    private void setupMocksForRequest(EligibilityCheckRequest request) {
        Member member = new Member();
        member.setId(request.getMemberId());
        member.setBenefitPolicy(new BenefitPolicy());
        
        Provider provider = new Provider();
        provider.setId(request.getProviderId());

        User user = new User();
        user.setId(5L);
        user.setUsername(SecurityConstants.SYSTEM_USER);

        when(memberRepository.findById(request.getMemberId())).thenReturn(Optional.of(member));
        when(providerRepository.findById(request.getProviderId())).thenReturn(Optional.of(provider));
        when(authorizationService.getCurrentUser()).thenReturn(user);
    }
}
