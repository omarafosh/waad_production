package com.waad.tba.common.excel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Common DTO for Excel column detection results
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelColumnDetectionDto {
    private String fileName;
    private String sheetName;
    private Integer totalRows;
    private Integer totalColumns;
    private Integer headerRowNumber;
    private List<String> columnHeaders;
    private List<ExcelMappingSuggestionDto> suggestions;
    private List<ExcelPreviewRowDto> previewRows;
    private List<String> missingRequiredFields;
    private Double overallConfidence;
    private Integer autoAcceptedCount;
    private Integer manualReviewCount;
    private List<String> warnings;
}
