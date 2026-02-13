package com.waad.tba.modules.company.repository;

import com.waad.tba.modules.company.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for Company entity
 */
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    
    Optional<Company> findByCode(String code);
    
    /**
     * Find the default company (is_default = true).
     * In single-company mode, there should be exactly one.
     */
    Optional<Company> findByIsDefaultTrue();
    
    boolean existsByCode(String code);
}
