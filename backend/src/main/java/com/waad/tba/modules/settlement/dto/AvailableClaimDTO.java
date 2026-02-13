package com.waad.tba.modules.settlement.dto;

import com.waad.tba.modules.claim.entity.Claim;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for claims available for settlement batching
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableClaimDTO {

    private Long claimId;
    private String claimNumber;
    private Long memberId;
    private String memberName;
    private Long providerId;
    private String providerName;
    private LocalDate serviceDate;
    private BigDecimal requestedAmount;
    private BigDecimal netProviderAmount;
    private BigDecimal patientShare;
    private String status;
    private String diagnosisDescription; // Helpful for context

    public static AvailableClaimDTO fromClaim(Claim claim) {
        return AvailableClaimDTO.builder()
                .claimId(claim.getId())
                .claimNumber(String.valueOf(claim.getId())) // Using ID as number since no separate claimNumber field
                .memberId(claim.getMember() != null ? claim.getMember().getId() : null)
                // Assuming member name fetching is handled in service or query
                .serviceDate(claim.getServiceDate())
                .requestedAmount(claim.getRequestedAmount())
                .netProviderAmount(claim.getNetProviderAmount())
                .patientShare(claim.getPatientCoPay())
                .status(claim.getStatus().name())
                .diagnosisDescription(claim.getDiagnosisDescription())
                .build();
    }
}
