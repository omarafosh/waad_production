package com.waad.tba.common.lifecycle.dto;

import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LifecycleResult {
    private boolean success;
    private String message;
    private LifecycleAction action;
    private String previousStatus;
    private String newStatus;
    private Long auditLogId;
}
