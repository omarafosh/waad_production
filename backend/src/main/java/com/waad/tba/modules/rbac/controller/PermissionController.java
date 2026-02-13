package com.waad.tba.modules.rbac.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.rbac.dto.PermissionCreateDto;
import com.waad.tba.modules.rbac.dto.PermissionResponseDto;
import com.waad.tba.modules.rbac.service.PermissionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
@Tag(name = "RBAC - Permissions", description = "APIs for managing permissions")
public class PermissionController {

        private final PermissionService permissionService;

        @GetMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_VIEW')")
        @Operation(summary = "List all permissions", description = "Returns all permissions.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Not Found", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal Server Error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<PermissionResponseDto>>> getAllPermissions() {
                List<PermissionResponseDto> permissions = permissionService.findAll();
                return ResponseEntity.ok(ApiResponse.success(permissions));
        }

        @GetMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_VIEW')")
        @Operation(summary = "Get permission by ID", description = "Returns a permission by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Permission not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<PermissionResponseDto>> getPermissionById(
                        @Parameter(name = "id", description = "Permission ID", required = true) @PathVariable Long id) {
                PermissionResponseDto permission = permissionService.findById(id);
                return ResponseEntity.ok(ApiResponse.success(permission));
        }

        @PostMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_MANAGE')")
        @Operation(summary = "Create permission", description = "Creates a new permission.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Permission created successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<PermissionResponseDto>> createPermission(
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Permission creation payload") @Valid @RequestBody PermissionCreateDto dto) {
                PermissionResponseDto createdPermission = permissionService.create(dto);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success("Permission created successfully", createdPermission));
        }

        @PutMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_MANAGE')")
        @Operation(summary = "Update permission", description = "Updates an existing permission by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission updated successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Permission not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<PermissionResponseDto>> updatePermission(
                        @Parameter(name = "id", description = "Permission ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Permission update payload") @Valid @RequestBody PermissionCreateDto dto) {
                PermissionResponseDto updatedPermission = permissionService.update(id, dto);
                return ResponseEntity.ok(ApiResponse.success("Permission updated successfully", updatedPermission));
        }

        @DeleteMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_MANAGE')")
        @Operation(summary = "Delete permission", description = "Deletes a permission by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission deleted successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Permission not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<Void>> deletePermission(
                        @Parameter(name = "id", description = "Permission ID", required = true) @PathVariable Long id) {
                permissionService.delete(id);
                return ResponseEntity.ok(ApiResponse.success("Permission deleted successfully", null));
        }

        @GetMapping("/search")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_VIEW')")
        @Operation(summary = "Search permissions", description = "Search permissions by query string.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<List<PermissionResponseDto>>> searchPermissions(
                        @Parameter(name = "query", description = "Search query", required = true) @RequestParam String query) {
                List<PermissionResponseDto> permissions = permissionService.search(query);
                return ResponseEntity.ok(ApiResponse.success(permissions));
        }

        @GetMapping("/paginate")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('PERMISSION_VIEW')")
        @Operation(summary = "Paginate permissions", description = "Returns a page of permissions.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permissions page retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<Page<PermissionResponseDto>>> getPermissionsPaginated(
                        @Parameter(name = "page", description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
                        @Parameter(name = "size", description = "Page size") @RequestParam(defaultValue = "10") int size) {
                Page<PermissionResponseDto> permissions = permissionService
                                .findAllPaginated(PageRequest.of(page, size));
                return ResponseEntity.ok(ApiResponse.success(permissions));
        }
}
