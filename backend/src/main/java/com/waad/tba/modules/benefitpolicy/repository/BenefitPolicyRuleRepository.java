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
 * Repository for BenefitPolicyRule entity.
 * Provides queries for coverage lookup and rule management.
 */
@Repository
public interface BenefitPolicyRuleRepository extends JpaRepository<BenefitPolicyRule, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // FIND BY POLICY
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all rules for a specific policy (Ordered by ID DESC to show newest at top)
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.deleted = false ORDER BY r.id DESC")
    List<BenefitPolicyRule> findByBenefitPolicyId(@Param("policyId") Long policyId);

    /**
     * Find all rules for a specific policy (paginated)
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.deleted = false")
    Page<BenefitPolicyRule> findByBenefitPolicyId(@Param("policyId") Long policyId, Pageable pageable);

    /**
     * Find only DELETED rules for a specific policy (Trash view)
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.deleted = true ORDER BY r.id DESC")
    Page<BenefitPolicyRule> findDeletedByBenefitPolicyId(@Param("policyId") Long policyId, Pageable pageable);

    /**
     * Search rules with filters (label and encounter type)
     */
    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.deleted = :deleted
          AND (:encounterType IS NULL OR r.encounterType = :encounterType)
          AND (:label IS NULL OR
               LOWER(r.medicalService.name) LIKE LOWER(CONCAT('%', :label, '%')) OR
               LOWER(r.medicalService.nameEn) LIKE LOWER(CONCAT('%', :label, '%')) OR
               LOWER(r.medicalCategory.name) LIKE LOWER(CONCAT('%', :label, '%')) OR
               LOWER(r.medicalPackage.name) LIKE LOWER(CONCAT('%', :label, '%')))
        """)
    Page<BenefitPolicyRule> searchRules(
            @Param("policyId") Long policyId,
            @Param("deleted") boolean deleted,
            @Param("label") String label,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType,
            Pageable pageable);

    /**
     * Find all ACTIVE rules for a specific policy (Ordered by ID DESC)
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId AND r.active = true AND r.deleted = false ORDER BY r.id DESC")
    List<BenefitPolicyRule> findByBenefitPolicyIdAndActiveTrue(@Param("policyId") Long policyId);

    /**
     * Count rules for a policy
     */
    long countByBenefitPolicyId(Long policyId);

    /**
     * Count active rules for a policy
     */
    long countByBenefitPolicyIdAndActiveTrueAndDeletedFalse(Long policyId);
    
    /**
     * Count deleted rules for a policy
     */
    long countByBenefitPolicyIdAndDeletedTrue(Long policyId);

    // ═══════════════════════════════════════════════════════════════════════════
    // FIND BY SERVICE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find rule for a specific service within a policy
     */
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalServiceId(Long policyId, Long serviceId);

    /**
     * Find active rule for a specific service within a policy
     */
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalServiceIdAndActiveTrue(
            Long policyId, Long serviceId);

    /**
     * Find all rules targeting a specific service (across all policies)
     */
    List<BenefitPolicyRule> findByMedicalServiceId(Long serviceId);

    /**
     * Count rules targeting a specific service
     */
    long countByMedicalServiceId(Long serviceId);

    /**
     * Delete rules targeting a specific service
     */
    void deleteByMedicalServiceId(Long serviceId);

    // ═══════════════════════════════════════════════════════════════════════════
    // FIND BY CATEGORY
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find rule for a specific category within a policy
     */
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalCategoryId(Long policyId, Long categoryId);

    /**
     * Find active rule for a specific category within a policy
     */
    Optional<BenefitPolicyRule> findByBenefitPolicyIdAndMedicalCategoryIdAndActiveTrue(
            Long policyId, Long categoryId);

    /**
     * Find all rules targeting a specific category (across all policies)
     */
    List<BenefitPolicyRule> findByMedicalCategoryId(Long categoryId);

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE LOOKUP QUERIES (Used by Claims/Eligibility)
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY RESOLUTION QUERIES (Service > Category)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Case 1: Specific Service + Specific Encounter Type
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalService.id = :serviceId " +
           "AND r.encounterType = :encounterType " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByServiceAndEncounter(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    /**
     * Case 2: Specific Service (General rule, encounterType is null)
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalService.id = :serviceId " +
           "AND r.encounterType IS NULL " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByServiceGeneral(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId);

    /**
     * Case 3: Specific Category + Specific Encounter Type
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalCategory.id = :categoryId " +
           "AND r.encounterType = :encounterType " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByCategoryAndEncounter(
            @Param("policyId") Long policyId,
            @Param("categoryId") Long categoryId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    /**
     * Case 4: Specific Category (General rule, encounterType is null)
     */
    @Query("SELECT r FROM BenefitPolicyRule r WHERE r.benefitPolicy.id = :policyId " +
           "AND r.medicalCategory.id = :categoryId " +
           "AND r.encounterType IS NULL " +
           "AND r.active = true")
    Optional<BenefitPolicyRule> findActiveByCategoryGeneral(
            @Param("policyId") Long policyId,
            @Param("categoryId") Long categoryId);

    /**
     * Find best rule using prioritization logic (Service > Category)
     * Note: This is a complex query, kept for reference or single-shot retrieval.
     * We recommended using the specific queries above in the Service layer for better control/debugging.
     */
    /**
     * Find the most specific rule for a service within a policy.
     * Service-specific rules take priority over category rules.
     * 
     * Order of precedence:
     * 1. Direct service match
     * 2. Category match (for the service's category)
     */
    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.active = true
          AND (
              r.medicalService.id = :serviceId
              OR (r.medicalPackage.id IN :packageIds AND r.medicalService IS NULL)
              OR (r.medicalCategory.id = :categoryId AND r.medicalService IS NULL AND r.medicalPackage IS NULL)
          )
          AND (r.encounterType = :encounterType OR r.encounterType IS NULL)
        ORDER BY 
            CASE 
                WHEN r.medicalService.id = :serviceId AND r.encounterType = :encounterType THEN 0
                WHEN r.medicalService.id = :serviceId AND r.encounterType IS NULL THEN 1
                WHEN r.medicalPackage.id IN :packageIds AND r.encounterType = :encounterType THEN 2
                WHEN r.medicalPackage.id IN :packageIds AND r.encounterType IS NULL THEN 3
                WHEN r.medicalCategory.id = :categoryId AND r.encounterType = :encounterType THEN 4
                WHEN r.medicalCategory.id = :categoryId AND r.encounterType IS NULL THEN 5
                ELSE 6 
            END ASC
        """)
    List<BenefitPolicyRule> findApplicableRulesForService(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("packageIds") List<Long> packageIds,
            @Param("categoryId") Long categoryId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    /**
     * Find the best matching rule for a service within a policy.
     * Returns the most specific rule (service > package > category).
     */
    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.active = true
          AND (
              r.medicalService.id = :serviceId
              OR (r.medicalPackage.id IN :packageIds AND r.medicalService IS NULL)
              OR (r.medicalCategory.id = :categoryId AND r.medicalService IS NULL AND r.medicalPackage IS NULL)
          )
          AND (r.encounterType = :encounterType OR r.encounterType IS NULL)
        ORDER BY 
            CASE 
                WHEN r.medicalService.id = :serviceId AND r.encounterType = :encounterType THEN 0
                WHEN r.medicalService.id = :serviceId AND r.encounterType IS NULL THEN 1
                WHEN r.medicalPackage.id IN :packageIds AND r.encounterType = :encounterType THEN 2
                WHEN r.medicalPackage.id IN :packageIds AND r.encounterType IS NULL THEN 3
                WHEN r.medicalCategory.id = :categoryId AND r.encounterType = :encounterType THEN 4
                WHEN r.medicalCategory.id = :categoryId AND r.encounterType IS NULL THEN 5
                ELSE 6 
            END ASC
        LIMIT 1
        """)
    Optional<BenefitPolicyRule> findBestRuleForService(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("packageIds") List<Long> packageIds,
            @Param("categoryId") Long categoryId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType);

    /**
     * Find active category rule for a policy
     */
    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalCategory.id = :categoryId
          AND r.medicalService IS NULL
          AND r.active = true
        """)
    Optional<BenefitPolicyRule> findActiveCategoryRule(
            @Param("policyId") Long policyId,
            @Param("categoryId") Long categoryId);

    // ═══════════════════════════════════════════════════════════════════════════
    // DUPLICATE CHECK QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if a service rule already exists for this policy (excluding given rule id)
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalService.id = :serviceId
          AND r.deleted = false
          AND (r.encounterType = :encounterType OR (:encounterType IS NULL AND r.encounterType IS NULL))
          AND (:excludeRuleId IS NULL OR r.id != :excludeRuleId)
        """)
    boolean existsServiceRule(
            @Param("policyId") Long policyId,
            @Param("serviceId") Long serviceId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType,
            @Param("excludeRuleId") Long excludeRuleId);

    /**
     * Check if a category rule already exists for this policy (excluding given rule id)
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalCategory.id = :categoryId
          AND r.medicalService IS NULL
          AND r.deleted = false
          AND (r.encounterType = :encounterType OR (:encounterType IS NULL AND r.encounterType IS NULL))
          AND (:excludeRuleId IS NULL OR r.id != :excludeRuleId)
        """)
    boolean existsCategoryRule(
            @Param("policyId") Long policyId,
            @Param("categoryId") Long categoryId,
            @Param("encounterType") com.waad.tba.modules.visit.entity.VisitType encounterType,
            @Param("excludeRuleId") Long excludeRuleId);

    // ═══════════════════════════════════════════════════════════════════════════
    // RULE FILTERING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all category-level rules for a policy (no specific service)
     */
    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalCategory IS NOT NULL
          AND r.medicalService IS NULL
          AND r.active = true
        ORDER BY r.id DESC
        """)
    List<BenefitPolicyRule> findCategoryRulesForPolicy(@Param("policyId") Long policyId);

    /**
     * Find all service-level rules for a policy
     */
    @Query("""
        SELECT r FROM BenefitPolicyRule r
        WHERE r.benefitPolicy.id = :policyId
          AND r.medicalService IS NOT NULL
          AND r.active = true
        ORDER BY r.id DESC
        """)
    List<BenefitPolicyRule> findServiceRulesForPolicy(@Param("policyId") Long policyId);

    /**
     * Find rules that require pre-approval
     */
    List<BenefitPolicyRule> findByBenefitPolicyIdAndRequiresPreApprovalTrue(Long policyId);

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Delete all rules for a policy
     */
    void deleteByBenefitPolicyId(Long policyId);

    /**
     * Deactivate all rules for a policy (soft delete)
     */
    @Query("UPDATE BenefitPolicyRule r SET r.active = false WHERE r.benefitPolicy.id = :policyId")
    int deactivateAllForPolicy(@Param("policyId") Long policyId);

    /**
     * Bulk snapshot coverage for a service across all active policies that don't have an override.
     * Inherits from category rule if exists, otherwise from policy default.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = """
        INSERT INTO benefit_policy_rules (
            benefit_policy_id, medical_service_id, coverage_percent, amount_limit, 
            times_limit, waiting_period_days, requires_pre_approval, active, notes, 
            created_at, updated_at
        )
        SELECT 
            p.id, :serviceId, 
            COALESCE(cr.coverage_percent, p.default_coverage_percent), 
            cr.amount_limit, cr.times_limit, cr.waiting_period_days, 
            COALESCE(cr.requires_pre_approval, false), 
            true, 'Auto-generated: Keep Override Strategy during reclassification',
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM benefit_policies p
        LEFT JOIN benefit_policy_rules cr ON cr.benefit_policy_id = p.id 
            AND cr.medical_category_id = :oldCategoryId 
            AND cr.medical_service_id IS NULL 
            AND cr.active = true
        WHERE p.active = true AND p.status = 'ACTIVE'
        AND NOT EXISTS (
            SELECT 1 FROM benefit_policy_rules sr 
            WHERE sr.benefit_policy_id = p.id 
            AND sr.medical_service_id = :serviceId 
            AND sr.active = true
        )
        """, nativeQuery = true)
    int snapshotServiceCoverage(
        @Param("serviceId") Long serviceId, 
        @Param("oldCategoryId") Long oldCategoryId);
}
