package com.waad.tba.modules.member.dto;

import com.waad.tba.modules.member.entity.MemberChronicCondition;
import com.waad.tba.modules.member.enums.ChronicConditionType;
import com.waad.tba.modules.member.enums.ChronicCoverageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO for chronic condition data.
 * Contains all fields needed for display and API responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChronicConditionResponseDto {

    // ═══════════════════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    private Long id;
    private Long memberId;
    private String memberName;
    private String memberCardNumber;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONDITION DETAILS
    // ═══════════════════════════════════════════════════════════════════════════

    private ChronicConditionType conditionType;
    private String conditionCode;
    private String conditionName;
    private String customConditionName;
    private String displayName;
    private String icd10Code;
    private LocalDate diagnosisDate;
    private LocalDate disclosureDate;
    private Integer severityLevel;
    private String severityLabel;

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE INFORMATION
    // ═══════════════════════════════════════════════════════════════════════════

    private ChronicCoverageStatus coverageStatus;
    private String coverageStatusCode;
    private String coverageStatusLabel;
    private String coverageReason;
    private Integer waitingPeriodDays;
    private LocalDate waitingPeriodEndDate;
    private Boolean waitingPeriodOver;
    private BigDecimal coveragePercentage;
    private BigDecimal annualLimit;
    private BigDecimal usedAmount;
    private BigDecimal remainingLimit;
    private Boolean canSubmitClaims;
    private Boolean requiresPreApproval;

    // ═══════════════════════════════════════════════════════════════════════════
    // DOCUMENTATION
    // ═══════════════════════════════════════════════════════════════════════════

    private String documentationPath;
    private String diagnosingPhysician;
    private String diagnosingFacility;
    private Boolean documentationVerified;
    private LocalDate verificationDate;
    private String verifiedBy;

    // ═══════════════════════════════════════════════════════════════════════════
    // TREATMENT
    // ═══════════════════════════════════════════════════════════════════════════

    private String currentMedications;
    private String treatmentPlan;
    private LocalDate lastReviewDate;
    private LocalDate nextReviewDate;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════════════════

    private Boolean active;
    private LocalDate resolvedDate;
    private String notes;

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════════════════

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    // ═══════════════════════════════════════════════════════════════════════════
    // FACTORY METHOD
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create DTO from entity
     */
    public static ChronicConditionResponseDto fromEntity(MemberChronicCondition entity) {
        if (entity == null) return null;

        ChronicConditionType condType = entity.getConditionType();
        ChronicCoverageStatus covStatus = entity.getCoverageStatus();

        return ChronicConditionResponseDto.builder()
                // Identifiers
                .id(entity.getId())
                .memberId(entity.getMember() != null ? entity.getMember().getId() : null)
                .memberName(entity.getMember() != null ? entity.getMember().getFullName() : null)
                .memberCardNumber(entity.getMember() != null ? entity.getMember().getCardNumber() : null)
                
                // Condition Details
                .conditionType(condType)
                .conditionCode(condType != null ? condType.getCode() : null)
                .conditionName(condType != null ? condType.getNameAr() : null)
                .customConditionName(entity.getCustomConditionName())
                .displayName(entity.getDisplayName())
                .icd10Code(entity.getIcd10Code() != null ? entity.getIcd10Code() : 
                          (condType != null ? condType.getIcd10Code() : null))
                .diagnosisDate(entity.getDiagnosisDate())
                .disclosureDate(entity.getDisclosureDate())
                .severityLevel(entity.getSeverityLevel())
                .severityLabel(getSeverityLabel(entity.getSeverityLevel()))
                
                // Coverage
                .coverageStatus(covStatus)
                .coverageStatusCode(covStatus != null ? covStatus.getCode() : null)
                .coverageStatusLabel(covStatus != null ? covStatus.getLabelAr() : null)
                .coverageReason(entity.getCoverageReason())
                .waitingPeriodDays(entity.getWaitingPeriodDays())
                .waitingPeriodEndDate(entity.getWaitingPeriodEndDate())
                .waitingPeriodOver(entity.isWaitingPeriodOver())
                .coveragePercentage(entity.getCoveragePercentage())
                .annualLimit(entity.getAnnualLimit())
                .usedAmount(entity.getUsedAmount())
                .remainingLimit(entity.getRemainingLimit())
                .canSubmitClaims(entity.canSubmitClaims())
                .requiresPreApproval(entity.requiresPreApproval())
                
                // Documentation
                .documentationPath(entity.getDocumentationPath())
                .diagnosingPhysician(entity.getDiagnosingPhysician())
                .diagnosingFacility(entity.getDiagnosingFacility())
                .documentationVerified(entity.getDocumentationVerified())
                .verificationDate(entity.getVerificationDate())
                .verifiedBy(entity.getVerifiedBy())
                
                // Treatment
                .currentMedications(entity.getCurrentMedications())
                .treatmentPlan(entity.getTreatmentPlan())
                .lastReviewDate(entity.getLastReviewDate())
                .nextReviewDate(entity.getNextReviewDate())
                
                // Status
                .active(entity.getActive())
                .resolvedDate(entity.getResolvedDate())
                .notes(entity.getNotes())
                
                // Audit
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                
                .build();
    }

    /**
     * Get severity label in Arabic
     */
    private static String getSeverityLabel(Integer level) {
        if (level == null) return "غير محدد";
        return switch (level) {
            case 1 -> "خفيف جداً";
            case 2 -> "خفيف";
            case 3 -> "متوسط";
            case 4 -> "شديد";
            case 5 -> "شديد جداً";
            default -> "غير محدد";
        };
    }
}
