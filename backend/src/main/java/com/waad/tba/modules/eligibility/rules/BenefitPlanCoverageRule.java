package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.EligibilityRule;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyRuleService;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyRuleResponseDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

import java.util.List;
import java.util.Map;

/**
 * Requirement 3 & 8: Benefit Plan-Driven Coverage Model
 * Rule: Coverage, limits, and costs must be governed exclusively by Benefit Plans.
 * Validation: Benefit Plan + Category + Service
 */
@Slf4j
@Component
@Order(100) // Execute after basic checks
@RequiredArgsConstructor
public class BenefitPlanCoverageRule implements EligibilityRule {

    private final BenefitPolicyRuleService ruleService;
    private final MedicalServiceRepository serviceRepository;

    @Override
    public boolean isApplicable(EligibilityContext context) {
        return context.getBenefitPolicy() != null && context.getServiceCode() != null;
    }

    @Override
    public RuleResult evaluate(EligibilityContext context) {
        BenefitPolicy plan = context.getBenefitPolicy();
        String serviceCode = context.getServiceCode();
        com.waad.tba.modules.visit.entity.VisitType visitType = context.getVisitType();

        // 1. Resolve Medical Service
        MedicalService service = serviceRepository.findByCode(serviceCode).orElse(null);
        if (service == null) {
            return RuleResult.fail(EligibilityReason.INVALID_REQUEST, 
                "Medical service not found: " + serviceCode, 
                "الخدمة الطبية غير موجودة: " + serviceCode);
        }

        // 2. Check Benefit Plan Rules using hierarchical logic
        // This method already handles: Service+Context > Service+Global > Category+Context > Category+Global
        Optional<BenefitPolicyRuleResponseDto> applicableRule = ruleService.findCoverageForService(
                plan.getId(), service.getId(), visitType);

        if (applicableRule.isPresent()) {
            BenefitPolicyRuleResponseDto rule = applicableRule.get();
            
            if (!rule.isActive()) {
                return RuleResult.fail(EligibilityReason.SERVICE_NOT_COVERED,
                    "This benefit is currently inactive.",
                    "هذه المنفعة غير نشطة حالياً.");
            }

            // Check if requires pre-approval
            if (rule.isRequiresPreApproval()) {
                log.info("Service {} requires pre-approval for Plan {}", serviceCode, plan.getId());
                // We pass the result but front-end/UI should handle the "Requires Approval" message
            }

            return RuleResult.pass();
        }

        // 3. Fallback to Plan Defaults (if no specific rule found)
        if (plan.getDefaultCoveragePercent() != null && plan.getDefaultCoveragePercent() <= 0) {
            return RuleResult.fail(EligibilityReason.SERVICE_NOT_COVERED, 
                "Service not covered under this plan by default.", 
                "هذه الخدمة غير مغطاة تحت هذه الخطة بشكل افتراضي.");
        }

        return RuleResult.pass();
    }


    @Override
    public String getRuleCode() {
        return "BENEFIT_PLAN_COVERAGE_VALIDATION";
    }

    @Override
    public String getNameAr() {
        return "التحقق من تغطية خطة المنافع";
    }

    @Override
    public int getPriority() {
        return 100;
    }

    @Override
    public boolean isHardRule() {
        return true;
    }
}
