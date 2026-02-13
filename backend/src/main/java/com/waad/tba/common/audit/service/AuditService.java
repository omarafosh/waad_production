package com.waad.tba.common.audit.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.audit.entity.EntityHistory;
import com.waad.tba.common.audit.repository.EntityHistoryRepository;
import com.waad.tba.common.logging.CorrelationIdFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final EntityHistoryRepository entityHistoryRepository;
    private final ObjectMapper objectMapper;

    /**
     * Records a change in an entity.
     * Uses Propagation.REQUIRES_NEW to ensure audit is saved even if main transaction fails? 
     * Actually, usually audit should stay in same transaction for consistency, 
     * but requirement says "Append-Only" history.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void recordHistory(String entityType, Long entityId, String action, Object oldState, Object newState, String performedBy) {
        try {
            Map<String, Object> oldMap = oldState != null ? stateToMap(oldState) : null;
            Map<String, Object> newMap = newState != null ? stateToMap(newState) : null;
            
            Map<String, Object> changes = new java.util.HashMap<>();
            changes.put("old", oldMap);
            changes.put("new", newMap);
            String changesJson = null;
            try {
                 changesJson = objectMapper.writeValueAsString(changes);
            } catch (Exception e) {
                 log.warn("Failed to serialize changes json", e);
                 changesJson = "{}";
            }

            EntityHistory history = EntityHistory.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .changesJson(changesJson)
                    .correlationId(MDC.get(CorrelationIdFilter.MDC_KEY))
                    .performedBy(performedBy)
                    .build();

            entityHistoryRepository.save(history);
            log.debug("Audit record saved for {} id {}", entityType, entityId);
        } catch (Exception e) {
            log.error("Failed to save audit record for {} id {}", entityType, entityId, e);
            // We don't want to fail the main business transaction if auditing fails? 
            // In high-compliance systems, we usually DO want to fail. 
        }
    }

    private Map<String, Object> stateToMap(Object state) {
        if (state == null) return Collections.emptyMap();
        try {
            return objectMapper.convertValue(state, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to convert state to map for auditing", e);
            return Collections.singletonMap("error", "Serialization failed: " + e.getMessage());
        }
    }
}
