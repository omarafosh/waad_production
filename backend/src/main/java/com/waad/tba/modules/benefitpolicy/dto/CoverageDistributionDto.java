package com.waad.tba.modules.benefitpolicy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for Coverage Distribution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoverageDistributionDto {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private Long serviceId;
    private String serviceName;
    private BigDecimal limitAmount;
    private boolean active;

    public static CoverageDistributionDto fromEntity(com.waad.tba.modules.benefitpolicy.entity.CoverageDistribution entity) {
        if (entity == null) return null;
        return CoverageDistributionDto.builder()
            .id(entity.getId())
            .categoryId(entity.getMedicalCategory() != null ? entity.getMedicalCategory().getId() : null)
            .categoryName(entity.getMedicalCategory() != null ? entity.getMedicalCategory().getName() : null)
            .serviceId(entity.getMedicalService() != null ? entity.getMedicalService().getId() : null)
            .serviceName(entity.getMedicalService() != null ? entity.getMedicalService().getName() : null)
            .limitAmount(entity.getLimitAmount())
            .active(entity.isActive())
            .build();
    }
}
