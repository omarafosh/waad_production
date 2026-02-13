package com.waad.tba.modules.benefitpolicy.repository;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for BenefitPolicy entity.
 */
@Repository
public interface BenefitPolicyRepository extends JpaRepository<BenefitPolicy, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // BASIC QUERIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Find by ID including soft-deleted items.
     * Overrides @SQLRestriction("active=true") by using native query or similar approach.
     */
    @Query(value = "SELECT * FROM benefit_policies WHERE id = :id", nativeQuery = true)
    Optional<BenefitPolicy> findByIdIncludeDeleted(@Param("id") Long id);

    /**
     * Find by policy code
     */
    Optional<BenefitPolicy> findByPolicyCode(String policyCode);

    /**
     * Find all active (not soft-deleted) policies
     */
    List<BenefitPolicy> findByActiveTrue();

    /**
     * Find all active (not soft-deleted) policies - paginated
     */
    Page<BenefitPolicy> findByActiveTrue(Pageable pageable);

    /**
     * Find all active policies with eager loading of organizations to avoid N+1
     */
    @Query(value = "SELECT bp FROM BenefitPolicy bp " +
                   "LEFT JOIN FETCH bp.employerOrganization " +
                   "LEFT JOIN FETCH bp.insuranceOrganization " +
                   "WHERE bp.active = true AND bp.deleted = false",
           countQuery = "SELECT COUNT(bp) FROM BenefitPolicy bp WHERE bp.active = true AND bp.deleted = false")
    Page<BenefitPolicy> findAllOptimized(Pageable pageable);

    /**
     * Find all deleted (soft-deleted) policies - paginated.
     * Use native query to bypass @SQLRestriction.
     */
    @Query(value = "SELECT * FROM (SELECT * FROM benefit_policies) AS bp WHERE bp.active = false OR bp.deleted = true", 
           countQuery = "SELECT COUNT(*) FROM (SELECT * FROM benefit_policies) AS bp WHERE bp.active = false OR bp.deleted = true",
           nativeQuery = true)
    Page<BenefitPolicy> findByActiveFalseNative(Pageable pageable);

    /**
     * Find all policies (active + deleted) - paginated.
     */
    @Query(value = "SELECT * FROM (SELECT * FROM benefit_policies) AS bp", 
           countQuery = "SELECT COUNT(*) FROM benefit_policies",
           nativeQuery = true)
    Page<BenefitPolicy> findAllIncludingDeleted(Pageable pageable);

    /**
     * Find all policies for an employer with a specific status
     */
    List<BenefitPolicy> findByStatus(BenefitPolicyStatus status);

    /**
     * Find all active policies with a specific status
     */
    List<BenefitPolicy> findByStatusAndActiveTrue(BenefitPolicyStatus status);

    // ═══════════════════════════════════════════════════════════════════════════
    // GLOBAL UNIQUENESS QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /** Check if a policy name already exists globally */
    boolean existsByNameAndActiveTrue(String name);

    /** Check if a policy name already exists globally (excluding current ID) */
    boolean existsByNameAndIdNotAndActiveTrue(String name, Long excludeId);

    /** Check if a policy code already exists globally */
    boolean existsByPolicyCodeAndActiveTrue(String policyCode);

    /** Check if a policy code already exists globally (excluding current ID) */
    boolean existsByPolicyCodeAndIdNotAndActiveTrue(String policyCode, Long excludeId);

    // ═══════════════════════════════════════════════════════════════════════════
    // EMPLOYER QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all policies for an employer by ID
     */
    List<BenefitPolicy> findByEmployerOrganizationIdAndActiveTrue(Long employerOrgId);

    /**
     * Find all policies for an employer by Name (fallback/diagnostic)
     */
    List<BenefitPolicy> findByEmployerOrganizationNameAndActiveTrue(String employerName);

    /**
     * Find policies for an employer with a specific status
     */
    List<BenefitPolicy> findByEmployerOrganizationIdAndStatusAndActiveTrue(
            Long employerOrgId, BenefitPolicyStatus status);

    /**
     * Find paginated policies for an employer (including inactive/deleted).
     * Use native query to bypass @SQLRestriction.
     */
    @Query(value = "SELECT * FROM (SELECT * FROM benefit_policies) AS bp WHERE bp.employer_org_id = :employerOrgId",
           countQuery = "SELECT COUNT(*) FROM benefit_policies WHERE employer_org_id = :employerOrgId",
           nativeQuery = true)
    Page<BenefitPolicy> findByEmployerOrganizationIdNative(@Param("employerOrgId") Long employerOrgId, Pageable pageable);

    /**
     * Find paginated policies for an employer (active only)
     */
    Page<BenefitPolicy> findByEmployerOrganizationIdAndActiveTrue(Long employerOrgId, Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // DATE-BASED QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find policies effective on a specific date for an employer
     */
    @Query("SELECT bp FROM BenefitPolicy bp " +
           "WHERE bp.employerOrganization.id = :employerOrgId " +
           "AND bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND bp.startDate <= :date " +
           "AND bp.endDate >= :date")
    List<BenefitPolicy> findEffectivePoliciesForEmployer(
            @Param("employerOrgId") Long employerOrgId,
            @Param("date") LocalDate date);

    /**
     * Find active policy for employer on a specific date (should return 0 or 1)
     */
    @Query("SELECT bp FROM BenefitPolicy bp " +
           "WHERE bp.employerOrganization.id = :employerOrgId " +
           "AND bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND bp.startDate <= :date " +
           "AND bp.endDate >= :date " +
           "ORDER BY bp.createdAt DESC")
    Optional<BenefitPolicy> findActiveEffectivePolicyForEmployer(
            @Param("employerOrgId") Long employerOrgId,
            @Param("date") LocalDate date);

    /**
     * Check if there's an overlapping active policy for the employer
     */
    @Query("SELECT COUNT(bp) > 0 FROM BenefitPolicy bp " +
           "WHERE bp.employerOrganization.id = :employerOrgId " +
           "AND bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND bp.id != :excludeId " +
           "AND bp.startDate <= :endDate " +
           "AND bp.endDate >= :startDate")
    boolean existsOverlappingActivePolicy(
            @Param("employerOrgId") Long employerOrgId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeId") Long excludeId);

    /**
     * Check if there's an overlapping active policy (for new policies)
     */
    @Query("SELECT COUNT(bp) > 0 FROM BenefitPolicy bp " +
           "WHERE bp.employerOrganization.id = :employerOrgId " +
           "AND bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND bp.startDate <= :endDate " +
           "AND bp.endDate >= :startDate")
    boolean existsOverlappingActivePolicyNew(
            @Param("employerOrgId") Long employerOrgId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    /**
     * Find overlapping active policies (to auto-deactivate them)
     */
    @Query("SELECT bp FROM BenefitPolicy bp " +
           "WHERE bp.employerOrganization.id = :employerOrgId " +
           "AND bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND (:excludeId IS NULL OR bp.id != :excludeId) " +
           "AND bp.startDate <= :endDate " +
           "AND bp.endDate >= :startDate")
    List<BenefitPolicy> findOverlappingActivePolicies(
            @Param("employerOrgId") Long employerOrgId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeId") Long excludeId);

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH & FILTER QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Search policies by name
     */
    @Query("SELECT bp FROM BenefitPolicy bp " +
           "WHERE bp.active = true AND bp.deleted = false " +
           "AND (LOWER(bp.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(bp.policyCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<BenefitPolicy> searchByNameOrCode(@Param("search") String search, Pageable pageable);

    /**
     * Find policies expiring soon (within N days)
     */
    @Query("SELECT bp FROM BenefitPolicy bp " +
           "WHERE bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND bp.endDate BETWEEN :today AND :futureDate")
    List<BenefitPolicy> findPoliciesExpiringSoon(
            @Param("today") LocalDate today,
            @Param("futureDate") LocalDate futureDate);

    /**
     * Find expired policies that need status update
     */
    @Query("SELECT bp FROM BenefitPolicy bp " +
           "WHERE bp.status = 'ACTIVE' " +
           "AND bp.active = true AND bp.deleted = false " +
           "AND bp.endDate < :today")
    List<BenefitPolicy> findExpiredActivePolicies(@Param("today") LocalDate today);

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Count policies by status
     */
    long countByStatusAndActiveTrue(BenefitPolicyStatus status);
    
    /**
     * Count all active policies
     */
    long countByActiveTrue();

    /**
     * Count policies for an employer
     */
    long countByEmployerOrganizationIdAndActiveTrue(Long employerOrgId);

    /**
     * Find the highest policy code for a given year prefix (for auto-code generation)
     * Example: For prefix "POL-2025-", returns "POL-2025-005" if that's the highest
     */
    @Query("SELECT bp.policyCode FROM BenefitPolicy bp " +
           "WHERE bp.policyCode LIKE CONCAT(:yearPrefix, '%') " +
           "ORDER BY bp.policyCode DESC " +
           "LIMIT 1")
    Optional<String> findMaxPolicyCodeByYearPrefix(@Param("yearPrefix") String yearPrefix);

    /**
     * Find distinct employer IDs that have at least one active (non-deleted) policy.
     * Used for "Has Policy" filter in Employer List.
     */
    @Query("SELECT DISTINCT bp.employerOrganization.id FROM BenefitPolicy bp WHERE bp.active = true")
    List<Long> findDistinctEmployerIdsWithActivePolicies();
}
