package com.waad.tba.modules.claim.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import java.util.UUID;

/**
 * ClaimLine DTO (CANONICAL REBUILD 2026-01-16)
 * 
 * ARCHITECTURAL LAW:
 * - medicalServiceId is MANDATORY - NO free-text services
 * - unitPrice is AUTO-RESOLVED from Provider Contract (read-only in response)
 * - totalPrice is SERVER-CALCULATED (read-only)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimLineDto {
    
    private Long id;
    
    // ==================== INPUT (for create/update) ====================
    
    /**
     * OPTIONAL: Medical Service ID (Master Code)
     * If not provided, providerServiceCode MUST be present for resolution.
     */
    private UUID medicalServiceId;

    /**
     * OPTIONAL: Provider-specific service code
     * Used to resolve to a Master Service if medicalServiceId is not provided.
     */
    @Size(max = 100, message = "Provider service code must not exceed 100 characters")
    private String providerServiceCode;
    
    /**
     * REQUIRED: Quantity of service
     */
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Builder.Default
    private Integer quantity = 1;
    
    // ==================== OUTPUT (read-only in response) ====================
    
    /**
     * Service code (denormalized from MedicalService)
     */
    private String serviceCode;
    
    /**
     * Service name (denormalized from MedicalService)
     */
    private String serviceName;
    
    /**
     * Service category (Unified Dictionary)
     */
    private String serviceCategory;
    
    /**
     * Unit price from Provider Contract (READ-ONLY)
     */
    private BigDecimal unitPrice;
    
    /**
     * Total price (SERVER-CALCULATED: quantity × unitPrice) (READ-ONLY)
     */
    private BigDecimal totalPrice;
    
    /**
     * Whether service requires pre-authorization
     */
    private Boolean requiresPA;
}
