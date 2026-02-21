package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Service-Category Mapping
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceCategoryMappingDto {
    private Long categoryId;
    private String categoryCode;
    private String categoryName;
    private boolean isPrimary;
    private String context; // ANY, OUTPATIENT, INPATIENT, EMERGENCY
}
