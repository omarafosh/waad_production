package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for importing medical services from Excel.
 * Represents a single row in the standard import file.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceImportDto {
    private String code;
    private String name; // Arabic Name
    private String category; // Category Name
    private BigDecimal basePrice;
    private String englishName; // Optional
}
