package com.waad.tba.modules.medicaltaxonomy.enterprise.repository;

import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseServiceMappingAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnterpriseServiceMappingAuditRepository extends JpaRepository<EnterpriseServiceMappingAudit, Long> {
}
