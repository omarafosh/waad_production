package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    private String categoryCode; // For reference
    private String description;
    private BigDecimal basePrice;
    private boolean requiresPA;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
