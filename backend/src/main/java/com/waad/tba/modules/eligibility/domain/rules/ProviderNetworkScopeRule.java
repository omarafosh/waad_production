package com.waad.tba.modules.eligibility.domain.rules;

import com.waad.tba.modules.eligibility.domain.*;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import com.waad.tba.modules.provider.repository.ProviderAllowedEmployerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.List;

@Component
@Order(20) // Early check
@Slf4j
@RequiredArgsConstructor
public class ProviderNetworkScopeRule implements EligibilityRule {

    private final ProviderContractRepository providerContractRepository;
    private final ProviderAllowedEmployerRepository providerAllowedEmployerRepository;

    @Override
    public String getRuleCode() {
        return "PROVIDER_NETWORK_SCOPE";
    }

    @Override
    public String getNameAr() {
        return "نطاق شبكة مقدم الخدمة";
    }

    @Override
    public int getPriority() {
        return 20;
    }

    @Override
    public boolean isHardRule() {
        return true;
    }

    @Override
    public boolean isApplicable(EligibilityContext context) {
        // Only applicable if we have a provider and a member with an employer
        return context.getProvider() != null && context.getEmployerOrganization() != null;
    }

    @Override
    public RuleResult evaluate(EligibilityContext context) {
        Long providerId = context.getProviderId();
        Long memberEmployerId = context.getEmployerOrganization().getId(); // Assuming employerOrganization is the payer
        String employerName = context.getEmployerOrganization().getName();
        Provider provider = context.getProvider();

        // 1. Check Global Network Flag (From Provider Entity)
        if (Boolean.TRUE.equals(provider.getAllowAllEmployers())) {
            return RuleResult.pass();
        }

        // 2. Check for Valid Contracts (Specific Employer OR Global Contract)
        // This checks for Active contracts that cover this employer
        List<ProviderContract> validContracts = providerContractRepository.findValidContracts(
                providerId, 
                memberEmployerId, 
                LocalDate.now()
        );

        if (!validContracts.isEmpty()) {
            return RuleResult.pass();
        }

        // 3. TPA Model: Check "Allowed Employers" list (No direct contract needed if Main Contract exists)
        // We verify if this specific employer is in the allowed list
        boolean isExplicitlyAllowed = providerAllowedEmployerRepository
                .findByProviderIdAndEmployerId(providerId, memberEmployerId)
                .map(pae -> Boolean.TRUE.equals(pae.getActive()))
                .orElse(false);

        if (isExplicitlyAllowed) {
             // We still need to ensure they have AT LEAST ONE active main contract with Waad (The TPA)
             // We'll check generic active contracts in step 4
             // For now, if explicitly allowed, we proceed to check general validity
        } else {
             // If not in allowed list, we might still fall through to check constraints
        }
        
        if (isExplicitlyAllowed) {
             // Check if they have ANY active contract to legitimate the relationship
             boolean hasAnyContract = providerContractRepository
                .existsByProviderIdAndStatusAndActiveTrue(providerId, ContractStatus.ACTIVE);
             
             if (hasAnyContract) {
                 return RuleResult.pass();
             }
        }

        // 3. Fallback: Check if there is ANY generic active contract (just in case ValidContracts logic is too strict)
        // If they have NO generic contract at all, it's definitely a fail.
        boolean hasAnyActiveContract = providerContractRepository
                .existsByProviderIdAndStatusAndActiveTrue(providerId, ContractStatus.ACTIVE);

        if (!hasAnyActiveContract) {
            return RuleResult.fail(
                    EligibilityReason.PROVIDER_NOT_IN_NETWORK,
                    "No active contract found for this provider",
                    "عذراً، لا يوجد عقد ساري المفعول مع شركة وعد"
            );
        }

        return RuleResult.fail(
                EligibilityReason.MEMBER_NOT_IN_SCOPE,
                "Employer " + memberEmployerId + " not allowed for provider " + providerId,
                "عذراً، جهة العمل (" + employerName + ") غير مشمولة في شبكة مقدم الخدمة هذا"
        );
    }
}
