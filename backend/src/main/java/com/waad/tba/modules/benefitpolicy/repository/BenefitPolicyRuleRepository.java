package com.waad.tba.modules.benefitpolicy.repository;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for BenefitPolicyRule entity (REFACTORED for Unified Dictionary).
 */
@Repository
public interface BenefitPolicyRuleRepository extends JpaRepository<BenefitPolicyRule, Long> {

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.deleted = false ORDER BY r.id DESC")
    List<BenefitPolicyRule> findByBenefitPolicyId(@Param("policyId") Long policyId);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.deleted = false")
    Page<BenefitPolicyRule> findByBenefitPolicyId(@Param("policyId") Long policyId, Pageable pageable);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.deleted = true ORDER BY r.id DESC")
    Page<BenefitPolicyRule> findDeletedByBenefitPolicyId(@Param("policyId") Long policyId, Pageable pageable);

            @Query("""
                SELECT r FROM BenefitPolicyRule r
                LEFT JOIN r.medicalService ms
                LEFT JOIN r.medicalCategoryRef mc
                LEFT JOIN r.medicalPackage mp
                WHERE r.benefitPolicy.id = :policyId
                  AND r.deleted = :deleted
                  AND (:encounterType IS NULL OR r.encounterType = :encounterType)
                  AND (:label IS NULL OR :label = '' OR
                       LOWER(CAST(ms.name AS string)) LIKE LOWER(CAST(CONCAT('%', :label, '%') AS string)) OR
                       LOWER(CAST(ms.nameEn AS string)) LIKE LOWER(CAST(CONCAT('%', :label, '%') AS string)) OR
                       LOWER(CAST(mc.name AS string)) LIKE LOWER(CAST(CONCAT('%', :label, '%') AS string)) OR
                       LOWER(CAST(mp.name AS string)) LIKE LOWER(CAST(CONCAT('%', :label, '%') AS string)))
                """)
    Page<BenefitPolicyRule> searchRules(
            @Param("policyId") Long policyId,
            @Param("deleted") boolean deleted,
            @Param("label") String label,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType,
            Pageable pageable);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.active = true AND r.deleted = false ORDER BY r.id DESC")
    List<BenefitPolicyRule> findByBenefitPolicyIdAndActiveTrue(@Param("policyId") Long policyId);

    long countByBenefitPolicyId(Long policyId);
    long countByBenefitPolicyIdAndActiveTrueAndDeletedFalse(Long policyId);
    long countByBenefitPolicyIdAndDeletedTrue(Long policyId);

    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalServiceId(Long policyId, Long serviceId);
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalServiceIdAndActiveTrue(Long policyId, Long serviceId);
    List<BenefitPolicyRule> findByMedicalServiceId(Long serviceId);
    long countByMedicalServiceId(Long serviceId);
    void deleteByMedicalServiceId(Long serviceId);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.medicalCategoryRef.code = :category")
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalCategory(@Param("policyId") Long policyId, @Param("category") String category);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.medicalCategoryRef.code = :category AND r.active = true")
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalCategoryAndActiveTrue(@Param("policyId") Long policyId, @Param("category") String category);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.medicalCategoryRef.code = :category")
    List<BenefitPolicyRule> findByMedicalCategory(@Param("category") String category);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalService.id = :serviceId " +
           "AND r.encounterType = :encounterType " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByServiceAndEncounter(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalService.id = :serviceId " +
           "AND r.encounterType IS NULL " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByServiceGeneral(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalCategoryRef.code = :category " +
           "AND r.encounterType = :encounterType " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByCategoryAndEncounter(
            @Param("policyId") Long policyId,
            @Param("category") String category,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalCategoryRef.code = :category " +
           "AND r.encounterType IS NULL " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByCategoryGeneral(
            @Param("policyId") Long policyId,
            @Param("category") String category);

    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.active = true
          AND (
              r.medicalService.id = :serviceId
              OR (r.medicalPackage.id IN :packageIds AND r.medicalService IS NULL)
              OR (r.medicalCategoryRef.code = :category AND r.medicalService IS NULL AND r.medicalPackage IS NULL)
          )
          AND (r.encounterType = :encounterType OR r.encounterType IS NULL)
        ORDER BY 
            CASE 
                WHEN r.medicalService.id = :serviceId AND r.encounterType = :encounterType THEN 0
                WHEN r.medicalService.id = :serviceId AND r.encounterType IS NULL THEN 1
                WHEN r.medicalPackage.id IN :packageIds AND r.encounterType = :encounterType THEN 2
                WHEN r.medicalPackage.id IN :packageIds AND r.encounterType IS NULL THEN 3
                WHEN r.medicalCategoryRef.code = :category AND r.encounterType = :encounterType THEN 4
                WHEN r.medicalCategoryRef.code = :category AND r.encounterType IS NULL THEN 5
                ELSE 6 
            END ASC
        """)
    List<BenefitPolicyRule> findApplicableRulesForService(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("packageIds") List<Long> packageIds,
            @Param("category") String category,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalCategoryRef.code = :category
          AND r.medicalService IS NULL
          AND r.active = true
        """)
    Optional<BenefitPolicyRule> findActiveCategoryRule(
            @Param("policyId") Long policyId,
            @Param("category") String category);

    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalCategoryRef IS NOT NULL
          AND r.medicalService IS NULL
          AND r.active = true
        ORDER BY r.id DESC
        """)
    List<BenefitPolicyRule> findCategoryRulesForPolicy(@Param("policyId") Long policyId);

    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalService IS NOT NULL
          AND r.active = true
        ORDER BY r.id DESC
        """)
    List<BenefitPolicyRule> findServiceRulesForPolicy(@Param("policyId") Long policyId);

    List<BenefitPolicyRule> findByBenefitPolicyIdAndRequiresPreApprovalTrue(Long policyId);

    void deleteByBenefitPolicyId(Long policyId);

    @Query("UPDATE BenefitPolicyRule r SET r.active = false WHERE r.benefitPolicy.id = :policyId")
    int deactivateAllForPolicy(@Param("policyId") Long policyId);

    @Query("SELECT COUNT(r) > 0 FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalService.id = :serviceId " +
           "AND (:encounterType IS NULL OR r.encounterType = :encounterType) " +
           "AND r.deleted = false")
    boolean existsServiceRule(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType,
            @Param("excludeId") Long excludeId);
}
