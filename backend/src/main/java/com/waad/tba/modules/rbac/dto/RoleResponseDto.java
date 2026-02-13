package com.waad.tba.modules.rbac.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponseDto {
    private Long id;
    private String name;
    private String nameAr;
    private String description;
    private String descriptionAr;
    private List<PermissionResponseDto> permissions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
