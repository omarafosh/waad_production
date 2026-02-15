package com.waad.tba.common.excel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Common DTO for Excel preview rows
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelPreviewRowDto {
    private Integer rowNumber;
    private List<String> values;
}
