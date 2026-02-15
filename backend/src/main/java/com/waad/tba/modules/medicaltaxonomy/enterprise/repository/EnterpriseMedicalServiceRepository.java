package com.waad.tba.modules.medicaltaxonomy.enterprise.repository;

import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnterpriseMedicalServiceRepository extends JpaRepository<EnterpriseMedicalService, UUID> {
    Optional<EnterpriseMedicalService> findByCode(String code);
    Optional<EnterpriseMedicalService> findByNameAr(String nameAr);
    Optional<EnterpriseMedicalService> findByNameEn(String nameEn);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM EnterpriseMedicalService s WHERE " +
            "(:categoryId IS NULL OR s.category = :categoryId) AND " +
            "(:query IS NULL OR lower(s.code) LIKE lower(concat('%', :query, '%')) OR " +
            "lower(s.nameAr) LIKE lower(concat('%', :query, '%')) OR " +
            "lower(s.nameEn) LIKE lower(concat('%', :query, '%')))")
    java.util.List<EnterpriseMedicalService> searchActive(
            @org.springframework.data.repository.query.Param("query") String query,
            @org.springframework.data.repository.query.Param("categoryId") String categoryId,
            org.springframework.data.domain.Pageable pageable);
}
