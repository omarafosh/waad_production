package com.waad.tba.modules.reviewer.repository;

import com.waad.tba.modules.reviewer.entity.ReviewerCompany;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * LEGACY REPOSITORY - READ ONLY
 * 
 * @deprecated Use {@link com.waad.tba.common.repository.OrganizationRepository} instead.
 *             This repository is kept for backward compatibility ONLY.
 *             DO NOT use save(), saveAll(), delete(), or any write operations.
 *             All writes must go through OrganizationRepository with type=REVIEWER.
 */
@Deprecated
@Repository
public interface ReviewerCompanyRepository extends JpaRepository<ReviewerCompany, Long> {

    Optional<ReviewerCompany> findByEmail(String email);

    Optional<ReviewerCompany> findByName(String name);

    @Query("SELECT rc FROM ReviewerCompany rc WHERE " +
           "LOWER(rc.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(rc.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(rc.medicalDirector) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<ReviewerCompany> search(@Param("search") String search);

    @Query("SELECT rc FROM ReviewerCompany rc WHERE " +
           "LOWER(rc.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(rc.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(rc.medicalDirector) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<ReviewerCompany> searchPaged(@Param("search") String search, Pageable pageable);
}
