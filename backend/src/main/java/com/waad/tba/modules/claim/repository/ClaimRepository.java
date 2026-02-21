package com.waad.tba.modules.claim.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.waad.tba.modules.claim.entity.Claim;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {

       // ═══════════════════════════════════════════════════════════════════════════════
       // FINANCIAL CLOSURE: PESSIMISTIC LOCKING FOR ALL FINANCIAL OPERATIONS
       // ═══════════════════════════════════════════════════════════════════════════════
       // Use SELECT ... FOR UPDATE to prevent double settlement, double approval,
       // and race conditions. This is MANDATORY for financial integrity.
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Find claim by ID with pessimistic write lock (SELECT ... FOR UPDATE).
        * MANDATORY for ALL financial state changes: approve, reject, settle.
        * 
        * @param id Claim ID
        * @return Claim with exclusive lock held until transaction commits
        */
       @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
       @Query("SELECT c FROM Claim c WHERE c.id = :id")
       java.util.Optional<Claim> findByIdForUpdate(@Param("id") Long id);

       /**
        * Find claim by ID with pessimistic write lock AND full fetch joins.
        * MANDATORY for approval operations that need member and benefit policy data.
        * Prevents N+1 queries while maintaining financial locking.
        * 
        * @param id Claim ID
        * @return Claim with exclusive lock and eagerly loaded relationships
        */
       @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "LEFT JOIN FETCH c.lines cl " +
                     "LEFT JOIN FETCH cl.medicalService ms " +
                     "WHERE c.id = :id")
       java.util.Optional<Claim> findByIdForFinancialUpdate(@Param("id") Long id);

       /**
        * Find claim by ID with full fetch joins for viewing details.
        * Prevents N+1 queries in ClaimMapper.toViewDto()
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.employerOrganization eo " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.visit v " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "LEFT JOIN FETCH c.lines cl " +
                     "LEFT JOIN FETCH cl.medicalService ms " +
                     "LEFT JOIN FETCH c.attachments " +
                     "WHERE c.id = :id")
       java.util.Optional<Claim> findByIdWithDetails(@Param("id") Long id);

       /**
        * PHASE 5.B: Enhanced with full fetch joins for member.benefitPolicy and
        * insuranceOrganization
        * to avoid N+1 queries in ClaimMapper.toViewDto()
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND (LOWER(c.providerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(c.diagnosisDescription) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(m.civilId) LIKE LOWER(CONCAT('%', :keyword, '%')))")
       Page<Claim> searchPaged(@Param("keyword") String keyword, Pageable pageable);

       /**
        * Search claims with pagination filtered by employer ID.
        * PHASE 5.B: Enhanced with full fetch joins
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH m.employerOrganization e " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND m.employerOrganization.id = :employerId " +
                     "AND (LOWER(c.providerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(c.diagnosisDescription) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(m.civilId) LIKE LOWER(CONCAT('%', :keyword, '%')))")
       Page<Claim> searchPagedByEmployerId(@Param("keyword") String keyword, @Param("employerId") Long employerId,
                     Pageable pageable);

       /**
        * Search claims with pagination filtered by provider ID.
        * PHASE 6: Added for Provider Portal
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH m.employerOrganization e " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND (LOWER(c.providerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(c.diagnosisDescription) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
                     "OR LOWER(m.civilId) LIKE LOWER(CONCAT('%', :keyword, '%')))")
       Page<Claim> searchPagedByProviderId(@Param("keyword") String keyword, @Param("providerId") Long providerId,
                     Pageable pageable);

       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "WHERE c.active = true " +
                     "AND (LOWER(c.providerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(c.diagnosisDescription) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')))")
       List<Claim> search(@Param("query") String query);

       /**
        * Search claims (non-paginated) filtered by employer ID.
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "WHERE c.active = true " +
                     "AND m.employerOrganization.id = :employerId " +
                     "AND (LOWER(c.providerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(c.diagnosisDescription) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')))")
       List<Claim> searchByEmployerId(@Param("query") String query, @Param("employerId") Long employerId);

       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member " +
                     "LEFT JOIN FETCH c.preAuthorization " +
                     "WHERE c.member.id = :memberId AND c.active = true")
       List<Claim> findByMemberId(@Param("memberId") Long memberId);

       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member " +
                     "LEFT JOIN FETCH c.preAuthorization " +
                     "WHERE c.preAuthorization.id = :preAuthorizationId AND c.active = true")
       List<Claim> findByPreAuthorizationId(@Param("preAuthorizationId") Long preAuthorizationId);

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true")
       long countActive();

       /**
        * Count claims filtered by employer ID.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.member.employerOrganization.id = :employerId")
       long countByMemberEmployerId(@Param("employerId") Long employerId);

       /**
        * Find claims by member ID and status list.
        * Used for deductible and out-of-pocket calculations.
        * 
        * @param memberId The member ID
        * @param statuses List of claim statuses to include
        * @return List of matching claims
        */
       @Query("SELECT c FROM Claim c " +
                     "WHERE c.member.id = :memberId " +
                     "AND c.status IN :statuses " +
                     "AND c.active = true")
       List<Claim> findByMemberIdAndStatusIn(@Param("memberId") Long memberId,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses);

       /**
        * Count claims by member ID and status list.
        * Used for lifecycle validation.
        */
       @Query("SELECT COUNT(c) FROM Claim c " +
                     "WHERE c.member.id = :memberId " +
                     "AND c.status IN :statuses " +
                     "AND c.active = true")
       long countByMemberIdAndStatusIn(@Param("memberId") Long memberId,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses);

       // ═══════════════════════════════════════════════════════════════════════════════
       // MVP PHASE: Inbox Queries
       // PHASE 5.B: Enhanced with full fetch joins to avoid N+1 in DTO mapping
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Find claims by status list with pagination (for inbox views).
        * PHASE 5.B: Full fetch joins for member, benefitPolicy, insuranceOrganization
        * FIXED: Added countQuery to fix "Streamable to Page" conversion error
        */
       @Query(value = "SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.status IN :statuses", countQuery = "SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.status IN :statuses")
       Page<Claim> findByStatusIn(@Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     Pageable pageable);

       /**
        * Find claims by single status with pagination.
        * PHASE 5.B: Full fetch joins for member, benefitPolicy, insuranceOrganization
        * FIXED: Added countQuery to fix "Streamable to Page" conversion error
        */
       @Query(value = "SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.status = :status", countQuery = "SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.status = :status")
       Page<Claim> findByStatus(@Param("status") com.waad.tba.modules.claim.entity.ClaimStatus status,
                     Pageable pageable);

       /**
        * Count claims by status.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.status = :status")
       long countByStatus(@Param("status") com.waad.tba.modules.claim.entity.ClaimStatus status);

       /**
        * Count claims by status list.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.status IN :statuses")
       long countByStatusIn(@Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses);

       // ═══════════════════════════════════════════════════════════════════════════════
       // PROVIDER FILTERING METHODS
       // ADDED 2026-01-05: For PROVIDER role to see only their own claims
       // Global Best Practice: Healthcare providers should only access their claims
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Search claims (non-paginated) filtered by provider ID.
        * Used by PROVIDER role to search within their own claims.
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND (LOWER(c.providerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(c.diagnosisDescription) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
                     "OR LOWER(m.civilId) LIKE LOWER(CONCAT('%', :query, '%')))")
       List<Claim> searchByProviderId(@Param("query") String query, @Param("providerId") Long providerId);

       /**
        * Find all claims for a specific provider (non-paginated).
        * Used by PROVIDER role to view all their claims.
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId")
       List<Claim> findByProviderId(@Param("providerId") Long providerId);

       /**
        * Find all active claims for a provider (for documents aggregation)
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "WHERE c.active = true AND c.providerId = :providerId " +
                     "ORDER BY c.serviceDate DESC")
       List<Claim> findByProviderIdAndActiveTrue(@Param("providerId") Long providerId);

       /**
        * Find claims for settlement report with optimized filtering at DB level.
        * PERFORMANCE CRITICAL: All filtering done in database, not in memory.
        * 
        * @param providerId Provider ID (required)
        * @param statuses   List of claim statuses to include
        * @param fromDate   Service date from (inclusive)
        * @param toDate     Service date to (inclusive)
        * @return List of claims with member and preAuth eagerly loaded
        */
       @Query("SELECT DISTINCT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "LEFT JOIN FETCH c.lines cl " +
                     "LEFT JOIN FETCH cl.medicalService ms " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.status IN :statuses " +
                     "AND c.serviceDate >= :fromDate " +
                     "AND c.serviceDate <= :toDate " +
                     "ORDER BY c.serviceDate ASC")
       List<Claim> findForSettlementReport(
                     @Param("providerId") Long providerId,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     @Param("fromDate") java.time.LocalDate fromDate,
                     @Param("toDate") java.time.LocalDate toDate);

       /**
        * Count claims for settlement report (for validation/statistics).
        */
       @Query("SELECT COUNT(c) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.status IN :statuses " +
                     "AND c.serviceDate >= :fromDate " +
                     "AND c.serviceDate <= :toDate")
       long countForSettlementReport(
                     @Param("providerId") Long providerId,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     @Param("fromDate") java.time.LocalDate fromDate,
                     @Param("toDate") java.time.LocalDate toDate);

       /**
        * Get settlement totals directly from database (NO entity loading).
        * CANONICAL: All financial calculations in database for accuracy.
        * 
        * Returns: [totalRequested, totalApproved, totalCoPay, count]
        */
       @Query("SELECT " +
                     "COALESCE(SUM(c.requestedAmount), 0), " +
                     "COALESCE(SUM(c.approvedAmount), 0), " +
                     "COALESCE(SUM(c.patientCoPay), 0), " +
                     "COUNT(c) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.status IN :statuses " +
                     "AND c.serviceDate >= :fromDate " +
                     "AND c.serviceDate <= :toDate")
       List<Object[]> getSettlementTotals(
                     @Param("providerId") Long providerId,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     @Param("fromDate") java.time.LocalDate fromDate,
                     @Param("toDate") java.time.LocalDate toDate);

       /**
        * Count claims by provider ID.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.providerId = :providerId")
       long countByProviderId(@Param("providerId") Long providerId);

       /**
        * Find claims by provider ID and status with pagination.
        * Used by PROVIDER role to filter their claims by status.
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.status = :status")
       Page<Claim> findByProviderIdAndStatus(@Param("providerId") Long providerId,
                     @Param("status") com.waad.tba.modules.claim.entity.ClaimStatus status,
                     Pageable pageable);

       /**
        * Find claims by provider ID and status LIST with pagination.
        * Used by PROVIDER role to filter their inbox (e.g. SUBMITTED + UNDER_REVIEW).
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.status IN :statuses")
       Page<Claim> findByProviderIdAndStatusIn(@Param("providerId") Long providerId,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     Pageable pageable);

       // ═══════════════════════════════════════════════════════════════════════════════
       // DASHBOARD STATISTICS QUERIES (Phase A)
       // Aggregations using JPQL - No Lazy Loading, No Entities returned
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Count claims by status (aggregation)
        */
       @Query("SELECT c.status, COUNT(c) FROM Claim c WHERE c.active = true GROUP BY c.status")
       List<Object[]> countByStatusGrouped();

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.SUBMITTED, com.waad.tba.modules.claim.entity.ClaimStatus.UNDER_REVIEW)")
       long countOpenClaims();

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       long countApprovedClaims();

       /**
        * Sum total approved amounts
        */
       @Query("SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Claim c " +
                     "WHERE c.active = true AND c.approvedAmount IS NOT NULL")
       java.math.BigDecimal sumApprovedAmounts();

       /**
        * Get monthly trends (claims count per month)
        * Returns: [year, month, count]
        */
       @Query("SELECT YEAR(c.createdAt) as year, MONTH(c.createdAt) as month, COUNT(c) as count " +
                     "FROM Claim c WHERE c.active = true " +
                     "AND c.createdAt >= :startDate " +
                     "AND c.createdAt <= :endDate " +
                     "GROUP BY YEAR(c.createdAt), MONTH(c.createdAt) " +
                     "ORDER BY year, month")
       List<Object[]> getMonthlyTrends(@Param("startDate") java.time.LocalDateTime startDate,
                     @Param("endDate") java.time.LocalDateTime endDate);

       /**
        * Inbox stats calculations
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.status IN :statuses " +
                     "AND (:providerId IS NULL OR c.providerId = :providerId)")
       long countInboxClaims(@Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     @Param("providerId") Long providerId);

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.status = :status " +
                     "AND (:providerId IS NULL OR c.providerId = :providerId)")
       long countInboxClaimsByStatus(@Param("status") com.waad.tba.modules.claim.entity.ClaimStatus status,
                     @Param("providerId") Long providerId);

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.createdAt >= :startOfDay " +
                     "AND c.status IN :statuses " +
                     "AND (:providerId IS NULL OR c.providerId = :providerId)")
       long countInboxClaimsToday(@Param("startOfDay") java.time.LocalDateTime startOfDay,
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     @Param("providerId") Long providerId);

       @Query("SELECT COALESCE(SUM(c.requestedAmount), 0) FROM Claim c WHERE c.active = true " +
                     "AND c.status IN :statuses " +
                     "AND (:providerId IS NULL OR c.providerId = :providerId)")
       java.math.BigDecimal sumInboxClaimsRequestedAmount(
                     @Param("statuses") List<com.waad.tba.modules.claim.entity.ClaimStatus> statuses,
                     @Param("providerId") Long providerId);

       /**
        * Get costs by provider (aggregated)
        * Returns: [providerId, providerName, totalCost, claimCount]
        */
       @Query("SELECT c.providerId, c.providerName, " +
                     "COALESCE(SUM(c.approvedAmount), 0) as totalCost, " +
                     "COUNT(c) as claimCount " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.approvedAmount IS NOT NULL " +
                     "GROUP BY c.providerId, c.providerName " +
                     "ORDER BY totalCost DESC")
       List<Object[]> getCostsByProvider();

       /**
        * Get service distribution (aggregated by provider name)
        * Since Claim entity doesn't have serviceType/serviceName,
        * we aggregate by provider which is available
        * Returns: [providerName, count]
        */
       @Query("SELECT COALESCE(c.providerName, 'غير محدد') as providerName, " +
                     "COUNT(c) as count " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "GROUP BY c.providerName " +
                     "ORDER BY count DESC")
       List<Object[]> getServiceDistribution();

       /**
        * Get recent claims (for dashboard recent activities)
        * Returns: [id, member.fullName, diagnosis, status, createdAt]
        */
       @Query("SELECT c.id, " +
                     "c.member.fullName as memberName, " +
                     "c.diagnosisDescription, " +
                     "c.status, " +
                     "c.createdAt " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "ORDER BY c.createdAt DESC")
       List<Object[]> getRecentClaims(Pageable pageable);

       /**
        * Count claims created in date range (for growth calculation)
        */
       @Query("SELECT COUNT(c) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.createdAt >= :startDate " +
                     "AND c.createdAt < :endDate")
       long countClaimsInDateRange(@Param("startDate") java.time.LocalDateTime startDate,
                     @Param("endDate") java.time.LocalDateTime endDate);

       // ═══════════════════════════════════════════════════════════════════════════════
       // EMPLOYER-FILTERED DASHBOARD QUERIES (Phase A)
       // Used when dashboard is filtered by specific employer organization
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Count claims by member's employer organization ID
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.member.employerOrganization.id = :employerOrgId")
       long countByMemberEmployerOrganizationId(@Param("employerOrgId") Long employerOrgId);

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.SUBMITTED, com.waad.tba.modules.claim.entity.ClaimStatus.UNDER_REVIEW)")
       long countOpenClaimsByEmployer(@Param("employerOrgId") Long employerOrgId);

       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       long countApprovedClaimsByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Sum total approved amounts by employer organization
        */
       @Query("SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.approvedAmount IS NOT NULL")
       java.math.BigDecimal sumApprovedAmountsByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Get monthly trends (claims count per month) filtered by employer organization
        * Returns: [year, month, count]
        */
       @Query("SELECT YEAR(c.createdAt) as year, MONTH(c.createdAt) as month, COUNT(c) as count " +
                     "FROM Claim c WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.createdAt >= :startDate " +
                     "AND c.createdAt <= :endDate " +
                     "GROUP BY YEAR(c.createdAt), MONTH(c.createdAt) " +
                     "ORDER BY year, month")
       List<Object[]> getMonthlyTrendsByEmployer(@Param("startDate") java.time.LocalDateTime startDate,
                     @Param("endDate") java.time.LocalDateTime endDate,
                     @Param("employerOrgId") Long employerOrgId);

       /**
        * Count claims created in date range by employer organization (for growth
        * calculation)
        */
       @Query("SELECT COUNT(c) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.createdAt >= :startDate " +
                     "AND c.createdAt < :endDate")
       long countClaimsInDateRangeByEmployer(@Param("startDate") java.time.LocalDateTime startDate,
                     @Param("endDate") java.time.LocalDateTime endDate,
                     @Param("employerOrgId") Long employerOrgId);

       // ═══════════════════════════════════════════════════════════════════════════
       // PHASE 1: SLA TRACKING QUERIES
       // ═══════════════════════════════════════════════════════════════════════════

       /**
        * Find claims that exceeded SLA (businessDaysTaken > slaDaysConfigured).
        * Used for SLA compliance reporting and alerts.
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "WHERE c.active = true " +
                     "AND c.withinSla = false " +
                     "AND c.businessDaysTaken IS NOT NULL")
       List<Claim> findClaimsExceededSla();

       /**
        * Find claims approaching deadline (expected completion within N days).
        * Used for daily SLA monitoring and reviewer alerts.
        * 
        * @param fromDate Start of date range (typically today)
        * @param toDate   End of date range (typically today + 2 days)
        * @return Claims in UNDER_REVIEW status with deadline approaching
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "WHERE c.active = true " +
                     "AND c.status = 'UNDER_REVIEW' " +
                     "AND c.expectedCompletionDate BETWEEN :fromDate AND :toDate")
       List<Claim> findClaimsApproachingDeadline(@Param("fromDate") java.time.LocalDate fromDate,
                     @Param("toDate") java.time.LocalDate toDate);

       /**
        * Calculate average processing time (business days) for completed claims.
        * Used for SLA metrics dashboard.
        */
       @Query("SELECT AVG(c.businessDaysTaken) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.businessDaysTaken IS NOT NULL")
       Double getAverageProcessingDays();

       /**
        * Calculate SLA compliance rate (percentage of claims completed within SLA).
        * Returns value between 0-100.
        */
       @Query("SELECT CAST(COUNT(CASE WHEN c.withinSla = true THEN 1 END) AS double) * 100.0 / " +
                     "CAST(COUNT(c) AS double) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.withinSla IS NOT NULL")
       Double getSlaComplianceRate();

       /**
        * Count claims by SLA status.
        * Returns: [withinSla=true count, withinSla=false count]
        */
       @Query("SELECT c.withinSla, COUNT(c) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.withinSla IS NOT NULL " +
                     "GROUP BY c.withinSla")
       List<Object[]> countBySlStatus();

       /**
        * Find claims in UNDER_REVIEW with no expected completion date set.
        * Indicates data integrity issue (claims submitted before SLA feature was
        * enabled).
        */
       @Query("SELECT c FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.status = 'UNDER_REVIEW' " +
                     "AND c.expectedCompletionDate IS NULL")
       List<Claim> findUnderReviewWithoutSla();

       /**
        * Calculate average SLA days configured across all claims.
        * Useful to track changes in system SLA setting over time.
        */
       @Query("SELECT AVG(c.slaDaysConfigured) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.slaDaysConfigured IS NOT NULL")
       Double getAverageSlaDaysConfigured();

       // ═══════════════════════════════════════════════════════════════════════════
       // PHASE 1: SERVICE TIMES LIMIT TRACKING QUERIES
       // ═══════════════════════════════════════════════════════════════════════════

       /**
        * DEPRECATED: serviceCategoryId field doesn't exist in Claim entity.
        * This query has been disabled. Use alternative approach with ClaimLines.
        * 
        * 
        * @deprecated serviceCategoryId removed from schema - use ClaimLine-based
        *             counting
        */
       @Deprecated
       default long countApprovedClaimsByMemberAndServiceInPeriod(
                     Long memberId,
                     Long serviceCategoryId,
                     LocalDate startDate,
                     LocalDate endDate) {
              // Temporarily returns 0 - service category tracking removed
              return 0L;
       }

       /**
        * DEPRECATED: Needs refactoring after schema changes.
        * Temporarily returns 0 to allow server startup.
        * 
        */
       // @Query disabled - serviceCode field doesn't exist in Claim entity
       default long countPendingAndApprovedClaimsByMemberAndServiceInPeriod(
                     Long memberId,
                     String serviceCode,
                     LocalDate startDate,
                     LocalDate endDate) {
              return 0L; // Temporarily disabled
       }

       // ═══════════════════════════════════════════════════════════════════════════════
       // VISIT-BASED QUERIES (Added 2026-01-14)
       // For Contract-First compliance
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Find claims by Visit ID.
        * Used to retrieve all claims associated with a specific visit.
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.visit.id = :visitId")
       List<Claim> findByVisitId(@Param("visitId") Long visitId);

       /**
        * Find claim by claim number (unique identifier).
        */
       @Query("SELECT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.insuranceOrganization io " +
                     "LEFT JOIN FETCH c.preAuthorization pa " +
                     "WHERE c.active = true " +
                     "AND c.id = :claimNumber")
       java.util.Optional<Claim> findByClaimNumber(@Param("claimNumber") Long claimNumber);

       // ═══════════════════════════════════════════════════════════════════════════════
       // TICKET 1: ANNUAL LIMIT CONSUMPTION TRACKING (Phase Lite)
       // Sum APPROVED claims for member by benefit year
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Sum approved amounts for a specific member in a given year.
        * Uses only APPROVED and SETTLED claims for accurate consumption tracking.
        * 
        * @param memberId  The member ID
        * @param yearStart Start of the benefit year (e.g., 2026-01-01)
        * @param yearEnd   End of the benefit year (e.g., 2026-12-31)
        * @return Total approved amount for the member in that period (NULL-safe,
        *         defaults to 0)
        */
       @Query("SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.id = :memberId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED) "
                     +
                     "AND c.serviceDate >= :yearStart " +
                     "AND c.serviceDate <= :yearEnd")
       java.math.BigDecimal sumApprovedAmountsByMemberAndYear(
                     @Param("memberId") Long memberId,
                     @Param("yearStart") LocalDate yearStart,
                     @Param("yearEnd") LocalDate yearEnd);

       // ═══════════════════════════════════════════════════════════════════════════════
       // PHASE 6: Provider Portal Queries
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Count open claims filtered by provider ID.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.providerId = :providerId AND (c.status = com.waad.tba.modules.claim.entity.ClaimStatus.DRAFT OR c.status = com.waad.tba.modules.claim.entity.ClaimStatus.SUBMITTED OR c.status = com.waad.tba.modules.claim.entity.ClaimStatus.UNDER_REVIEW OR c.status = com.waad.tba.modules.claim.entity.ClaimStatus.RETURNED_FOR_INFO)")
       long countOpenClaimsByProvider(@Param("providerId") Long providerId);

       /**
        * Count approved claims filtered by provider ID.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.providerId = :providerId AND c.status = com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED")
       long countApprovedClaimsByProvider(@Param("providerId") Long providerId);

       /**
        * Sum approved amounts filtered by provider ID.
        */
       @Query("SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Claim c WHERE c.active = true AND c.providerId = :providerId AND c.status = com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED")
       java.math.BigDecimal sumApprovedAmountsByProvider(@Param("providerId") Long providerId);

       /**
        * Get recent claims by provider ID.
        */
       @Query("SELECT c.id, c.member.fullName as memberName, c.diagnosisDescription, c.status, c.createdAt FROM Claim c WHERE c.active = true AND c.providerId = :providerId ORDER BY c.createdAt DESC")
       List<Object[]> getRecentClaimsByProvider(@Param("providerId") Long providerId, Pageable pageable);

       // ═══════════════════════════════════════════════════════════════════════════════
       // FINANCIAL SUMMARY QUERIES (SINGLE SOURCE OF TRUTH)
       // ═══════════════════════════════════════════════════════════════════════════════
       // ALL financial aggregations MUST use these queries.
       // Frontend is FORBIDDEN from calculating totals.
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Sum total requested amounts across all active claims.
        * 
        * @return SUM(requestedAmount) - COALESCE handles NULL safety
        */
       @Query("SELECT COALESCE(SUM(c.requestedAmount), 0) FROM Claim c WHERE c.active = true")
       java.math.BigDecimal sumTotalRequestedAmounts();

       /**
        * Sum total requested amounts filtered by employer.
        */
       @Query("SELECT COALESCE(SUM(c.requestedAmount), 0) FROM Claim c " +
                     "WHERE c.active = true AND c.member.employerOrganization.id = :employerOrgId")
       java.math.BigDecimal sumTotalRequestedAmountsByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Sum total approved amounts filtered by employer.
        * Only includes APPROVED and SETTLED status claims.
        */
       @Query("SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       java.math.BigDecimal sumApprovedAmountsForApprovedSettledByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Sum total patient co-pay amounts.
        */
       @Query("SELECT COALESCE(SUM(c.patientCoPay), 0) FROM Claim c WHERE c.active = true")
       java.math.BigDecimal sumTotalPatientCoPay();

       /**
        * Sum total patient co-pay amounts filtered by employer.
        */
       @Query("SELECT COALESCE(SUM(c.patientCoPay), 0) FROM Claim c " +
                     "WHERE c.active = true AND c.member.employerOrganization.id = :employerOrgId")
       java.math.BigDecimal sumTotalPatientCoPayByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Sum net provider amounts (amount owed to providers).
        * Falls back to approvedAmount if netProviderAmount is null.
        */
       @Query("SELECT COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       java.math.BigDecimal sumTotalNetProviderAmounts();

       /**
        * Sum net provider amounts filtered by employer.
        */
       /**
        * Sum net provider amounts filtered by employer.
        */
       @Query("SELECT COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       java.math.BigDecimal sumNetProviderAmountsByEmployer(@Param("employerOrgId") Long employerOrgId);

       // ═══════════════════════════════════════════════════════════════════════════════
       // LIFECYCLE MANAGEMENT QUERIES
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Count active claims associated with a specific benefit policy.
        * Used by Lifecycle Manager to determine if a policy can be CANCELLED or
        * TERMINATED.
        */
       @Query("SELECT COUNT(c) FROM Claim c WHERE c.active = true AND c.member.benefitPolicy.id = :policyId")
       long countByMemberBenefitPolicyId(@Param("policyId") Long policyId);

       /**
        * Sum total net provider amounts by employer (used by Lifecycle Manager).
        */
       @Query("SELECT COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       java.math.BigDecimal sumTotalNetProviderAmountsByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Sum settled amounts (only SETTLED status).
        */
       @Query("SELECT COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) FROM Claim c " +
                     "WHERE c.active = true AND c.status = com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED")
       java.math.BigDecimal sumTotalSettledAmounts();

       /**
        * Sum settled amounts filtered by employer.
        */
       @Query("SELECT COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status = com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED")
       java.math.BigDecimal sumTotalSettledAmountsByEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Sum difference amounts (requested - approved).
        */
       @Query("SELECT COALESCE(SUM(c.differenceAmount), 0) FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       java.math.BigDecimal sumTotalDifferenceAmounts();

       /**
        * Financial summary by provider - AUTHORITATIVE aggregation.
        * Returns: [providerId, providerName, claimsCount, requestedAmount,
        * approvedAmount, patientCoPay, netProviderAmount]
        */
       @Query("SELECT c.providerId, c.providerName, " +
                     "COUNT(c), " +
                     "COALESCE(SUM(c.requestedAmount), 0), " +
                     "COALESCE(SUM(c.approvedAmount), 0), " +
                     "COALESCE(SUM(c.patientCoPay), 0), " +
                     "COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED) "
                     +
                     "GROUP BY c.providerId, c.providerName " +
                     "ORDER BY COALESCE(SUM(c.approvedAmount), 0) DESC")
       List<Object[]> getFinancialSummaryByProvider();

       /**
        * Financial summary by provider filtered by employer.
        */
       @Query("SELECT c.providerId, c.providerName, " +
                     "COUNT(c), " +
                     "COALESCE(SUM(c.requestedAmount), 0), " +
                     "COALESCE(SUM(c.approvedAmount), 0), " +
                     "COALESCE(SUM(c.patientCoPay), 0), " +
                     "COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED) "
                     +
                     "GROUP BY c.providerId, c.providerName " +
                     "ORDER BY COALESCE(SUM(c.approvedAmount), 0) DESC")
       List<Object[]> getFinancialSummaryByProviderAndEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Financial summary by status - for pie charts and status breakdown.
        * Returns: [status, count, totalRequestedAmount, totalApprovedAmount]
        */
       @Query("SELECT c.status, COUNT(c), " +
                     "COALESCE(SUM(c.requestedAmount), 0), " +
                     "COALESCE(SUM(c.approvedAmount), 0) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "GROUP BY c.status")
       List<Object[]> getFinancialSummaryByStatus();

       /**
        * Financial summary by status filtered by employer.
        */
       @Query("SELECT c.status, COUNT(c), " +
                     "COALESCE(SUM(c.requestedAmount), 0), " +
                     "COALESCE(SUM(c.approvedAmount), 0) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization.id = :employerOrgId " +
                     "GROUP BY c.status")
       List<Object[]> getFinancialSummaryByStatusAndEmployer(@Param("employerOrgId") Long employerOrgId);

       /**
        * Financial summary by employer organization.
        * Returns: [employerOrgId, employerOrgName, claimsCount, membersCount,
        * requestedAmount, approvedAmount]
        */
       @Query("SELECT c.member.employerOrganization.id, c.member.employerOrganization.name, " +
                     "COUNT(c), " +
                     "COUNT(DISTINCT c.member.id), " +
                     "COALESCE(SUM(c.requestedAmount), 0), " +
                     "COALESCE(SUM(c.approvedAmount), 0) " +
                     "FROM Claim c " +
                     "WHERE c.active = true " +
                     "AND c.member.employerOrganization IS NOT NULL " +
                     "GROUP BY c.member.employerOrganization.id, c.member.employerOrganization.name " +
                     "ORDER BY COALESCE(SUM(c.approvedAmount), 0) DESC")
       List<Object[]> getFinancialSummaryByEmployer();

       // ═══════════════════════════════════════════════════════════════════════════════
       // PDF REPORT QUERIES (Added 2026-02-04)
       // For Provider Invoice PDF Reports
       // ═══════════════════════════════════════════════════════════════════════════════

       /**
        * Find all claims for a provider within a date range.
        * Used for Provider Invoice PDF Reports.
        * 
        * @param providerId Provider ID
        * @param fromDate   Start date (inclusive)
        * @param toDate     End date (inclusive)
        * @return List of claims with member and lines eagerly loaded
        */
       @Query("SELECT DISTINCT c FROM Claim c " +
                     "LEFT JOIN FETCH c.member m " +
                     "LEFT JOIN FETCH m.benefitPolicy bp " +
                     "LEFT JOIN FETCH c.lines cl " +
                     "WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.serviceDate >= :fromDate " +
                     "AND c.serviceDate <= :toDate " +
                     "ORDER BY c.serviceDate DESC")
       List<Claim> findByProviderIdAndServiceDateBetween(
                     @Param("providerId") Long providerId,
                     @Param("fromDate") java.time.LocalDate fromDate,
                     @Param("toDate") java.time.LocalDate toDate);

       /**
        * Calculate total approved amount for a benefit policy.
        * Used for policy usage tracking.
        */
       @Query("SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Claim c " +
                     "WHERE c.member.benefitPolicy.id = :policyId " +
                     "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, " +
                     "                 com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED)")
       java.math.BigDecimal sumApprovedAmountByPolicyId(@Param("policyId") Long policyId);

       /**
        * Bulk update claim status by IDs.
        * Used by SettlementBatchService when a batch is PAID.
        */
       @org.springframework.data.jpa.repository.Modifying
       @org.springframework.data.jpa.repository.Query("UPDATE Claim c SET c.status = :status WHERE c.id IN :ids")
       void updateStatusForClaims(@org.springframework.data.repository.query.Param("ids") java.util.List<Long> ids,
                     @org.springframework.data.repository.query.Param("status") com.waad.tba.modules.claim.entity.ClaimStatus status);

       /**
        * Find claims available for settlement for a specific provider.
        * Criteria: active=true, status=APPROVED, and not already in any settlement
        * batch.
        */
       @org.springframework.data.jpa.repository.Query("SELECT c FROM Claim c WHERE c.active = true " +
                     "AND c.providerId = :providerId " +
                     "AND c.status = com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED " +
                     "AND c.id NOT IN (SELECT sbi.claimId FROM SettlementBatchItem sbi)")
       List<Claim> findAvailableForSettlement(
                     @org.springframework.data.repository.query.Param("providerId") Long providerId);
}
