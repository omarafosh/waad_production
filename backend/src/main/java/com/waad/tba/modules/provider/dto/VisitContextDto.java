package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Visit Context DTO
 * 
 * Determines the state of a visit for the provider portal UI.
 * Used to decide which buttons to show (Create Claim vs View Claim vs Create
 * Pre-Auth).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitContextDto {

    private Long visitId;

    // Claim Info
    private boolean hasClaim;
    private Long claimId;
    private String claimStatus;
    private String claimStatusLabel;
    private String claimReference;

    // Pre-Authorization Info
    private boolean hasPreAuthorization;
    private Long preAuthorizationId;
    private String preAuthorizationStatus;
    private String preAuthorizationStatusLabel;
    private String preAuthorizationReference;

    // Derived States
    private boolean eligibilityOnly;
    private boolean canCreateClaim;
    private boolean canCreatePreAuth;
}
