package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Medical Service responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceResponseDto {

    private Long id;
    private String code;
    private String name;
    private String nameEn;
    private boolean isMaster;
    private Long categoryId;
    private String categoryName; // For UX - display category name
    private String subCategory; // Specialization (التخصص)
    private String categoryCode; // For reference
    
    // Multi-category support (REFACTORED 2026-02-18)
    private List<ServiceCategoryMappingDto> categories;
    private ServiceCategoryMappingDto primaryCategoryMapping;

    private String description;
    private BigDecimal basePrice;
    private boolean requiresPA;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
