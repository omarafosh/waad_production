package com.waad.tba.modules.claim.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API v1 Request: Update Claim Data
 * 
 * SECURITY: This endpoint is for PROVIDER and EMPLOYER_ADMIN only.
 * Allowed ONLY when claim status is DRAFT or NEEDS_CORRECTION.
 * 
 * @since Provider Portal Security Fix (Phase 0)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateClaimDataRequest {
    
    @Size(max = 255, message = "Doctor name must not exceed 255 characters")
    private String doctorName;
    
    @NotBlank(message = "Diagnosis code is required")
    @Size(max = 20, message = "Diagnosis code must not exceed 20 characters")
    private String diagnosisCode;
    
    @Size(max = 500, message = "Diagnosis description must not exceed 500 characters")
    private String diagnosisDescription;
    
    private Long preAuthorizationId;
}
