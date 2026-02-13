package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API Request: Pay settlement batch
 * CRITICAL FINANCIAL OPERATION
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to pay a CONFIRMED settlement batch")
public class PaySettlementBatchRequest {

    @NotBlank(message = "Payment reference is required (e.g., Bank Transfer ID)")
    @Schema(description = "Bank Reference / Check Number", requiredMode = Schema.RequiredMode.REQUIRED, example = "TRF-2026-998877")
    private String paymentReference;

    @NotBlank(message = "Payment method is required")
    @Pattern(regexp = "BANK_TRANSFER|CHECK|CASH|WIRE_TRANSFER", message = "Invalid payment method")
    @Schema(description = "Payment Method", requiredMode = Schema.RequiredMode.REQUIRED, example = "BANK_TRANSFER", 
            allowableValues = {"BANK_TRANSFER", "CHECK", "CASH", "WIRE_TRANSFER"})
    private String paymentMethod;

    @Schema(description = "Bank Account Number used (Optional)", example = "SA9900000000000000000000")
    private String bankAccountNumber;

    @Schema(description = "Payment notes")
    private String paymentNotes;

    /**
     * SECURITY NOTE: 
     * We DO NOT accept 'amount' in this request.
     * The payment amount MUST be derived from the immutable CONFIRMED batch total in the database.
     * Accepting amount from frontend would be a massive security vulnerability.
     */
}
