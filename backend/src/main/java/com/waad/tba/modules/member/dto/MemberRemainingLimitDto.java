package com.waad.tba.modules.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberRemainingLimitDto {
    private Long memberId;
    private String memberName;
    private BigDecimal annualLimit;
    private BigDecimal usedAmount;
    private BigDecimal remainingLimit;
    private BigDecimal usagePercentage;
    private String policyName;
    private Boolean policyActive;
}
