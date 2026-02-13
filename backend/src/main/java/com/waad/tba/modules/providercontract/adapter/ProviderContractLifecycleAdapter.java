package com.waad.tba.modules.providercontract.adapter;

import com.waad.tba.common.lifecycle.adapter.LifecycleAdapter;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import com.waad.tba.common.lifecycle.dto.LifecycleResult;
import com.waad.tba.common.lifecycle.dto.ValidationResult;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ProviderContractLifecycleAdapter implements LifecycleAdapter<ProviderContract> {

    private final ProviderContractRepository contractRepository;

    @Override
    public boolean supports(String entityType) {
        return "PROVIDER_CONTRACT".equalsIgnoreCase(entityType) || "CONTRACT".equalsIgnoreCase(entityType);
    }

    @Override
    public List<LifecycleAction> getAllowedActions(Long entityId) {
        ProviderContract contract = contractRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        List<LifecycleAction> actions = new ArrayList<>();
        ContractStatus status = contract.getStatus();

        switch (status) {
            case DRAFT:
                actions.add(LifecycleAction.CANCEL);
                actions.add(LifecycleAction.RESTORE); // Restore might mean 'Submit for Activation' in some contexts, but here it's generic
                actions.add(LifecycleAction.HARD_DELETE);
                break;
            case ACTIVE:
                actions.add(LifecycleAction.TERMINATE);
                break;
            case SUSPENDED:
                actions.add(LifecycleAction.RESTORE); // Reactive
                actions.add(LifecycleAction.TERMINATE);
                break;
            case EXPIRED:
            case TERMINATED:
                actions.add(LifecycleAction.ARCHIVE);
                break;
            default:
                break;
        }

        return actions;
    }

    @Override
    public ValidationResult validate(Long entityId, LifecycleAction action) {
        ProviderContract contract = contractRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        if (action == LifecycleAction.HARD_DELETE && contract.getStatus() != ContractStatus.DRAFT) {
            return ValidationResult.invalid("Only DRAFT contracts can be hard deleted.");
        }

        return ValidationResult.valid();
    }

    @Override
    public LifecycleResult executeAction(Long entityId, LifecycleAction action, LifecycleContext context) {
        ProviderContract contract = contractRepository.findById(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        String oldStatus = contract.getStatus().name();

        switch (action) {
            case CANCEL:
                contract.setStatus(ContractStatus.TERMINATED); // or introduce CANCELLED
                contract.setActive(false);
                break;
            case TERMINATE:
                contract.setStatus(ContractStatus.TERMINATED);
                contract.setEndDate(LocalDate.now());
                contract.setActive(false);
                break;
            case ARCHIVE:
                contract.setActive(false);
                break;
            case RESTORE:
                contract.setStatus(ContractStatus.ACTIVE);
                contract.setActive(true);
                break;
            case HARD_DELETE:
                contractRepository.delete(contract);
                return LifecycleResult.builder()
                        .success(true)
                        .action(action)
                        .previousStatus(oldStatus)
                        .newStatus("DELETED")
                        .message("Contract deleted permanently.")
                        .build();
            default:
                throw new UnsupportedOperationException("Action not supported for contracts: " + action);
        }

        contractRepository.save(contract);

        return LifecycleResult.builder()
                .success(true)
                .action(action)
                .previousStatus(oldStatus)
                .newStatus(contract.getStatus().name())
                .message("Action " + action + " executed successfully.")
                .build();
    }

    @Override
    public String getCurrentStatus(Long entityId) {
        return contractRepository.findById(entityId)
                .map(c -> c.getStatus().name())
                .orElse("UNKNOWN");
    }

    @Override
    public ProviderContract getEntity(Long entityId) {
        return contractRepository.findById(entityId).orElse(null);
    }
}
