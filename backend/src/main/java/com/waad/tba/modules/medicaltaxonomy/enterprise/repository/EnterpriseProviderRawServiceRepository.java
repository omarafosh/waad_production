package com.waad.tba.modules.medicaltaxonomy.enterprise.repository;

import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseProviderRawService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnterpriseProviderRawServiceRepository extends JpaRepository<EnterpriseProviderRawService, Long> {
    Page<EnterpriseProviderRawService> findByProviderIdAndMappingStatus(Long providerId, EnterpriseProviderRawService.MappingStatus status, Pageable pageable);
}
