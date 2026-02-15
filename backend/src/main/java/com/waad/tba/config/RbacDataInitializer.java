package com.waad.tba.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.AppPermission;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * RBAC Data Initializer - Clean Foundation (Version 3.0)
 * 
 * Initializes the complete RBAC system with:
 * - All permissions from AppPermission enum (Granular Resource-Action model)
 * - 6 business-aligned roles:
 *   1. SUPER_ADMIN: Full system access (All permissions)
 *   2. INSURANCE_ADMIN: Insurance company administrator
 *   3. EMPLOYER_ADMIN: Employer company administrator
 *   4. REVIEWER: Medical claim reviewer
 *   5. PROVIDER: Healthcare provider
 *   6. USER: Basic read-only user
 * - Single superadmin user (superadmin@tba.sa / Admin@123)
 * 
 * Execution Order: Runs FIRST (@Order(50)) before SuperAdminPermissionSynchronizer (@Order(100))
 * 
 * @author TBA WAAD System
 * @version 3.0
 */
@Component
@Order(50) // Run BEFORE SuperAdminPermissionSynchronizer (which is @Order(100))
@RequiredArgsConstructor
@Slf4j
public class RbacDataInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${app.security.initial-admin-password:Admin@123}")
    private String initialAdminPassword;

    @org.springframework.beans.factory.annotation.Value("${app.security.initial-admin-username:superadmin}")
    private String initialAdminUsername;

    @org.springframework.beans.factory.annotation.Value("${app.security.initial-admin-email:superadmin@tba.sa}")
    private String initialAdminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║  RBAC Data Initializer - Granular Permissions v3.0         ║");
        log.info("╚════════════════════════════════════════════════════════════╝");
        
        try {
            // Step 1: Create all permissions from enum
            Map<String, Permission> permissionMap = ensureAllPermissions();
            log.info("✅ Step 1/3: Permissions initialized ({} total)", permissionMap.size());
            
            // Step 2: Create all roles with their permission mappings
            Map<String, Role> roleMap = ensureAllRoles(permissionMap);
            log.info("✅ Step 2/3: Roles initialized ({} total)", roleMap.size());
            
            // Step 3: Create superadmin user
            ensureSuperAdminUser(roleMap);
            log.info("✅ Step 3/3: Super Admin user initialized");
            
            log.info("╔════════════════════════════════════════════════════════════╗");
            log.info("║  RBAC Initialization Completed Successfully!               ║");
            
        } catch (Exception e) {
            log.error("❌ RBAC initialization failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initialize RBAC system", e);
        }
    }

    /**
     * Step 1: Create all permissions from AppPermission enum.
     * Returns a map of permission name -> Permission entity for role assignment.
     * 100% Idempotent - checks existence before insert.
     */
    private Map<String, Permission> ensureAllPermissions() {
        log.info("📋 Initializing permissions from AppPermission enum...");
        
        Map<String, Permission> permissionMap = new HashMap<>();
        int created = 0;
        int skipped = 0;
        
        for (AppPermission appPerm : AppPermission.values()) {
            String permName = appPerm.getPermissionName();
            
            // Check if permission already exists
            Optional<Permission> existingPerm = permissionRepository.findByName(permName);
            
            if (existingPerm.isPresent()) {
                Permission p = existingPerm.get();
                // Update existing permission metadata
                p.setDescription(appPerm.getDescription());
                p.setNameAr(appPerm.getDisplayNameAr());
                p.setModule(appPerm.getModule());
                permissionRepository.save(p);
                
                permissionMap.put(permName, p);
                skipped++;
            } else {
                Permission newPerm = Permission.builder()
                        .name(permName)
                        .nameAr(appPerm.getDisplayNameAr())
                        .description(appPerm.getDescription())
                        .module(appPerm.getModule())
                        .build();
                
                Permission saved = permissionRepository.save(newPerm);
                permissionMap.put(permName, saved);
                created++;
            }
        }
        
        log.info("   📊 Permissions: {} created, {} skipped, {} total", created, skipped, permissionMap.size());
        
        // Step 1.1: Prune obsolete permissions (Dangling references causing 404s)
        pruneObsoletePermissions(permissionMap);
        
        return permissionMap;
    }

    /**
     * Delete permissions from DB that are no longer in AppPermission enum.
     * This prevents 404 errors in frontend when trying to assign non-existent IDs.
     */
    private void pruneObsoletePermissions(Map<String, Permission> validPermissions) {
        log.info("🧹 Pruning obsolete permissions from database...");
        
        List<Permission> allInDb = permissionRepository.findAll();
        Set<String> validNames = validPermissions.keySet();
        
        List<Permission> toDelete = allInDb.stream()
                .filter(p -> !validNames.contains(p.getName()))
                .collect(Collectors.toList());
        
        if (!toDelete.isEmpty()) {
            log.warn("   ⚠️ Found {} obsolete permissions to delete", toDelete.size());
            
            // Step 1: Remove these permissions from all roles efficiently
            List<Role> allRoles = roleRepository.findAll();
            boolean rolesModified = false;
            
            for (Role role : allRoles) {
                // removeAll is efficient for Sets if the collection is provided
                if (role.getPermissions().removeAll(toDelete)) {
                    roleRepository.save(role);
                    rolesModified = true;
                }
            }
            
            if (rolesModified) {
                log.info("   ✅ Unlinked obsolete permissions from all roles");
            }
            
            // Step 2: Delete permissions from database
            permissionRepository.deleteAll(toDelete);
            log.info("   ✅ Successfully deleted {} obsolete permissions", toDelete.size());
        } else {
            log.info("   ✨ No obsolete permissions found to prune");
        }
    }

    /**
     * Step 2: Create all 6 business-aligned roles with their permission mappings.
     */
    private Map<String, Role> ensureAllRoles(Map<String, Permission> permissionMap) {
        log.info("👥 Initializing roles...");
        
        Map<String, Role> roleMap = new HashMap<>();
        
        // Role 1: SUPER_ADMIN - Full system access (Auto-assign ALL permissions)
        roleMap.put("SUPER_ADMIN", ensureRole(
                "SUPER_ADMIN",
                "المدير العام للنظام",
                "Full system administrator with all permissions",
                permissionMap,
                Arrays.asList(AppPermission.getAllPermissionNames()) // ALL PERMISSIONS
        ));
        
        // Role 2: INSURANCE_ADMIN - Insurance company administrator
        // Has almost everything except MANAGE_RBAC (security)
        List<String> insuranceApiPermissions = new ArrayList<>();
        // Add all except RBAC
        for(AppPermission p : AppPermission.values()) {
            if(!p.name().startsWith("MANAGE_RBAC") && !p.name().equals("MANAGE_SYSTEM_SETTINGS")) {
                insuranceApiPermissions.add(p.name());
            }
        }
        // Add specific allowed system settings if needed
        insuranceApiPermissions.add("MANAGE_SYSTEM_SETTINGS"); 
        
        roleMap.put("INSURANCE_ADMIN", ensureRole(
                "INSURANCE_ADMIN",
                "مدير شركة التأمين",
                "Insurance company administrator with full system access",
                permissionMap,
                insuranceApiPermissions
        ));
        
        // Role 3: EMPLOYER_ADMIN - Employer company administrator
        roleMap.put("EMPLOYER_ADMIN", ensureRole(
                "EMPLOYER_ADMIN",
                "مدير صاحب العمل",
                "Employer company administrator",
                permissionMap,
                Arrays.asList(
                    AppPermission.MEMBER_VIEW.name(), AppPermission.MEMBER_PRINT.name(), AppPermission.MEMBER_EXPORT.name(),
                    AppPermission.CLAIM_VIEW.name(), AppPermission.CLAIM_PRINT.name(), AppPermission.CLAIM_EXPORT.name(),
                    AppPermission.VISIT_VIEW.name(), AppPermission.VISIT_PRINT.name(), AppPermission.VISIT_EXPORT.name(),
                    AppPermission.REPORT_VIEW.name(), AppPermission.REPORT_PRINT.name(), AppPermission.REPORT_EXPORT.name(),
                    AppPermission.BASIC_DATA_VIEW.name(),
                    AppPermission.EMPLOYER_VIEW.name(), AppPermission.EMPLOYER_EDIT.name()
                )
        ));
        
        // Role 4: REVIEWER - Medical claim and pre-authorization reviewer
        roleMap.put("REVIEWER", ensureRole(
                "REVIEWER",
                "مراجع طبي",
                "Medical claim and pre-authorization reviewer",
                permissionMap,
                Arrays.asList(
                    // Claims
                    AppPermission.CLAIM_VIEW.name(), AppPermission.CLAIM_UPDATE.name(), AppPermission.CLAIM_APPROVE.name(), 
                    AppPermission.CLAIM_REJECT.name(), AppPermission.CLAIM_STATUS_VIEW.name(),
                    AppPermission.CLAIM_PRINT.name(), AppPermission.CLAIM_EXPORT.name(),
                    
                    // Pre-Auth
                    AppPermission.PREAUTH_VIEW.name(), AppPermission.PREAUTH_APPROVE.name(), AppPermission.PREAUTH_REJECT.name(), 
                    AppPermission.PREAUTH_UPDATE.name(), AppPermission.PREAUTH_PRINT.name(), AppPermission.PREAUTH_EXPORT.name(),
                    
                    // Read-only access to needed data
                    AppPermission.MEMBER_VIEW.name(), AppPermission.VISIT_VIEW.name(), AppPermission.PROVIDER_VIEW.name(),
                    AppPermission.MEDICAL_SERVICE_VIEW.name(), AppPermission.MEDICAL_PACKAGE_VIEW.name(), AppPermission.BENEFIT_POLICY_VIEW.name(),
                    
                    // Reports
                    AppPermission.DASHBOARD_VIEW.name(), AppPermission.REPORT_VIEW.name(), AppPermission.REPORT_PRINT.name(), AppPermission.REPORT_EXPORT.name(),
                    
                    AppPermission.BASIC_DATA_VIEW.name()
                )
        ));
        
        // Role 5: PROVIDER - Healthcare provider
        roleMap.put("PROVIDER", ensureRole(
                "PROVIDER",
                "مقدم خدمة طبية",
                "Healthcare provider with eligibility and claim submission",
                permissionMap,
                Arrays.asList(
                    // Eligibility & Visits
                    AppPermission.MEMBER_VIEW.name(), AppPermission.ELIGIBILITY_CHECK.name(),
                    AppPermission.VISIT_CREATE.name(), AppPermission.VISIT_VIEW.name(), AppPermission.VISIT_PRINT.name(),
                    
                    // Claims
                    AppPermission.CLAIM_CREATE.name(), AppPermission.CLAIM_UPDATE.name(), AppPermission.CLAIM_VIEW.name(), 
                    AppPermission.CLAIM_STATUS_VIEW.name(), AppPermission.CLAIM_PRINT.name(), AppPermission.CLAIM_EXPORT.name(),
                    
                    // Pre-Auth
                    AppPermission.PREAUTH_CREATE.name(), AppPermission.PREAUTH_VIEW.name(),
                    AppPermission.PREAUTH_PRINT.name(),
                    
                    // Reports
                    AppPermission.REPORT_VIEW.name(), AppPermission.REPORT_PRINT.name(),
                    
                    AppPermission.BASIC_DATA_VIEW.name()
                )
        ));
        
        // Role 6: USER - Basic read-only user
        roleMap.put("USER", ensureRole(
                "USER",
                "مستخدم عادي",
                "Basic read-only user",
                permissionMap,
                Arrays.asList(
                    AppPermission.BASIC_DATA_VIEW.name()
                )
        ));
        
        log.info("   📊 Roles: {} total configured", roleMap.size());
        return roleMap;
    }

    /**
     * Helper method to ensure role exists and has correct permissions.
     */
    private Role ensureRole(String roleName, String displayNameAr, String description, 
                           Map<String, Permission> permissionMap, List<String> permissionNames) {
        
        Set<Permission> permissions = permissionNames.stream()
                .map(permissionMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Check if role already exists
        Optional<Role> existingRoleOpt = roleRepository.findByName(roleName);
        
        if (existingRoleOpt.isPresent()) {
            Role existingRole = existingRoleOpt.get();
            
            // CRITICAL: Only force-sync SUPER_ADMIN to ensure system access is never lost.
            // For all other roles (PROVIDER, REVIEWER, etc.), we respects the database state
            // to allow users to customize permissions (e.g., hiding specific menus).
            if ("SUPER_ADMIN".equals(roleName)) {
                existingRole.setPermissions(permissions);
                roleRepository.save(existingRole);
                log.debug("   🔄 Syncing permissions for SUPER_ADMIN role (Enforcing full access)");
            } else {
                // For other roles, keep manual adjustments
                log.debug("   ℹ️ Role {} already exists, respecting manual permission adjustments", roleName);
            }
            return existingRole;
        }
        
        // Role doesn't exist - create it
        Role newRole = Role.builder()
                .name(roleName)
                .description(description + " | " + displayNameAr)
                .permissions(permissions)
                .build();
        
        Role saved = roleRepository.save(newRole);
        log.debug("   ➕ Created role: {} ({} permissions)", roleName, permissions.size());
        return saved;
    }

    /**
     * Step 3: Create single superadmin user if not exists.
     */
    private void ensureSuperAdminUser(Map<String, Role> roleMap) {
        log.info("👤 Initializing super admin user...");
        
        String username = initialAdminUsername;
        String email = initialAdminEmail;
        
        // Check if superadmin user already exists
        Optional<User> existingUser = userRepository.findByUsername(username);
        
        if (existingUser.isPresent()) {
            log.info("   👤 User {} already exists. Synchronizing password...", username);
            User admin = existingUser.get();
            admin.setPassword(passwordEncoder.encode(initialAdminPassword));
            admin.setEmail(email); // Also sync email just in case
            userRepository.save(admin);
            return;
        }
        
        // Get SUPER_ADMIN role
        Role superAdminRole = roleMap.get("SUPER_ADMIN");
        if (superAdminRole == null) {
            throw new IllegalStateException("SUPER_ADMIN role not found!");
        }
        
        // Create superadmin user with SUPER_ADMIN role
        User superAdmin = User.builder()
                .username(username)
                .email(email)
                .civilId("0000000000") // Default civilId for superadmin
                .password(passwordEncoder.encode(initialAdminPassword))
                .fullName("System Super Administrator")
                .active(true)
                .roles(new HashSet<>(Collections.singletonList(superAdminRole)))
                .build();
        
        userRepository.save(superAdmin);
        log.info("   ✅ Created user: {}", username);
    }
}
