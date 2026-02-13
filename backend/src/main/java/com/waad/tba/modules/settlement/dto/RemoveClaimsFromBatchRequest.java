package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * API Request: Remove claims from settlement batch
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to remove claims from a DRAFT settlement batch")
public class RemoveClaimsFromBatchRequest {

    @NotEmpty(message = "Claim IDs list cannot be empty")
    @Schema(description = "List of Claim IDs to remove", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Long> claimIds;
}
