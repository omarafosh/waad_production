package com.waad.tba.modules.reviewer.dto;

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
public class ReviewerCompanyCreateDto {
    
    @NotBlank(message = "Name is required")
    private String name;
    
    private String medicalDirector;
    
    private String phone;
    
    @Email(message = "Email must be valid")
    private String email;
    
    private String address;
}
