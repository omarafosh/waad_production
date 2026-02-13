package com.waad.tba.modules.rbac.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.service.UserService;
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

/**
 * User Management Controller
 * 
 * RBAC HARDENING (2026-01-13):
 * - User management requires INSURANCE_ADMIN or SUPER_ADMIN
 * - Role hierarchy enforced in service layer
 * - SUPER_ADMIN protection on delete/update operations
 * 
 * @version 2.0 - RBAC Hardening
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Tag(name = "RBAC - Users", description = "APIs for managing users and their roles/permissions")
public class UserController {

        private final UserService userService;

        @GetMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_VIEW')")
        @Operation(summary = "List all users", description = "Returns all users.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad Request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Not Found", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal Server Error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<UserResponseDto>>> getAllUsers() {
                List<UserResponseDto> users = userService.findAll();
                return ResponseEntity.ok(ApiResponse.success(users));
        }

        @GetMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_VIEW')")
        @Operation(summary = "Get user by ID", description = "Returns a user by ID.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<UserResponseDto>> getUserById(
                        @Parameter(name = "id", description = "User ID", required = true) @PathVariable Long id) {
                UserResponseDto user = userService.findById(id);
                return ResponseEntity.ok(ApiResponse.success(user));
        }

        @PostMapping
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_CREATE')")
        @Operation(summary = "Create user", description = "Creates a new user. INSURANCE_ADMIN can create users except SUPER_ADMIN.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "User created successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<UserResponseDto>> createUser(
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "User creation payload") @Valid @RequestBody UserCreateDto dto) {
                UserResponseDto createdUser = userService.create(dto);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success("User created successfully", createdUser));
        }

        @PutMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_UPDATE')")
        @Operation(summary = "Update user", description = "Updates an existing user by ID. Role hierarchy enforced.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User updated successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<UserResponseDto>> updateUser(
                        @Parameter(name = "id", description = "User ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "User update payload") @Valid @RequestBody UserUpdateDto dto) {
                UserResponseDto updatedUser = userService.update(id, dto);
                return ResponseEntity.ok(ApiResponse.success("User updated successfully", updatedUser));
        }

        @DeleteMapping("/{id:\\d+}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_DELETE')")
        @Operation(summary = "Delete user", description = "Deletes a user by ID. SUPER_ADMIN users can only be deleted by SUPER_ADMIN.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User deleted successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<Void>> deleteUser(
                        @Parameter(name = "id", description = "User ID", required = true) @PathVariable Long id) {
                userService.delete(id);
                return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
        }

        @GetMapping("/search")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_VIEW')")
        @Operation(summary = "Search users", description = "Search users by query string.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<List<UserResponseDto>>> searchUsers(
                        @Parameter(name = "query", description = "Search query", required = true) @RequestParam String query) {
                List<UserResponseDto> users = userService.search(query);
                return ResponseEntity.ok(ApiResponse.success(users));
        }

        @GetMapping("/provider/{providerId}")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_VIEW')")
        @Operation(summary = "Get users by provider ID", description = "Returns all users associated with a specific provider.")
        public ResponseEntity<ApiResponse<List<UserResponseDto>>> getUsersByProvider(
                        @Parameter(name = "providerId", description = "Provider ID", required = true) 
                        @PathVariable("providerId") Long providerId) {
                List<UserResponseDto> users = userService.findByProviderId(providerId);
                return ResponseEntity.ok(ApiResponse.success(users));
        }

        @GetMapping("/unassigned-providers")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_VIEW')")
        @Operation(summary = "Get unassigned provider users", description = "Returns users with PROVIDER role who are not linked to any provider.")
        public ResponseEntity<ApiResponse<List<UserResponseDto>>> getUnassignedProviderUsers() {
                List<UserResponseDto> users = userService.findUnassignedProviders();
                return ResponseEntity.ok(ApiResponse.success(users));
        }

        @GetMapping("/paginate")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_VIEW')")
        @Operation(summary = "Paginate users", description = "Returns a page of users.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Users page retrieved successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<Page<UserResponseDto>>> getUsersPaginated(
                        @Parameter(name = "page", description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
                        @Parameter(name = "size", description = "Page size") @RequestParam(defaultValue = "10") int size) {
                Page<UserResponseDto> users = userService.findAllPaginated(PageRequest.of(page, size));
                return ResponseEntity.ok(ApiResponse.success(users));
        }

    @PostMapping("/{id:\\d+}/assign-roles")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_ASSIGN')")
        @Operation(summary = "Assign roles to user", description = "Assigns one or more roles to a user. Role hierarchy enforced - cannot assign SUPER_ADMIN unless you are SUPER_ADMIN.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Roles assigned successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<UserResponseDto>> assignRoles(
                        @Parameter(name = "id", description = "User ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Role assignment payload") @Valid @RequestBody AssignRolesDto dto) {
                UserResponseDto user = userService.assignRoles(id, dto);
                return ResponseEntity.ok(ApiResponse.success("Roles assigned successfully", user));
        }

        @PostMapping("/{id:\\d+}/remove-roles")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('ROLE_ASSIGN')")
        @Operation(summary = "Remove roles from user", description = "Removes one or more roles from a user.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Roles removed successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User or Role not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error")
        })
        public ResponseEntity<ApiResponse<UserResponseDto>> removeRoles(
                        @Parameter(name = "id", description = "User ID", required = true) @PathVariable Long id,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Role removal payload") @Valid @RequestBody AssignRolesDto dto) {
                UserResponseDto user = userService.removeRoles(id, dto);
                return ResponseEntity.ok(ApiResponse.success("Roles removed successfully", user));
        }

        @PatchMapping("/{id:\\d+}/toggle-status")
        @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('USER_UPDATE')")
        @Operation(summary = "Toggle user status", description = "Activates or deactivates a user. SUPER_ADMIN users cannot be deactivated.")
        @ApiResponses({
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User status toggled successfully"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found"),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Cannot deactivate SUPER_ADMIN", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized request", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class))),
                        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server error", content = @io.swagger.v3.oas.annotations.media.Content(schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.waad.tba.common.error.ApiError.class)))
        })
        public ResponseEntity<ApiResponse<UserResponseDto>> toggleUserStatus(
                        @Parameter(name = "id", description = "User ID", required = true) @PathVariable Long id) {
                UserResponseDto user = userService.toggleStatus(id);
                String message = Boolean.TRUE.equals(user.getActive()) ? "تم تفعيل المستخدم بنجاح" : "تم تعطيل المستخدم بنجاح";
                return ResponseEntity.ok(ApiResponse.success(message, user));
        }
}
