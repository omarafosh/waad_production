package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.ReclassificationAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReclassificationAuditRepository extends JpaRepository<ReclassificationAudit, Long> {
    List<ReclassificationAudit> findByServiceIdOrderByCreatedAtDesc(Long serviceId);
}
