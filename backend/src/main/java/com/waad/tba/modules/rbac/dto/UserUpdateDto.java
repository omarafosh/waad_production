package com.waad.tba.modules.rbac.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateDto {
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    private String phone;
    private Boolean active;
    
    // Employer/Provider associations
    private Long employerId;
    private Long providerId;
    


    // Provider specific permissions
    private Boolean allowAllCompanies;
    private java.util.List<Long> permittedCompanyIds;
}
