package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to create a new settlement batch
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBatchRequest {

    @NotNull(message = "Provider ID is required")
    @Schema(description = "Provider ID to create batch for", example = "101")
    private Long providerId;

    @Schema(description = "Optional description or notes for the batch")
    private String description;

    @Schema(description = "Optional list of claim IDs to add immediately")
    private List<Long> initialClaimIds;

    // For auditing - typically injected by controller from security context,
    // but DTO can carry it if service is called internally
    @Schema(hidden = true)
    private Long createdByUserId;
}
