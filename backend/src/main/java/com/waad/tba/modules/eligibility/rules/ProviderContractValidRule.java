package com.waad.tba.modules.eligibility.rules;

import com.waad.tba.modules.eligibility.domain.EligibilityContext;
import com.waad.tba.modules.eligibility.domain.EligibilityReason;
import com.waad.tba.modules.eligibility.domain.EligibilityRule;
import com.waad.tba.modules.eligibility.domain.RuleResult;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Requirement 5: Provider Contract Validation
 * Rule: Valid active pricing contract must exist between Provider and Member's
 * Link (Employer/Payer)
 */
@Slf4j
@Component
@Order(55)
@RequiredArgsConstructor
public class ProviderContractValidRule implements EligibilityRule {

    private final ProviderContractRepository contractRepository;

    @Override
    public String getRuleCode() {
        return "PROVIDER_CONTRACT_VALID";
    }

    @Override
    public String getNameAr() {
        return "التحقق من سريان العقد";
    }

    @Override
    public boolean isApplicable(EligibilityContext context) {
        return context.getMember() != null
                && context.getProvider() != null
                && context.getServiceDate() != null;
    }

    @Override
    public RuleResult evaluate(EligibilityContext context) {
        Member member = context.getMember();
        Long providerId = context.getProvider().getId();
        LocalDate serviceDate = context.getServiceDate();

        Member principal = member.getPrincipalMember();

        if (principal.getEmployerOrganization() == null) {
            log.warn("Member {} (Principal {}) has no employer linked.", member.getId(), principal.getId());
            return RuleResult.fail(EligibilityReason.OTHER, "المشترك غير مرتبط بأي جهة عمل", null);
        }

        Long employerId = principal.getEmployerOrganization().getId();
        String employerName = principal.getEmployerOrganization().getName();

        List<ProviderContract> contracts = contractRepository.findValidContracts(providerId, employerId, serviceDate);

        if (contracts.isEmpty()) {
            log.info("Eligibility Failed: No contract for Provider {} and Employer {}", providerId, employerId);
            return RuleResult.fail(EligibilityReason.CONTRACT_NOT_FOUND, 
                    "لا يوجد عقد ساري بين مقدم الخدمة والشركة: " + employerName, null);
        }

        return RuleResult.pass();
    }
}
