package com.waad.tba.common.lifecycle.dto;

import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LifecyclePreviewDto {
    private String entityType;
    private Long entityId;
    private String currentStatus;
    private List<LifecycleActionOption> allowedActions;

    @Data
    @Builder
    public static class LifecycleActionOption {
        private LifecycleAction action;
        private String label;
        private String severity; // INFO, WARNING, DANGER
        private boolean requiresReason;
        private String impactSummary;
        private List<ReasonCodeDto> reasonOptions;
    }
}
