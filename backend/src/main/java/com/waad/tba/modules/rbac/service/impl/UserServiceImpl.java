package com.waad.tba.modules.rbac.service.impl;

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
import com.waad.tba.modules.rbac.service.UserSecurityService;
import com.waad.tba.modules.rbac.service.UserService;
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
 * تنفيذ خدمة المستخدمين (User Service Implementation).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserSecurityService securityService;
    private final RbacGuardService rbacGuard;
    private final OrganizationRepository organizationRepository;
    private final ProviderService providerService;

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDto> findAll() {
        log.debug("Finding all users");
        return userRepository.findAll().stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDto findById(Long id) {
        log.debug("Finding user by id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toResponseDto(user);
    }

    @Override
    @Transactional
    public UserResponseDto create(UserCreateDto dto) {
        log.info("Creating new user: {}", dto.getUsername());
        
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("اسم المستخدم '" + dto.getUsername() + "' موجود مسبقاً");
        }
        
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("البريد الإلكتروني '" + dto.getEmail() + "' مسجل مسبقاً");
        }

        if (dto.getPassword().equalsIgnoreCase(dto.getUsername())) {
            throw new PasswordPolicyViolationException("Password cannot be the same as username",
                    java.util.Collections.singletonList("PASSWORD_SAME_AS_USERNAME"));
        }

        User user = userMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        
        if (dto.getPermittedCompanyIds() != null && !dto.getPermittedCompanyIds().isEmpty()) {
            user.setPermittedOrganizations(new HashSet<>(organizationRepository.findAllById(dto.getPermittedCompanyIds())));
        }

        User savedUser = userRepository.save(user);

        if (savedUser.getProviderId() != null) {
            providerService.syncUserWithProvider(savedUser);
        }

        log.info("User created successfully: {}", savedUser.getUsername());
        securityService.sendEmailVerification(savedUser);
        
        securityService.auditLog(savedUser.getId(), UserAuditLog.ACTION_USER_CREATED,
                "User created: " + dto.getUsername(), null, null, null);
        
        return userMapper.toResponseDto(savedUser);
    }

    @Override
    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "User creation requires INSURANCE_ADMIN or higher")
    public UserResponseDto update(Long id, UserUpdateDto dto) {
        log.info("Updating user with id: {}", id);
        rbacGuard.validateUserUpdate(id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (!user.getEmail().equals(dto.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        String oldEmail = user.getEmail();
        Long oldProviderId = user.getProviderId();
        Boolean oldAllowAllCompanies = user.getAllowAllCompanies();
        Set<Organization> oldPermittedOrgs = new HashSet<>(user.getPermittedOrganizations());
        
        userMapper.updateEntityFromDto(user, dto);
        
        if (dto.getPermittedCompanyIds() != null) {
            if (dto.getPermittedCompanyIds().isEmpty()) {
                user.getPermittedOrganizations().clear();
            } else {
                user.setPermittedOrganizations(new HashSet<>(organizationRepository.findAllById(dto.getPermittedCompanyIds())));
            }
        }

        User updatedUser = userRepository.save(user);
        userRepository.flush();
        
        if (updatedUser.getProviderId() != null && !updatedUser.getProviderId().equals(oldProviderId)) {
            providerService.syncUserWithProvider(updatedUser);
        } else if (updatedUser.getProviderId() == null && oldProviderId != null) {
            providerService.clearProviderSettingsForUser(updatedUser);
        } else if (updatedUser.getProviderId() != null) {
            boolean visibilityChanged = 
                !java.util.Objects.equals(oldAllowAllCompanies, updatedUser.getAllowAllCompanies()) ||
                !oldPermittedOrgs.equals(updatedUser.getPermittedOrganizations());
            
            if (visibilityChanged) {
                providerService.syncProviderFromUser(updatedUser);
            }
        }

        securityService.auditLog(id, UserAuditLog.ACTION_USER_UPDATED,
                "User updated" + (oldEmail.equals(dto.getEmail()) ? "" : ", email changed"),
                null, null, null);
        
        return userMapper.toResponseDto(updatedUser);
    }

    @Override
    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "User deletion requires INSURANCE_ADMIN or higher")
    public void delete(Long id) {
        log.info("Deleting user with id: {}", id);
        rbacGuard.validateUserDeletion(id);
        
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        boolean isSuperAdmin = user.getRoles().stream()
            .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
        
        if (isSuperAdmin) {
            throw new IllegalArgumentException("Cannot delete SUPER_ADMIN user");
        }
        
        securityService.auditLog(id, UserAuditLog.ACTION_USER_DELETED,
                "User deleted (soft delete)", null, null, null);
        
        userRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDto> search(String query) {
        return userRepository.searchUsers(query).stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDto> findByProviderId(Long providerId) {
        return userRepository.findByProviderId(providerId).stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDto> findUnassignedProviders() {
        return userRepository.findUnassignedProviders().stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponseDto> findAllPaginated(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(userMapper::toResponseDto);
    }

    @Override
    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "Role assignment requires INSURANCE_ADMIN or higher")
    public UserResponseDto assignRoles(Long userId, AssignRolesDto dto) {
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
            
            if ("SUPER_ADMIN".equals(role.getName())) hasSuperAdmin = true;
            if ("EMPLOYER_ADMIN".equals(role.getName())) hasEmployerAdmin = true;
        }

        rbacGuard.validateRoleAssignment(userId, roleNames);
        rbacGuard.validateSuperAdminExists(userId, roleNames);

        if (hasSuperAdmin && user.getEmployerId() != null) {
            throw new IllegalArgumentException("SUPER_ADMIN cannot have employerId");
        }
        if (hasEmployerAdmin && user.getEmployerId() == null) {
            throw new IllegalArgumentException("EMPLOYER_ADMIN must have employerId");
        }

        user.setRoles(roles);
        User updatedUser = userRepository.save(user);

        if (updatedUser.getProviderId() != null) {
            providerService.syncUserWithProvider(updatedUser);
        }
        
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
        
        return userMapper.toResponseDto(updatedUser);
    }

    @Override
    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "Role removal requires INSURANCE_ADMIN or higher")
    public UserResponseDto removeRoles(Long userId, AssignRolesDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        
        Set<Role> currentRoles = new HashSet<>(user.getRoles());
        Set<Role> rolesToRemove = new HashSet<>();
        
        for (Long roleId : dto.getRoleIds()) {
            currentRoles.stream()
                .filter(r -> r.getId().equals(roleId))
                .findFirst()
                .ifPresent(rolesToRemove::add);
        }
        
        if (rolesToRemove.isEmpty()) {
            return userMapper.toResponseDto(user);
        }
        
        Set<Role> newRoles = new HashSet<>(currentRoles);
        newRoles.removeAll(rolesToRemove);
        
        Set<String> newRoleNames = newRoles.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        
        boolean removingSuperAdmin = rolesToRemove.stream().anyMatch(r -> "SUPER_ADMIN".equals(r.getName()));
        if (removingSuperAdmin) {
            rbacGuard.validateSuperAdminExists(userId, newRoleNames);
        }
        
        user.setRoles(newRoles);
        User updatedUser = userRepository.save(user);
        
        Set<String> removedRoleNames = rolesToRemove.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        
        securityService.auditLog(userId, UserAuditLog.ACTION_ROLE_REVOKED,
                "Roles removed: " + String.join(", ", removedRoleNames), null, null, null);
        
        return userMapper.toResponseDto(updatedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public User findByUsernameOrEmail(String identifier) {
        return userRepository.findByUsernameOrEmail(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with identifier: " + identifier));
    }

    @Override
    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "Toggle status requires INSURANCE_ADMIN or higher")
    public UserResponseDto toggleStatus(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
        
        if (isSuperAdmin && Boolean.TRUE.equals(user.getActive())) {
            throw new IllegalArgumentException("لا يمكن تعطيل مستخدم SUPER_ADMIN");
        }
        
        boolean newStatus = !Boolean.TRUE.equals(user.getActive());
        user.setActive(newStatus);
        User savedUser = userRepository.save(user);
        
        String action = newStatus ? UserAuditLog.ACTION_USER_ACTIVATED : UserAuditLog.ACTION_USER_DEACTIVATED;
        String details = newStatus ? "User activated" : "User deactivated";
        securityService.auditLog(id, action, details, null, null, null);
        
        return userMapper.toResponseDto(savedUser);
    }
}
