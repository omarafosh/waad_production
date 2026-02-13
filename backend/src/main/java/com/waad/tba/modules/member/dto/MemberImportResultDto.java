package com.waad.tba.modules.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for import result after confirmation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberImportResultDto {
    
    private String batchId;
    private String status;
    
    // Statistics for Frontend compatibility
    private ImportSummary summary;
    
    // Legacy mapping (kept for safety)
    private int totalProcessed;
    private int createdCount;
    private int updatedCount;
    private int skippedCount;
    private int errorCount;
    
    private long processingTimeMs;
    private LocalDateTime completedAt;
    private double successRate;
    
    private List<ImportErrorDetailDto> errors;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportSummary {
        private int total;
        private int created;
        private int updated;
        private int failed;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportErrorDetailDto {
        private int rowNumber;
        private String nationalId;
        private String errorType;
        private String field;
        private String message;   // Legacy
        private String messageAr; // Expected by Frontend
        private String messageEn; // Expected by Frontend
    }
}
