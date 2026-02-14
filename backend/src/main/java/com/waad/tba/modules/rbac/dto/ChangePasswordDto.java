package com.waad.tba.modules.rbac.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.waad.tba.common.validation.PasswordPolicy;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for changing password (logged in user)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordDto {
    
    @NotBlank(message = "Current password is required")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String currentPassword;
    
    @NotBlank(message = "New password is required")
    @PasswordPolicy
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String newPassword;
    
    @NotBlank(message = "Password confirmation is required")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String confirmPassword;
}
