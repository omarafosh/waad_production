package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.provider.service.ProviderService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.entity.UserAuditLog;
import com.waad.tba.modules.rbac.exception.PasswordPolicyViolationException;
import com.waad.tba.modules.rbac.mapper.UserMapper;
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
 * Refactored (2026-02-13) to comply with 350-line limit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserSecurityService securityService;
    private final UserRoleService roleService;
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
            user.setPermittedOrganizations(dto.getPermittedCompanyIds().isEmpty() ? new HashSet<>() : 
                    new HashSet<>(organizationRepository.findAllById(dto.getPermittedCompanyIds())));
        }

        User updatedUser = userRepository.save(user);
        
        // sync logic
        handleProviderSync(updatedUser, oldProviderId, oldAllowAllCompanies, oldPermittedOrgs);

        securityService.auditLog(id, UserAuditLog.ACTION_USER_UPDATED,
                "User updated" + (oldEmail.equals(dto.getEmail()) ? "" : ", email changed"), null, null, null);
        
        return userMapper.toResponseDto(updatedUser);
    }

    private void handleProviderSync(User updatedUser, Long oldProviderId, Boolean oldAllowAll, Set<Organization> oldOrgs) {
        if (updatedUser.getProviderId() != null && !updatedUser.getProviderId().equals(oldProviderId)) {
            providerService.syncUserWithProvider(updatedUser);
        } else if (updatedUser.getProviderId() == null && oldProviderId != null) {
            providerService.clearProviderSettingsForUser(updatedUser);
        } else if (updatedUser.getProviderId() != null) {
            boolean visibilityChanged = !java.util.Objects.equals(oldAllowAll, updatedUser.getAllowAllCompanies()) ||
                                         !oldOrgs.equals(updatedUser.getPermittedOrganizations());
            if (visibilityChanged) {
                providerService.syncProviderFromUser(updatedUser);
            }
        }
    }

    @Transactional
    @RequireRole(value = SystemRole.INSURANCE_ADMIN, message = "User deletion requires INSURANCE_ADMIN or higher")
    public void delete(Long id) {
        log.info("Deleting user with id: {}", id);
        rbacGuard.validateUserDeletion(id);
        
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        if (user.getRoles().stream().anyMatch(role -> "SUPER_ADMIN".equals(role.getName()))) {
            throw new IllegalArgumentException("Cannot delete SUPER_ADMIN user");
        }
        
        securityService.auditLog(id, UserAuditLog.ACTION_USER_DELETED, "User deleted (soft delete)", null, null, null);
        userRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> search(String query) {
        return userRepository.searchUsers(query).stream().map(userMapper::toResponseDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> findByProviderId(Long providerId) {
        return userRepository.findByProviderId(providerId).stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> findUnassignedProviders() {
        return userRepository.findUnassignedProviders().stream()
                .map(userMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<UserResponseDto> findAllPaginated(Pageable pageable) {
        return userRepository.findAll(pageable).map(userMapper::toResponseDto);
    }

    @Transactional
    public UserResponseDto assignRoles(Long userId, AssignRolesDto dto) {
        roleService.assignRoles(userId, dto);
        return findById(userId);
    }

    @Transactional
    public UserResponseDto removeRoles(Long userId, AssignRolesDto dto) {
        roleService.removeRoles(userId, dto);
        return findById(userId);
    }

    @Transactional(readOnly = true)
    public User findByUsernameOrEmail(String identifier) {
        return userRepository.findByUsernameOrEmail(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with identifier: " + identifier));
    }

    @Transactional
    public UserResponseDto toggleStatus(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        if (Boolean.TRUE.equals(user.getActive()) && user.getRoles().stream().anyMatch(r -> "SUPER_ADMIN".equals(r.getName()))) {
            throw new IllegalArgumentException("لا يمكن تعطيل مستخدم SUPER_ADMIN");
        }
        
        user.setActive(!Boolean.TRUE.equals(user.getActive()));
        User savedUser = userRepository.save(user);
        
        String action = savedUser.getActive() ? UserAuditLog.ACTION_USER_ACTIVATED : UserAuditLog.ACTION_USER_DEACTIVATED;
        securityService.auditLog(id, action, savedUser.getActive() ? "User activated" : "User deactivated", null, null, null);
        
        return userMapper.toResponseDto(savedUser);
    }
}
