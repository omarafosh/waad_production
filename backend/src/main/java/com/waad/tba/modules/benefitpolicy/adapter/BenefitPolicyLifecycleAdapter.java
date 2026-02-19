package com.waad.tba.modules.benefitpolicy.adapter;

import com.waad.tba.common.lifecycle.adapter.LifecycleAdapter;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import com.waad.tba.common.lifecycle.dto.LifecycleResult;
import com.waad.tba.common.lifecycle.dto.ValidationResult;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class BenefitPolicyLifecycleAdapter implements LifecycleAdapter<BenefitPolicy> {

    private final BenefitPolicyRepository benefitPolicyRepository;
    private final ClaimRepository claimRepository;

    @Override
    public boolean supports(String entityType) {
        return "BENEFIT_POLICY".equalsIgnoreCase(entityType) || "POLICY".equalsIgnoreCase(entityType);
    }

    @Override
    public List<LifecycleAction> getAllowedActions(Long entityId) {
        BenefitPolicy policy = benefitPolicyRepository.findByIdIncludeDeleted(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        List<LifecycleAction> actions = new ArrayList<>();
        BenefitPolicyStatus status = policy.getStatus();
        boolean isDeleted = !policy.isActive();
        long claimsCount = claimRepository.countByMemberBenefitPolicyId(entityId);

        // If soft-deleted or cancelled (State 5), provide RESTORE
        if (isDeleted || status == BenefitPolicyStatus.CANCELLED) {
            actions.add(LifecycleAction.RESTORE);
            return actions; // Terminal states only allow Restore or maybe Hard Delete for drafts
        }

        switch (status) {
            case DRAFT:
                actions.add(LifecycleAction.CANCEL);
                actions.add(LifecycleAction.SOFT_DELETE);
                actions.add(LifecycleAction.HARD_DELETE);
                break;

            case ACTIVE:
            case SUSPENDED:
                if (claimsCount == 0) {
                    actions.add(LifecycleAction.CANCEL); // No claims -> Cancel allowed
                }
                actions.add(LifecycleAction.TERMINATE); // Always allowed to terminate active policy
                break;

            case EXPIRED:
            case TERMINATED:
            case CANCELLED:
                actions.add(LifecycleAction.ARCHIVE);
                actions.add(LifecycleAction.RESTORE);
                break;

            case ARCHIVED:
                actions.add(LifecycleAction.RESTORE);
                break;

            default:
                break;
        }

        return actions;
    }

    @Override
    public ValidationResult validate(Long entityId, LifecycleAction action) {
        BenefitPolicy policy = benefitPolicyRepository.findByIdIncludeDeleted(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        long claimsCount = claimRepository.countByMemberBenefitPolicyId(entityId);

        if (action == LifecycleAction.CANCEL && policy.getStatus() != BenefitPolicyStatus.DRAFT && claimsCount > 0) {
            return ValidationResult
                    .invalid("لا يمكن إلغاء وثيقة تحتوي على مطالبات. يرجى استخدام خيار الإنهاء (Terminate).");
        }

        if (action == LifecycleAction.HARD_DELETE && policy.getStatus() != BenefitPolicyStatus.DRAFT) {
            return ValidationResult.invalid("الحذف النهائي مسموح فقط للوثائق في حالة المسودة (Draft).");
        }

        return ValidationResult.valid();
    }

    @Override
    public LifecycleResult executeAction(Long entityId, LifecycleAction action, LifecycleContext context) {
        BenefitPolicy policy = benefitPolicyRepository.findByIdIncludeDeleted(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        String oldStatus = policy.getStatus().name();
        String newStatusStr = oldStatus;

        switch (action) {
            case CANCEL:
            case SOFT_DELETE:
                policy.setStatus(BenefitPolicyStatus.CANCELLED);
                policy.setActive(false);
                break;
            case TERMINATE:
                policy.setStatus(BenefitPolicyStatus.TERMINATED);
                policy.setEndDate(LocalDate.now()); // Set end date to today
                policy.setActive(false);
                break;
            case ARCHIVE:
                policy.setStatus(BenefitPolicyStatus.ARCHIVED);
                policy.setActive(false); // Archived is inactive by definition
                break;
            case RESTORE:
                policy.setStatus(BenefitPolicyStatus.DRAFT); // Safer to restore to Draft
                policy.setActive(true);
                break;
            case HARD_DELETE:
                benefitPolicyRepository.delete(policy);
                return LifecycleResult.builder()
                        .success(true)
                        .action(action)
                        .previousStatus(oldStatus)
                        .newStatus("DELETED")
                        .message("تم حذف الوثيقة نهائياً.")
                        .build();
            case ACTIVATE:
                if (policy.getStatus() == BenefitPolicyStatus.DRAFT
                        || policy.getStatus() == BenefitPolicyStatus.SUSPENDED) {
                    policy.setStatus(BenefitPolicyStatus.ACTIVE);
                    policy.setActive(true);
                    // Deactivate other active policies for same employer if needed (Business Rule)
                    // existingService.deactivateOtherPolicies(policy.getEmployerId()); // This
                    // might need service injection or event publishing
                }
                break;
            default:
                throw new UnsupportedOperationException("Action not supported: " + action);
        }

        if (action != LifecycleAction.HARD_DELETE) {
            benefitPolicyRepository.save(policy);
            newStatusStr = policy.getStatus().name();
        }

        return LifecycleResult.builder()
                .success(true)
                .action(action)
                .previousStatus(oldStatus)
                .newStatus(newStatusStr)
                .message("تم تنفيذ الإجراء بنجاح: " + action.getLabelAr())
                .build();
    }

    @Override
    public String getCurrentStatus(Long entityId) {
        return benefitPolicyRepository.findByIdIncludeDeleted(entityId)
                .map(p -> p.getStatus().name())
                .orElse("UNKNOWN");
    }

    @Override
    public BenefitPolicy getEntity(Long entityId) {
        return benefitPolicyRepository.findByIdIncludeDeleted(entityId).orElse(null);
    }
}
