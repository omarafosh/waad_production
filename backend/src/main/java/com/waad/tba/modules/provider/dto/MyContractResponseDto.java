package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

/**
 * Response DTO for my-contract endpoint
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyContractResponseDto {
    private Long id;
    private Long providerId;
    private String providerName;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean hasActiveContract;
    private Long totalServices;
    private String errorMessage;
}
