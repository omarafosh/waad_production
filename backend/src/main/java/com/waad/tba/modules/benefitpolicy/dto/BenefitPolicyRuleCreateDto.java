package com.waad.tba.modules.benefitpolicy.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating a new Benefit Policy Rule.
 * 
 * RULES:
 * - Exactly ONE of: medicalCategory, medicalServiceId must be provided
 * - encounterType is MANDATORY (coverage type must be specified)
 * - amountLimit removed (redundant with timesLimit)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitPolicyRuleCreateDto {

    /**
     * Target Medical Category (String code — legacy support)
     * Used when frontend sends category code directly.
     */
    private String medicalCategory;

    /**
     * Target Medical Category ID (preferred — FK-based)
     */
    private Long medicalCategoryId;

    /**
     * Target Medical Service ID
     */
    private Long medicalServiceId;

    /**
     * Coverage percentage (0-100).
     * If null, inherits from parent BenefitPolicy.defaultCoveragePercent
     */
    @Min(value = 0, message = "Coverage percent must be >= 0")
    @Max(value = 100, message = "Coverage percent must be <= 100")
    private Integer coveragePercent;

    /**
     * Maximum number of times this benefit can be used per period.
     * If null, unlimited.
     */
    @Min(value = 0, message = "Times limit must be >= 0")
    private Integer timesLimit;

    /**
     * Waiting period in days before benefit becomes effective.
     */
    @Min(value = 0, message = "Waiting period must be >= 0")
    @Builder.Default
    private Integer waitingPeriodDays = 0;

    @Builder.Default
    private Boolean requiresPreApproval = false;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    @Builder.Default
    private Boolean active = true;

    /**
     * MANDATORY: The type of coverage this rule applies to.
     * Values: OUTPATIENT, INPATIENT, EMERGENCY, LABORATORY,
     *         RADIOLOGY, PHARMACY, DENTAL, PHYSIOTHERAPY
     */
    @NotNull(message = "نوع التغطية إلزامي")
    private com.waad.tba.modules.visit.entity.VisitType encounterType;
}
