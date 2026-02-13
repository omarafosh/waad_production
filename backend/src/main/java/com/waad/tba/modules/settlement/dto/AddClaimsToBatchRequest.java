package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * API Request: Add claims to settlement batch
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to add claims to a DRAFT settlement batch")
public class AddClaimsToBatchRequest {

    @NotEmpty(message = "Claim IDs list cannot be empty")
    @Schema(description = "List of Claim IDs to add", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Long> claimIds;

    /**
     * NOTE: We DO NOT send amounts here.
     * The backend will fetch the current approved amounts from the claim entities.
     * This ensures financial integrity and prevents frontend manipulation.
     */
}
