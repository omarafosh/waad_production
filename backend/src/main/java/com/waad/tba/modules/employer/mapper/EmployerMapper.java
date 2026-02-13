package com.waad.tba.modules.employer.mapper;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.modules.employer.dto.EmployerResponseDto;
import com.waad.tba.modules.employer.dto.EmployerSelectorDto;
import org.springframework.stereotype.Component;

/**
 * Employer mapper - maps Organization (type=EMPLOYER) to Employer DTOs.
 * Simplified: Arabic name only (no English name)
 */
@Component
public class EmployerMapper {

    /**
     * Map Organization entity to EmployerResponseDto
     * 
     * Field Mapping:
     * - org.name → dto.name (will be serialized as 'nameAr' via @JsonProperty)
     * - org.code → dto.code
     * - org.active → dto.active
     * - org.archived → dto.archived
     * - Includes audit timestamps
     */
    public EmployerResponseDto toResponse(Organization org) {
        return EmployerResponseDto.builder()
                .id(org.getId())
                .code(org.getCode())
                .name(org.getName())  // Arabic name - will be serialized as 'nameAr'
                .active(org.isActive())
                .archived(org.isArchived())
                .createdAt(org.getCreatedAt())
                .updatedAt(org.getUpdatedAt())
                .build();
    }

    /**
     * Map Organization entity to EmployerSelectorDto (for dropdowns)
     */
    public EmployerSelectorDto toSelector(Organization org) {
        return EmployerSelectorDto.builder()
                .id(org.getId())
                .label(org.getName())  // Use Arabic name for display
                .code(org.getCode())   // Include code for filtering
                .build();
    }
}


