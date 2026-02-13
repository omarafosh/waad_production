package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.ProviderRawService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderRawServiceRepository extends JpaRepository<ProviderRawService, Long> {
    
    Optional<ProviderRawService> findByProviderIdAndServiceCode(Long providerId, String serviceCode);
    
    // Find unmapped services (those without an active entry in provider_service_mappings)
    @Query("SELECT r FROM ProviderRawService r " +
           "WHERE r.provider.id = :providerId " +
           "AND r.active = true " +
           "AND NOT EXISTS (SELECT m FROM ProviderServiceMapping m WHERE m.providerServiceCode = r.serviceCode AND m.provider.id = :providerId AND m.active = true)")
    Page<ProviderRawService> findUnmappedServices(Long providerId, Pageable pageable);

    @Query("SELECT r FROM ProviderRawService r " +
           "WHERE r.provider.id = :providerId " +
           "AND r.active = true " +
           "AND (LOWER(r.serviceCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(r.serviceName) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<ProviderRawService> searchByProviderAndTerm(Long providerId, String searchTerm, Pageable pageable);
}
