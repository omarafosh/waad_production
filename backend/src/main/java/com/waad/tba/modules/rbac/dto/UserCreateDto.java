package com.waad.tba.modules.rbac.dto;

import com.waad.tba.common.validation.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCreateDto {
    
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    
    @NotBlank(message = "Password is required")
    @PasswordPolicy
    private String password;
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    private String phone;
    
    // Employer/Provider associations
    private Long employerId;
    private Long providerId;
    


    // Provider specific permissions
    private Boolean allowAllCompanies;
    private java.util.List<Long> permittedCompanyIds;
}
