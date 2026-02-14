package com.waad.tba.modules.rbac.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.waad.tba.common.validation.PasswordPolicy;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for resetting password via token
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordDto {
    
    @NotBlank(message = "Reset token is required")
    private String token;
    
    @NotBlank(message = "New password is required")
    @PasswordPolicy
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String newPassword;
    
    @NotBlank(message = "Password confirmation is required")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String confirmPassword;
}
