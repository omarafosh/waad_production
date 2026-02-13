package com.waad.tba.modules.preauthorization.repository;

import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization.PreAuthStatus;
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
 * Repository for PreAuthorization entity
 */
@Repository
public interface PreAuthorizationRepository extends JpaRepository<PreAuthorization, Long> {

    // ==================== Find All Active ====================

    /**
     * Find all active pre-authorizations (paginated)
     */
    Page<PreAuthorization> findByActiveTrue(Pageable pageable);

    // ==================== Find by Reference Number ====================

    /**
     * Find by reference number
     */
    Optional<PreAuthorization> findByReferenceNumberAndActiveTrue(String referenceNumber);

    /**
     * Check if reference number exists
     */
    boolean existsByReferenceNumber(String referenceNumber);

    // ==================== Find by Member ====================

    /**
     * Find all pre-authorizations for a member
     */
    Page<PreAuthorization> findByMemberIdAndActiveTrue(Long memberId, Pageable pageable);

    /**
     * Find all pre-authorizations for a specific employer (via member)
     */
    @Query("SELECT pa FROM PreAuthorization pa " +
           "LEFT JOIN pa.visit v " +
           "LEFT JOIN v.member m " +
           "WHERE pa.active = true " +
           "AND m.employerOrganization.id = :employerId")
    Page<PreAuthorization> findByMemberEmployerOrganizationIdAndActiveTrue(
            @Param("employerId") Long employerId,
            Pageable pageable
    );

    /**
     * Find pre-authorizations by member and status
     */
    Page<PreAuthorization> findByMemberIdAndStatusAndActiveTrue(
            Long memberId, 
            PreAuthStatus status, 
            Pageable pageable
    );

    /**
     * Count pre-authorizations by member
     */
    long countByMemberIdAndActiveTrue(Long memberId);

    /**
     * Count approved pre-authorizations for member
     */
    long countByMemberIdAndStatusAndActiveTrue(Long memberId, PreAuthStatus status);

    // ==================== Find by Provider ====================

    /**
     * Find all pre-authorizations for a provider
     */
    Page<PreAuthorization> findByProviderIdAndActiveTrue(Long providerId, Pageable pageable);

    /**
     * Find pre-authorizations by provider and status
     */
    Page<PreAuthorization> findByProviderIdAndStatusAndActiveTrue(
            Long providerId, 
            PreAuthStatus status, 
            Pageable pageable
    );

    // ==================== Find by Service ====================

    /**
     * Find pre-authorizations by service code
     */
    Page<PreAuthorization> findByServiceCodeAndActiveTrue(String serviceCode, Pageable pageable);

    // ==================== Find by Status ====================

    /**
     * Find pre-authorizations by single status (active only)
     */
    Page<PreAuthorization> findByStatusAndActiveTrue(PreAuthStatus status, Pageable pageable);

    // ==================== INBOX QUERIES (CANONICAL 2026-01-26) ====================

    /**
     * Find pre-authorizations by status list with pagination (for inbox views).
     * Mirrors ClaimRepository.findByStatusIn() pattern.
     * 
     * CANONICAL: Includes full fetch joins to prevent N+1 queries
     * 
     * @param statuses List of PreAuthStatus values to include
     * @param pageable Pagination information
     * @return Page of PreAuthorizations with related entities fetched
     */
    @Query(value = "SELECT pa FROM PreAuthorization pa " +
           "LEFT JOIN FETCH pa.visit v " +
           "LEFT JOIN FETCH pa.medicalService ms " +
           "WHERE pa.active = true " +
           "AND pa.status IN :statuses",
           countQuery = "SELECT COUNT(pa) FROM PreAuthorization pa WHERE pa.active = true AND pa.status IN :statuses")
    Page<PreAuthorization> findByStatusIn(@Param("statuses") List<PreAuthStatus> statuses, Pageable pageable);

    /**
     * Find pre-authorizations by status list and provider with pagination.
     */
    @Query(value = "SELECT pa FROM PreAuthorization pa " +
           "LEFT JOIN FETCH pa.visit v " +
           "LEFT JOIN FETCH pa.medicalService ms " +
           "WHERE pa.active = true " +
           "AND pa.status IN :statuses " +
           "AND pa.providerId = :providerId",
           countQuery = "SELECT COUNT(pa) FROM PreAuthorization pa WHERE pa.active = true AND pa.status IN :statuses AND pa.providerId = :providerId")
    Page<PreAuthorization> findByStatusInAndProviderIdAndActiveTrue(
            @Param("statuses") List<PreAuthStatus> statuses, 
            @Param("providerId") Long providerId, 
            Pageable pageable
    );

    /**
     * Count pre-authorizations by status list.
     */
    @Query("SELECT COUNT(pa) FROM PreAuthorization pa WHERE pa.active = true AND pa.status IN :statuses")
    long countByStatusIn(@Param("statuses") List<PreAuthStatus> statuses);

    /**
     * Find expired approved pre-authorizations
     */
    @Query("SELECT pa FROM PreAuthorization pa WHERE pa.active = true " +
           "AND pa.status = 'APPROVED' " +
           "AND pa.expiryDate < :currentDate")
    List<PreAuthorization> findExpiredPreAuthorizations(@Param("currentDate") LocalDate currentDate);

    // ==================== Find by Date Range ====================

    /**
     * Find pre-authorizations by request date range
     */
    @Query("SELECT pa FROM PreAuthorization pa WHERE pa.active = true " +
           "AND pa.requestDate BETWEEN :startDate AND :endDate " +
           "ORDER BY pa.requestDate DESC")
    Page<PreAuthorization> findByRequestDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );

    // ==================== Complex Queries ====================

    /**
     * Find valid pre-authorizations for member + provider + service
     */
    @Query("SELECT pa FROM PreAuthorization pa WHERE pa.active = true " +
           "AND pa.memberId = :memberId " +
           "AND pa.providerId = :providerId " +
           "AND pa.serviceCode = :serviceCode " +
           "AND pa.status = 'APPROVED' " +
           "AND (pa.expiryDate IS NULL OR pa.expiryDate >= :currentDate) " +
           "ORDER BY pa.createdAt DESC")
    List<PreAuthorization> findValidPreAuthorizations(
            @Param("memberId") Long memberId,
            @Param("providerId") Long providerId,
            @Param("serviceCode") String serviceCode,
            @Param("currentDate") LocalDate currentDate
    );

    /**
     * Find pre-authorizations expiring within days
     */
    @Query("SELECT pa FROM PreAuthorization pa WHERE pa.active = true " +
           "AND pa.status = 'APPROVED' " +
           "AND pa.expiryDate BETWEEN :currentDate AND :expiryDate")
    List<PreAuthorization> findPreAuthsExpiringWithinDays(
            @Param("currentDate") LocalDate currentDate,
            @Param("expiryDate") LocalDate expiryDate
    );

    // ==================== Statistics ====================

    /**
     * Count pre-authorizations by status
     */
    @Query("SELECT pa.status, COUNT(pa) FROM PreAuthorization pa " +
           "WHERE pa.active = true " +
           "GROUP BY pa.status")
    List<Object[]> countByStatus();

    /**
     * Sum approved amounts by status
     */
    @Query("SELECT pa.status, SUM(pa.approvedAmount), COUNT(pa) " +
           "FROM PreAuthorization pa " +
           "WHERE pa.active = true " +
           "GROUP BY pa.status")
    List<Object[]> sumAmountsByStatus();

    /**
     * Get statistics for date range
     * CANONICAL (2026-01-16): Use contractPrice instead of requestedAmount
     */
    @Query("SELECT " +
           "COUNT(pa), " +
           "SUM(pa.contractPrice), " +
           "SUM(pa.approvedAmount), " +
           "SUM(pa.copayAmount), " +
           "SUM(pa.insuranceCoveredAmount) " +
           "FROM PreAuthorization pa " +
           "WHERE pa.active = true " +
           "AND pa.requestDate BETWEEN :startDate AND :endDate")
    Object[] getStatisticsForDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ==================== Priority Queries ====================

    /**
     * Find emergency/urgent pre-authorizations
     */
    @Query("SELECT pa FROM PreAuthorization pa WHERE pa.active = true " +
           "AND pa.status = 'PENDING' " +
           "AND pa.priority IN ('EMERGENCY', 'URGENT') " +
           "ORDER BY " +
           "CASE pa.priority " +
           "  WHEN 'EMERGENCY' THEN 1 " +
           "  WHEN 'URGENT' THEN 2 " +
           "  ELSE 3 " +
           "END, " +
           "pa.createdAt ASC")
    List<PreAuthorization> findHighPriorityPending();

    // ==================== Search ====================

    /**
     * Search pre-authorizations
     */
    @Query("SELECT pa FROM PreAuthorization pa WHERE pa.active = true " +
           "AND (LOWER(pa.referenceNumber) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(pa.diagnosisDescription) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(pa.notes) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<PreAuthorization> search(@Param("query") String query, Pageable pageable);

    // ==================== Find by Visit (NEW FLOW 2026-01-13) ====================

    /**
     * Find pre-authorizations by visit ID
     */
    List<PreAuthorization> findByVisitIdAndActiveTrue(Long visitId);

    /**
     * Count pre-authorizations for a visit
     */
    long countByVisitIdAndActiveTrue(Long visitId);
}
