package com.waad.tba.modules.member.repository;

import com.waad.tba.modules.member.entity.MemberChronicCondition;
import com.waad.tba.modules.member.enums.ChronicConditionType;
import com.waad.tba.modules.member.enums.ChronicCoverageStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for MemberChronicCondition entity.
 * Provides comprehensive queries for chronic condition management.
 */
@Repository
public interface MemberChronicConditionRepository extends JpaRepository<MemberChronicCondition, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // BASIC QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all conditions for a member
     */
    List<MemberChronicCondition> findByMemberId(Long memberId);

    /**
     * Find all active conditions for a member
     */
    List<MemberChronicCondition> findByMemberIdAndActiveTrue(Long memberId);

    /**
     * Find all conditions for a member - paginated
     */
    Page<MemberChronicCondition> findByMemberId(Long memberId, Pageable pageable);

    /**
     * Find specific condition for a member
     */
    Optional<MemberChronicCondition> findByMemberIdAndConditionType(
            Long memberId, ChronicConditionType conditionType);

    /**
     * Check if member has a specific condition
     */
    boolean existsByMemberIdAndConditionType(Long memberId, ChronicConditionType conditionType);

    /**
     * Check if member has any active chronic conditions
     */
    boolean existsByMemberIdAndActiveTrue(Long memberId);

    /**
     * Count active conditions for a member
     */
    long countByMemberIdAndActiveTrue(Long memberId);

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE STATUS QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find conditions by coverage status
     */
    List<MemberChronicCondition> findByCoverageStatus(ChronicCoverageStatus status);

    /**
     * Find conditions pending review
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.coverageStatus = 'PENDING_REVIEW' AND c.active = true")
    List<MemberChronicCondition> findPendingReview();

    /**
     * Find conditions in waiting period that should be activated
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.coverageStatus = 'WAITING_PERIOD' " +
           "AND c.waitingPeriodEndDate <= :today AND c.active = true")
    List<MemberChronicCondition> findWaitingPeriodEnded(@Param("today") LocalDate today);

    /**
     * Find excluded conditions for a member
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.member.id = :memberId " +
           "AND c.coverageStatus = 'EXCLUDED' AND c.active = true")
    List<MemberChronicCondition> findExcludedConditions(@Param("memberId") Long memberId);

    /**
     * Find covered conditions for a member (all statuses that allow claims)
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.member.id = :memberId " +
           "AND c.coverageStatus IN ('COVERED', 'PARTIAL', 'COVERED_AFTER_WAITING', 'REQUIRES_PRE_APPROVAL', 'LIMITED') " +
           "AND c.active = true")
    List<MemberChronicCondition> findCoveredConditions(@Param("memberId") Long memberId);

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM VALIDATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if a member's condition is covered for claims
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END " +
           "FROM MemberChronicCondition c WHERE c.member.id = :memberId " +
           "AND c.conditionType = :conditionType AND c.active = true " +
           "AND c.coverageStatus IN ('COVERED', 'PARTIAL', 'COVERED_AFTER_WAITING', 'REQUIRES_PRE_APPROVAL', 'LIMITED')")
    boolean isConditionCovered(@Param("memberId") Long memberId, 
                               @Param("conditionType") ChronicConditionType conditionType);

    /**
     * Check if condition requires pre-approval
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END " +
           "FROM MemberChronicCondition c WHERE c.member.id = :memberId " +
           "AND c.conditionType = :conditionType AND c.active = true " +
           "AND c.coverageStatus IN ('REQUIRES_PRE_APPROVAL', 'PARTIAL', 'LIMITED')")
    boolean conditionRequiresPreApproval(@Param("memberId") Long memberId, 
                                         @Param("conditionType") ChronicConditionType conditionType);

    /**
     * Get condition details for claim validation
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.member.id = :memberId " +
           "AND c.conditionType = :conditionType AND c.active = true")
    Optional<MemberChronicCondition> findForClaimValidation(@Param("memberId") Long memberId,
                                                            @Param("conditionType") ChronicConditionType conditionType);

    // ═══════════════════════════════════════════════════════════════════════════
    // EMPLOYER/ORGANIZATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all chronic conditions for members of an employer
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.member.employerOrganization.id = :employerId " +
           "AND c.active = true")
    List<MemberChronicCondition> findByEmployerId(@Param("employerId") Long employerId);

    /**
     * Count chronic conditions by employer
     */
    @Query("SELECT COUNT(c) FROM MemberChronicCondition c WHERE c.member.employerOrganization.id = :employerId " +
           "AND c.active = true")
    long countByEmployerId(@Param("employerId") Long employerId);

    /**
     * Find conditions by employer - paginated
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.member.employerOrganization.id = :employerId " +
           "AND c.active = true")
    Page<MemberChronicCondition> findByEmployerId(@Param("employerId") Long employerId, Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS & REPORTING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Count conditions by type
     */
    @Query("SELECT c.conditionType, COUNT(c) FROM MemberChronicCondition c " +
           "WHERE c.active = true GROUP BY c.conditionType ORDER BY COUNT(c) DESC")
    List<Object[]> countByConditionType();

    /**
     * Count conditions by coverage status
     */
    @Query("SELECT c.coverageStatus, COUNT(c) FROM MemberChronicCondition c " +
           "WHERE c.active = true GROUP BY c.coverageStatus")
    List<Object[]> countByCoverageStatus();

    /**
     * Get total used amount for a condition type
     */
    @Query("SELECT SUM(c.usedAmount) FROM MemberChronicCondition c " +
           "WHERE c.conditionType = :conditionType AND c.active = true")
    BigDecimal sumUsedAmountByConditionType(@Param("conditionType") ChronicConditionType conditionType);

    /**
     * Get top conditions by cost
     */
    @Query("SELECT c.conditionType, SUM(c.usedAmount) as total FROM MemberChronicCondition c " +
           "WHERE c.active = true GROUP BY c.conditionType ORDER BY total DESC")
    List<Object[]> findTopConditionsByCost(Pageable pageable);

    /**
     * Count members with chronic conditions
     */
    @Query("SELECT COUNT(DISTINCT c.member.id) FROM MemberChronicCondition c WHERE c.active = true")
    long countDistinctMembers();

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Search conditions with multiple filters
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.active = true " +
           "AND (:conditionType IS NULL OR c.conditionType = :conditionType) " +
           "AND (:coverageStatus IS NULL OR c.coverageStatus = :coverageStatus) " +
           "AND (:employerId IS NULL OR c.member.employerOrganization.id = :employerId) " +
           "AND (:verified IS NULL OR c.documentationVerified = :verified)")
    Page<MemberChronicCondition> search(
            @Param("conditionType") ChronicConditionType conditionType,
            @Param("coverageStatus") ChronicCoverageStatus coverageStatus,
            @Param("employerId") Long employerId,
            @Param("verified") Boolean verified,
            Pageable pageable);

    /**
     * Find conditions requiring review (pending + unverified)
     */
    @Query("SELECT c FROM MemberChronicCondition c WHERE c.active = true " +
           "AND (c.coverageStatus = 'PENDING_REVIEW' OR c.documentationVerified = false)")
    Page<MemberChronicCondition> findRequiringReview(Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Reset all used amounts (for annual reset)
     */
    @Modifying
    @Query("UPDATE MemberChronicCondition c SET c.usedAmount = 0 WHERE c.active = true")
    int resetAllUsedAmounts();

    /**
     * Reset used amounts for specific employer
     */
    @Modifying
    @Query("UPDATE MemberChronicCondition c SET c.usedAmount = 0 " +
           "WHERE c.member.employerOrganization.id = :employerId AND c.active = true")
    int resetUsedAmountsByEmployer(@Param("employerId") Long employerId);

    /**
     * Update waiting period conditions to covered
     */
    @Modifying
    @Query("UPDATE MemberChronicCondition c SET c.coverageStatus = 'COVERED_AFTER_WAITING' " +
           "WHERE c.coverageStatus = 'WAITING_PERIOD' AND c.waitingPeriodEndDate <= :today AND c.active = true")
    int activateWaitingPeriodConditions(@Param("today") LocalDate today);

    /**
     * Soft delete all conditions for a member
     */
    @Modifying
    @Query("UPDATE MemberChronicCondition c SET c.active = false WHERE c.member.id = :memberId")
    int deactivateByMemberId(@Param("memberId") Long memberId);
}
