package com.waad.tba.modules.systemadmin.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.systemadmin.dto.PermissionMatrixDto;
import com.waad.tba.modules.systemadmin.service.PermissionMatrixService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Permission Matrix Controller
 * Phase 2 - System Administration
 * 
 * REST API for permission matrix and role-permission assignments (SUPER_ADMIN only)
 * Base path: /api/admin/permission-matrix
 * 
 * NOTE: This controller manages ONLY permission-role relationships and matrix views.
 * For Permission CRUD operations, use /api/admin/permissions (PermissionController in RBAC module).
 */
@RestController
@RequestMapping("/api/admin/permission-matrix")
@Tag(name = "Permission Matrix", description = "Permission matrix and role-permission assignments (SUPER_ADMIN only)")
@Slf4j
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PermissionMatrixController {

    private final PermissionMatrixService permissionService;

    /**
     * GET /api/admin/permission-matrix
     * Get permission matrix (roles × permissions)
     */
    @GetMapping
    @Operation(summary = "Get permission matrix", description = "Build complete permission matrix (all roles × all permissions)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission matrix built successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<PermissionMatrixDto> getPermissionMatrix() {
        log.info("GET /api/admin/permission-matrix");
        PermissionMatrixDto matrix = permissionService.getPermissionMatrix();
        return ApiResponse.success("Permission matrix built successfully", matrix);
    }

    /**
     * POST /api/admin/permission-matrix/assign
     * Assign permission to role
     */
    @PostMapping("/assign")
    @Operation(summary = "Assign permission to role", description = "Add a permission to a role")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission assigned successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role or permission not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<Void> assignPermissionToRole(@RequestBody Map<String, Long> payload,
                                                     Authentication authentication) {
        log.info("POST /api/admin/permission-matrix/assign");
        Long roleId = payload.get("roleId");
        Long permissionId = payload.get("permissionId");
        
        if (roleId == null || permissionId == null) {
            return ApiResponse.error("roleId and permissionId are required");
        }
        
        String updatedBy = authentication.getName();
        permissionService.assignPermissionToRole(roleId, permissionId, updatedBy);
        return ApiResponse.success("Permission assigned successfully", null);
    }

    /**
     * POST /api/admin/permission-matrix/remove
     * Remove permission from role
     */
    @PostMapping("/remove")
    @Operation(summary = "Remove permission from role", description = "Remove a permission from a role")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission removed successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role or permission not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<Void> removePermissionFromRole(@RequestBody Map<String, Long> payload,
                                                       Authentication authentication) {
        log.info("POST /api/admin/permission-matrix/remove");
        Long roleId = payload.get("roleId");
        Long permissionId = payload.get("permissionId");
        
        if (roleId == null || permissionId == null) {
            return ApiResponse.error("roleId and permissionId are required");
        }
        
        String updatedBy = authentication.getName();
        permissionService.removePermissionFromRole(roleId, permissionId, updatedBy);
        return ApiResponse.success("Permission removed successfully", null);
    }

    /**
     * GET /api/admin/permission-matrix/role/{roleId}
     * Get permissions for specific role
     */
    @GetMapping("/role/{roleId}")
    @Operation(summary = "Get permissions for role", description = "List all permissions assigned to a role")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<List<Map<String, Object>>> getPermissionsForRole(@PathVariable Long roleId) {
        log.info("GET /api/admin/permission-matrix/role/{}", roleId);
        List<Map<String, Object>> permissions = permissionService.getPermissionsForRole(roleId);
        return ApiResponse.success("Permissions retrieved successfully", permissions);
    }

    /**
     * GET /api/admin/permission-matrix/user/{userId}
     * Get effective permissions for user
     */
    @GetMapping("/user/{userId}")
    @Operation(summary = "Get effective permissions for user", 
               description = "Get aggregated permissions from all user's roles")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Effective permissions retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<Set<String>> getEffectivePermissionsForUser(@PathVariable Long userId) {
        log.info("GET /api/admin/permission-matrix/user/{}", userId);
        Set<String> permissions = permissionService.getEffectivePermissionsForUser(userId);
        return ApiResponse.success("Effective permissions retrieved successfully", permissions);
    }

    /**
     * POST /api/admin/permission-matrix/bulk-assign
     * Bulk assign permissions to role
     */
    @PostMapping("/bulk-assign")
    @Operation(summary = "Bulk assign permissions", description = "Assign multiple permissions to a role at once")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions assigned successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role or permission not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<Void> bulkAssignPermissions(@RequestBody Map<String, Object> payload,
                                                   Authentication authentication) {
        log.info("POST /api/admin/permission-matrix/bulk-assign");
        Long roleId = ((Number) payload.get("roleId")).longValue();
        @SuppressWarnings("unchecked")
        List<Number> permissionIds = (List<Number>) payload.get("permissionIds");
        
        if (permissionIds == null || permissionIds.isEmpty()) {
            return ApiResponse.error("roleId and permissionIds are required");
        }
        
        List<Long> ids = permissionIds.stream()
                .map(Number::longValue)
                .toList();
        
        String updatedBy = authentication.getName();
        permissionService.bulkAssignPermissionsToRole(roleId, ids, updatedBy);
        return ApiResponse.success("Permissions assigned successfully", null);
    }

    /**
     * POST /api/admin/permission-matrix/bulk-remove
     * Bulk remove permissions from role
     */
    @PostMapping("/bulk-remove")
    @Operation(summary = "Bulk remove permissions", description = "Remove multiple permissions from a role at once")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions removed successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role or permission not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<Void> bulkRemovePermissions(@RequestBody Map<String, Object> payload,
                                                   Authentication authentication) {
        log.info("POST /api/admin/permission-matrix/bulk-remove");
        Long roleId = ((Number) payload.get("roleId")).longValue();
        @SuppressWarnings("unchecked")
        List<Number> permissionIds = (List<Number>) payload.get("permissionIds");
        
        if (permissionIds == null || permissionIds.isEmpty()) {
            return ApiResponse.error("roleId and permissionIds are required");
        }
        
        List<Long> ids = permissionIds.stream()
                .map(Number::longValue)
                .toList();
        
        String updatedBy = authentication.getName();
        permissionService.bulkRemovePermissionsFromRole(roleId, ids, updatedBy);
        return ApiResponse.success("Permissions removed successfully", null);
    }
}
