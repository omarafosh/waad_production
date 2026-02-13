package com.waad.tba.common.lifecycle;

import com.waad.tba.common.lifecycle.dto.LifecycleResult;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.common.lifecycle.service.LifecycleManagerService;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import org.springframework.security.core.userdetails.User;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class LifecycleIntegrationTest {

    @Autowired
    private LifecycleManagerService lifecycleManagerService;

    @Autowired
    private BenefitPolicyRepository benefitPolicyRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @Test
    public void testBenefitPolicyLifecycle() {
        // 1. Create DRAFT Policy
        BenefitPolicy policy = new BenefitPolicy();
        policy.setName("Test Policy Integration");
        policy.setStatus(BenefitPolicy.BenefitPolicyStatus.DRAFT);
        policy = benefitPolicyRepository.save(policy);

        // 2. Mock some fields for validity
        policy.setStatus(BenefitPolicy.BenefitPolicyStatus.ACTIVE);
        policy.setActive(true);
        policy = benefitPolicyRepository.save(policy);

        // 3. Terminate
        LifecycleContext context = LifecycleContext.builder()
                .reason("End of contract")
                .currentUser(User.withUsername("admin").password("pass").roles("ADMIN").build())
                .build();

        LifecycleResult result = lifecycleManagerService.execute(
                "POLICY", policy.getId(), LifecycleAction.TERMINATE, context);

        Assertions.assertTrue(result.isSuccess());
        Assertions.assertEquals("TERMINATED", result.getNewStatus());
    }

    @Test
    public void testMemberLifecycle_WithPendingClaims() {
        // 1. Create Active Member
        Member member = new Member();
        member.setStatus(Member.MemberStatus.ACTIVE);
        member.setActive(true);
        member = memberRepository.save(member);

        // 2. Create Pending Claim
        Claim claim = new Claim();
        claim.setMember(member);
        claim.setStatus(ClaimStatus.SUBMITTED);
        claim.setActive(true);
        claim.setCreatedAt(LocalDateTime.now());
        claimRepository.save(claim);

        // 3. Try to Terminate Member -> Should Fail due to pending claims validation
        try {
            LifecycleContext context = LifecycleContext.builder()
                    .reason("Termination attempt")
                    .currentUser(User.withUsername("admin").password("pass").roles("ADMIN").build())
                    .build();

            lifecycleManagerService.execute(
                    "MEMBER", member.getId(), LifecycleAction.TERMINATE, context);
            Assertions.fail("Should have failed due to pending claims");
        } catch (Exception e) {
            // Success - caught the validation error
            Assertions.assertTrue(e.getMessage().contains("مطالبات معلقة"));
        }
    }
}
