package com.waad.tba.modules.settlement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Comprehensive Batch Summary DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchSummaryDTO {

    @Schema(description = "Batch ID")
    private Long batchId;

    @Schema(description = "Batch Number (STL-...)")
    private String batchNumber;

    @Schema(description = "Provider ID")
    private Long providerId;

    @Schema(description = "Provider Name")
    private String providerName;

    @Schema(description = "Settlement Date")
    private LocalDate settlementDate;

    @Schema(description = "Batch Status")
    private String status;

    @Schema(description = "Arabic Status Label")
    private String statusArabic;

    @Schema(description = "Total number of claims")
    private Integer totalClaimsCount;

    @Schema(description = "Total Gross Amount")
    private BigDecimal totalGrossAmount;

    @Schema(description = "Total Net Amount (Payable)")
    private BigDecimal totalNetAmount;

    @Schema(description = "Total Patient Share")
    private BigDecimal totalPatientShare;

    @Schema(description = "Description/Notes")
    private String description;

    @Schema(description = "Payment Reference (if paid)")
    private String paymentReference;

    @Schema(description = "Payment Method (if paid)")
    private String paymentMethod;

    @Schema(description = "Payment Date")
    private LocalDate paymentDate;

    // Audit Info
    private String createdBy;
    private String confirmedBy;
    private String paidBy;
    private String cancelledBy;
    private String cancellationReason;

    // Optional: Items list for detailed view (can be null for summary list)
    private List<BatchClaimItemResponse> items;
}
