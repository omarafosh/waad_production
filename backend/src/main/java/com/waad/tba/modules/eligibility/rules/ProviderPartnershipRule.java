package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.EligibilityRule;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.provider.entity.Provider;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Requirement 4: Provider Partnership Control
 * Rule: A provider cannot serve an insured member unless:
 * provider <-> insurance company partnership = active
 */
@Slf4j
@Component
@Order(50) // High priority - check partnership early
@RequiredArgsConstructor
public class ProviderPartnershipRule implements EligibilityRule {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public boolean isApplicable(EligibilityContext context) {
        return context.getMember() != null && context.getProvider() != null;
    }

    @Override
    public RuleResult evaluate(EligibilityContext context) {
        Member member = context.getMember();
        Provider provider = context.getProvider();

        if (member.getInsuranceOrganization() == null) {
            log.warn("Member {} has no insurance organization assigned. Skipping partnership check.", member.getId());
            return RuleResult.pass();
        }

        Long insuranceOrgId = member.getInsuranceOrganization().getId();
        Long providerId = provider.getId();

        // Check active partnership in provider_insurance_partnerships table
        String query = "SELECT COUNT(*) FROM provider_insurance_partnerships " +
                       "WHERE provider_id = :providerId " +
                       "AND insurance_org_id = :insuranceOrgId " +
                       "AND active = TRUE";

        Number count = (Number) entityManager.createNativeQuery(query)
                .setParameter("providerId", providerId)
                .setParameter("insuranceOrgId", insuranceOrgId)
                .getSingleResult();

        if (count.longValue() > 0) {
            return RuleResult.pass();
        }

        log.info("Partnership check failed for Provider {} and Insurance Org {}", providerId, insuranceOrgId);
        
        return RuleResult.fail(
            EligibilityReason.POLICY_INACTIVE, // Reusing similar status or we can add PARTNER_NETWORK_ERROR
            "This insurance card is not within the approved partner network.",
            "بطاقة التأمين هذه ليست ضمن شبكة الشركاء المعتمدين."
        );
    }

    @Override
    public String getRuleCode() {
        return "PARTNER_NETWORK_VALIDATION";
    }

    @Override
    public String getNameAr() {
        return "التحقق من شراكة الشبكة";
    }

    @Override
    public int getPriority() {
        return 50;
    }

    @Override
    public boolean isHardRule() {
        return true;
    }
}
