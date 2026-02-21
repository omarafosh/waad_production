package com.waad.tba.common.audit.service;

import com.waad.tba.common.audit.entity.AuditLog;
import com.waad.tba.common.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void createAuditLog(String action, String entityName, Long entityId, String details, 
                               Long performedById, String performedByUsername, String clientIp, String userAgent) {
        
        log.debug("Creating audit log: {} on {} (ID: {}) by {}", action, entityName, entityId, performedByUsername);
        
        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .entityName(entityName)
                .entityId(entityId)
                .details(details)
                .performedById(performedById)
                .performedByUsername(performedByUsername)
                .clientIp(clientIp)
                .userAgent(userAgent)
                .build();
                
        auditLogRepository.save(auditLog);
    }
}
