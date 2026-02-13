package com.waad.tba.modules.systemadmin.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.systemadmin.dto.RoleCreateDto;
import com.waad.tba.modules.systemadmin.dto.RoleUpdateDto;
import com.waad.tba.modules.systemadmin.dto.RoleViewDto;
import com.waad.tba.security.rbac.RbacGuardService;
import com.waad.tba.security.rbac.SuperAdminOnly;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Role Management Service
 * Phase 2 - System Administration
 * 
 * Manages role CRUD operations and permission assignments (SUPER_ADMIN only)
 * 
 * SECURITY HARDENING (2026-01-13):
 * - All write operations require SUPER_ADMIN
 * - Protected system roles cannot be deleted
 * - SUPER_ADMIN role permissions cannot be modified
 * 
 * @version 2.0 - RBAC Hardening
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RoleManagementService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final RbacGuardService rbacGuard;

    /**
     * Get all roles with user counts
     */
    @Transactional(readOnly = true)
    public List<RoleViewDto> getAllRoles() {
        log.info("Fetching all roles");
        return roleRepository.findAll().stream()
                .map(this::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get role by ID
     */
    @Transactional(readOnly = true)
    public RoleViewDto getRoleById(Long id) {
        log.info("Fetching role by ID: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));
        return toViewDto(role);
    }

    /**
     * Get role by name
     */
    @Transactional(readOnly = true)
    public RoleViewDto getRoleByName(String name) {
        log.info("Fetching role by name: {}", name);
        Role role = roleRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + name));
        return toViewDto(role);
    }

    /**
     * Search roles
     */
    @Transactional(readOnly = true)
    public List<RoleViewDto> searchRoles(String query) {
        log.info("Searching roles with query: {}", query);
        return roleRepository.searchRoles(query).stream()
                .map(this::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Create new role
     * SUPER_ADMIN ONLY - enforced by @SuperAdminOnly annotation
     */
    @Transactional
    @SuperAdminOnly(message = "Only SUPER_ADMIN can create new roles")
    public RoleViewDto createRole(RoleCreateDto dto, String createdBy) {
        log.info("Creating role: {} by {}", dto.getName(), createdBy);

        // RBAC Guard: Validate role creation
        rbacGuard.validateRoleCreation(dto.getName());

        // Validation
        if (roleRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Role already exists: " + dto.getName());
        }

        // Resolve permissions
        Set<Permission> permissions = resolvePermissions(dto.getPermissions());

        // Build role
        Role role = Role.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .permissions(permissions)
                .build();

        Role saved = roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "ROLE_CREATED",
                "Role",
                saved.getId(),
                String.format("Created role: %s with %d permissions", saved.getName(), permissions.size()),
                null,
                createdBy,
                null,
                null
        );

        log.info("Role created successfully: {}", saved.getName());
        return toViewDto(saved);
    }

    /**
     * Update role
     * SUPER_ADMIN ONLY - enforced by @SuperAdminOnly annotation
     */
    @Transactional
    @SuperAdminOnly(message = "Only SUPER_ADMIN can update roles")
    public RoleViewDto updateRole(Long id, RoleUpdateDto dto, String updatedBy) {
        log.info("Updating role ID: {} by {}", id, updatedBy);

        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));

        // RBAC Guard: Validate role modification
        rbacGuard.validateRoleModification(role.getName());

        // Check name uniqueness (if changed)
        if (!role.getName().equals(dto.getName()) && roleRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Role name already exists: " + dto.getName());
        }

        // Update fields
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());

        // Update permissions
        if (dto.getPermissions() != null && !dto.getPermissions().isEmpty()) {
            role.setPermissions(resolvePermissions(dto.getPermissions()));
        }

        Role updated = roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "ROLE_UPDATED",
                "Role",
                updated.getId(),
                String.format("Updated role: %s", updated.getName()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("Role updated successfully: {}", updated.getName());
        return toViewDto(updated);
    }

    /**
     * Delete role
     * SUPER_ADMIN ONLY - enforced by @SuperAdminOnly annotation
     * Protected system roles cannot be deleted
     */
    @Transactional
    @SuperAdminOnly(message = "Only SUPER_ADMIN can delete roles")
    public void deleteRole(Long id, String deletedBy) {
        log.info("Deleting role ID: {} by {}", id, deletedBy);

        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));

        // RBAC Guard: Validate role deletion
        rbacGuard.validateRoleDeletion(role.getName());

        // Check if role is in use
        long userCount = countUsersWithRole(id);
        if (userCount > 0) {
            throw new IllegalStateException(
                    String.format("Cannot delete role '%s': %d users currently assigned", role.getName(), userCount)
            );
        }

        String roleName = role.getName();
        roleRepository.delete(role);

        // Audit log
        auditLogService.createAuditLog(
                "ROLE_DELETED",
                "Role",
                id,
                String.format("Deleted role: %s", roleName),
                null,
                deletedBy,
                null,
                null
        );

        log.info("Role deleted successfully: {}", roleName);
    }

    /**
     * Assign permissions to role
     * SUPER_ADMIN ONLY
     */
    @Transactional
    @SuperAdminOnly(message = "Only SUPER_ADMIN can assign permissions to roles")
    public RoleViewDto assignPermissions(Long roleId, List<String> permissionNames, String updatedBy) {
        log.info("Assigning permissions {} to role ID: {}", permissionNames, roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        // RBAC Guard: Validate role modification
        rbacGuard.validateRoleModification(role.getName());

        Set<Permission> newPermissions = resolvePermissions(permissionNames);
        role.getPermissions().addAll(newPermissions);
        Role updated = roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "ROLE_PERMISSIONS_ASSIGNED",
                "Role",
                updated.getId(),
                String.format("Assigned %d permissions to role: %s", permissionNames.size(), updated.getName()),
                null,
                updatedBy,
                null,
                null
        );

        return toViewDto(updated);
    }

    /**
     * Remove permissions from role
     * SUPER_ADMIN ONLY
     */
    @Transactional
    @SuperAdminOnly(message = "Only SUPER_ADMIN can remove permissions from roles")
    public RoleViewDto removePermissions(Long roleId, List<String> permissionNames, String updatedBy) {
        log.info("Removing permissions {} from role ID: {}", permissionNames, roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        // RBAC Guard: Validate role modification
        rbacGuard.validateRoleModification(role.getName());

        Set<Permission> permissionsToRemove = resolvePermissions(permissionNames);
        role.getPermissions().removeAll(permissionsToRemove);
        Role updated = roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "ROLE_PERMISSIONS_REMOVED",
                "Role",
                updated.getId(),
                String.format("Removed %d permissions from role: %s", permissionNames.size(), updated.getName()),
                null,
                updatedBy,
                null,
                null
        );

        return toViewDto(updated);
    }

    /**
     * Get users with specific role
     */
    @Transactional(readOnly = true)
    public List<String> getUsersWithRole(Long roleId) {
        log.info("Fetching users with role ID: {}", roleId);
        
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        return userRepository.findAll().stream()
                .filter(user -> user.getRoles().contains(role))
                .map(User::getUsername)
                .collect(Collectors.toList());
    }

    /**
     * Count users with role
     */
    @Transactional(readOnly = true)
    public long countUsersWithRole(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        return userRepository.findAll().stream()
                .filter(user -> user.getRoles().contains(role))
                .count();
    }

    // Helper methods
    private Set<Permission> resolvePermissions(List<String> permissionNames) {
        Set<Permission> permissions = new HashSet<>();
        for (String permissionName : permissionNames) {
            Permission permission = permissionRepository.findByName(permissionName)
                    .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionName));
            permissions.add(permission);
        }
        return permissions;
    }

    private RoleViewDto toViewDto(Role role) {
        return RoleViewDto.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions().stream()
                        .map(Permission::getName)
                        .collect(Collectors.toList()))
                .userCount((int) countUsersWithRole(role.getId()))
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }
}
