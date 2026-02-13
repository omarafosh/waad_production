package com.waad.tba.modules.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Account Summary DTO
 * Used for dashboard and account overview
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountSummaryDTO {

    private Long accountId;
    private Long providerId;
    private String providerName;
    private BigDecimal runningBalance;
    private BigDecimal totalApproved;
    private BigDecimal totalPaid;
    private String status;
    private String statusArabic;
    private Integer activeClaimsCount; // Claims waiting for settlement
    private Long transactionCount; // Total transactions
    private Long lastTransactionId;
    private Boolean balanceVerified; // Backend logic to verify running == calculated
}
