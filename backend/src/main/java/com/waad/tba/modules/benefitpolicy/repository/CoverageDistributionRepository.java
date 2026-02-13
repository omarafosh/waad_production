package com.waad.tba.modules.benefitpolicy.repository;

import com.waad.tba.modules.benefitpolicy.entity.CoverageDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CoverageDistributionRepository extends JpaRepository<CoverageDistribution, Long> {
    List<CoverageDistribution> findByBenefitPolicyId(Long policyId);
    List<CoverageDistribution> findByBenefitPolicyIdAndActiveTrue(Long policyId);
}
