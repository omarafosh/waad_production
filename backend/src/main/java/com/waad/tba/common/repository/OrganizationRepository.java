package com.waad.tba.common.repository;

import com.waad.tba.common.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Canonical repository for all organization types (TPA, EMPLOYER, INSURANCE,
 * REVIEWER).
 */
@Repository
public interface OrganizationRepository
                extends JpaRepository<Organization, Long>, JpaSpecificationExecutor<Organization> {

        List<Organization> findByActiveTrue();

        // Explicit DB-level filtering (Archive Support)
        List<Organization> findByActiveTrueAndArchivedFalse();

        List<Organization> findByArchivedTrue();

        Optional<Organization> findByCode(String code);

        @Query("SELECT o FROM Organization o WHERE o.active = true AND " +
                        "(LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(o.code) LIKE LOWER(CONCAT('%', :search, '%')))")
        List<Organization> searchActive(@Param("search") String search);

        @Query("SELECT o FROM Organization o WHERE o.archived = :archived AND " +
                        "(LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(o.code) LIKE LOWER(CONCAT('%', :search, '%')))")
        Page<Organization> searchByArchived(@Param("search") String search,
                        @Param("archived") boolean archived,
                        Pageable pageable);

        @Query("SELECT o FROM Organization o WHERE o.archived = :archived AND o.active = :active AND " +
                        "(LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(o.code) LIKE LOWER(CONCAT('%', :search, '%')))")
        Page<Organization> searchByArchivedAndActive(@Param("search") String search,
                        @Param("archived") boolean archived,
                        @Param("active") boolean active,
                        Pageable pageable);

        Page<Organization> findByArchived(boolean archived, Pageable pageable);

        Page<Organization> findByArchivedAndActive(boolean archived, boolean active, Pageable pageable);

        @Query("SELECT o.code FROM Organization o WHERE o.code LIKE :prefix ORDER BY o.code DESC")
        List<String> findMaxCodeByPrefix(@Param("prefix") String prefix);
}
