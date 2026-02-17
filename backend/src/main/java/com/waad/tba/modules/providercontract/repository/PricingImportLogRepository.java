package com.waad.tba.modules.providercontract.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.waad.tba.modules.providercontract.entity.PricingImportLog;

/**
 * Repository for PricingImportLog.
 */
@Repository
public interface PricingImportLogRepository extends JpaRepository<PricingImportLog, Long> {
    
    /**
     * Find import log by batch ID.
     * 
     * @param importBatchId Batch ID
     * @return Optional log
     */
    Optional<PricingImportLog> findByImportBatchId(String importBatchId);
}
