package com.waad.tba.common.lifecycle.repository;

import com.waad.tba.common.lifecycle.entity.LifecycleLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LifecycleLogRepository extends JpaRepository<LifecycleLog, Long> {
    List<LifecycleLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(String entityType, Long entityId);
}
