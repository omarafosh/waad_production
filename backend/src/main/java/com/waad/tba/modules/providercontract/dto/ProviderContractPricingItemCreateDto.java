package com.waad.tba.modules.providercontract.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * DTO for creating a new Provider Contract Pricing Item.
 * (REFACTORED 2026-02-15 - UNIFIED DICTIONARY)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderContractPricingItemCreateDto {

    @Schema(description = "System Medical Service ID (if from dictionary)")
    private Long medicalServiceId;

    @Schema(description = "System Medical Category ID (for lookup)")
    private Long medicalCategoryId;

    /**
     * Service Name (Required if medicalServiceId is null)
     */
    @Size(max = 255)
    private String serviceName;

    /**
     * Service Code (Optional, auto-generated if null)
     */
    @Size(max = 50)
    private String serviceCode;

    /**
     * Optional category override (String code)
     */
    private String categoryName;

    /**
     * Standard/list price (required)
     */
    @NotNull(message = "Base price is required")
    @DecimalMin(value = "0.00", message = "Base price must be >= 0")
    private BigDecimal basePrice;

    /**
     * Negotiated contract price (required)
     */
    @NotNull(message = "Contract price is required")
    @DecimalMin(value = "0.00", message = "Contract price must be >= 0")
    private BigDecimal contractPrice;

    /**
     * Unit of service
     */
    @Size(max = 50)
    @Builder.Default
    private String unit = "service";

    /**
     * Currency code
     */
    @Size(max = 3)
    @Builder.Default
    private String currency = "LYD";

    /**
     * Date this pricing becomes effective (optional)
     */
    private LocalDate effectiveFrom;

    /**
     * Date this pricing expires (optional)
     */
    private LocalDate effectiveTo;

    /**
     * Notes
     */
    @Size(max = 2000)
    private String notes;
}
