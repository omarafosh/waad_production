package com.waad.tba.common.lifecycle.dto;

import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LifecycleActionRequest {
    @NotNull(message = "Action is required")
    private LifecycleAction action;
    
    private String reason;
    private String notes;
    private String metadata; // JSON
}
