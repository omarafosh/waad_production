package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.modules.benefitpolicy.dto.SimulationRequestDto;
import com.waad.tba.modules.benefitpolicy.dto.SimulationResultDto;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.common.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service for "Dry-Run" benefit coverage simulation.
 * Allows testing coverage rules before actual claim submission.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CoverageSimulationService {

    private final BenefitPolicyRepository policyRepository;
    private final BenefitPolicyRuleRepository ruleRepository;
    private final MedicalServiceRepository serviceRepository;
    private final BenefitPolicyRuleService ruleService;

    /**
     * Simulate coverage for a service under a specific policy
     */
    @Transactional(readOnly = true)
    public SimulationResultDto simulate(SimulationRequestDto request) {
        log.debug("Simulating coverage for service {} under policy {}", 
                request.getServiceId(), request.getPolicyId());

        BenefitPolicy policy = policyRepository.findById(request.getPolicyId())
                .orElseThrow(() -> new BusinessRuleException("Policy not found"));

        MedicalService service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new BusinessRuleException("Service not found"));

        // Use the existing core logic from BenefitPolicyRuleService
        var ruleOpt = ruleRepository.findBestRuleForService(
                policy.getId(), 
                service.getId(), 
                java.util.Collections.emptyList(), 
                service.getCategoryId(), 
                request.getEncounterType());

        SimulationResultDto.SimulationResultDtoBuilder builder = SimulationResultDto.builder()
                .policyName(policy.getName())
                .serviceName(service.getName())
                .categoryName(service.getCategory() != null ? service.getCategory().getName() : "Unknown");

        if (ruleOpt.isPresent()) {
            BenefitPolicyRule rule = ruleOpt.get();
            builder.coveragePercent(rule.getEffectiveCoveragePercent())
                    .amountLimit(rule.getAmountLimit())
                    .timesLimit(rule.getTimesLimit())
                    .waitingPeriodDays(rule.getWaitingPeriodDays())
                    .requiresPreApproval(rule.isRequiresPreApproval())
                    .ruleSource(rule.isServiceRule() ? "SERVICE" : "CATEGORY")
                    .notes(rule.getNotes());
        } else {
            // Fallback to policy default
            builder.coveragePercent(policy.getDefaultCoveragePercent())
                    .waitingPeriodDays(policy.getDefaultWaitingPeriodDays())
                    .ruleSource("POLICY_DEFAULT")
                    .notes("No specific rule found; using policy defaults.");
        }

        return builder.build();
    }
}
