package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.MappingAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MappingAuditLogRepository extends JpaRepository<MappingAuditLog, Long> {
}
