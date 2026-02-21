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
    // Note: @SQLRestriction("active = true") is automatically applied to all JPA queries
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find service by unique code
     */
    Optional<MedicalService> findByCode(String code);

    /**
     * Find service by exact name (for duplicate checking during import)
     * Maps to name_ar in the database
     */
    Optional<MedicalService> findByName(String name);

    /**
     * Alias for findByName to support old EnterpriseMedicalService queries
     */
    default Optional<MedicalService> findByNameAr(String nameAr) {
        return findByName(nameAr);
    }

    /**
     * Find service by English name
     */
    Optional<MedicalService> findByNameEn(String nameEn);

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
     * Must use NATIVE query to bypass @SQLRestriction("active = true")
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
     * Find all services in a category through the Multi-Category Junction Table (REFACTORED 2026-02-18)
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        JOIN ms.categoryMappings m
        WHERE m.category.id = :categoryId
          AND (:context IS NULL OR m.context = :context OR m.context = 'ANY')
    """)
    List<MedicalService> findActiveByCategoryIdInMultiMapping(
        @Param("categoryId") Long categoryId,
        @Param("context") String context
    );

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

    // NOTE: Pre-authorization requirement is now determined by BenefitPolicyRule
    // findServicesRequiringPA queries removed as the field is deprecated in MedicalService entity.

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Search by name - case insensitive
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE LOWER(CAST(ms.name AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))
    """)
    List<MedicalService> searchByName(@Param("searchTerm") String searchTerm);

    /**
     * Search by name with pagination
     */
    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE LOWER(CAST(ms.name AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))
    """)
    Page<MedicalService> searchByName(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("""
        SELECT ms FROM MedicalService ms
        WHERE (:searchTerm IS NULL 
            OR LOWER(CAST(ms.name AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string)))
          AND (:categoryId IS NULL OR ms.categoryId = :categoryId)
          AND (:minPrice IS NULL OR ms.basePrice >= :minPrice)
          AND (:maxPrice IS NULL OR ms.basePrice <= :maxPrice)
    """)
    Page<MedicalService> advancedSearch(
        @Param("searchTerm") String searchTerm,
        @Param("categoryId") Long categoryId,
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
          AND (:categoryId IS NULL OR ms.categoryId = :categoryId)
          AND (:searchTerm IS NULL OR :searchTerm = '' 
               OR (LOWER(CAST(ms.code AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))
               OR LOWER(CAST(ms.name AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))
               OR LOWER(CAST(ms.nameEn AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))))
    """, countQuery = """
        SELECT COUNT(ms) FROM MedicalService ms
        WHERE (:active IS NULL OR ms.active = :active)
          AND (:isMaster IS NULL OR ms.isMaster = :isMaster)
          AND (:categoryId IS NULL OR ms.categoryId = :categoryId)
          AND (:searchTerm IS NULL OR :searchTerm = '' 
               OR (LOWER(CAST(ms.code AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))
               OR LOWER(CAST(ms.name AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))
               OR LOWER(CAST(ms.nameEn AS string)) LIKE LOWER(CAST(CONCAT('%', :searchTerm, '%') AS string))))
    """)
    Page<MedicalService> findAllByFilters(
        @Param("active") Boolean active, 
        @Param("isMaster") Boolean isMaster, 
        @Param("categoryId") Long categoryId,
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
     * Note: Native Query ALREADY bypasses @SQLRestriction, keeping explicit check for safety
     */
    @Query(value = """
        SELECT 
            ms.id as id,
            ms.code as code,
            ms.name_ar as name,
            ms.category_id as categoryId,
            mc.name as categoryName
        FROM medical_services ms
        LEFT JOIN medical_categories mc ON ms.category_id = mc.id
        WHERE ms.active = true
          AND (:query IS NULL OR :query = '' 
               OR LOWER(CAST(ms.code AS text)) LIKE LOWER(CAST(CONCAT('%', :query, '%') AS text))
               OR LOWER(CAST(ms.name_ar AS text)) LIKE LOWER(CAST(CONCAT('%', :query, '%') AS text))
               OR LOWER(CAST(mc.name AS text)) LIKE LOWER(CAST(CONCAT('%', :query, '%') AS text)))
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
