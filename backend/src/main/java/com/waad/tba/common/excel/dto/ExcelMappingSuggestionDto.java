package com.waad.tba.common.excel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Common DTO for Excel column mapping suggestions
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelMappingSuggestionDto {
    private Integer columnIndex;
    private String columnName;
    private String suggestedField;
    private String suggestedFieldLabelAr;
    private String suggestedFieldLabelEn;
    private Double confidence;
    private String matchReason;
    private Boolean autoAccepted;
    private String sampleValue;
}
