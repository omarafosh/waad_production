package com.waad.tba.modules.medicaltaxonomy.enterprise.repository;

import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseServiceAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EnterpriseServiceAliasRepository extends JpaRepository<EnterpriseServiceAlias, Long> {
    List<EnterpriseServiceAlias> findByMedicalServiceId(UUID medicalServiceId);
    List<EnterpriseServiceAlias> findByAliasTextContainingIgnoreCase(String text);
}
