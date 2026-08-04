package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.MedicalServiceSplitQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MedicalServiceSplitQueueRepository extends JpaRepository<MedicalServiceSplitQueue, Long> {
    Optional<MedicalServiceSplitQueue> findFirstByServiceNormalizedAndStatusOrderByConfidenceDesc(String serviceNormalized, String status);
}
