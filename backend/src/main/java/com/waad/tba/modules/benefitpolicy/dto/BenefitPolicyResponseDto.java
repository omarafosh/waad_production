package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus;
import com.waad.tba.modules.benefitpolicy.enums.DistributionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for Benefit Policy responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitPolicyResponseDto {

    private Long id;
    private String name;
    private String policyCode;
    private String description;

    // Employer info
    private Long employerOrgId;
    private String employerName;

    // Insurance info (optional)
    private Long insuranceOrgId;
    private String insuranceName;

    // Dates
    private LocalDate startDate;
    private LocalDate endDate;

    // Limits
    private BigDecimal annualLimit;
    private Integer defaultCoveragePercent;
    private BigDecimal perMemberLimit;
    private BigDecimal perFamilyLimit;
    private Integer defaultWaitingPeriodDays;
    private java.math.BigDecimal usedAmount;
    private Double usagePercentage;
    private DistributionType distributionType;
    private java.util.List<CoverageDistributionDto> distributions;

    // Status
    private BenefitPolicyStatus status;
    private String statusDisplay;
    private boolean effective;  // Is currently effective (active + within dates)

    // Stats
    private Integer coveredMembersCount;
    private Integer rulesCount;
    private Integer activeRulesCount;

    // Metadata
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ═══════════════════════════════════════════════════════════════════════════
    // FACTORY METHOD
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Convert entity to response DTO
     */
    public static BenefitPolicyResponseDto fromEntity(BenefitPolicy entity) {
        if (entity == null) {
            return null;
        }

        return BenefitPolicyResponseDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .policyCode(entity.getPolicyCode())
                .description(entity.getDescription())
                .employerOrgId(entity.getEmployerOrganization() != null 
                        ? entity.getEmployerOrganization().getId() : null)
                .employerName(entity.getEmployerOrganization() != null 
                        ? entity.getEmployerOrganization().getName() : null)
                .insuranceOrgId(entity.getInsuranceOrganization() != null 
                        ? entity.getInsuranceOrganization().getId() : null)
                .insuranceName(entity.getInsuranceOrganization() != null 
                        ? entity.getInsuranceOrganization().getName() : null)
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .annualLimit(entity.getAnnualLimit())
                .defaultCoveragePercent(entity.getDefaultCoveragePercent())
                .perMemberLimit(entity.getPerMemberLimit())
                .perFamilyLimit(entity.getPerFamilyLimit())
                .defaultWaitingPeriodDays(entity.getDefaultWaitingPeriodDays())
                .status(entity.getStatus())
                .statusDisplay(getStatusDisplay(entity.getStatus()))
                .effective(entity.isEffective())
                .coveredMembersCount(entity.getCoveredMembersCount())
                .rulesCount(entity.getRulesCount())
                .activeRulesCount(entity.getActiveRulesCount())
                .notes(entity.getNotes())
                .active(entity.isActive())
                .distributionType(entity.getDistributionType())
                .distributions(entity.getDistributions() != null ? 
                        entity.getDistributions().stream().map(CoverageDistributionDto::fromEntity).toList() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .usedAmount(entity.getUsedAmount())
                .usagePercentage(entity.getUsagePercentage())
                .build();
    }

    /**
     * Get localized status display text
     */
    private static String getStatusDisplay(BenefitPolicyStatus status) {
        if (status == null) return "";
        return switch (status) {
            case DRAFT -> "مسودة";
            case ACTIVE -> "نشط";
            case EXPIRED -> "منتهي";
            case SUSPENDED -> "موقوف";
            case TERMINATED -> "منهي";
            case CANCELLED -> "ملغي";
            case INACTIVE -> "غير نشط";
            case ARCHIVED -> "مؤرشف";
        };
    }
}
