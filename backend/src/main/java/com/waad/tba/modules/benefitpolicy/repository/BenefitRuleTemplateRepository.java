package com.waad.tba.modules.benefitpolicy.repository;

import com.waad.tba.modules.benefitpolicy.entity.BenefitRuleTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BenefitRuleTemplateRepository extends JpaRepository<BenefitRuleTemplate, Long> {
    
    List<BenefitRuleTemplate> findAllByActiveTrue();
    
    @Query("SELECT t FROM BenefitRuleTemplate t LEFT JOIN FETCH t.items WHERE t.active = true")
    List<BenefitRuleTemplate> findAllWithItems();

    @Query("SELECT t FROM BenefitRuleTemplate t LEFT JOIN FETCH t.items WHERE t.id = :id")
    BenefitRuleTemplate findByIdWithItems(Long id);
}
