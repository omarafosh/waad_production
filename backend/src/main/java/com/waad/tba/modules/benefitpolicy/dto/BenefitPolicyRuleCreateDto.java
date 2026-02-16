package com.waad.tba.modules.benefitpolicy.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for creating a new Benefit Policy Rule (REFACTORED).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitPolicyRuleCreateDto {

    /**
     * Target Medical Category (String-based)
     */
    private String medicalCategory;

    /**
     * Target Enterprise Medical Service ID
     */
    private Long medicalServiceId;

    /**
     * Target Medical Package ID
     */
    private Long medicalPackageId;

    /**
     * Coverage percentage (0-100)
     */
    @Min(value = 0, message = "Coverage percent must be >= 0")
    @Max(value = 100, message = "Coverage percent must be <= 100")
    private Integer coveragePercent;

    @DecimalMin(value = "0.00", message = "Amount limit must be >= 0")
    private BigDecimal amountLimit;

    @Min(value = 0, message = "Times limit must be >= 0")
    private Integer timesLimit;

    @Min(value = 0, message = "Waiting period must be >= 0")
    @Builder.Default
    private Integer waitingPeriodDays = 0;

    @Builder.Default
    private Boolean requiresPreApproval = false;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    @Builder.Default
    private Boolean active = true;

    private com.waad.tba.modules.visit.entity.VisitType encounterType;
}
