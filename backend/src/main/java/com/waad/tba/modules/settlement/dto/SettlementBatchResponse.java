package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           SETTLEMENT BATCH RESPONSE - API CONTRACT v1                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Represents a full settlement batch with details and items.
 * 
 * DESIGN PRINCIPLES:
 * ✓ Comprehensive read model
 * ✓ Includes audit trail
 * ✓ Includes aggregated financial data
 * ✓ Supports embedded item list (claims)
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Settlement batch details")
public class SettlementBatchResponse {

    @Schema(description = "Batch ID", example = "1001")
    private Long id;

    @Schema(description = "Batch number", example = "STL-2026-000001")
    private String batchNumber;

    @Schema(description = "Provider ID", example = "50")
    private Long providerId;

    @Schema(description = "Provider Name", example = "King Faisal Specialist Hospital")
    private String providerName;

    @Schema(description = "Settlement Date", example = "2026-01-15")
    private LocalDate settlementDate;

    // ═══════════════════════════════════════════════════════════════════════════
    // FINANCIALS
    // ═══════════════════════════════════════════════════════════════════════════

    @Schema(description = "Total number of claims", example = "150")
    private Integer totalClaimsCount;

    @Schema(description = "Total gross amount (requested)", example = "500000.00")
    private BigDecimal totalGrossAmount;

    @Schema(description = "Total net amount (payable)", example = "450000.00")
    private BigDecimal totalNetAmount;

    @Schema(description = "Total patient share", example = "25000.00")
    private BigDecimal totalPatientShare;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS & PAYMENT
    // ═══════════════════════════════════════════════════════════════════════════

    @Schema(description = "Batch status", example = "PAID")
    private String status;

    @Schema(description = "Status description in Arabic", example = "مدفوعة")
    private String statusArabic;

    @Schema(description = "Payment reference (if paid)", example = "TRF-998877")
    private String paymentReference;

    @Schema(description = "Payment method", example = "BANK_TRANSFER")
    private String paymentMethod;

    @Schema(description = "Payment date", example = "2026-02-01")
    private LocalDate paymentDate;
    
    @Schema(description = "Notes", example = "Regular monthly settlement")
    private String notes;

    // ═══════════════════════════════════════════════════════════════════════════
    // METADATA & AUDIT
    // ═══════════════════════════════════════════════════════════════════════════

    @Schema(description = "Created by user ID", example = "1")
    private Long createdBy;
    
    @Schema(description = "Created at timestamp")
    private LocalDateTime createdAt;
    
    @Schema(description = "Confirmed at timestamp")
    private LocalDateTime confirmedAt;
    
    @Schema(description = "Paid at timestamp")
    private LocalDateTime paidAt;
    
    @Schema(description = "Cancelled at timestamp")
    private LocalDateTime cancelledAt;
    
    @Schema(description = "Cancellation reason")
    private String cancellationReason;

    // ═══════════════════════════════════════════════════════════════════════════
    // ITEMS
    // ═══════════════════════════════════════════════════════════════════════════

    @Schema(description = "List of claims in this batch (optional)")
    private List<BatchClaimItemResponse> claims;
}
