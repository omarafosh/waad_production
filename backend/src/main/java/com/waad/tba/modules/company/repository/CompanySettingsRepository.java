package com.waad.tba.modules.company.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.waad.tba.modules.company.entity.CompanySettings;

/**
 * CompanySettingsRepository - Phase 9
 * 
 * Repository for managing company settings and feature toggles.
 * Provides methods to query settings by employer or company.
 */
@Repository
public interface CompanySettingsRepository extends JpaRepository<CompanySettings, Long> {
    
    /**
     * Find settings for a specific employer.
     * Each employer should have exactly one settings record.
     * 
     * @param employerId Employer ID
     * @return Optional containing settings if found
     */
    Optional<CompanySettings> findByEmployerId(Long employerId);
    
    /**
     * Find settings for a specific employer within a company.
     * This ensures the employer belongs to the correct company.
     * 
     * @param companyId Company ID
     * @param employerId Employer ID
     * @return Optional containing settings if found
     */
    Optional<CompanySettings> findByCompanyIdAndEmployerId(Long companyId, Long employerId);
    
    /**
     * Get all settings for a specific company.
     * Useful for company admins to see all employer settings.
     * 
     * @param companyId Company ID
     * @return List of all settings for this company
     */
    List<CompanySettings> findByCompanyId(Long companyId);
    
    /**
     * Check if settings exist for an employer.
     * 
     * @param employerId Employer ID
     * @return true if settings exist
     */
    boolean existsByEmployerId(Long employerId);
    
    /**
     * Find all employers with a specific feature enabled.
     * Useful for analytics and reporting.
     * 
     * @param companyId Company ID
     * @return List of settings where canViewClaims is true
     */
    @Query("SELECT cs FROM CompanySettings cs WHERE cs.companyId = :companyId AND cs.canViewClaims = true")
    List<CompanySettings> findEmployersWithClaimsAccess(@Param("companyId") Long companyId);
    
    /**
     * Find all employers with visits access enabled.
     * 
     * @param companyId Company ID
     * @return List of settings where canViewVisits is true
     */
    @Query("SELECT cs FROM CompanySettings cs WHERE cs.companyId = :companyId AND cs.canViewVisits = true")
    List<CompanySettings> findEmployersWithVisitsAccess(@Param("companyId") Long companyId);
    
    /**
     * Count employers with specific feature enabled.
     * 
     * @param companyId Company ID
     * @return Count of employers with canViewClaims enabled
     */
    @Query("SELECT COUNT(cs) FROM CompanySettings cs WHERE cs.companyId = :companyId AND cs.canViewClaims = true")
    Long countEmployersWithClaimsAccess(@Param("companyId") Long companyId);
}
