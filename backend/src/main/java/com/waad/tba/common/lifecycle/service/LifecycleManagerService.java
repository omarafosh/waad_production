package com.waad.tba.common.lifecycle.service;

import com.waad.tba.common.lifecycle.adapter.LifecycleAdapter;
import com.waad.tba.common.lifecycle.dto.*;
import com.waad.tba.common.lifecycle.entity.LifecycleLog;
import com.waad.tba.common.lifecycle.entity.LifecycleReasonCode;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import com.waad.tba.common.lifecycle.repository.LifecycleLogRepository;
import com.waad.tba.common.lifecycle.repository.LifecycleReasonCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LifecycleManagerService {

    private final List<LifecycleAdapter<?>> adapters;
    private final LifecycleLogRepository auditRepository;
    private final LifecycleReasonCodeRepository reasonCodeRepository;
    private final com.waad.tba.common.audit.service.AuditService auditService;

    private LifecycleAdapter<?> getAdapter(String entityType) {
        return adapters.stream()
                .filter(a -> a.supports(entityType))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No lifecycle adapter found for entity type: " + entityType));
    }

    @Transactional(readOnly = true)
    public LifecyclePreviewDto preview(String entityType, Long entityId) {
        LifecycleAdapter<?> adapter = getAdapter(entityType);
        
        String currentStatus = adapter.getCurrentStatus(entityId);
        List<LifecycleAction> allowed = adapter.getAllowedActions(entityId);
        
        List<LifecyclePreviewDto.LifecycleActionOption> options = allowed.stream()
                .map(action -> {
                    List<LifecycleReasonCode> reasons = reasonCodeRepository.findApplicableReasons(entityType.toUpperCase(), action.name());
                    
                    return LifecyclePreviewDto.LifecycleActionOption.builder()
                            .action(action)
                            .label(action.getLabelAr())
                            .severity(getSeverity(action))
                            .requiresReason(true)
                            .impactSummary(getImpactSummary(action))
                            .reasonOptions(reasons.stream()
                                    .map(r -> ReasonCodeDto.builder()
                                             .code(r.getCode())
                                             .labelAr(r.getLabelAr())
                                             .labelEn(r.getLabelEn())
                                             .build())
                                    .collect(Collectors.toList()))
                            .build();
                })
                .collect(Collectors.toList());

        return LifecyclePreviewDto.builder()
                .entityType(entityType)
                .entityId(entityId)
                .currentStatus(currentStatus)
                .allowedActions(options)
                .build();
    }

    @Transactional
    public LifecycleResult execute(String entityType, Long entityId, LifecycleAction action, LifecycleContext context) {
        log.info("Executing lifecycle action {} on {}/{} by {}", action, entityType, entityId, context.getCurrentUser().getUsername());
        
        LifecycleAdapter<?> adapter = getAdapter(entityType);
        String oldStatus = adapter.getCurrentStatus(entityId);
        Object beforeState = adapter.getEntity(entityId);

        // 1. Structural Validation (State Machine)
        
        // 2. Adapter Business Validation
        ValidationResult validation = adapter.validate(entityId, action);
        if (!validation.isValid()) {
            throw new IllegalStateException(validation.getMessage());
        }

        // 3. Reason Code Validation
        if (context.getReasonCode() == null || context.getReasonCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Reason code is required for lifecycle actions.");
        }

        // 4. Execute
        LifecycleResult result = adapter.executeAction(entityId, action, context);

        // 5. Audit & History
        if (result.isSuccess()) {
            Object afterState = adapter.getEntity(entityId);
            
            // Record in detailed entity_history with snapshots
            auditService.recordHistory(entityType, entityId, action.name(), beforeState, afterState, context.getCurrentUser().getUsername());

            // Record in lifecycle_logs (Summary)
            LifecycleLog audit = LifecycleLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .previousStatus(oldStatus)
                    .newStatus(result.getNewStatus())
                    .reasonCode(context.getReasonCode())
                    .reasonDetails(context.getReason())
                    .performedBy(context.getCurrentUser().getUsername())
                    .metadata(context.getMetadata())
                    .build();
            
            LifecycleLog savedAudit = auditRepository.save(audit);
            result.setAuditLogId(savedAudit.getId());
        }

        return result;
    }

    private String getSeverity(LifecycleAction action) {
        return switch (action) {
            case TERMINATE -> "WARNING";
            case CANCEL, HARD_DELETE -> "DANGER";
            default -> "INFO";
        };
    }
    
    private String getImpactSummary(LifecycleAction action) {
        return switch (action) {
            case CANCEL -> "سيتم إلغاء السجل كأنه لم يكن. لا يمكن التراجع عن هذا الإجراء.";
            case TERMINATE -> "سيتم إيقاف الفعالية اعتباراً من اليوم.";
            case ARCHIVE -> "سيتم نقل السجل للأرشيف ولن يظهر في القوائم النشطة.";
            case RESTORE -> "سيتم إعادة تفعيل السجل.";
            default -> "";
        };
    }
}
