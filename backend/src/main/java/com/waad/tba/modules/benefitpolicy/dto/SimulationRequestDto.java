package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.visit.entity.VisitType;
import lombok.Data;

/**
 * Request DTO for simulating benefit coverage.
 */
@Data
public class SimulationRequestDto {
    private Long policyId;
    private Long serviceId;
    private VisitType encounterType;
}
