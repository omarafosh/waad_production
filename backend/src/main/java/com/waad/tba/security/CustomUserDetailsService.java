package com.waad.tba.security;

import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.rbac.service.UserSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Custom UserDetailsService that loads user authentication details.
 * 
 * CRITICAL FEATURE:
 * SUPER_ADMIN users automatically receive ALL permissions in the system,
 * ensuring they are NEVER blocked by any permission check.
 * 
 * SECURITY FEATURES:
 * - Account lockout check (locked accounts cannot login)
 * - Email verification check (configurable, can require verified email)
 * 
 * @author TBA WAAD System
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private static final String SUPER_ADMIN_ROLE = "SUPER_ADMIN";

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final UserSecurityService securityService;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Fix: Allow login by either username or email
        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> {
                    log.warn("LOGIN: User not found for: {}", username);
                    return new UsernameNotFoundException("User not found with username or email: " + username);
                });

        log.debug("LOGIN: Found user: {}", user.getUsername());
        log.debug("LOGIN: Active Status: {}", user.getActive());

        // SECURITY CHECK: Account lockout
        securityService.checkAccountLocked(user);
        
        // SECURITY CHECK: Email verification (configurable, throws if required but not verified)
        securityService.checkEmailVerified(user);

        Collection<? extends GrantedAuthority> authorities = getAuthorities(user);
        
        log.debug("LOGIN: User {} loaded with {} authorities", user.getUsername(), authorities.size());

        return UserPrincipal.create(user, authorities);
    }

    /**
     * Build authorities for the user.
     * 
     * CRITICAL: SUPER_ADMIN users receive ALL permissions automatically.
     * This ensures SUPER_ADMIN is NEVER blocked by any permission check.
     */
    private Collection<? extends GrantedAuthority> getAuthorities(User user) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Check if user is SUPER_ADMIN
        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(role -> SUPER_ADMIN_ROLE.equals(role.getName()));
        
        // Add role-based authorities with ROLE_ prefix (required for hasRole() checks)
        user.getRoles().forEach(role -> 
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()))
        );
        
        if (isSuperAdmin) {
            // SUPER_ADMIN gets ALL permissions in the system
            List<Permission> allPermissions = permissionRepository.findAll();
            
            for (Permission permission : allPermissions) {
                authorities.add(new SimpleGrantedAuthority(permission.getName()));
            }
            
            log.info("🔓 SUPER_ADMIN {} loaded with ALL {} permissions (unrestricted access)", 
                    user.getUsername(), allPermissions.size());
        } else {
            // Regular users get only their role-based permissions
            user.getRoles().stream()
                    .flatMap(role -> role.getPermissions().stream())
                    .forEach(permission -> 
                        authorities.add(new SimpleGrantedAuthority(permission.getName()))
                    );
        }
        
        return authorities;
    }
}
