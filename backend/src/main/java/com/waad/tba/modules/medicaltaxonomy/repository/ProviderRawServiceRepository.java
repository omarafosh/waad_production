package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.ProviderRawService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderRawServiceRepository extends JpaRepository<ProviderRawService, Long> {
    
    Optional<ProviderRawService> findByProviderIdAndServiceCode(Long providerId, String serviceCode);
    
    @Query("SELECT r FROM ProviderRawService r " +
           "WHERE r.provider.id = :providerId " +
           "AND r.active = true " +
           "AND (:mapped IS NULL OR r.mapped = :mapped) " +
           "AND (LOWER(r.serviceCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(r.serviceName) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<ProviderRawService> findFilteredServices(
            @Param("providerId") Long providerId, 
            @Param("mapped") Boolean mapped, 
            @Param("searchTerm") String searchTerm, 
            @Param("pageable") Pageable pageable);

    @Query("SELECT r FROM ProviderRawService r " +
           "WHERE r.provider.id = :providerId " +
           "AND r.active = true " +
           "AND r.mapped = false")
    Page<ProviderRawService> findUnmappedServices(Long providerId, Pageable pageable);

    @Modifying
    @jakarta.transaction.Transactional
    @Query(value = "INSERT INTO provider_raw_services (provider_id, service_code, service_name, category, specialty, active, is_mapped, created_at, updated_at) " +
           "SELECT c.provider_id, p.service_code, p.service_name, p.category_name, p.specialty, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP " +
           "FROM provider_contract_pricing_items p " +
           "JOIN provider_contracts c ON p.contract_id = c.id " +
           "WHERE c.provider_id = :providerId AND c.active = true " +
           "ON CONFLICT (provider_id, service_code) DO UPDATE " +
           "SET service_name = EXCLUDED.service_name, " +
           "category = COALESCE(provider_raw_services.category, EXCLUDED.category), " +
           "specialty = COALESCE(provider_raw_services.specialty, EXCLUDED.specialty), " +
           "updated_at = CURRENT_TIMESTAMP", nativeQuery = true)
    void syncFromContractPricing(@Param("providerId") Long providerId);
}
