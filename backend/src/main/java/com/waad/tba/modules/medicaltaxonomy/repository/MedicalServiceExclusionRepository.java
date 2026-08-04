package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.MedicalServiceExclusion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MedicalServiceExclusionRepository extends JpaRepository<MedicalServiceExclusion, Long> {
    Optional<MedicalServiceExclusion> findFirstByAliasNormalizedAndStatusOrderByConfidenceDesc(String aliasNormalized, String status);
}
