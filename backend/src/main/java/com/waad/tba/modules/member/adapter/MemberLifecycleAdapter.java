package com.waad.tba.modules.member.adapter;

import com.waad.tba.common.lifecycle.adapter.LifecycleAdapter;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import com.waad.tba.common.lifecycle.dto.LifecycleResult;
import com.waad.tba.common.lifecycle.dto.ValidationResult;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MemberLifecycleAdapter implements LifecycleAdapter<Member> {

    private final MemberRepository memberRepository;
    private final com.waad.tba.modules.claim.repository.ClaimRepository claimRepository;
    private final com.waad.tba.modules.workflow.service.WorkflowService workflowService;

    @Override
    public boolean supports(String entityType) {
        return "MEMBER".equalsIgnoreCase(entityType);
    }

    @Override
    public List<LifecycleAction> getAllowedActions(Long entityId) {
        Member member = memberRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        List<LifecycleAction> actions = new ArrayList<>();
        long pendingClaimsCount = claimRepository.countByMemberIdAndStatusIn(entityId, List.of(
                com.waad.tba.modules.claim.entity.ClaimStatus.SUBMITTED,
                com.waad.tba.modules.claim.entity.ClaimStatus.UNDER_REVIEW,
                com.waad.tba.modules.claim.entity.ClaimStatus.RETURNED_FOR_INFO));

        switch (member.getStatus()) {
            case DRAFT:
            case PENDING:
                actions.add(LifecycleAction.CANCEL);
                actions.add(LifecycleAction.HARD_DELETE);
                break;
            case ACTIVE:
                if (pendingClaimsCount == 0) {
                    actions.add(LifecycleAction.TERMINATE);
                }
                actions.add(LifecycleAction.SUSPEND);
                break;
            case SUSPENDED:
                actions.add(LifecycleAction.RESTORE);
                if (pendingClaimsCount == 0) {
                    actions.add(LifecycleAction.TERMINATE);
                }
                break;
            case TERMINATED:
                actions.add(LifecycleAction.ARCHIVE);
                actions.add(LifecycleAction.RESTORE);
                break;
            default:
                break;
        }

        return actions;
    }

    @Override
    public ValidationResult validate(Long entityId, LifecycleAction action) {
        if (action == LifecycleAction.TERMINATE) {
            long pendingClaims = claimRepository.countByMemberIdAndStatusIn(entityId, List.of(
                    com.waad.tba.modules.claim.entity.ClaimStatus.SUBMITTED,
                    com.waad.tba.modules.claim.entity.ClaimStatus.UNDER_REVIEW));

            if (pendingClaims > 0) {
                return ValidationResult.invalid("لا يمكن إنهاء عضوية العضو لوجود " + pendingClaims
                        + " مطالبات معلقة. يرجى تسوية المطالبات أولاً.");
            }
        }

        // Check for existing pending approval requests
        if (workflowService.hasPendingRequest("MEMBER", entityId)) {
            return ValidationResult.invalid("هناك طلب اعتماد معلق بالفعل لهذا العضو. يرجى الانتظار حتى يتم البت فيه.");
        }

        return ValidationResult.valid();
    }

    @Override
    public LifecycleResult executeAction(Long entityId, LifecycleAction action, LifecycleContext context) {
        Member member = memberRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        String oldStatus = member.getStatus().name();

        switch (action) {
            case CANCEL:
                member.setStatus(Member.MemberStatus.TERMINATED); // Or add CANCELLED
                member.setActive(false);
                break;
            case TERMINATE:
                member.setStatus(Member.MemberStatus.TERMINATED);
                member.setActive(false);
                break;
            case ARCHIVE:
                member.setActive(false);
                break;
            case RESTORE:
                member.setStatus(Member.MemberStatus.ACTIVE);
                member.setActive(true);
                break;
            case HARD_DELETE:
                memberRepository.delete(member);
                return LifecycleResult.builder()
                        .success(true)
                        .action(action)
                        .previousStatus(oldStatus)
                        .newStatus("DELETED")
                        .message("Member deleted permanently.")
                        .build();
            default:
                throw new UnsupportedOperationException("Action not supported for members: " + action);
        }

        memberRepository.save(member);

        return LifecycleResult.builder()
                .success(true)
                .action(action)
                .previousStatus(oldStatus)
                .newStatus(member.getStatus().name())
                .message("Action " + action + " executed successfully.")
                .build();
    }

    @Override
    public String getCurrentStatus(Long entityId) {
        return memberRepository.findById(entityId)
                .map(m -> m.getStatus().name())
                .orElse("UNKNOWN");
    }

    @Override
    public Member getEntity(Long entityId) {
        return memberRepository.findById(entityId).orElse(null);
    }
}
