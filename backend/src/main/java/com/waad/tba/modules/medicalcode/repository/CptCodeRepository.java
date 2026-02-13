package com.waad.tba.modules.medicalcode.repository;

import com.waad.tba.modules.medicalcode.entity.CptCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CptCodeRepository extends JpaRepository<CptCode, Long> {
    
    Optional<CptCode> findByCode(String code);
    
    List<CptCode> findByCategory(String category);
    
    List<CptCode> findByProcedureType(CptCode.ProcedureType procedureType);
    
    List<CptCode> findByCovered(Boolean covered);
    
    List<CptCode> findByRequiresPreAuth(Boolean requiresPreAuth);
    
    List<CptCode> findByActive(Boolean active);
    
    @Query("SELECT c FROM CptCode c WHERE " +
           "LOWER(c.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.descriptionAr) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.descriptionEn) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<CptCode> searchCptCodes(@Param("search") String search);
    
    boolean existsByCode(String code);
}
