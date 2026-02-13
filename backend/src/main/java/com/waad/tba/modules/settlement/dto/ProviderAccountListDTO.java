package com.waad.tba.modules.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for listing provider accounts
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderAccountListDTO {

    private Long accountId;
    private Long providerId;
    private String providerName;
    private String providerType; // HOSPITAL, PHARMACY, etc.
    private BigDecimal runningBalance;
    private BigDecimal totalApproved;
    private BigDecimal totalPaid;
    private String status;
    private String statusArabic;
    private Integer pendingClaimsCount; // Claims waiting to be batched
    private LocalDateTime lastTransactionDate;
    private LocalDateTime updatedAt;
}
