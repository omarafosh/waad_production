package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.provider.service.ProviderService;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.entity.UserAuditLog;
import com.waad.tba.modules.rbac.exception.PasswordPolicyViolationException;
import com.waad.tba.modules.rbac.mapper.UserMapper;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.rbac.RbacGuardService;
import com.waad.tba.security.rbac.RequireRole;
import com.waad.tba.security.rbac.SystemRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * User Service - RBAC Hardened
 * 
 * SECURITY HARDENING (2026-01-13):
 * - Role hierarchy enforcement on all write operations
 * - SUPER_ADMIN protection on delete/update
 * - Privilege escalation prevention
 * 
 * @version 2.0 - RBAC Hardening
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserSecurityService securityService;
    private final RbacGuardService rbacGuard;
    private final OrganizationRepository organizationRepository;
    private final ProviderService providerService;

    @Transactional(readOnly = true)
    public List<UserResponseDto> findAll() {
        log.debug("Finding all users");
        return userRepository.findAll().stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }
    
    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Transactional(readOnly = true)
    public UserResponseDto findById(Long id) {
        log.debug("Finding user by id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toResponseDto(user);
    }

    @Transactional
    public UserResponseDto create(UserCreateDto dto) {
        log.info("Creating new user: {}", dto.getUsername());
        
        // Uniqueness checks
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("اسم المستخدم '" + dto.getUsername() + "' موجود مسبقاً");
        }
        
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("البريد الإلكتروني '" + dto.getEmail() + "' مسجل مسبقاً");
        }

        // Password policy check (username match)
        if (dto.getPassword().equalsIgnoreCase(dto.getUsername())) {
            throw new PasswordPolicyViolationException("Password cannot be the same as username",
                    java.util.Collections.singletonList("PASSWORD_SAME_AS_USERNAME"));
        }

        User user = userMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        
        // Map organizations if company IDs are provided
        if (dto.getPermittedCompanyIds() != null && !dto.getPermittedCompanyIds().isEmpty()) {
            user.setPermittedOrganizations(new HashSet<>(organizationRepository.findAllById(dto.getPermittedCompanyIds())));
        }

        User savedUser = userRepository.save(user);

        // SYNC: If user is linked to a provider, sync settings from provider
        if (savedUser.getProviderId() != null) {
            providerService.syncUserWithProvider(savedUser);
        }

        log.info("User created successfully: {}", savedUser.getUsername());
        securityService.sendEmailVerification(savedUser);
        
        // Audit log
        securityService.auditLog(savedUser.getId(), UserAuditLog.ACTION_USER_CREATED,
                "User created: " + dto.getUsername(), null, null, null);
        
        return userMapper.toResponseDto(savedUser);
    }

    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "User creation requires INSURANCE_ADMIN or higher")
    public UserResponseDto update(Long id, UserUpdateDto dto) {
        log.info("Updating user with id: {}", id);
        
        // RBAC Guard: Validate user update
        rbacGuard.validateUserUpdate(id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Check email uniqueness if changed
        if (!user.getEmail().equals(dto.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }


        String oldEmail = user.getEmail();
        Long oldProviderId = user.getProviderId(); // Store old providerId for sync check
        Boolean oldAllowAllCompanies = user.getAllowAllCompanies(); // Track visibility changes
        Set<Organization> oldPermittedOrgs = new HashSet<>(user.getPermittedOrganizations()); // Track org changes
        
        log.info("RBAC: Updating user {}. Received DTO ProviderId: {}", id, dto.getProviderId());
        userMapper.updateEntityFromDto(user, dto);
        log.info("RBAC: Entity ProviderId after mapping: {}", user.getProviderId());
        
        // Handle permitted companies for Providers
        if (dto.getPermittedCompanyIds() != null) {
            if (dto.getPermittedCompanyIds().isEmpty()) {
                user.getPermittedOrganizations().clear();
            } else {
                user.setPermittedOrganizations(new HashSet<>(organizationRepository.findAllById(dto.getPermittedCompanyIds())));
            }
        }

        User updatedUser = userRepository.save(user);
        userRepository.flush(); // Force flush to catch constraint errors
        log.info("RBAC: User {} saved successfully. Final ProviderId: {}", id, updatedUser.getProviderId());
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // BIDIRECTIONAL SYNC LOGIC
        // ═══════════════════════════════════════════════════════════════════════════════
        
        // Case 1: ProviderId changed (new provider linked)
        if (updatedUser.getProviderId() != null && !updatedUser.getProviderId().equals(oldProviderId)) {
            log.info("🔗 Provider link changed: {} → {}", oldProviderId, updatedUser.getProviderId());
            providerService.syncUserWithProvider(updatedUser);
        } 
        // Case 2: ProviderId removed (unlinked from provider)
        else if (updatedUser.getProviderId() == null && oldProviderId != null) {
            log.info("🔓 Provider unlinked from user {}", updatedUser.getUsername());
            providerService.clearProviderSettingsForUser(updatedUser);
        }
        // Case 3: ProviderId unchanged BUT visibility settings changed manually
        else if (updatedUser.getProviderId() != null) {
            boolean visibilityChanged = 
                !java.util.Objects.equals(oldAllowAllCompanies, updatedUser.getAllowAllCompanies()) ||
                !oldPermittedOrgs.equals(updatedUser.getPermittedOrganizations());
            
            if (visibilityChanged) {
                log.info("🔄 Visibility settings changed manually for user {}, syncing to provider {}", 
                    updatedUser.getUsername(), updatedUser.getProviderId());
                providerService.syncProviderFromUser(updatedUser);
            }
        }

        
        // Audit log
        securityService.auditLog(id, UserAuditLog.ACTION_USER_UPDATED,
                "User updated" + (oldEmail.equals(dto.getEmail()) ? "" : ", email changed"),
                null, null, null);
        
        log.info("User updated successfully: {}", id);
        return userMapper.toResponseDto(updatedUser);
    }

    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "User deletion requires INSURANCE_ADMIN or higher")
    public void delete(Long id) {
        log.info("Deleting user with id: {}", id);
        
        // RBAC Guard: Validate user deletion (includes SUPER_ADMIN protection)
        rbacGuard.validateUserDeletion(id);
        
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        
        // Additional PROTECTION: Prevent deletion of SUPER_ADMIN users (double-check)
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        boolean isSuperAdmin = user.getRoles().stream()
            .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
        
        if (isSuperAdmin) {
            log.error("⛔ Attempt to delete SUPER_ADMIN user: id={}, username={}", id, user.getUsername());
            throw new IllegalArgumentException("Cannot delete SUPER_ADMIN user");
        }
        
        // Audit log before deletion
        securityService.auditLog(id, UserAuditLog.ACTION_USER_DELETED,
                "User deleted (soft delete)", null, null, null);
        
        userRepository.deleteById(id);
        log.info("User deleted successfully: {}", id);
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> search(String query) {
        log.debug("Searching users with query: {}", query);
        return userRepository.searchUsers(query).stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> findByProviderId(Long providerId) {
        log.debug("Finding users by providerId: {}", providerId);
        return userRepository.findByProviderId(providerId).stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> findUnassignedProviders() {
        log.debug("Finding unassigned provider users");
        return userRepository.findUnassignedProviders().stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<UserResponseDto> findAllPaginated(Pageable pageable) {
        log.debug("Finding users with pagination");
        return userRepository.findAll(pageable)
                .map(userMapper::toResponseDto);
    }

    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "Role assignment requires INSURANCE_ADMIN or higher")
    public UserResponseDto assignRoles(Long userId, AssignRolesDto dto) {
        log.info("Assigning roles to user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Set<Role> oldRoles = new HashSet<>(user.getRoles());
        Set<Role> roles = new HashSet<>();
        Set<String> roleNames = new HashSet<>();
        boolean hasSuperAdmin = false;
        boolean hasEmployerAdmin = false;
        
        for (Long roleId : dto.getRoleIds()) {
            Role role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
            roles.add(role);
            roleNames.add(role.getName());
            
            // Check role types for multi-tenant validation
            if ("SUPER_ADMIN".equals(role.getName())) {
                hasSuperAdmin = true;
            }
            if ("EMPLOYER_ADMIN".equals(role.getName())) {
                hasEmployerAdmin = true;
            }
        }

        // RBAC Guard: Validate role assignment (hierarchy + escalation prevention)
        rbacGuard.validateRoleAssignment(userId, roleNames);
        
        // RBAC Guard: Ensure at least one SUPER_ADMIN remains in system
        rbacGuard.validateSuperAdminExists(userId, roleNames);

        // Multi-tenant validation
        if (hasSuperAdmin && user.getEmployerId() != null) {
            throw new IllegalArgumentException("SUPER_ADMIN cannot have employerId");
        }
        if (hasEmployerAdmin && user.getEmployerId() == null) {
            throw new IllegalArgumentException("EMPLOYER_ADMIN must have employerId");
        }

        user.setRoles(roles);
        User updatedUser = userRepository.save(user);

        // SYNC: If user is linked to a provider, sync settings from provider
        if (updatedUser.getProviderId() != null) {
            providerService.syncUserWithProvider(updatedUser);
        }
        
        // Audit log role changes
        Set<String> addedRoles = roles.stream()
                .filter(r -> !oldRoles.contains(r))
                .map(Role::getName)
                .collect(Collectors.toSet());
        Set<String> removedRoles = oldRoles.stream()
                .filter(r -> !roles.contains(r))
                .map(Role::getName)
                .collect(Collectors.toSet());
        
        String auditDetails = String.format("Roles changed - Added: %s, Removed: %s", 
                addedRoles.isEmpty() ? "none" : String.join(", ", addedRoles),
                removedRoles.isEmpty() ? "none" : String.join(", ", removedRoles));
        
        securityService.auditLog(userId, UserAuditLog.ACTION_ROLE_ASSIGNED,
                auditDetails, null, null, null);
        
        log.info("Roles assigned successfully to user: {}", userId);
        return userMapper.toResponseDto(updatedUser);
    }

    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "Role removal requires INSURANCE_ADMIN or higher")
    public UserResponseDto removeRoles(Long userId, AssignRolesDto dto) {
        log.info("Removing roles from user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        
        Set<Role> currentRoles = new HashSet<>(user.getRoles());
        Set<Role> rolesToRemove = new HashSet<>();
        
        for (Long roleId : dto.getRoleIds()) {
            // Find role in current roles
            currentRoles.stream()
                .filter(r -> r.getId().equals(roleId))
                .findFirst()
                .ifPresent(rolesToRemove::add);
        }
        
        if (rolesToRemove.isEmpty()) {
            return userMapper.toResponseDto(user);
        }
        
        // Calculate new roles BEFORE removal to validate
        Set<Role> newRoles = new HashSet<>(currentRoles);
        newRoles.removeAll(rolesToRemove);
        
        Set<String> newRoleNames = newRoles.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        
        // RBAC Guard: Ensure at least one SUPER_ADMIN remains in system if we are removing SUPER_ADMIN
        boolean removingSuperAdmin = rolesToRemove.stream().anyMatch(r -> "SUPER_ADMIN".equals(r.getName()));
        if (removingSuperAdmin) {
            rbacGuard.validateSuperAdminExists(userId, newRoleNames);
        }
        
        // Apply removal
        user.setRoles(newRoles);
        User updatedUser = userRepository.save(user);
        
        // SYNC validation (if provider role removed, maybe cleanup?)
        // For now, keep simple.
        
        // Audit log
        Set<String> removedRoleNames = rolesToRemove.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        
        securityService.auditLog(userId, UserAuditLog.ACTION_ROLE_REVOKED,
                "Roles removed: " + String.join(", ", removedRoleNames), null, null, null);
        
        log.info("Roles removed successfully from user: {}", userId);
        return userMapper.toResponseDto(updatedUser);
    }

    @Transactional(readOnly = true)
    public User findByUsernameOrEmail(String identifier) {
        return userRepository.findByUsernameOrEmail(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with identifier: " + identifier));
    }

    /**
     * Toggle user active status (activate/deactivate)
     * SUPER_ADMIN users cannot be deactivated.
     */
    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "Toggle status requires INSURANCE_ADMIN or higher")
    public UserResponseDto toggleStatus(Long id) {
        log.info("Toggling status for user: {}", id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        // PROTECTION: SUPER_ADMIN cannot be deactivated
        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
        
        if (isSuperAdmin && Boolean.TRUE.equals(user.getActive())) {
            log.error("⛔ Attempt to deactivate SUPER_ADMIN user: id={}, username={}", id, user.getUsername());
            throw new IllegalArgumentException("لا يمكن تعطيل مستخدم SUPER_ADMIN");
        }
        
        // Toggle the status
        boolean newStatus = !Boolean.TRUE.equals(user.getActive());
        user.setActive(newStatus);
        User savedUser = userRepository.save(user);
        
        // Audit log
        String action = newStatus ? UserAuditLog.ACTION_USER_ACTIVATED : UserAuditLog.ACTION_USER_DEACTIVATED;
        String details = newStatus ? "User activated" : "User deactivated";
        securityService.auditLog(id, action, details, null, null, null);
        
        log.info("User {} status changed to: {}", id, newStatus ? "ACTIVE" : "INACTIVE");
        return userMapper.toResponseDto(savedUser);
    }
}
