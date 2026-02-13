package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API Request: Cancel settlement batch
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to cancel a settlement batch")
public class CancelSettlementBatchRequest {

    @NotBlank(message = "Cancellation reason is required")
    @Schema(description = "Reason for cancellation", requiredMode = Schema.RequiredMode.REQUIRED)
    private String reason;
}
