package com.waad.tba.modules.claim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InboxStatsDto {
    private long total;
    private long submitted;
    private long underReview;
    private long todayNew;
    private BigDecimal avgAmount;
}
