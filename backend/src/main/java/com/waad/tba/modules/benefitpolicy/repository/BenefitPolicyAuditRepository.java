package com.waad.tba.modules.benefitpolicy.repository;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BenefitPolicyAuditRepository extends JpaRepository<BenefitPolicyAudit, Long> {
    List<BenefitPolicyAudit> findByBenefitPolicyIdOrderByCreatedAtDesc(Long benefitPolicyId);
}
