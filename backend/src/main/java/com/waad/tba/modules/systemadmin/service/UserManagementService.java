package com.waad.tba.modules.systemadmin.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.systemadmin.dto.UserCreateDto;
import com.waad.tba.modules.systemadmin.dto.UserUpdateDto;
import com.waad.tba.modules.systemadmin.dto.UserViewDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * User Management Service
 * Phase 2 - System Administration
 * 
 * Manages user CRUD operations (SUPER_ADMIN only)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    /**
     * Get all users (paginated)
     */
    @Transactional(readOnly = true)
    public Page<UserViewDto> getAllUsers(Pageable pageable) {
        log.info("Fetching all users (page {})", pageable.getPageNumber());
        return userRepository.findAll(pageable).map(this::toViewDto);
    }

    /**
     * Get user by ID
     */
    @Transactional(readOnly = true)
    public UserViewDto getUserById(Long id) {
        log.info("Fetching user by ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return toViewDto(user);
    }

    /**
     * Search users
     */
    @Transactional(readOnly = true)
    public List<UserViewDto> searchUsers(String query) {
        log.info("Searching users with query: {}", query);
        return userRepository.searchUsers(query).stream()
                .map(this::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Create new user
     */
    @Transactional
    public UserViewDto createUser(UserCreateDto dto, String createdBy) {
        log.info("Creating user: {} by {}", dto.getUsername(), createdBy);

        // Validation
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + dto.getUsername());
        }
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + dto.getEmail());
        }

        // Resolve roles
        Set<Role> roles = resolveRoles(dto.getRoles());

        // Build user
        User user = User.builder()
                .username(dto.getUsername())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .fullName(dto.getFullName())
                .phone(dto.getPhone())
                .active(dto.getActive())
                .roles(roles)
                .employerId(dto.getEmployerId())
                .companyId(dto.getInsuranceCompanyId())
                .build();

        User saved = userRepository.save(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_CREATED",
                "User",
                saved.getId(),
                String.format("Created user: %s with roles: %s", saved.getUsername(), dto.getRoles()),
                null,
                createdBy,
                null,
                null
        );

        log.info("User created successfully: {}", saved.getUsername());
        return toViewDto(saved);
    }

    /**
     * Update user
     */
    @Transactional
    public UserViewDto updateUser(Long id, UserUpdateDto dto, String updatedBy) {
        log.info("Updating user ID: {} by {}", id, updatedBy);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        // Check email uniqueness (if changed)
        if (!user.getEmail().equals(dto.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + dto.getEmail());
        }

        // Update fields
        user.setEmail(dto.getEmail());
        user.setFullName(dto.getFullName());
        user.setPhone(dto.getPhone());
        user.setActive(dto.getActive());
        user.setEmployerId(dto.getEmployerId());
        user.setCompanyId(dto.getCompanyId());

        // Update roles
        if (dto.getRoles() != null && !dto.getRoles().isEmpty()) {
            user.setRoles(resolveRoles(dto.getRoles()));
        }

        User updated = userRepository.save(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_UPDATED",
                "User",
                updated.getId(),
                String.format("Updated user: %s", updated.getUsername()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("User updated successfully: {}", updated.getUsername());
        return toViewDto(updated);
    }

    /**
     * Delete user
     */
    @Transactional
    public void deleteUser(Long id, String deletedBy) {
        log.info("Deleting user ID: {} by {}", id, deletedBy);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        String username = user.getUsername();
        userRepository.delete(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_DELETED",
                "User",
                id,
                String.format("Deleted user: %s", username),
                null,
                deletedBy,
                null,
                null
        );

        log.info("User deleted successfully: {}", username);
    }

    /**
     * Toggle user active status
     */
    @Transactional
    public UserViewDto toggleUserStatus(Long id, boolean active, String updatedBy) {
        log.info("Toggling user ID: {} to {} by {}", id, active, updatedBy);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        user.setActive(active);
        User updated = userRepository.save(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_STATUS_TOGGLED",
                "User",
                updated.getId(),
                String.format("User %s %s", updated.getUsername(), active ? "activated" : "deactivated"),
                null,
                updatedBy,
                null,
                null
        );

        return toViewDto(updated);
    }

    /**
     * Reset user password
     */
    @Transactional
    public void resetUserPassword(Long id, String newPassword, String updatedBy) {
        log.info("Resetting password for user ID: {} by {}", id, updatedBy);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_PASSWORD_RESET",
                "User",
                user.getId(),
                String.format("Password reset for user: %s", user.getUsername()),
                null,
                updatedBy,
                null,
                null
        );

        log.info("Password reset successfully for user: {}", user.getUsername());
    }

    /**
     * Assign roles to user
     */
    @Transactional
    public UserViewDto assignRoles(Long userId, List<String> roleNames, String updatedBy) {
        log.info("Assigning roles {} to user ID: {}", roleNames, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        Set<Role> newRoles = resolveRoles(roleNames);
        user.getRoles().addAll(newRoles);
        User updated = userRepository.save(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_ROLES_ASSIGNED",
                "User",
                updated.getId(),
                String.format("Assigned roles %s to user: %s", roleNames, updated.getUsername()),
                null,
                updatedBy,
                null,
                null
        );

        return toViewDto(updated);
    }

    /**
     * Remove roles from user
     */
    @Transactional
    public UserViewDto removeRoles(Long userId, List<String> roleNames, String updatedBy) {
        log.info("Removing roles {} from user ID: {}", roleNames, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        Set<Role> rolesToRemove = resolveRoles(roleNames);
        user.getRoles().removeAll(rolesToRemove);
        User updated = userRepository.save(user);

        // Audit log
        auditLogService.createAuditLog(
                "USER_ROLES_REMOVED",
                "User",
                updated.getId(),
                String.format("Removed roles %s from user: %s", roleNames, updated.getUsername()),
                null,
                updatedBy,
                null,
                null
        );

        return toViewDto(updated);
    }

    // Helper methods
    private Set<Role> resolveRoles(List<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        for (String roleName : roleNames) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
            roles.add(role);
        }
        return roles;
    }

    private UserViewDto toViewDto(User user) {
        return UserViewDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .active(user.getActive())
                .emailVerified(user.getEmailVerified())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .employerId(user.getEmployerId())
                .companyId(user.getCompanyId())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
