package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API Request: Confirm settlement batch
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to confirm a settlement batch (Lock it)")
public class ConfirmSettlementBatchRequest {

    @Schema(description = "Optional notes for confirmation")
    private String notes;
    
    // Potentially future fields:
    // - Two-factor auth token
    // - Manager approval ID
}
