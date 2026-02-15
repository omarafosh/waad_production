package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.visit.entity.VisitType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for returning Benefit Policy Rule information (REFACTORED for Unified Dictionary).
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
    private String ruleType; // "CATEGORY", "SERVICE", or "PACKAGE"
    
    // Category info (String-based in Unified Dictionary)
    private String medicalCategory;
    
    // Service info (UUID-based in Unified Dictionary)
    private UUID medicalServiceId;
    private String medicalServiceCode;
    private String medicalServiceNameAr;
    private String medicalServiceNameEn;
    
    // Package info
    private Long medicalPackageId;
    private String medicalPackageName;
    
    // Coverage settings
    private Integer coveragePercent;
    private Integer effectiveCoveragePercent;
    private BigDecimal amountLimit;
    private Integer timesLimit;
    private Integer waitingPeriodDays;
    private boolean requiresPreApproval;
    
    private String label;
    private String notes;
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
                .amountLimit(rule.getAmountLimit())
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
            builder.medicalCategory(rule.getMedicalCategory());
        } else if (rule.isServiceRule()) {
            builder.ruleType("SERVICE");
            if (rule.getMedicalService() != null) {
                builder.medicalServiceId(rule.getMedicalService().getId())
                       .medicalServiceCode(rule.getMedicalService().getCode())
                       .medicalServiceNameAr(rule.getMedicalService().getNameAr())
                       .medicalServiceNameEn(rule.getMedicalService().getNameEn())
                       .medicalCategory(rule.getMedicalService().getCategory());
            }
        } else if (rule.isPackageRule()) {
            builder.ruleType("PACKAGE");
            if (rule.getMedicalPackage() != null) {
                builder.medicalPackageId(rule.getMedicalPackage().getId())
                       .medicalPackageName(rule.getMedicalPackage().getName());
            }
        }

        return builder.build();
    }
}
