package com.waad.tba.modules.benefitpolicy.repository;

import com.waad.tba.modules.benefitpolicy.entity.CoverageRuleConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CoverageRuleConfigRepository extends JpaRepository<CoverageRuleConfig, Long> {
    Optional<CoverageRuleConfig> findByRuleKey(String ruleKey);
}
