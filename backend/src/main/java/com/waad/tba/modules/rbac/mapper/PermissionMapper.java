package com.waad.tba.modules.rbac.mapper;

import com.waad.tba.modules.rbac.dto.PermissionCreateDto;
import com.waad.tba.modules.rbac.dto.PermissionResponseDto;
import com.waad.tba.modules.rbac.entity.Permission;
import org.springframework.stereotype.Component;

@Component
public class PermissionMapper {

    public PermissionResponseDto toResponseDto(Permission permission) {
        if (permission == null) return null;
        
        return PermissionResponseDto.builder()
                .id(permission.getId())
                .name(permission.getName())
                .nameAr(permission.getNameAr())
                .description(permission.getDescription())
                .descriptionAr(permission.getDescriptionAr())
                .module(permission.getModule())
                .category(permission.getCategory())
                .createdAt(permission.getCreatedAt())
                .updatedAt(permission.getUpdatedAt())
                .build();
    }

    public Permission toEntity(PermissionCreateDto dto) {
        if (dto == null) return null;
        
        return Permission.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .build();
    }

    public void updateEntityFromDto(Permission permission, PermissionCreateDto dto) {
        if (dto == null) return;
        
        permission.setName(dto.getName());
        permission.setDescription(dto.getDescription());
    }
}
