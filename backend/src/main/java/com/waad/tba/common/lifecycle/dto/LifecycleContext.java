package com.waad.tba.common.lifecycle.dto;

import lombok.Builder;
import lombok.Data;
import org.springframework.security.core.userdetails.UserDetails;

@Data
@Builder
public class LifecycleContext {
    private String reasonCode;
    private String reason;
    private String metadata; // JSON
    private UserDetails currentUser;

    public String getReasonCode() {
        if (reasonCode != null && !reasonCode.trim().isEmpty()) {
            return reasonCode;
        }
        return reason;
    }
}
