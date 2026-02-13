package com.waad.tba.modules.rbac.mapper;

import com.waad.tba.modules.rbac.dto.RoleCreateDto;
import com.waad.tba.modules.rbac.dto.RoleResponseDto;
import com.waad.tba.modules.rbac.entity.Role;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class RoleMapper {

    private final PermissionMapper permissionMapper;

    public RoleMapper(PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

    public RoleResponseDto toResponseDto(Role role) {
        if (role == null) return null;
        
        return RoleResponseDto.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions() != null ?
                           role.getPermissions().stream()
                               .map(permissionMapper::toResponseDto)
                               .collect(Collectors.toList()) : null)
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }

    public Role toEntity(RoleCreateDto dto) {
        if (dto == null) return null;
        
        return Role.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .build();
    }

    public void updateEntityFromDto(Role role, RoleCreateDto dto) {
        if (dto == null) return;
        
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
    }
}
