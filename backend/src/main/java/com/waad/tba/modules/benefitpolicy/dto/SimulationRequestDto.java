package com.waad.tba.modules.benefitpolicy.dto;

import com.waad.tba.modules.visit.entity.VisitType;
import lombok.Data;

/**
 * Request DTO for simulating benefit coverage.
 */
@Data
public class SimulationRequestDto {
    private Long policyId;
    private java.util.UUID serviceId;
    private VisitType encounterType;
}
