package com.waad.tba.modules.workflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.workflow.entity.ApprovalRequest;
import com.waad.tba.modules.workflow.entity.ApprovalRequest.ApprovalStatus;
import com.waad.tba.modules.workflow.repository.ApprovalRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for managing Maker/Checker workflows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowService {

    private final ApprovalRequestRepository repository;
    private final ObjectMapper objectMapper;

    /**
     * Submit a new approval request.
     */
    @Transactional
    public ApprovalRequest submitRequest(String entityType, Long entityId, String action, Map<String, Object> payload,
            String makerUser, String notes) {
        log.info("Submitting approval request: {} for {} by {}", action, entityType, makerUser);

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("Error serializing payload", e);
            throw new BusinessRuleException("Invalid payload data format");
        }

        ApprovalRequest request = ApprovalRequest.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .payload(payloadJson)
                .makerUser(makerUser)
                .makerNotes(notes)
                .status(ApprovalStatus.PENDING)
                .build();

        return repository.save(request);
    }

    /**
     * Approve a request and apply its changes.
     */
    @Transactional
    public void approveRequest(Long requestId, String checkerUser, String notes) {
        ApprovalRequest request = repository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("ApprovalRequest", "id", requestId));

        if (request.getStatus() != ApprovalStatus.PENDING) {
            throw new BusinessRuleException("Only PENDING requests can be approved.");
        }

        if (request.getMakerUser().equals(checkerUser)) {
            throw new BusinessRuleException("Maker and Checker cannot be the same user.");
        }

        log.info("Approving request {} by {}", requestId, checkerUser);

        // Apply logic would go here:
        // 1. Identify Adapter for entityType
        // 2. Map payload to Entity
        // 3. Save Entity
        // (This will be implemented in Step 2 of Phase 5 using reflection or dedicated
        // adapters)

        request.setStatus(ApprovalStatus.APPROVED);
        request.setCheckerUser(checkerUser);
        request.setCheckerNotes(notes);
        repository.save(request);
    }

    /**
     * Reject a request.
     */
    @Transactional
    public void rejectRequest(Long requestId, String checkerUser, String notes) {
        ApprovalRequest request = repository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("ApprovalRequest", "id", requestId));

        if (request.getStatus() != ApprovalStatus.PENDING) {
            throw new BusinessRuleException("Only PENDING requests can be rejected.");
        }

        log.info("Rejecting request {} by {}", requestId, checkerUser);

        request.setStatus(ApprovalStatus.REJECTED);
        request.setCheckerUser(checkerUser);
        request.setCheckerNotes(notes);
        repository.save(request);
    }

    /**
     * Check if an entity has a pending approval request.
     */
    public boolean hasPendingRequest(String entityType, Long entityId) {
        return !repository.findByEntityTypeAndEntityIdAndStatus(entityType, entityId, ApprovalStatus.PENDING).isEmpty();
    }

    /**
     * Get preview of changes (Current vs Proposed).
     */
    public Map<String, Object> getImpactPreview(Long requestId) {
        ApprovalRequest request = repository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("ApprovalRequest", "id", requestId));

        Map<String, Object> preview = new HashMap<>();
        preview.put("entityType", request.getEntityType());
        preview.put("entityId", request.getEntityId());
        preview.put("action", request.getAction());
        Map<String, Object> proposedChanges = new HashMap<>();
        try {
            if (request.getPayload() != null) {
                proposedChanges = objectMapper.readValue(request.getPayload(),
                        new TypeReference<Map<String, Object>>() {
                        });
            }
        } catch (Exception e) {
            log.error("Error parsing payload JSON", e);
            proposedChanges.put("error", "Could not parse payload");
            proposedChanges.put("raw", request.getPayload());
        }

        preview.put("proposedChanges", proposedChanges);


        return preview;
    }
}
