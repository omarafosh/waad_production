package com.waad.tba.modules.member.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;

import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> {
    
    @Query("SELECT m FROM Member m WHERE m.civilId = :civilId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByCivilId(@Param("civilId") String civilId);
    
    @Query("SELECT m FROM Member m WHERE m.cardNumber = :cardNumber AND m.active = true ORDER BY m.id DESC")
    List<Member> findByCardNumber(@Param("cardNumber") String cardNumber);
    
    @Query("SELECT m FROM Member m JOIN m.employmentDetails ed WHERE ed.employeeNumber = :employeeNumber AND m.active = true ORDER BY m.id DESC")
    List<Member> findByEmployeeNumber(@Param("employeeNumber") String employeeNumber);

    
    /**
     * Find member by barcode (used for QR scanning and eligibility check).
     * Uses EntityGraph to eagerly fetch employer organization and benefit policy
     * to avoid LazyInitializationException and ensure eligibility data is complete.
     */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"employerOrganization", "benefitPolicy"})
    @Query("SELECT m FROM Member m WHERE m.barcode = :barcode AND m.active = true ORDER BY m.id DESC")
    List<Member> findByBarcode(@Param("barcode") String barcode);
    
    /**
     * Find member by card number with eager loading of employer and policy.
     * Used for eligibility checks when searching by card number instead of barcode.
     */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"employerOrganization", "benefitPolicy"})
    @Query("SELECT m FROM Member m WHERE m.cardNumber = :cardNumber AND m.active = true ORDER BY m.id DESC")
    List<Member> findByCardNumberWithDetails(@Param("cardNumber") String cardNumber);

    /**
     * Find member by employee number with eager loading of employer and policy.
     * Used for eligibility checks when searching by employee number (e.g. EMP-...).
     */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"employerOrganization", "benefitPolicy"})
    @Query("SELECT m FROM Member m JOIN m.employmentDetails ed WHERE ed.employeeNumber = :employeeNumber AND m.active = true ORDER BY m.id DESC")
    List<Member> findByEmployeeNumberWithDetails(@Param("employeeNumber") String employeeNumber);


    /**
     * Finds a member by ID and acquires a pessimistic lock.
     * Used for atomic financial operations (e.g., deductible calculations).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Member m WHERE m.id = :id")
    Optional<Member> findByIdForFinancialUpdate(@Param("id") Long id);
    

    
    
    List<Member> findByStatus(Member.MemberStatus status);

    /**
     * Find all active members.
     * Used for efficient bulk operations/pre-loading.
     */
    List<Member> findByActiveTrue();
    

    
    
    boolean existsByCivilId(String civilId);
    
    boolean existsByCardNumber(String cardNumber);
    
    boolean existsByCivilIdAndIdNot(String civilId, Long id);
    
    /**
     * 🔒 CRITICAL: Check if barcode exists (for collision prevention with FamilyMember)
     * Used by BarcodeGeneratorService.generateUniqueBarcodeForFamilyMember()
     */
    boolean existsByBarcode(String barcode);
    
    // Duplicates removed (searchPagedByEmployerOrganizationId, findByEmployerOrganizationId) - see Canoncial Model section below

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"employerOrganization", "benefitPolicy"})
    @Query("SELECT m FROM Member m WHERE m.active = true")
    Page<Member> findAll(Pageable pageable);

    @Query("SELECT m FROM Member m LEFT JOIN FETCH m.employerOrganization LEFT JOIN FETCH m.benefitPolicy WHERE " +
           "m.active = true AND (" +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.civilId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.barcode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.cardNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Member> searchPaged(@Param("search") String search, Pageable pageable);
    
    @Query("SELECT m FROM Member m LEFT JOIN FETCH m.employerOrganization LEFT JOIN FETCH m.benefitPolicy WHERE " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.civilId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.cardNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Member> search(@Param("query") String query);
    
    // REMOVED: findByInsuranceCompanyIdPaged and searchByInsuranceCompany (Architecture Refactor 2025-12-27)
    // Insurance company filtering is not part of operational data access.
    // Use employer-based queries via employerOrganization instead.
    // See: COMPANY-EMPLOYER-REFACTOR-SUMMARY.md

    // ═══════════════════════════════════════════════════════════════════════════
    // ORGANIZATION-BASED QUERIES (Canonical Model)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all members by employer organization ID
     */
    List<Member> findByEmployerOrganizationId(Long employerOrgId);

    /**
     * Find all active members by employer organization ID
     */
    List<Member> findByEmployerOrganizationIdAndActiveTrue(Long employerOrgId);

    /**
     * Find all members by employer organization ID (paginated)
     */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"employerOrganization", "benefitPolicy"})
    @Query("SELECT m FROM Member m WHERE m.employerOrganization.id = :employerOrgId AND m.active = true")
    Page<Member> findByEmployerOrganizationId(@Param("employerOrgId") Long employerOrgId, Pageable pageable);

    /**
     * Count members by employer organization ID
     */
    long countByEmployerOrganizationId(Long employerOrgId);

    /**
     * Count active members by employer organization ID
     * Used for dashboard statistics with employer filtering
     */
    long countByEmployerOrganizationIdAndActiveTrue(Long employerOrgId);

    /**
     * Search members by employer organization ID (paginated)
     */
    @Query("SELECT m FROM Member m LEFT JOIN FETCH m.employerOrganization LEFT JOIN FETCH m.benefitPolicy WHERE m.employerOrganization.id = :employerOrgId AND m.active = true AND (" +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.civilId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.barcode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.cardNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Member> searchPagedByEmployerOrganizationId(@Param("search") String search, @Param("employerOrgId") Long employerOrgId, Pageable pageable);

    /**
     * Search members by employer organization ID (non-paginated)
     */
    @Query("SELECT m FROM Member m WHERE m.employerOrganization.id = :employerOrgId AND (" +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.civilId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.cardNumber) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Member> searchByEmployerOrganizationId(@Param("query") String query, @Param("employerOrgId") Long employerOrgId);

    /**
     * Find members without a benefit policy for an employer
     */
    @Query("SELECT m FROM Member m WHERE m.employerOrganization.id = :employerOrgId AND m.benefitPolicy IS NULL")
    List<Member> findMembersWithoutBenefitPolicy(@Param("employerOrgId") Long employerOrgId);

    /**
     * Find members by benefit policy ID
     */
    List<Member> findByBenefitPolicyId(Long benefitPolicyId);

    /**
     * Count members by benefit policy ID
     */
    long countByBenefitPolicyId(Long benefitPolicyId);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: STATUS & CARD STATUS FILTERING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find members by status and employer organization ID
     */
    List<Member> findByStatusAndEmployerOrganizationId(Member.MemberStatus status, Long employerOrgId);

    /**
     * Find members by status and employer organization ID (paginated)
     */
    Page<Member> findByStatusAndEmployerOrganizationId(Member.MemberStatus status, Long employerOrgId, Pageable pageable);

    /**
     * Find members by card status and employer organization ID
     */
    List<Member> findByCardStatusAndEmployerOrganizationId(Member.CardStatus cardStatus, Long employerOrgId);

    /**
     * Find members by card status and employer organization ID (paginated)
     */
    Page<Member> findByCardStatusAndEmployerOrganizationId(Member.CardStatus cardStatus, Long employerOrgId, Pageable pageable);

    /**
     * Find members by status, card status, and employer organization ID (paginated)
     */
    Page<Member> findByStatusAndCardStatusAndEmployerOrganizationId(
            Member.MemberStatus status,
            Member.CardStatus cardStatus,
            Long employerOrgId,
            Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // ADVANCED SEARCH QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * 🔍 ELIGIBILITY SEARCH: Find members by full name containing search term - CASE INSENSITIVE
     * Used by searchForEligibility() - Priority 3
     */
    @Query("SELECT m FROM Member m WHERE " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Member> findByFullNameContainingIgnoreCase(@Param("name") String name);
    


    /**
     * Find members by name and employer organization ID - CASE INSENSITIVE
     */
    @Query("SELECT m FROM Member m WHERE m.employerOrganization.id = :employerOrgId AND " +
           "LOWER(m.fullName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Member> findByNameContainingAndEmployerOrganizationId(
            @Param("name") String name, 
            @Param("employerOrgId") Long employerOrgId);
    
    /**
     * Alias for findByNameContainingAndEmployerOrganizationId - explicit case-insensitive naming
     */
    default List<Member> findByNameContainingIgnoreCaseAndEmployerOrganizationId(String name, Long employerOrgId) {
        return findByNameContainingAndEmployerOrganizationId(name, employerOrgId);
    }

    /**
     * Find member by civil ID and employer organization ID
     */
    /**
     * Find member by civil ID and employer organization ID
     */
    @Query("SELECT m FROM Member m WHERE m.civilId = :civilId AND m.employerOrganization.id = :employerOrgId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByCivilIdAndEmployerOrganizationId(@Param("civilId") String civilId, @Param("employerOrgId") Long employerOrgId);

    /**
     * Find member by full name and birth date and employer organization ID (Duplicate detection fallback)
     */
    @Query("SELECT m FROM Member m WHERE LOWER(m.fullName) = LOWER(:fullName) AND m.birthDate = :birthDate AND m.employerOrganization.id = :employerOrgId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByFullNameAndBirthDateAndEmployerOrganizationId(
            @Param("fullName") String fullName, 
            @Param("birthDate") java.time.LocalDate birthDate, 
            @Param("employerOrgId") Long employerOrgId);

    /**
     * Find member by card number and employer organization ID
     */
    @Query("SELECT m FROM Member m WHERE m.cardNumber = :cardNumber AND m.employerOrganization.id = :employerOrgId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByCardNumberAndEmployerOrganizationId(@Param("cardNumber") String cardNumber, @Param("employerOrgId") Long employerOrgId);

    /**
     * Find member by national number and employer organization ID
     */
    @Query("SELECT m FROM Member m WHERE m.civilId = :civilId AND m.employerOrganization.id = :employerOrgId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByCivilIdAndEmployerOrganizationIdExplicit(@Param("civilId") String civilId, @Param("employerOrgId") Long employerOrgId);

    /**
     * Find member by employee number and employer organization ID
     */
    @Query("SELECT m FROM Member m JOIN m.employmentDetails ed WHERE ed.employeeNumber = :employeeNumber AND m.employerOrganization.id = :employerOrgId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByEmployeeNumberAndEmployerOrganizationId(@Param("employeeNumber") String employeeNumber, @Param("employerOrgId") Long employerOrgId);

    /**
     * Find member by full name and employer organization ID (active only)
     */
    @Query("SELECT m FROM Member m WHERE LOWER(m.fullName) = LOWER(:fullName) AND m.employerOrganization.id = :employerOrgId AND m.active = true ORDER BY m.id DESC")
    List<Member> findByFullNameAndEmployerOrganizationIdAndActiveTrue(@Param("fullName") String fullName, @Param("employerOrgId") Long employerOrgId);

    /**
     * Find members by phone containing search term
     */
    List<Member> findByPhoneContaining(String phone);

    /**
     * Find members by phone and employer organization ID
     */
    List<Member> findByPhoneContainingAndEmployerOrganizationId(String phone, Long employerOrgId);

    // ═══════════════════════════════════════════════════════════════════════════════
    // DASHBOARD STATISTICS QUERIES (Phase A)
    // Aggregations using JPQL - No Lazy Loading, No Entities returned
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Count active members (status = 'ACTIVE')
     */
    @Query("SELECT COUNT(m) FROM Member m WHERE m.active = true AND m.status = 'ACTIVE'")
    long countActiveMembers();

    /**
     * Get monthly member growth trends
     * Returns: [year, month, count]
     */
    @Query("SELECT YEAR(m.startDate) as year, MONTH(m.startDate) as month, COUNT(m) as count " +
           "FROM Member m WHERE m.active = true " +
           "AND m.startDate >= :startDate " +
           "AND m.startDate <= :endDate " +
           "GROUP BY YEAR(m.startDate), MONTH(m.startDate) " +
           "ORDER BY year, month")
    List<Object[]> getMonthlyGrowthTrends(@Param("startDate") java.time.LocalDate startDate,
                                          @Param("endDate") java.time.LocalDate endDate);

    /**
     * Get recent members (for dashboard recent activities)
     * Returns: [id, fullName, createdAt]
     */
    @Query("SELECT m.id, " +
           "m.fullName as name, " +
           "m.createdAt " +
           "FROM Member m " +
           "WHERE m.active = true " +
           "ORDER BY m.createdAt DESC")
    List<Object[]> getRecentMembers(Pageable pageable);

    /**
     * Count members created in date range (for growth calculation)
     */
    @Query("SELECT COUNT(m) FROM Member m " +
           "WHERE m.active = true " +
           "AND m.createdAt >= :startDate " +
           "AND m.createdAt < :endDate")
    long countMembersInDateRange(@Param("startDate") java.time.LocalDateTime startDate,
                                  @Param("endDate") java.time.LocalDateTime endDate);

    /**
     * Count members created in date range by employer organization (for growth calculation)
     */
    @Query("SELECT COUNT(m) FROM Member m " +
           "WHERE m.active = true " +
           "AND m.employerOrganization.id = :employerOrgId " +
           "AND m.createdAt >= :startDate " +
           "AND m.createdAt < :endDate")
    long countMembersInDateRangeByEmployer(@Param("startDate") java.time.LocalDateTime startDate,
                                            @Param("endDate") java.time.LocalDateTime endDate,
                                            @Param("employerOrgId") Long employerOrgId);

    // ============================================================================
    // PHASE 2: FUZZY NAME SEARCH (Arabic Autocomplete)
    // ============================================================================

    /**
     * Search members by name using fuzzy matching with pg_trgm
     * Uses similarity scoring for ranked results
     * Minimum 3 characters required
     * Returns top 10 matches ordered by similarity DESC
     * 
     * @param searchTerm Search query (min 3 chars)
     * @return List of members ordered by similarity score (highest first)
     */
    @Query(value = "SELECT m.id, m.full_name, m.card_number, " +
                   "similarity(m.full_name, :searchTerm) as sim " +
                   "FROM members m " +
                   "WHERE similarity(m.full_name, :searchTerm) > 0.1 " +
                   "ORDER BY sim DESC, m.full_name ASC " +
                   "LIMIT 10",
           nativeQuery = true)
    List<Object[]> searchByNameFuzzy(@Param("searchTerm") String searchTerm);

    /**
     * Search members by name using ILIKE (fallback for simple queries)
     * Faster than similarity but less intelligent
     * Good for exact prefix matches
     * 
     * @param searchPattern Search pattern with wildcards (e.g., "%احمد%")
     * @return List of members ordered by full name
     */
    @Query("SELECT m FROM Member m " +
           "WHERE LOWER(m.fullName) LIKE LOWER(:searchPattern) " +
           "ORDER BY m.fullName ASC")
    List<Member> searchByNamePattern(@Param("searchPattern") String searchPattern);

    // ═══════════════════════════════════════════════════════════════════════════
    // UNIFIED MEMBER ARCHITECTURE - PRINCIPAL/DEPENDENT QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all PRINCIPAL members (parent_id = NULL).
     * These are heads of families who have barcodes.
     */
    @Query("SELECT m FROM Member m WHERE m.parent IS NULL")
    List<Member> findAllPrincipals();

    /**
     * Find all PRINCIPAL members (paginated).
     */
    @Query("SELECT m FROM Member m WHERE m.parent IS NULL")
    Page<Member> findAllPrincipals(Pageable pageable);

    /**
     * Find all DEPENDENT members (parent_id IS NOT NULL).
     * These are family members who use parent's barcode.
     */
    @Query("SELECT m FROM Member m WHERE m.parent IS NOT NULL")
    List<Member> findAllDependents();

    /**
     * Find all dependents for a specific principal member.
     * 
     * @param parentId Principal member ID
     * @return List of dependents
     */
    List<Member> findByParentId(Long parentId);

    /**
     * Find all active dependents for a specific principal member.
     * 
     * @param parentId Principal member ID
     * @return List of active dependents
     */
    List<Member> findByParentIdAndActiveTrue(Long parentId);

    /**
     * Count dependents for a principal member.
     * 
     * @param parentId Principal member ID
     * @return Number of dependents
     */
    long countByParentId(Long parentId);

    /**
     * Find principal member with all dependents (using fetch join).
     * Optimized for single query with all family members.
     * 
     * @param principalId Principal member ID
     * @return Principal member with dependents eagerly loaded
     */
    @Query("SELECT m FROM Member m LEFT JOIN FETCH m.dependents WHERE m.id = :principalId AND m.parent IS NULL")
    Optional<Member> findPrincipalWithDependents(@Param("principalId") Long principalId);

    /**
     * Find all dependents by relationship type.
     * 
     * @param relationship Relationship type (WIFE, SON, DAUGHTER, etc.)
     * @return List of dependents with this relationship
     */
    List<Member> findByRelationship(Member.Relationship relationship);

    /**
     * Find dependents by parent ID and relationship.
     * Example: Find all sons of a specific principal
     * 
     * @param parentId Principal member ID
     * @param relationship Relationship type
     * @return List of matching dependents
     */
    List<Member> findByParentIdAndRelationship(Long parentId, Member.Relationship relationship);

    /**
     * Count dependents by parent ID and relationship.
     */
    long countByParentIdAndRelationship(Long parentId, Member.Relationship relationship);

    /**
     * Check if a member has any dependents.
     * 
     * @param principalId Principal member ID
     * @return true if has dependents, false otherwise
     */
    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END FROM Member m WHERE m.parent.id = :principalId")
    boolean hasAnyDependents(@Param("principalId") Long principalId);

    /**
     * Bulk update benefit policy for all members of an employer
     */
    @Modifying
    @Query("UPDATE Member m SET m.benefitPolicy = :policy WHERE m.employerOrganization.id = :employerId AND m.active = true")
    int updateBenefitPolicyForEmployer(@Param("employerId") Long employerId, @Param("policy") BenefitPolicy policy);

    /**
     * Count members with a specific benefit policy status
     */
    long countByEmployerOrganizationIdAndBenefitPolicyStatusAndBenefitPolicyActiveTrue(
            Long employerId, BenefitPolicy.BenefitPolicyStatus status);
}
