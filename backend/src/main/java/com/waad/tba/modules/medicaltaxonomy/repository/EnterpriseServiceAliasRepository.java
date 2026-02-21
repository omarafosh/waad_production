package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.EnterpriseServiceAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnterpriseServiceAliasRepository extends JpaRepository<EnterpriseServiceAlias, Long> {
    List<EnterpriseServiceAlias> findByMedicalServiceId(Long medicalServiceId);
    List<EnterpriseServiceAlias> findByAliasTextContainingIgnoreCase(String text);
}
