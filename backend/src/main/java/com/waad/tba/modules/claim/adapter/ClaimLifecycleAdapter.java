package com.waad.tba.modules.claim.adapter;

import com.waad.tba.common.lifecycle.adapter.LifecycleAdapter;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import com.waad.tba.common.lifecycle.dto.LifecycleResult;
import com.waad.tba.common.lifecycle.dto.ValidationResult;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ClaimLifecycleAdapter implements LifecycleAdapter<Claim> {

    private final ClaimRepository claimRepository;

    @Override
    public boolean supports(String entityType) {
        return "CLAIM".equalsIgnoreCase(entityType);
    }

    @Override
    public List<LifecycleAction> getAllowedActions(Long entityId) {
        Claim claim = claimRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found"));

        List<LifecycleAction> actions = new ArrayList<>();
        ClaimStatus status = claim.getStatus();

        if (status == ClaimStatus.DRAFT || status == ClaimStatus.RETURNED_FOR_INFO) {
            actions.add(LifecycleAction.CANCEL);
            actions.add(LifecycleAction.HARD_DELETE);
        }

        if (status == ClaimStatus.SUBMITTED || status == ClaimStatus.UNDER_REVIEW) {
            actions.add(LifecycleAction.CANCEL);
        }

        if (status == ClaimStatus.REJECTED || status == ClaimStatus.SETTLED) {
            actions.add(LifecycleAction.ARCHIVE);
        }

        return actions;
    }

    @Override
    public ValidationResult validate(Long entityId, LifecycleAction action) {
        Claim claim = claimRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found"));

        if (action == LifecycleAction.HARD_DELETE && claim.getStatus() != ClaimStatus.DRAFT) {
            return ValidationResult.invalid("Only DRAFT claims can be hard deleted.");
        }

        if (action == LifecycleAction.CANCEL && claim.getStatus() == ClaimStatus.SETTLED) {
            return ValidationResult.invalid("Cannot cancel a settled claim.");
        }

        return ValidationResult.valid();
    }

    @Override
    public LifecycleResult executeAction(Long entityId, LifecycleAction action, LifecycleContext context) {
        Claim claim = claimRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found"));

        String oldStatus = claim.getStatus().name();

        switch (action) {
            case CANCEL:
                claim.setStatus(ClaimStatus.CANCELLED);
                claim.setActive(false);
                break;
            case ARCHIVE:
                claim.setActive(false);
                break;
            case RESTORE:
                claim.setActive(true);
                break;
            case HARD_DELETE:
                claimRepository.delete(claim);
                return LifecycleResult.builder()
                        .success(true)
                        .action(action)
                        .previousStatus(oldStatus)
                        .newStatus("DELETED")
                        .message("Claim deleted permanently.")
                        .build();
            default:
                throw new UnsupportedOperationException("Action not supported for claims: " + action);
        }

        claimRepository.save(claim);
        
        return LifecycleResult.builder()
                .success(true)
                .action(action)
                .previousStatus(oldStatus)
                .newStatus(claim.getStatus().name())
                .message("Action " + action + " executed successfully.")
                .build();
    }

    @Override
    public String getCurrentStatus(Long entityId) {
        return claimRepository.findById(entityId)
                .map(c -> c.getStatus().name())
                .orElse("UNKNOWN");
    }

    @Override
    public Claim getEntity(Long entityId) {
        return claimRepository.findById(entityId).orElse(null);
    }
}
