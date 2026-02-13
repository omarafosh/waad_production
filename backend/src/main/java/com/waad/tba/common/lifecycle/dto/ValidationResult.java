package com.waad.tba.common.lifecycle.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ValidationResult {
    private boolean valid;
    private String message;
    
    public static ValidationResult valid() {
        return ValidationResult.builder().valid(true).build();
    }
    
    public static ValidationResult invalid(String message) {
        return ValidationResult.builder().valid(false).message(message).build();
    }
}
