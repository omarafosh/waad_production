package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.provider.service.ProviderService;
import com.waad.tba.modules.rbac.dto.AssignRolesDto;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.entity.UserAuditLog;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.rbac.RbacGuardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProviderService providerService;
    private final RbacGuardService rbacGuard;
    private final UserAuthAuditService auditService;

    @Transactional
    public void assignRoles(Long userId, AssignRolesDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Set<Role> oldRoles = new HashSet<>(user.getRoles());
        Set<Role> roles = new HashSet<>();
        Set<String> roleNames = new HashSet<>();
        
        for (Long roleId : dto.getRoleIds()) {
            Role role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
            roles.add(role);
            roleNames.add(role.getName());
        }

        rbacGuard.validateRoleAssignment(userId, roleNames);
        rbacGuard.validateSuperAdminExists(userId, roleNames);

        validateMultiTenantRules(user, roleNames);

        user.setRoles(roles);
        User updatedUser = userRepository.save(user);

        if (updatedUser.getProviderId() != null) {
            providerService.syncUserWithProvider(updatedUser);
        }
        
        logAuditTrail(userId, oldRoles, roles);
    }

    @Transactional
    public void removeRoles(Long userId, AssignRolesDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        
        Set<Role> currentRoles = new HashSet<>(user.getRoles());
        Set<Role> rolesToRemove = currentRoles.stream()
                .filter(r -> dto.getRoleIds().contains(r.getId()))
                .collect(Collectors.toSet());
        
        if (rolesToRemove.isEmpty()) return;
        
        Set<Role> newRoles = new HashSet<>(currentRoles);
        newRoles.removeAll(rolesToRemove);
        
        Set<String> newRoleNames = newRoles.stream().map(Role::getName).collect(Collectors.toSet());
        if (rolesToRemove.stream().anyMatch(r -> "SUPER_ADMIN".equals(r.getName()))) {
            rbacGuard.validateSuperAdminExists(userId, newRoleNames);
        }
        
        user.setRoles(newRoles);
        userRepository.save(user);
        
        String removed = rolesToRemove.stream().map(Role::getName).collect(Collectors.joining(", "));
        auditService.auditLog(userId, UserAuditLog.ACTION_ROLE_REVOKED, "Roles removed: " + removed, null, null, null);
    }

    private void validateMultiTenantRules(User user, Set<String> roleNames) {
        if (roleNames.contains("SUPER_ADMIN") && user.getEmployerId() != null) {
            throw new IllegalArgumentException("SUPER_ADMIN cannot have employerId");
        }
        if (roleNames.contains("EMPLOYER_ADMIN") && user.getEmployerId() == null) {
            throw new IllegalArgumentException("EMPLOYER_ADMIN must have employerId");
        }
    }

    private void logAuditTrail(Long userId, Set<Role> oldRoles, Set<Role> newRoles) {
        Set<String> added = newRoles.stream().filter(r -> !oldRoles.contains(r)).map(Role::getName).collect(Collectors.toSet());
        Set<String> removed = oldRoles.stream().filter(r -> !newRoles.contains(r)).map(Role::getName).collect(Collectors.toSet());
        
        String details = String.format("Roles changed - Added: %s, Removed: %s", 
                added.isEmpty() ? "none" : String.join(", ", added),
                removed.isEmpty() ? "none" : String.join(", ", removed));
        
        auditService.auditLog(userId, UserAuditLog.ACTION_ROLE_ASSIGNED, details, null, null, null);
    }
}
