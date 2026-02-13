package com.waad.tba.common.audit.repository;

import com.waad.tba.common.audit.entity.EntityHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntityHistoryRepository extends JpaRepository<EntityHistory, Long> {

    Page<EntityHistory> findByEntityTypeAndEntityId(String entityType, Long entityId, Pageable pageable);

    Page<EntityHistory> findByCorrelationId(String correlationId, Pageable pageable);

    List<EntityHistory> findTop10ByOrderByPerformedAtDesc();
}
