package com.waad.tba.modules.systemadmin.dto;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Permission Matrix (Roles × Permissions)
 * Phase 2 - System Administration - Permission Matrix
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionMatrixDto {
    
    private List<RolePermissionDto> roles;
    private List<String> allPermissions;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RolePermissionDto {
        private Long roleId;
        private String roleName;
        private String roleNameAr;
        private List<String> permissions;
        private Map<String, Boolean> permissionMap;
    }

    private List<CategoryPermissionsDto> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryPermissionsDto {
        private String name;
        private String nameAr;
        private List<PermissionDto> permissions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PermissionDto {
        private Long id;
        private String name;
        private String displayNameAr;
    }
}
