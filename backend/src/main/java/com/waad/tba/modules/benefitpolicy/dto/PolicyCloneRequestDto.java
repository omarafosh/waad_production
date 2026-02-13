package com.waad.tba.modules.benefitpolicy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

/**
 * DTO for requesting a policy clone.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyCloneRequestDto {
    private String newName;
    private Long targetEmployerOrgId;
    private LocalDate startDate;
    private LocalDate endDate;
}
