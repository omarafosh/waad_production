package com.waad.tba.common.lifecycle.dto;

import lombok.Builder;
import lombok.Data;
import org.springframework.security.core.userdetails.UserDetails;

@Data
@Builder
public class LifecycleContext {
    private String reason;
    private String metadata; // JSON
    private UserDetails currentUser;

    public String getReasonCode() {
        return reason;
    }
}
