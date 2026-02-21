package com.waad.tba.modules.benefitpolicy.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * Result DTO for benefit coverage simulation.
 */
@Data
@Builder
public class SimulationResultDto {
    private String policyName;
    private String serviceName;
    private String categoryName;
    private Integer coveragePercent;

    private Integer timesLimit;
    private Integer waitingPeriodDays;
    private boolean requiresPreApproval;
    private String ruleSource; // SERVICE, CATEGORY, POLICY_DEFAULT, NOT_COVERED
    private String notes;
}
