package com.waad.tba.modules.rbac.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
@Tag(name = "RBAC - Roles", description = "APIs for managing roles and their permissions")
public class RoleController {

        private final RoleService roleService;

        @GetMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_VIEW')")
        @Operation(summary = "List all roles", description = "Returns all roles.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Roles retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Not Found", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal Server Error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<RoleResponseDto>>> getAllRoles() {
                List<RoleResponseDto> roles = roleService.findAll();
                return ResponseEntity.ok(ApiResponse.success(roles));
        }

        @GetMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_VIEW')")
        @Operation(summary = "Get role by ID", description = "Returns a role by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Role retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<RoleResponseDto>> getRoleById(
                        @Parameter(name = "id", description = "Role ID", required = true) @PathVariable Long id) {
                RoleResponseDto role = roleService.findById(id);
                return ResponseEntity.ok(ApiResponse.success(role));
        }

        @PostMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_CREATE')")
        @Operation(summary = "Create role", description = "Creates a new role.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Role created successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<RoleResponseDto>> createRole(
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Role creation payload") @Valid @RequestBody RoleCreateDto dto) {
                RoleResponseDto createdRole = roleService.create(dto);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success("Role created successfully", createdRole));
        }

        @PutMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_UPDATE')")
        @Operation(summary = "Update role", description = "Updates an existing role by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Role updated successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<RoleResponseDto>> updateRole(
                        @Parameter(name = "id", description = "Role ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Role update payload") @Valid @RequestBody RoleCreateDto dto) {
                RoleResponseDto updatedRole = roleService.update(id, dto);
                return ResponseEntity.ok(ApiResponse.success("Role updated successfully", updatedRole));
        }

        @DeleteMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_DELETE')")
        @Operation(summary = "Delete role", description = "Deletes a role by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Role deleted successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<Void>> deleteRole(
                        @Parameter(name = "id", description = "Role ID", required = true) @PathVariable Long id) {
                roleService.delete(id);
                return ResponseEntity.ok(ApiResponse.success("Role deleted successfully", null));
        }

        @GetMapping("/search")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_VIEW')")
        @Operation(summary = "Search roles", description = "Search roles by query string.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Roles retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<RoleResponseDto>>> searchRoles(
                        @Parameter(name = "query", description = "Search query", required = true) @RequestParam String query) {
                List<RoleResponseDto> roles = roleService.search(query);
                return ResponseEntity.ok(ApiResponse.success(roles));
        }

        @GetMapping("/paginate")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_VIEW')")
        @Operation(summary = "Paginate roles", description = "Returns a page of roles.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Roles page retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<Page<RoleResponseDto>>> getRolesPaginated(
                        @Parameter(name = "page", description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
                        @Parameter(name = "size", description = "Page size") @RequestParam(defaultValue = "10") int size) {
                Page<RoleResponseDto> roles = roleService.findAllPaginated(PageRequest.of(page, size));
                return ResponseEntity.ok(ApiResponse.success(roles));
        }

        @PostMapping("/{id:\\d+}/assign-permissions")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_ASSIGN')")
        @Operation(summary = "Assign permissions to role", description = "Assigns one or more permissions to a role.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions assigned successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Role not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<RoleResponseDto>> assignPermissions(
                        @Parameter(name = "id", description = "Role ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Permission assignment payload") @Valid @RequestBody AssignPermissionsDto dto) {
                RoleResponseDto role = roleService.assignPermissions(id, dto);
                return ResponseEntity.ok(ApiResponse.success("Permissions assigned successfully", role));
        }
}
