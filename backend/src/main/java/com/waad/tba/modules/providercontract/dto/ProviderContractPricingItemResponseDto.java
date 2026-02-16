package com.waad.tba.modules.providercontract.dto;

import com.waad.tba.modules.providercontract.entity.ProviderContractPricingItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for returning Provider Contract Pricing Item data in API responses.
 * (REFACTORED 2026-02-15 - UNIFIED DICTIONARY)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderContractPricingItemResponseDto {

    private Long id;
    private Long contractId;

    // Service info (from medicalService relation)
    private ServiceSummaryDto medicalService;

    // Service name (for imported items without medical service link)
    private String serviceName;

    // Service code (for imported items - reference/lookup)
    private String serviceCode;

    // Category name (for imported items - display/grouping)
    private String categoryName;

    // Specialty (for grouping)
    private String specialty;

    // Quantity (for imported items)
    private Integer quantity;

    // Effective category (from item or service)
    private CategorySummaryDto effectiveCategory;

    // Pricing
    private BigDecimal basePrice;
    private BigDecimal contractPrice;
    private BigDecimal discountPercent;
    private BigDecimal savingsAmount;

    // Unit and currency
    private String unit;
    private String currency;

    // Dates
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;

    // Computed
    private Boolean isCurrentlyEffective;

    // Metadata
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to response DTO
     */
    public static ProviderContractPricingItemResponseDto fromEntity(ProviderContractPricingItem entity) {
        if (entity == null) {
            return null;
        }

        ServiceSummaryDto serviceDto = null;
        String serviceCategory = null;
        if (entity.getMedicalService() != null) {
            serviceDto = ServiceSummaryDto.builder()
                    .id(entity.getMedicalService().getId())
                    .code(entity.getMedicalService().getCode())
                    .name(entity.getMedicalService().getNameAr()) // Use Arabic name
                    .build();
            serviceCategory = entity.getMedicalService().getCategory();
        }

        // Determine effective category name
        String effectiveCategoryName = entity.getCategoryName();
        if (serviceCategory != null) {
            effectiveCategoryName = serviceCategory;
        }

        CategorySummaryDto effectiveCategoryDto = null;
        if (effectiveCategoryName != null) {
            effectiveCategoryDto = CategorySummaryDto.builder()
                    .name(effectiveCategoryName)
                    .build();
        }

        // Get display name: prefer medical service name, fallback to serviceName field
        String displayServiceName = entity.getServiceName();
        if (entity.getMedicalService() != null) {
             displayServiceName = entity.getMedicalService().getNameAr();
        }

        return ProviderContractPricingItemResponseDto.builder()
                .id(entity.getId())
                .contractId(entity.getContract() != null ? entity.getContract().getId() : null)
                .medicalService(serviceDto)
                .serviceName(displayServiceName)
                .serviceCode(entity.getServiceCode())
                .categoryName(effectiveCategoryName)
                .specialty(entity.getSpecialty() != null ? entity.getSpecialty() : (entity.getMedicalService() != null ? entity.getMedicalService().getSpecialty() : null))
                .quantity(entity.getQuantity())
                .effectiveCategory(effectiveCategoryDto)
                .basePrice(entity.getBasePrice() != null ? entity.getBasePrice() : java.math.BigDecimal.ZERO)
                .contractPrice(
                        entity.getContractPrice() != null ? entity.getContractPrice() : java.math.BigDecimal.ZERO)
                .discountPercent(
                        entity.getDiscountPercent() != null ? entity.getDiscountPercent() : java.math.BigDecimal.ZERO)
                .savingsAmount(
                        entity.getSavingsAmount() != null ? entity.getSavingsAmount() : java.math.BigDecimal.ZERO)
                .unit(entity.getUnit())
                .currency(entity.getCurrency())
                .effectiveFrom(entity.getEffectiveFrom())
                .effectiveTo(entity.getEffectiveTo())
                .isCurrentlyEffective(entity.isCurrentlyEffective())
                .notes(entity.getNotes() != null ? entity.getNotes() : "")
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * Service Summary DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceSummaryDto {
        private Long id;
        private String code;
        private String name;
    }

    /**
     * Category Summary DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySummaryDto {
        private String code;
        private String name;
    }
}
