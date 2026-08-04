package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.SafeMedicalServiceAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SafeMedicalServiceAliasRepository extends JpaRepository<SafeMedicalServiceAlias, Long> {
    @Query("""
        select a from SafeMedicalServiceAlias a join fetch a.medicalService
        where a.providerId = :providerId and a.providerCodeNormalized = :code
          and a.status = 'READY' and a.medicalServiceId is not null
        order by a.matchPriority asc, a.confidence desc
    """)
    List<SafeMedicalServiceAlias> findProviderCodeMatches(@Param("providerId") Long providerId, @Param("code") String code);

    @Query("""
        select a from SafeMedicalServiceAlias a join fetch a.medicalService
        where a.providerId = :providerId and a.aliasNormalized = :alias
          and a.status = 'READY' and a.medicalServiceId is not null
        order by a.matchPriority asc, a.confidence desc
    """)
    List<SafeMedicalServiceAlias> findProviderAliasMatches(@Param("providerId") Long providerId, @Param("alias") String alias);

    @Query("""
        select a from SafeMedicalServiceAlias a join fetch a.medicalService
        where a.providerId is null and a.aliasNormalized = :alias
          and a.status = 'READY' and a.medicalServiceId is not null
        order by a.matchPriority asc, a.confidence desc
    """)
    List<SafeMedicalServiceAlias> findGlobalAliasMatches(@Param("alias") String alias);
}
