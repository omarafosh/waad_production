package com.waad.tba.modules.visit.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;

@Repository
public interface VisitRepository extends JpaRepository<Visit, Long> {
    
    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.member m WHERE v.member.id = :memberId")
    List<Visit> findByMemberId(@Param("memberId") Long memberId);
    
    // Data-level filtering method for explicit employer filtering
    @Query("SELECT v FROM Visit v WHERE v.member.employerOrganization.id = :employerId")
    List<Visit> findByMemberEmployerId(@Param("employerId") Long employerId);
    
    // PHASE 5.B: Paginated employer filtering with FETCH JOIN for member
    @Query("SELECT v FROM Visit v " +
           "LEFT JOIN FETCH v.member m " +
           "WHERE v.member.employerOrganization.id = :employerId")
    Page<Visit> findByMemberEmployerId(@Param("employerId") Long employerId, Pageable pageable);
    
    // PHASE 5.B: Search with employer filtering - FETCH JOIN for member
    @Query("SELECT v FROM Visit v " +
           "LEFT JOIN FETCH v.member m " +
           "WHERE v.member.employerOrganization.id = :employerId AND (" +
           "LOWER(v.doctorName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(v.specialty) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(v.diagnosis) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Visit> searchPagedByEmployerId(@Param("q") String q, @Param("employerId") Long employerId, Pageable pageable);
    
    // Count by employer
    @Query("SELECT COUNT(v) FROM Visit v WHERE v.member.employerOrganization.id = :employerId")
    long countByMemberEmployerId(@Param("employerId") Long employerId);
    
    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.member m WHERE " +
           "LOWER(v.doctorName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(v.specialty) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(v.diagnosis) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Visit> search(@Param("query") String query);

    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.member m WHERE " +
           "v.member.employerOrganization.id = :employerId AND (" +
           "LOWER(v.doctorName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(v.specialty) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(v.diagnosis) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Visit> searchByMemberEmployerId(@Param("query") String query, @Param("employerId") Long employerId);

    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.member m WHERE " +
           "v.providerId = :providerId AND (" +
           "LOWER(v.doctorName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(v.specialty) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(v.diagnosis) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Visit> searchByProviderId(@Param("query") String query, @Param("providerId") Long providerId);

    // PHASE 5.B: Search paginated with FETCH JOIN for member
    @Query("SELECT v FROM Visit v " +
           "LEFT JOIN FETCH v.member m " +
           "WHERE LOWER(v.doctorName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(v.specialty) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(v.diagnosis) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Visit> searchPaged(@Param("q") String q, Pageable pageable);

    // PROVIDER filtering - visits by provider ID (providerId is Long field, not relation)
    // Optimized with FETCH JOIN
    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.member m WHERE v.providerId = :providerId")
    List<Visit> findByProviderId(@Param("providerId") Long providerId);

    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.member m WHERE v.providerId = :providerId")
    Page<Visit> findByProviderId(@Param("providerId") Long providerId, Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // PROVIDER DATA ISOLATION (2026-01-16): Search with provider filtering
    // ═══════════════════════════════════════════════════════════════════════════
    @Query("SELECT v FROM Visit v " +
           "LEFT JOIN FETCH v.member m " +
           "WHERE v.providerId = :providerId AND (" +
           "LOWER(v.doctorName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(v.specialty) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(v.diagnosis) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Visit> searchPagedByProviderId(@Param("q") String q, @Param("providerId") Long providerId, Pageable pageable);

    /**
     * Count visits by provider ID (for Provider Portal dashboard)
     */
    @Query("SELECT COUNT(v) FROM Visit v WHERE v.providerId = :providerId")
    long countByProviderId(@Param("providerId") Long providerId);

    // ==================== NEW FLOW (2026-01-13) ====================
    
    /**
     * Find visits with multiple optional filters for Provider Visit Log.
     * 
     * @param providerId Provider ID filter (null = all)
     * @param memberId Member ID filter (null = all)
     * @param memberName Member name search (null = no filter, partial match)
     * @param status Status filter (null = all)
     * @param fromDate Visit date from (null = no lower bound)
     * @param toDate Visit date to (null = no upper bound)
     * @param pageable Pagination
     * @return Page of visits matching filters
     */
    @Query(value = "SELECT v.* FROM visits v " +
           "LEFT JOIN members m ON m.id = v.member_id " +
           "LEFT JOIN organizations eo ON eo.id = v.employer_org_id " +
           "WHERE v.active = true " +
           "AND (CAST(:providerId AS BIGINT) IS NULL OR v.provider_id = CAST(:providerId AS BIGINT)) " +
           "AND (CAST(:memberId AS BIGINT) IS NULL OR v.member_id = CAST(:memberId AS BIGINT)) " +
           "AND (CAST(:memberName AS VARCHAR) IS NULL OR CAST(:memberName AS VARCHAR) = '' OR " +
           "     LOWER(m.full_name) LIKE LOWER('%' || CAST(:memberName AS VARCHAR) || '%') OR " +
           "     m.card_number LIKE '%' || CAST(:memberName AS VARCHAR) || '%' OR " +
           "     m.civil_id LIKE '%' || CAST(:memberName AS VARCHAR) || '%') " +
           "AND (CAST(:status AS VARCHAR) IS NULL OR v.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:fromDate AS DATE) IS NULL OR v.visit_date >= CAST(:fromDate AS DATE)) " +
           "AND (CAST(:toDate AS DATE) IS NULL OR v.visit_date <= CAST(:toDate AS DATE)) " +
           "ORDER BY v.visit_date DESC, v.id DESC",
           countQuery = "SELECT COUNT(*) FROM visits v " +
           "LEFT JOIN members m ON m.id = v.member_id " +
           "WHERE v.active = true " +
           "AND (CAST(:providerId AS BIGINT) IS NULL OR v.provider_id = CAST(:providerId AS BIGINT)) " +
           "AND (CAST(:memberId AS BIGINT) IS NULL OR v.member_id = CAST(:memberId AS BIGINT)) " +
           "AND (CAST(:memberName AS VARCHAR) IS NULL OR CAST(:memberName AS VARCHAR) = '' OR " +
           "     LOWER(m.full_name) LIKE LOWER('%' || CAST(:memberName AS VARCHAR) || '%') OR " +
           "     m.card_number LIKE '%' || CAST(:memberName AS VARCHAR) || '%' OR " +
           "     m.civil_id LIKE '%' || CAST(:memberName AS VARCHAR) || '%') " +
           "AND (CAST(:status AS VARCHAR) IS NULL OR v.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:fromDate AS DATE) IS NULL OR v.visit_date >= CAST(:fromDate AS DATE)) " +
           "AND (CAST(:toDate AS DATE) IS NULL OR v.visit_date <= CAST(:toDate AS DATE))",
           nativeQuery = true)
    Page<Visit> findByFilters(
        @Param("providerId") Long providerId,
        @Param("memberId") Long memberId,
        @Param("memberName") String memberName,
        @Param("status") String status,
        @Param("fromDate") java.time.LocalDate fromDate,
        @Param("toDate") java.time.LocalDate toDate,
        Pageable pageable);
    
    /**
     * Find visits by member with active=true
     */
    @Query("SELECT v FROM Visit v WHERE v.member.id = :memberId AND v.active = true ORDER BY v.visitDate DESC")
    List<Visit> findByMemberIdAndActiveTrue(@Param("memberId") Long memberId);
}
