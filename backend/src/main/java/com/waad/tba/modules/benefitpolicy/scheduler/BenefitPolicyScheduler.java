package com.waad.tba.modules.benefitpolicy.scheduler;

import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for Benefit Policy automation tasks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BenefitPolicyScheduler {

    private final BenefitPolicyService benefitPolicyService;

    /**
     * Run daily at 1:00 AM to expire policies that have passed their end date.
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void schedulePolicyExpiration() {
        log.info("Starting scheduled task: Expire Old Policies");
        try {
            int count = benefitPolicyService.expireOldPolicies();
            log.info("Completed scheduled task: Expired {} policies", count);
        } catch (Exception e) {
            log.error("Failed to execute scheduled task: Expire Old Policies", e);
        }
    }
}
