package com.waad.tba.modules.claim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUploadResultDto {
    private int processedCount;
    private int successCount;
    private int failureCount;
    
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    
    public void addError(String error) {
        this.errors.add(error);
    }
}
