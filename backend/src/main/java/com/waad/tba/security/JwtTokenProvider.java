package com.waad.tba.security;

import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * JWT Token Provider for authentication.
 * 
 * CRITICAL FEATURE:
 * SUPER_ADMIN users automatically receive ALL permissions in their JWT token,
 * ensuring they are NEVER blocked by any permission check.
 * 
 * @author TBA WAAD System
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String SUPER_ADMIN_ROLE = "SUPER_ADMIN";

    private final PermissionRepository permissionRepository;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    private SecretKey key;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate JWT token for user.
     * 
     * CRITICAL: SUPER_ADMIN users get ALL permissions in the token.
     */
    public String generateToken(User user) {
        // Roles
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        // Check if user is SUPER_ADMIN
        boolean isSuperAdmin = roles.stream().anyMatch(r -> r.equals(SUPER_ADMIN_ROLE));

        // Loading Permissions
        List<String> permissions;
        if (isSuperAdmin) {
            permissions = permissionRepository.findAll().stream()
                    .map(com.waad.tba.modules.rbac.entity.Permission::getName)
                    .collect(Collectors.toList());
        } else {
            permissions = user.getRoles().stream()
                    .flatMap(role -> role.getPermissions().stream())
                    .map(com.waad.tba.modules.rbac.entity.Permission::getName)
                    .distinct()
                    .collect(Collectors.toList());
        }

        return buildToken(user.getUsername(), user.getId(), user.getFullName(), user.getEmail(), 
                roles, permissions, user.getEmployerId(), user.getCompanyId(), isSuperAdmin);
    }

    public String generateToken(UserPrincipal userPrincipal) {
        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .collect(Collectors.toList());

        List<String> permissions = userPrincipal.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .filter(a -> !a.startsWith("ROLE_"))
                .collect(Collectors.toList());

        boolean isSuperAdmin = roles.contains(SUPER_ADMIN_ROLE);

        return buildToken(userPrincipal.getUsername(), userPrincipal.getId(), userPrincipal.getFullName(), 
                userPrincipal.getEmail(), roles, permissions, userPrincipal.getEmployerId(), 
                userPrincipal.getCompanyId(), isSuperAdmin);
    }

    private String buildToken(String username, Long userId, String fullName, String email, 
                             List<String> roles, List<String> permissions, Long employerId, 
                             Long companyId, boolean isSuperAdmin) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .claim("fullName", fullName)
                .claim("email", email)
                .claim("roles", roles)
                .claim("permissions", permissions)
                .claim("employerId", employerId)
                .claim("companyId", companyId)
                .claim("isSuperAdmin", isSuperAdmin)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    public Long getUserIdFromJWT(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("userId", Long.class);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException ex) {
            log.error("Invalid JWT signature");
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty");
        }
        return false;
    }
}
