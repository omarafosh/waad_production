package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.visit.entity.VisitType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitRuleTemplateResponseDto {
    private Long id;
    private String name;
    private String description;
    private boolean isSystem;
    private boolean active;
    private List<ItemDto> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemDto {
        private Long id;
        private VisitType encounterType;
        private String medicalCategoryCode;
        private BigDecimal coveragePercent;
        private Integer timesLimit;
        private Integer waiting_period_days;
        private boolean requiresPreApproval;
        private String notes;
    }
}
