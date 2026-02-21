package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.ProviderMappingAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderMappingAuditRepository extends JpaRepository<ProviderMappingAudit, Long> {
    List<ProviderMappingAudit> findByProviderRawServiceIdOrderByChangedAtDesc(Long providerRawServiceId);
}
