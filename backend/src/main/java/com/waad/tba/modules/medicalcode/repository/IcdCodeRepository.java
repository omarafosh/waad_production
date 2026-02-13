package com.waad.tba.modules.medicalcode.repository;

import com.waad.tba.modules.medicalcode.entity.IcdCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IcdCodeRepository extends JpaRepository<IcdCode, Long> {
    
    Optional<IcdCode> findByCode(String code);
    
    List<IcdCode> findByCategory(String category);
    
    List<IcdCode> findByVersion(IcdCode.IcdVersion version);
    
    List<IcdCode> findByActive(Boolean active);
    
    @Query("SELECT i FROM IcdCode i WHERE " +
           "LOWER(i.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(i.descriptionAr) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(i.descriptionEn) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<IcdCode> searchIcdCodes(@Param("search") String search);
    
    boolean existsByCode(String code);
}
