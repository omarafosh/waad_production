package com.waad.tba.common.excel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Common DTO for Excel import preview results
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelPreviewResultDto {
    private String sheetName;
    private int totalRows;
    private List<ExcelPreviewRowDto> previewRows;
    private List<ExcelColumnDetectionDto> detectedColumns;
    private List<String> originalHeaders;
    private boolean hasErrors;
    private Map<String, String> summary;
}
