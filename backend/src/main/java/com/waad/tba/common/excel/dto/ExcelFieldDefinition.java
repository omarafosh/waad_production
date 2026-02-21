package com.waad.tba.common.excel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Definition of a field for smart mapping
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelFieldDefinition {
    private String fieldName;
    private String labelAr;
    private String labelEn;
    private List<String> keywords;
    @Builder.Default
    private boolean required = false;
}
