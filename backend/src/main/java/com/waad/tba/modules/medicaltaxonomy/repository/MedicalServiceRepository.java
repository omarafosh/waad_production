package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository for MedicalService entity (Reference Data).
 * 
 * Supports:
 * - CRUD operations
 * - Code-based lookups
 * - Category filtering
 * - Pre-authorization filtering
 * - Price range queries
 * - Active/inactive filtering
 */
@Repository
public interface MedicalServiceRepository extends JpaRepository<MedicalService, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // BASIC QUERIES
    // Note: @Where(clause = "active = true") is automatically applied to all JPA queries
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find service by unique code
     */
    Optional<MedicalService> findByCode(String code);

    /**
     * Find service by exact name (for duplicate checking during import)
     */
    Optional<MedicalService> findByName(String name);

    /**
     * Check if code exists (for duplicate validation)
     */
    boolean existsByCode(String code);

    /**
     * Find all active services (redundant naming but kept for backward compat)
     */
    List<MedicalService> findByActiveTrue();

    /**
     * Find all active services ordered by code (for dropdowns)
     */
    List<MedicalService> findByActiveTrueOrderByCode();

    /**
     * Find all active services - paginated with optimized JOIN FETCH for categories
     */
    @Query(value = "SELECT ms FROM MedicalService ms LEFT JOIN FETCH ms.category",
           countQuery = "SELECT COUNT(ms) FROM MedicalService ms")
    Page<MedicalService> findAllOptimized(Pageable pageable);

    /**
     * Find all active services - paginated
     */
    Page<MedicalService> findByActiveTrue(Pageable pageable);

    /**
     * Find all inactive services - paginated
     * Must use NATIVE query to bypass @Where(clause = "active = true")
     */
    @Query(value = "SELECT * FROM medical_services WHERE active = false", nativeQuery = true)
    Page<MedicalService> findByActiveFalse(Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // CATEGORY QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all services in a category
     */
    List<MedicalService> findByCategoryId(Long categoryId);

    /**
     * Find all active services in a category
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.categoryId = :categoryId")
    List<MedicalService> findActiveByCategoryId(@Param("categoryId") Long categoryId);

    /**
     * Find all active services in a category - paginated
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.categoryId = :categoryId")
    Page<MedicalService> findActiveByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);

    /**
     * Check if category has services (for delete validation)
     */
    boolean existsByCategoryId(Long categoryId);

    /**
     * Count services in a category
     */
    long countByCategoryId(Long categoryId);

    /**
     * Count active services in a category
     */
    @Query("SELECT COUNT(ms) FROM MedicalService ms WHERE ms.categoryId = :categoryId")
    long countActiveByCategoryId(@Param("categoryId") Long categoryId);

    // ═══════════════════════════════════════════════════════════════════════════
    // PRE-AUTHORIZATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all services requiring pre-authorization
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.requiresPA = true")
    List<MedicalService> findServicesRequiringPA();

    /**
     * Find all services requiring pre-authorization - paginated
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.requiresPA = true")
    Page<MedicalService> findServicesRequiringPA(Pageable pageable);

    /**
     * Find services in category requiring PA
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE ms.categoryId = :categoryId
          AND ms.requiresPA = true
    """)
    List<MedicalService> findServicesRequiringPAByCategory(@Param("categoryId") Long categoryId);

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Search by name - case insensitive
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE LOWER(ms.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
    """)
    List<MedicalService> searchByName(@Param("searchTerm") String searchTerm);

    /**
     * Search by name with pagination
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE LOWER(ms.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
    """)
    Page<MedicalService> searchByName(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Advanced search with multiple filters
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE (:searchTerm IS NULL 
            OR LOWER(ms.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
          AND (:categoryId IS NULL OR ms.categoryId = :categoryId)
          AND (:requiresPA IS NULL OR ms.requiresPA = :requiresPA)
          AND (:minPrice IS NULL OR ms.basePrice >= :minPrice)
          AND (:maxPrice IS NULL OR ms.basePrice <= :maxPrice)
    """)
    Page<MedicalService> advancedSearch(
        @Param("searchTerm") String searchTerm,
        @Param("categoryId") Long categoryId,
        @Param("requiresPA") Boolean requiresPA,
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        Pageable pageable
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // PRICE QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find services within price range
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE ms.basePrice BETWEEN :minPrice AND :maxPrice
    """)
    List<MedicalService> findByPriceRange(
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice
    );

    /**
     * Find services by minimum price
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.basePrice >= :minPrice")
    List<MedicalService> findByBasePriceGreaterThanEqual(@Param("minPrice") BigDecimal minPrice);

    /**
     * Find services by maximum price
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.basePrice <= :maxPrice")
    List<MedicalService> findByBasePriceLessThanEqual(@Param("maxPrice") BigDecimal maxPrice);

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find by ID and ensure it's active
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.id = :id")
    Optional<MedicalService> findActiveById(@Param("id") Long id);

    /**
     * Find by code and ensure it's active
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.code = :code")
    Optional<MedicalService> findActiveByCode(@Param("code") String code);

    /**
     * Find multiple services by their codes
     * Useful for bulk operations
     */
    @Query("SELECT ms FROM MedicalService ms WHERE ms.code IN :codes")
    List<MedicalService> findByCodes(@Param("codes") List<String> codes);

    // ═══════════════════════════════════════════════════════════════════════════
    // BULK OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Soft delete all medical services (set active = false)
     * Using native query to be precise
     * @return number of updated records
     */
    @Modifying
    @Query(value = "UPDATE medical_services SET active = false WHERE active = true", nativeQuery = true)
    int softDeleteAll();

    /**
     * Activate all medical services (set active = true)
     * Using native query to bypass @Where
     * @return number of updated records
     */
    @Modifying
    @Query(value = "UPDATE medical_services SET active = true WHERE active = false", nativeQuery = true)
    int activateAll();

    @Query(value = """
        SELECT ms FROM MedicalService ms
        LEFT JOIN FETCH ms.category
        WHERE (:active IS NULL OR ms.active = :active)
          AND (:isMaster IS NULL OR ms.isMaster = :isMaster)
          AND (:searchTerm IS NULL OR :searchTerm = '' 
               OR LOWER(ms.code) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
               OR LOWER(ms.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
               OR LOWER(ms.nameEn) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
    """, countQuery = """
        SELECT COUNT(ms) FROM MedicalService ms
        WHERE (:active IS NULL OR ms.active = :active)
          AND (:isMaster IS NULL OR ms.isMaster = :isMaster)
          AND (:searchTerm IS NULL OR :searchTerm = '' 
               OR LOWER(ms.code) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
               OR LOWER(ms.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
               OR LOWER(ms.nameEn) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
    """)
    Page<MedicalService> findAllByFilters(
        @Param("active") Boolean active, 
        @Param("isMaster") Boolean isMaster, 
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );

    /**
     * Find all services (including inactive) - for admin operations

    /**
     * Count active services
     */
    long countByActiveTrue();

    /**
     * Count inactive services
     * Native query to bypass @Where
     */
    @Query(value = "SELECT COUNT(*) FROM medical_services WHERE active = false", nativeQuery = true)
    long countByActiveFalse();

    // ═══════════════════════════════════════════════════════════════════════════
    // LOOKUP QUERIES (For MedicalServiceSelector)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Unified lookup query for medical service selection
     * Note: Native Query ALREADY bypasses @Where, keeping explicit check for safety
     */
    @Query(value = """
        SELECT 
            ms.id as id,
            ms.code as code,
            ms.name as name,
            ms.category_id as categoryId,
            mc.name as categoryName
        FROM medical_services ms
        LEFT JOIN medical_categories mc ON ms.category_id = mc.id
        WHERE ms.active = true
          AND (:query IS NULL OR :query = '' 
               OR LOWER(ms.code) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(ms.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(mc.name) LIKE LOWER(CONCAT('%', :query, '%')))
          AND (:categoryId IS NULL OR ms.category_id = :categoryId)
        ORDER BY COALESCE(mc.name, 'zzz'), ms.name
        """, nativeQuery = true)
    List<MedicalServiceLookupProjection> lookupServices(
        @Param("query") String query,
        @Param("categoryId") Long categoryId
    );

    interface MedicalServiceLookupProjection {
        Long getId();
        String getCode();
        String getName();
        Long getCategoryId();
        String getCategoryName();
    }
}
