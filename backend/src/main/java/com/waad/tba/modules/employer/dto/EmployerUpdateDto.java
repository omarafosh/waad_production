package com.waad.tba.modules.employer.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Employer Update DTO - Simplified Version
 * 
 * Field Normalization:
 * - Accepts both 'code' and 'employerCode' (via @JsonAlias)
 * - Accepts both 'name' and 'nameAr' (via @JsonAlias)
 * - Arabic name only (no English name)
 * 
 * @see EMPLOYER_API_CONTRACT.md
 */
@Data
public class EmployerUpdateDto {

    /**
     * Employer code - REQUIRED for update
     * Note: Auto-generated codes should not be changed
     * Accepts: 'code' or 'employerCode' (frontend compatibility)
     */
    @NotBlank(message = "Employer code is required")
    @JsonAlias({"employerCode"})
    @Size(max = 50, message = "Employer code too long")
    private String code;

    /**
     * Employer name (Arabic only) - REQUIRED
     * Accepts: 'name' or 'nameAr' (frontend compatibility)
     */
    @NotBlank(message = "Employer name is required")
    @Size(max = 200, message = "Employer name too long")
    private String name;
    
    /**
     * Active status - OPTIONAL
     */
    private Boolean active;
}
