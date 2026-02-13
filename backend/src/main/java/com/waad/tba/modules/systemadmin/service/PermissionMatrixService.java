package com.waad.tba.modules.systemadmin.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
import com.waad.tba.modules.systemadmin.dto.PermissionMatrixDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Permission Matrix Service
 * Phase 2 - System Administration
 * 
 * Manages permission matrix and permission-role assignments (SUPER_ADMIN only)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PermissionMatrixService {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    /**
     * Get all permissions
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllPermissions() {
        log.info("Fetching all permissions");
        return permissionRepository.findAll().stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    /**
     * Get permission matrix (all roles × all permissions)
     */
    @Transactional(readOnly = true)
    public PermissionMatrixDto getPermissionMatrix() {
        log.info("Building permission matrix");

        List<Role> allRoles = roleRepository.findAll();
        List<Permission> allPermissions = permissionRepository.findAll();

        // Build role permission DTOs
        List<PermissionMatrixDto.RolePermissionDto> rolePermissions = allRoles.stream()
                .map(role -> {
                    Set<String> rolePermissionNames = role.getPermissions().stream()
                            .map(Permission::getName)
                            .collect(Collectors.toSet());

                    Map<String, Boolean> permissionMap = allPermissions.stream()
                            .collect(Collectors.toMap(
                                    Permission::getName,
                                    p -> rolePermissionNames.contains(p.getName())
                            ));

                    return PermissionMatrixDto.RolePermissionDto.builder()
                            .roleId(role.getId())
                            .roleName(role.getName())
                            .roleNameAr(role.getNameAr()) // Populate Arabic name
                            .permissions(new ArrayList<>(rolePermissionNames))
                            .permissionMap(permissionMap)
                            .build();
                })
                .collect(Collectors.toList());

        // Group permissions by module
        Map<String, List<Permission>> permissionsByModule = allPermissions.stream()
                .collect(Collectors.groupingBy(p -> p.getModule() != null ? p.getModule() : "Other"));

        List<PermissionMatrixDto.CategoryPermissionsDto> categories = permissionsByModule.entrySet().stream()
                .map(entry -> {
                    List<PermissionMatrixDto.PermissionDto> permDtos = entry.getValue().stream()
                            .map(p -> PermissionMatrixDto.PermissionDto.builder()
                                    .id(p.getId())
                                    .name(p.getName())
                                    .displayNameAr(p.getNameAr()) // Using nameAr from Permission entity
                                    .build())
                            .collect(Collectors.toList());

                    return PermissionMatrixDto.CategoryPermissionsDto.builder()
                            .name(entry.getKey())
                            .nameAr(entry.getKey()) // You might want a mapping for Arabic names
                            .permissions(permDtos)
                            .build();
                })
                .collect(Collectors.toList());

        List<String> allPermissionNames = allPermissions.stream()
                .map(Permission::getName)
                .collect(Collectors.toList());

        return PermissionMatrixDto.builder()
                .roles(rolePermissions)
                .categories(categories)
                .allPermissions(allPermissionNames)
                .build();
    }

    /**
     * Assign permission to role
     */
    @Transactional
    public void assignPermissionToRole(Long roleId, Long permissionId, String updatedBy) {
        log.info("Assigning permission ID {} to role ID {} by {}", permissionId, roleId, updatedBy);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found with ID: " + permissionId));

        role.getPermissions().add(permission);
        roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "PERMISSION_ASSIGNED_TO_ROLE",
                "RolePermission",
                roleId,
                String.format("Assigned permission '%s' to role '%s'", permission.getName(), role.getName()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("Permission '{}' assigned to role '{}'", permission.getName(), role.getName());
    }

    /**
     * Remove permission from role
     */
    @Transactional
    public void removePermissionFromRole(Long roleId, Long permissionId, String updatedBy) {
        log.info("Removing permission ID {} from role ID {} by {}", permissionId, roleId, updatedBy);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found with ID: " + permissionId));

        role.getPermissions().remove(permission);
        roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "PERMISSION_REMOVED_FROM_ROLE",
                "RolePermission",
                roleId,
                String.format("Removed permission '%s' from role '%s'", permission.getName(), role.getName()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("Permission '{}' removed from role '{}'", permission.getName(), role.getName());
    }

    /**
     * Get permissions for specific role
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPermissionsForRole(Long roleId) {
        log.info("Fetching permissions for role ID: {}", roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        return role.getPermissions().stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    /**
     * Get effective permissions for user (aggregated from all roles)
     */
    @Transactional(readOnly = true)
    public Set<String> getEffectivePermissionsForUser(Long userId) {
        log.info("Fetching effective permissions for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // Aggregate permissions from all roles
        Set<String> effectivePermissions = new HashSet<>();
        for (Role role : user.getRoles()) {
            effectivePermissions.addAll(
                    role.getPermissions().stream()
                            .map(Permission::getName)
                            .collect(Collectors.toSet())
            );
        }

        log.info("User {} has {} effective permissions", user.getUsername(), effectivePermissions.size());
        return effectivePermissions;
    }

    /**
     * Bulk assign permissions to role
     */
    @Transactional
    public void bulkAssignPermissionsToRole(Long roleId, List<Long> permissionIds, String updatedBy) {
        log.info("Bulk assigning {} permissions to role ID: {}", permissionIds.size(), roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        for (Long permissionId : permissionIds) {
            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Permission not found with ID: " + permissionId));
            role.getPermissions().add(permission);
        }

        roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "PERMISSIONS_BULK_ASSIGNED",
                "Role",
                roleId,
                String.format("Bulk assigned %d permissions to role '%s'", permissionIds.size(), role.getName()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("Bulk assigned {} permissions to role '{}'", permissionIds.size(), role.getName());
    }

    /**
     * Bulk remove permissions from role
     */
    @Transactional
    public void bulkRemovePermissionsFromRole(Long roleId, List<Long> permissionIds, String updatedBy) {
        log.info("Bulk removing {} permissions from role ID: {}", permissionIds.size(), roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + roleId));

        for (Long permissionId : permissionIds) {
            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Permission not found with ID: " + permissionId));
            role.getPermissions().remove(permission);
        }

        roleRepository.save(role);

        // Audit log
        auditLogService.createAuditLog(
                "PERMISSIONS_BULK_REMOVED",
                "Role",
                roleId,
                String.format("Bulk removed %d permissions from role '%s'", permissionIds.size(), role.getName()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("Bulk removed {} permissions from role '{}'", permissionIds.size(), role.getName());
    }

    /**
     * Search permissions
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> searchPermissions(String query) {
        log.info("Searching permissions with query: {}", query);
        return permissionRepository.searchPermissions(query).stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    // Helper methods
    private Map<String, Object> toMap(Permission permission) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", permission.getId());
        map.put("name", permission.getName());
        map.put("description", permission.getDescription());
        map.put("module", permission.getModule());
        map.put("createdAt", permission.getCreatedAt());
        map.put("updatedAt", permission.getUpdatedAt());
        return map;
    }
}
