package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.ProviderServiceMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface ProviderServiceMappingRepository extends JpaRepository<ProviderServiceMapping, Long> {

    /**
     * Find mapping by provider and their specific code.
     * This is the CORE query for claim processing.
     */
    @Query("SELECT m FROM ProviderServiceMapping m " +
           "JOIN FETCH m.masterService " +
           "WHERE m.provider.id = :providerId AND m.providerServiceCode = :serviceCode")
    Optional<ProviderServiceMapping> findMapping(Long providerId, String serviceCode);

    /**
     * Find all mappings for a specific provider.
     */
    List<ProviderServiceMapping> findByProviderId(Long providerId);

    /**
     * Find all mappings linked to a specific Master Service.
     */
    List<ProviderServiceMapping> findByMasterServiceId(Long masterServiceId);
    

    /**
     * Check if a mapping exists.
     */
    boolean existsByProviderIdAndProviderServiceCode(Long providerId, String providerServiceCode);

    Optional<ProviderServiceMapping> findByProviderIdAndProviderServiceCode(Long providerId, String providerServiceCode);

    long countByActiveTrue();
}
