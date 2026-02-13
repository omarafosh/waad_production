package com.waad.tba.common.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * ================================================================================================
 * Organization Context Service - Explicit Employer Filtering
 * ================================================================================================
 * 
 * ARCHITECTURE (Updated):
 * - NO global employer context
 * - NO X-Employer-ID headers
 * - Employer filtering is EXPLICIT via query parameters
 * 
 * USAGE PATTERN:
 * - Controllers accept optional `employerId` query parameter
 * - Services receive employerId explicitly and apply filtering
 * - If employerId is null and user is admin → return all data
 * - If employerId is null and user is EMPLOYER role → use user.employerId
 * - If employerId is provided → filter by that employer
 * 
 * SECURITY:
 * - SUPER_ADMIN can see all data or filter by any employer
 * - EMPLOYER role is LOCKED to their own employerId (override any parameter)
 * 
 * This service is still available for legacy compatibility but the preferred
 * pattern is explicit employerId parameter passing in controllers/services.
 * 
 * ================================================================================================
 * @author TBA WAAD System
 * @version 2.0 - Explicit Employer Filtering (No Global Context)
 * ================================================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationContextService {

    private final AuthorizationService authorizationService;
    private final OrganizationRepository organizationRepository;

    /**
     * DTO to represent current organization context
     */
    public static class OrganizationContext {
        private final Organization organization;
        private final boolean showAllData;

        public OrganizationContext(Organization organization) {
            this.organization = organization;
            // Simplified: If organization is null or specifically the TPA entity, show all data
            this.showAllData = (organization == null || "WAAD_TPA".equals(organization.getCode()));
        }

        /**
         * Get organization ID (null for TPA = show all)
         */
        public Long getOrganizationId() {
            return organization != null ? organization.getId() : null;
        }

        public Organization getOrganization() {
            return organization;
        }

        /**
         * Should data be filtered?
         * TPA context → NO filtering (show all)
         * Employer context → YES filtering (show only this employer)
         */
        public boolean shouldFilter() {
            return !showAllData;
        }

        /**
         * Get employer ID for filtering (null = no filtering)
         */
        public Long getEmployerIdForFiltering() {
            return shouldFilter() ? getOrganizationId() : null;
        }

        public boolean isTPA() {
            return organization == null || "WAAD_TPA".equals(organization.getCode());
        }

        public boolean isEmployer() {
            return !isTPA();
        }
    }

    /**
     * Get current organization context from request header and user
     * 
     * LOGIC:
     * 1. Get current authenticated user
     * 2. Check X-Employer-ID header (frontend organization selector)
     * 3. Validate context against user's permissions:
     *    - SUPER_ADMIN/TBA_ADMIN: Can select TPA or any employer
     *    - EMPLOYER: Locked to their own employerId
     * 4. Return OrganizationContext for filtering
     * 
     * @param employerIdHeader Value from X-Employer-ID header (null = TPA context)
     * @return OrganizationContext with filtering logic
     */
    public OrganizationContext getOrganizationContext(Long employerIdHeader) {
        User currentUser = authorizationService.getCurrentUser();
        
        if (currentUser == null) {
            log.warn("⚠️ No authenticated user found - defaulting to NO ACCESS");
            // Return null context = no data access
            return new OrganizationContext(null);
        }

        // ADMIN (SUPER or INSURANCE) bypasses all restrictions
        if (authorizationService.isAdmin(currentUser)) {
            return handleAdminContext(employerIdHeader);
        }

        // EMPLOYER role - LOCKED to their own employer
        if (authorizationService.isEmployerAdmin(currentUser)) {
            return handleEmployerContext(currentUser);
        }

        // Default: No access
        log.warn("⚠️ User {} has unknown role - no organization context", currentUser.getUsername());
        return new OrganizationContext(null);
    }

    /**
     * ADMIN (SUPER or INSURANCE): Can select TPA or any employer
     */
    private OrganizationContext handleAdminContext(Long employerIdHeader) {
        if (employerIdHeader == null) {
            // TPA context selected → Show ALL data
            log.debug("✅ ADMIN selected TPA context → Show ALL data");
            Organization tpaOrg = getTPAOrganizationOrNull();
            return new OrganizationContext(tpaOrg); // Will set showAllData = true
        } else {
            // Specific employer selected → Filter by that employer
            log.debug("✅ ADMIN selected employer {} → Filter data", employerIdHeader);
            Organization employerOrg = getEmployerOrganizationOrNull(employerIdHeader);
            return new OrganizationContext(employerOrg);
        }
    }

    /**
     * EMPLOYER: LOCKED to their own employer
     * Header is ignored - always use user.employerId
     */
    private OrganizationContext handleEmployerContext(User user) {
        if (user.getEmployerId() == null) {
            log.error("❌ EMPLOYER user {} has no employerId - SECURITY VIOLATION", user.getUsername());
            return new OrganizationContext(null);
        }

        log.debug("🔒 EMPLOYER user locked to employer {} → Filter data", user.getEmployerId());
        Organization employerOrg = getEmployerOrganizationOrNull(user.getEmployerId());
        return new OrganizationContext(employerOrg);
    }

    /**
     * Get TPA organization (WAAD)
     * This represents "show all companies" context
     */
    private Organization getTPAOrganizationOrNull() {
        Optional<Organization> tpaOrg = organizationRepository.findByCode("WAAD_TPA");
        
        if (tpaOrg.isEmpty()) {
            log.warn("⚠️ No TPA organization found - this should not happen!");
            // Create a virtual TPA org for "show all" context
            return Organization.builder()
                    .id(null)
                    .name("WAAD TPA")
                    .code("WAAD_TPA")
                    .active(true)
                    .build();
        }
        
        return tpaOrg.get();
    }

    /**
     * Get employer organization by ID
     */
    private Organization getEmployerOrganizationOrNull(Long employerId) {
        if (employerId == null) {
            return null;
        }
        
        return organizationRepository.findById(employerId)
                .filter(Organization::isActive)
                .orElseGet(() -> {
                    log.warn("⚠️ Employer organization {} not found or inactive", employerId);
                    return null;
                });
    }

    /**
     * Check if current context is TPA (show all data)
     */
    public boolean isTPAContext(Long employerIdHeader) {
        OrganizationContext context = getOrganizationContext(employerIdHeader);
        return context.isTPA();
    }

    /**
     * Check if data should be filtered (employer context)
     */
    public boolean shouldFilter(Long employerIdHeader) {
        OrganizationContext context = getOrganizationContext(employerIdHeader);
        return context.shouldFilter();
    }
}
