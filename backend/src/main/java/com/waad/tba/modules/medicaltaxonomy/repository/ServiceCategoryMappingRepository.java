package com.waad.tba.modules.medicaltaxonomy.repository;

import com.waad.tba.modules.medicaltaxonomy.entity.ServiceCategoryMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCategoryMappingRepository extends JpaRepository<ServiceCategoryMapping, Long> {
    
    List<ServiceCategoryMapping> findByServiceId(Long serviceId);
    
    List<ServiceCategoryMapping> findByCategoryId(Long categoryId);
    
    Optional<ServiceCategoryMapping> findByServiceIdAndCategoryIdAndContext(Long serviceId, Long categoryId, String context);
    
    void deleteByServiceId(Long serviceId);
    
    Optional<ServiceCategoryMapping> findByServiceIdAndIsPrimaryTrue(Long serviceId);
}
