package com.waad.tba.common.audit.controller;

import com.waad.tba.common.audit.entity.EntityHistory;
import com.waad.tba.common.audit.repository.EntityHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final EntityHistoryRepository entityHistoryRepository;

    @GetMapping("/history")
    public Page<EntityHistory> getHistory(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String correlationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        PageRequest pageRequest = PageRequest.of(page, size, sort);

        if (correlationId != null && !correlationId.isEmpty()) {
            return entityHistoryRepository.findByCorrelationId(correlationId, pageRequest);
        }
        
        if (entityType != null && entityId != null) {
            return entityHistoryRepository.findByEntityTypeAndEntityId(entityType, entityId, pageRequest);
        }

        return entityHistoryRepository.findAll(pageRequest);
    }

    @GetMapping("/recent")
    public List<EntityHistory> getRecent() {
        return entityHistoryRepository.findTop10ByOrderByPerformedAtDesc();
    }
}
