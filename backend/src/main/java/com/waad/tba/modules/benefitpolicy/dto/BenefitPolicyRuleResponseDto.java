package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.visit.entity.VisitType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for returning Benefit Policy Rule information.
 * amountLimit removed — redundant with timesLimit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitPolicyRuleResponseDto {

    private Long id;

    // Parent policy info
    private Long benefitPolicyId;
    private String benefitPolicyName;

    // Target info
    private String ruleType; // "CATEGORY" or "SERVICE"

    // Category info
    private String medicalCategory;
    private Long medicalCategoryId;
    private String medicalCategoryCode;
    private String medicalCategoryName;

    // Service info
    private Long medicalServiceId;
    private String medicalServiceCode;
    private String medicalServiceNameAr;
    private String medicalServiceNameEn;

    // Coverage settings
    private Integer coveragePercent;
    private Integer effectiveCoveragePercent;
    private Integer timesLimit;
    private Integer waitingPeriodDays;
    private boolean requiresPreApproval;

    private String label;
    private String notes;

    /**
     * MANDATORY: The coverage type context for this rule.
     * Values: OUTPATIENT, INPATIENT, EMERGENCY, LABORATORY,
     *         RADIOLOGY, PHARMACY, DENTAL, PHYSIOTHERAPY
     */
    private VisitType encounterType;

    private boolean active;
    private boolean deleted;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BenefitPolicyRuleResponseDto fromEntity(BenefitPolicyRule rule) {
        BenefitPolicyRuleResponseDtoBuilder builder = BenefitPolicyRuleResponseDto.builder()
                .id(rule.getId())
                .coveragePercent(rule.getCoveragePercent())
                .effectiveCoveragePercent(rule.getEffectiveCoveragePercent())
                .timesLimit(rule.getTimesLimit())
                .waitingPeriodDays(rule.getWaitingPeriodDays())
                .requiresPreApproval(rule.isRequiresPreApproval())
                .notes(rule.getNotes())
                .encounterType(rule.getEncounterType())
                .active(rule.isActive())
                .deleted(rule.isDeleted())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .label(rule.getLabel());

        if (rule.getBenefitPolicy() != null) {
            builder.benefitPolicyId(rule.getBenefitPolicy().getId())
                   .benefitPolicyName(rule.getBenefitPolicy().getName());
        }

        if (rule.isCategoryRule()) {
            builder.ruleType("CATEGORY");
            if (rule.getMedicalCategoryRef() != null) {
                builder.medicalCategoryId(rule.getMedicalCategoryRef().getId())
                       .medicalCategoryCode(rule.getMedicalCategoryRef().getCode())
                       .medicalCategoryName(rule.getMedicalCategoryRef().getName())
                       .medicalCategory(rule.getMedicalCategoryRef().getCode());
            } else {
                // Legacy fallback: category stored as string code
                builder.medicalCategory(rule.getMedicalCategory())
                       .medicalCategoryCode(rule.getMedicalCategory());
            }
        } else if (rule.isServiceRule()) {
            builder.ruleType("SERVICE");
            if (rule.getMedicalService() != null) {
                builder.medicalServiceId(rule.getMedicalService().getId())
                       .medicalServiceCode(rule.getMedicalService().getCode())
                       .medicalServiceNameAr(rule.getMedicalService().getName())
                       .medicalServiceNameEn(rule.getMedicalService().getNameEn());
                // Also populate category from service's primary category
                if (rule.getMedicalService().getCategory() != null) {
                    builder.medicalCategoryCode(rule.getMedicalService().getCategory().getCode())
                           .medicalCategoryName(rule.getMedicalService().getCategory().getName());
                }
            }
        } else if (rule.isGeneralRule()) {
            builder.ruleType("GENERAL");
        }

        return builder.build();
    }
}
