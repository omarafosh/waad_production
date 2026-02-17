package com.waad.tba.modules.providercontract.dto;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for pricing import preview.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingImportPreviewDto {

    private String batchId;
    private String fileName;
    private int totalRows;
    private int newCount;
    private int updateCount;
    private int errorCount;
    
    private List<String> detectedColumns;
    private List<PricingImportRowDto> previewRows;
    private boolean canProceed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PricingImportRowDto {
        private int rowNumber;
        private String serviceName;
        private String serviceCode;
        private String categoryName;
        private Double unitPrice;
        private Integer quantity;
        private String status; // NEW, UPDATE, ERROR
        private List<String> errors;
    }
}
