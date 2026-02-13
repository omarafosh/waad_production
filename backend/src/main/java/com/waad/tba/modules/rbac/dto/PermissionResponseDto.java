package com.waad.tba.modules.rbac.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionResponseDto {
    private Long id;
    private String name;
    private String nameAr;
    private String description;
    private String descriptionAr;
    private String module;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private com.waad.tba.modules.rbac.entity.PermissionCategory category;
}
