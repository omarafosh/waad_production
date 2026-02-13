package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.visit.entity.VisitType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for returning Benefit Policy Rule information.
 */
@Data
@Builder
public class BenefitPolicyRuleResponseDto {

    public BenefitPolicyRuleResponseDto() {}

    public BenefitPolicyRuleResponseDto(Long id, Long benefitPolicyId, String benefitPolicyName, String ruleType, 
                                     Long medicalCategoryId, String medicalCategoryCode, String medicalCategoryNameAr, String medicalCategoryNameEn, 
                                     Long medicalServiceId, String medicalServiceCode, String medicalServiceNameAr, String medicalServiceNameEn, 
                                     Integer coveragePercent, Integer effectiveCoveragePercent, BigDecimal amountLimit, Integer timesLimit, 
                                     Integer waitingPeriodDays, boolean requiresPreApproval, String label, String notes, 
                                     VisitType encounterType, boolean active, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.benefitPolicyId = benefitPolicyId;
        this.benefitPolicyName = benefitPolicyName;
        this.ruleType = ruleType;
        this.medicalCategoryId = medicalCategoryId;
        this.medicalCategoryCode = medicalCategoryCode;
        this.medicalCategoryNameAr = medicalCategoryNameAr;
        this.medicalCategoryNameEn = medicalCategoryNameEn;
        this.medicalServiceId = medicalServiceId;
        this.medicalServiceCode = medicalServiceCode;
        this.medicalServiceNameAr = medicalServiceNameAr;
        this.medicalServiceNameEn = medicalServiceNameEn;
        this.coveragePercent = coveragePercent;
        this.effectiveCoveragePercent = effectiveCoveragePercent;
        this.amountLimit = amountLimit;
        this.timesLimit = timesLimit;
        this.waitingPeriodDays = waitingPeriodDays;
        this.requiresPreApproval = requiresPreApproval;
        this.label = label;
        this.notes = notes;
        this.encounterType = encounterType;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    private Long id;
    
    // Parent policy info
    private Long benefitPolicyId;
    private String benefitPolicyName;
    
    // Target info
    private String ruleType; // "CATEGORY" or "SERVICE"
    
    // Category info (if category rule)
    private Long medicalCategoryId;
    private String medicalCategoryCode;
    private String medicalCategoryNameAr;
    private String medicalCategoryNameEn;
    
    // Service info (if service rule)
    private Long medicalServiceId;
    private String medicalServiceCode;
    private String medicalServiceNameAr;
    private String medicalServiceNameEn;
    
    // Coverage settings
    private Integer coveragePercent;
    private Integer effectiveCoveragePercent; // Resolved value (including fallback)
    private BigDecimal amountLimit;
    private Integer timesLimit;
    private Integer waitingPeriodDays;
    private boolean requiresPreApproval;
    
    // Display label
    private String label;
    
    private String notes;
    private VisitType encounterType;
    private boolean active;
    private boolean deleted; // New Field
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Factory method to create DTO from entity
     */
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
                .deleted(rule.isDeleted()) // Map new field
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .label(rule.getLabel());

        // Parent policy
        if (rule.getBenefitPolicy() != null) {
            builder.benefitPolicyId(rule.getBenefitPolicy().getId())
                   .benefitPolicyName(rule.getBenefitPolicy().getName());
        }

        // Determine rule type and set appropriate fields
        if (rule.isCategoryRule()) {
            builder.ruleType("CATEGORY");
            if (rule.getMedicalCategory() != null) {
                builder.medicalCategoryId(rule.getMedicalCategory().getId())
                       .medicalCategoryCode(rule.getMedicalCategory().getCode())
                       .medicalCategoryNameAr(rule.getMedicalCategory().getName())
                       .medicalCategoryNameEn(rule.getMedicalCategory().getName());
            }
        } else if (rule.isServiceRule()) {
            builder.ruleType("SERVICE");
            if (rule.getMedicalService() != null) {
                builder.medicalServiceId(rule.getMedicalService().getId())
                       .medicalServiceCode(rule.getMedicalService().getCode())
                       .medicalServiceNameAr(rule.getMedicalService().getName())
                       .medicalServiceNameEn(rule.getMedicalService().getName());
                
                // Set category ID if service has it (category details need to be fetched separately)
                if (rule.getMedicalService().getCategoryId() != null) {
                    builder.medicalCategoryId(rule.getMedicalService().getCategoryId());
                    // Category code/name would need separate repository fetch - omitting for now
                }
            }
        }

        return builder.build();
    }
}
