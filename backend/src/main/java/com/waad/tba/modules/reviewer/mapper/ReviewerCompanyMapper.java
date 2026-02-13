package com.waad.tba.modules.reviewer.mapper;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyCreateDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyResponseDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanySelectorDto;
import org.springframework.stereotype.Component;

/**
 * Reviewer Company mapper - maps Organization (type=REVIEWER) to Reviewer DTOs.
 */
@Component
public class ReviewerCompanyMapper {

    public ReviewerCompanyResponseDto toResponseDto(Organization entity) {
        if (entity == null) return null;
        
        return ReviewerCompanyResponseDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .medicalDirector(null) // Organization doesn't have medicalDirector field
                .phone(null) // Organization doesn't have phone field
                .email(null) // Organization doesn't have email field
                .address(null) // Organization doesn't have address field
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ReviewerCompanySelectorDto toSelectorDto(Organization entity) {
        if (entity == null) return null;
        
        return ReviewerCompanySelectorDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .nameAr(entity.getName())
                .build();
    }

    public Organization toEntity(ReviewerCompanyCreateDto dto) {
        if (dto == null) return null;
        
        return Organization.builder()
                .name(dto.getName())
                .code("REV-" + System.currentTimeMillis()) // Generate code
                .build();
    }

    public void updateEntityFromDto(Organization entity, ReviewerCompanyCreateDto dto) {
        if (dto == null) return;
        
        entity.setName(dto.getName());
        // Organization doesn't have medicalDirector, phone, email, address fields
        // These fields are not updated as Organization is simplified
    }
}

