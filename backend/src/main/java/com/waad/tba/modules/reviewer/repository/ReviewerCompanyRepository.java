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
 * @deprecated Use {@link com.waad.tba.common.repository.OrganizationRepository}
 *             instead.
 *             This repository is kept for backward compatibility ONLY.
 *             DO NOT use save(), saveAll(), delete(), or any write operations.
 *             All writes must go through OrganizationRepository with
 *             type=REVIEWER.
 */
@Deprecated
@Repository
public interface ReviewerCompanyRepository extends JpaRepository<ReviewerCompany, Long> {

       @Deprecated
       String SEARCH_QUERY = "SELECT rc FROM ReviewerCompany rc WHERE " +
                     "LOWER(rc.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                     "LOWER(rc.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                     "LOWER(rc.medicalDirector) LIKE LOWER(CONCAT('%', :search, '%'))";

       @Deprecated
       Optional<ReviewerCompany> findByEmail(String email);

       @Deprecated
       Optional<ReviewerCompany> findByName(String name);

       @Deprecated
       @Query(SEARCH_QUERY)
       List<ReviewerCompany> search(@Param("search") String search);

       @Deprecated
       @Query(SEARCH_QUERY)
       Page<ReviewerCompany> searchPaged(@Param("search") String search, Pageable pageable);
}
