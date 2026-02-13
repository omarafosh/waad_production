package com.waad.tba.modules.systemadmin.controller;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.systemadmin.dto.RoleViewDto;
import com.waad.tba.modules.systemadmin.service.RoleManagementService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Role Management Controller
 * Phase 2 - System Administration
 * 
 * REST API for role-user relationship management (SUPER_ADMIN only)
 * Base path: /api/admin/role-management
 * 
 * NOTE: This controller manages ONLY role-user relationships and role-permission assignments.
 * For Role CRUD operations, use /api/admin/roles (RoleController in RBAC module).
 */
@RestController
@RequestMapping("/api/admin/role-management")
@Tag(name = "Role Management", description = "Role-user relationships and role-permission assignments (SUPER_ADMIN only)")
@Slf4j
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class RoleManagementController {

    private final RoleManagementService roleManagementService;

    /**
     * GET /api/admin/role-management/{id}/users
     * Get users with specific role
     */
    @GetMapping("/{id}/users")
    @Operation(summary = "Get users with role", description = "List all users assigned to this role")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<List<String>> getUsersWithRole(@PathVariable Long id) {
        log.info("GET /api/admin/role-management/{}/users", id);
        List<String> usernames = roleManagementService.getUsersWithRole(id);
        return ApiResponse.success("Users retrieved successfully", usernames);
    }

    /**
     * PUT /api/admin/role-management/{id}/permissions
     * Assign permissions to role
     */
    @PutMapping("/{id}/permissions")
    @Operation(summary = "Assign permissions to role", description = "Add permissions to a role")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions assigned successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role or permission not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<RoleViewDto> assignPermissions(@PathVariable Long id,
                                                      @RequestBody Map<String, List<String>> payload,
                                                      Authentication authentication) {
        log.info("PUT /api/admin/role-management/{}/permissions", id);
        List<String> permissionNames = payload.get("permissions");
        if (permissionNames == null || permissionNames.isEmpty()) {
            return ApiResponse.error("Permissions list is required");
        }
        String updatedBy = authentication.getName();
        RoleViewDto updated = roleManagementService.assignPermissions(id, permissionNames, updatedBy);
        return ApiResponse.success("Permissions assigned successfully", updated);
    }

    /**
     * DELETE /api/admin/role-management/{id}/permissions
     * Remove permissions from role
     */
    @DeleteMapping("/{id}/permissions")
    @Operation(summary = "Remove permissions from role", description = "Remove permissions from a role")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions removed successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role or permission not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - SUPER_ADMIN only")
    })
    public ApiResponse<RoleViewDto> removePermissions(@PathVariable Long id,
                                                      @RequestBody Map<String, List<String>> payload,
                                                      Authentication authentication) {
        log.info("DELETE /api/admin/role-management/{}/permissions", id);
        List<String> permissionNames = payload.get("permissions");
        if (permissionNames == null || permissionNames.isEmpty()) {
            return ApiResponse.error("Permissions list is required");
        }
        String updatedBy = authentication.getName();
        RoleViewDto updated = roleManagementService.removePermissions(id, permissionNames, updatedBy);
        return ApiResponse.success("Permissions removed successfully", updated);
    }
}
