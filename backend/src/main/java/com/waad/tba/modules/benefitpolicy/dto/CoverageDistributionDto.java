package com.waad.tba.modules.benefitpolicy.dto;

import java.util.UUID;
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
    private String categoryId;
    private String categoryName;
    private UUID serviceId;
    private String serviceName;
    private BigDecimal limitAmount;
    private boolean active;

    public static CoverageDistributionDto fromEntity(com.waad.tba.modules.benefitpolicy.entity.CoverageDistribution entity) {
        if (entity == null) return null;
        return CoverageDistributionDto.builder()
            .id(entity.getId())
            .categoryId(entity.getMedicalCategory())
            .categoryName(entity.getMedicalCategory()) // Using code as name fallback
            .serviceId(entity.getMedicalService() != null ? entity.getMedicalService().getId() : null)
            .serviceName(entity.getMedicalService() != null ? entity.getMedicalService().getNameEn() : null)
            .limitAmount(entity.getLimitAmount())
            .active(entity.isActive())
            .build();
    }
}
