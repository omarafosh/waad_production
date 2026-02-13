package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.EligibilityRule;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Requirement 3 & 8: Benefit Plan annual limits
 * Rule: Validate that total spent amount does not exceed the plan's annual limit.
 */
@Slf4j
@Component
@Order(110)
@RequiredArgsConstructor
public class BenefitAnnualLimitRule implements EligibilityRule {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public boolean isApplicable(EligibilityContext context) {
        return context.getBenefitPolicy() != null && context.getMember() != null;
    }

    @Override
    public RuleResult evaluate(EligibilityContext context) {
        BenefitPolicy plan = context.getBenefitPolicy();
        BigDecimal annualLimit = plan.getAnnualLimit();
        
        if (annualLimit == null || annualLimit.compareTo(BigDecimal.ZERO) <= 0) {
            return RuleResult.pass(); // No limit defined
        }

        // Calculate total approved claims for this member in the current policy period
        String query = "SELECT COALESCE(SUM(approved_amount), 0) FROM claims " +
                       "WHERE member_id = :memberId " +
                       "AND status = 'APPROVED' " +
                       "AND active = TRUE " +
                       "AND created_at >= :startDate AND created_at <= :endDate";

        BigDecimal totalSpent = (BigDecimal) entityManager.createNativeQuery(query)
                .setParameter("memberId", context.getMemberId())
                .setParameter("startDate", plan.getStartDate().atStartOfDay())
                .setParameter("endDate", plan.getEndDate().atTime(23, 59, 59))
                .getSingleResult();

        if (totalSpent.compareTo(annualLimit) >= 0) {
            log.info("Annual limit exceeded for member {}: Spent {} / Limit {}", 
                context.getMemberId(), totalSpent, annualLimit);
                
            return RuleResult.fail(
                EligibilityReason.COVERAGE_LIMIT_EXHAUSTED,
                "Annual coverage limit reached: " + annualLimit,
                "تم الوصول إلى الحد الأقصى للتغطية السنوية: " + annualLimit
            );
        }

        return RuleResult.pass();
    }

    @Override
    public String getRuleCode() {
        return "ANNUAL_LIMIT_VALIDATION";
    }

    @Override
    public String getNameAr() {
        return "التحقق من الحد السنوي للمنافع";
    }

    @Override
    public int getPriority() {
        return 110;
    }

    @Override
    public boolean isHardRule() {
        return true;
    }
}
