package com.waad.tba.modules.claim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkClaimEntryDto {
    private String memberCardNumber;
    private String serviceCode;
    private LocalDate serviceDate;
    private String diagnosis;
    private Integer quantity; // Default to 1 if null
    private String notes;
}
