package com.waad.tba.modules.medicaltaxonomy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for reclassifying a medical service with a specific coverage strategy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclassifyRequestDto {

    @NotNull(message = "New classification ID is required")
    private Long newClassificationId;

    @NotBlank(message = "Strategy is required (INHERIT, KEEP_OVERRIDE, CUSTOM)")
    private String strategy;

    private CustomCoverageDto customCoverage;

    @NotBlank(message = "Reason code is required")
    private String reasonCode;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomCoverageDto {
        private Integer coveragePercentage;
        private BigDecimal maxAmount;
        private Integer maxVisits;
        private BigDecimal annualLimit;
    }
}
