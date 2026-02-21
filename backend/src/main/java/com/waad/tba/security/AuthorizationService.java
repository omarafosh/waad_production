package com.waad.tba.security;

import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;

import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.repository.VisitRepository;

import lombok.RequiredArgsConstructor;

/**
 * ================================================================================================
 * TBA-WAAD Authorization Service - SIMPLIFIED SECURITY MODEL
 * ================================================================================================
 * 
 * CRITICAL BUSINESS RULES (DO NOT MODIFY):
 * 
 * 1. There is ONLY ONE insurance company in the system.
 * 2. Insurance companies are NOT a security boundary.
 * 3. Companies table is for SYSTEM-LEVEL settings only (branding, features).
 * 4. Employers are the ONLY data-level security boundary.
 * 
 * ================================================================================================
 * AUTHORIZATION MODEL:
 * ================================================================================================
 * 
 * SUPER_ADMIN:
 * - Bypasses ALL authorization checks immediately.
 * - Can access ALL data without any restrictions.
 * - Never filtered by employerId or companyId.
 * 
 * INSURANCE_ADMIN:
 * - Behaves like SUPER_ADMIN for data access (for now).
 * - Can access ALL data without restrictions.
 * - No companyId filtering (single insurance company model).
 * 
 * EMPLOYER_ADMIN:
 * - Restricted STRICTLY by their employerId.
 * - Can ONLY access data belonging to their employer.
 * - Applied to: members, claims, visits, pre-approvals.
 * 
 * PROVIDER:
 * - Restricted by provider-specific logic (to be implemented).
 * 
 * REVIEWER:
 * - Can access claims for review purposes only.
 * 
 * ================================================================================================
 * KEY PRINCIPLES:
 * ================================================================================================
 * 
 * 1. RBAC ≠ Data Filtering:
 * - RBAC (permissions) decides WHAT modules a user can access.
 * - Data filtering decides WHICH rows they can see.
 * - These are two SEPARATE concerns.
 * 
 * 2. SUPER_ADMIN is GOD MODE:
 * - Always returns TRUE for all checks.
 * - Always returns NULL for filters (no filtering).
 * 
 * 3. EMPLOYER_ADMIN is the ONLY role with data-level restrictions:
 * - Filter query: WHERE employer_id = user.employerId
 * 
 * 4. Company filtering has been REMOVED:
 * - No more companyId checks.
 * - No more insuranceCompanyId filtering.
 * 
 * ================================================================================================
 * 
 * @author TBA WAAD System
 * @version 2.0 - SIMPLIFIED MODEL
 *          ================================================================================================
 */
@Service
@RequiredArgsConstructor
public class AuthorizationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthorizationService.class);

    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final ClaimRepository claimRepository;
    private final VisitRepository visitRepository;
    private final PreAuthorizationRepository preAuthorizationRepository;

    // =============================================================================================
    // CORE UTILITY METHODS
    // =============================================================================================

    /**
     * Get the currently authenticated user from the security context.
     * 
     * @return Current authenticated User, or null if not authenticated
     */
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("⚠️ No authenticated user found in security context");
            return null;
        }

        String username = authentication.getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    // =============================================================================================
    // ROLE CHECK METHODS (RBAC)
    // =============================================================================================

    /**
     * Check if user has SUPER_ADMIN role.
     * SUPER_ADMIN bypasses ALL authorization checks.
     * 
     * @param user User to check
     * @return true if user is SUPER_ADMIN
     */
    public boolean isSuperAdmin(User user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream()
                .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
    }

    /**
     * Check if user has INSURANCE_ADMIN role.
     * INSURANCE_ADMIN behaves like SUPER_ADMIN for data access.
     * 
     * @param user User to check
     * @return true if user is INSURANCE_ADMIN
     */
    public boolean isInsuranceAdmin(User user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream()
                .anyMatch(role -> "INSURANCE_ADMIN".equals(role.getName()));
    }

    /**
     * Check if user has administrative privileges (SUPER_ADMIN or INSURANCE_ADMIN).
     * These roles typically have broad data access.
     * 
     * @param user User to check
     * @return true if user is an administrator
     */
    public boolean isAdmin(User user) {
        return isSuperAdmin(user) || isInsuranceAdmin(user);
    }

    /**
     * Check if user has EMPLOYER_ADMIN role.
     * EMPLOYER_ADMIN is restricted by their employerId.
     * 
     * @param user User to check
     * @return true if user is EMPLOYER_ADMIN
     */
    public boolean isEmployerAdmin(User user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream()
                .anyMatch(role -> "EMPLOYER_ADMIN".equals(role.getName()));
    }

    /**
     * Check if user has PROVIDER role.
     * 
     * @param user User to check
     * @return true if user is PROVIDER
     */
    public boolean isProvider(User user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream()
                .anyMatch(role -> "PROVIDER".equals(role.getName()));
    }

    /**
     * Check if user has REVIEWER role.
     * 
     * @param user User to check
     * @return true if user is REVIEWER
     */
    public boolean isReviewer(User user) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream()
                .anyMatch(role -> "REVIEWER".equals(role.getName()));
    }

    // =============================================================================================
    // DATA-LEVEL ACCESS CONTROL METHODS
    // =============================================================================================

    /**
     * Check if user can access a specific member.
     * 
     * AUTHORIZATION RULES:
     * - SUPER_ADMIN: ✅ Full access (always TRUE)
     * - INSURANCE_ADMIN: ✅ Full access (always TRUE)
     * - EMPLOYER_ADMIN: ✅ Only if member.employerId == user.employerId
     * - Others: ❌ No access
     * 
     * @param user     Current user
     * @param memberId ID of the member to access
     * @return true if user can access the member
     */
    public boolean canAccessMember(User user, Long memberId) {
        if (user == null || memberId == null) {
            log.warn("❌ canAccessMember: DENIED - null user or memberId");
            return false;
        }

        // Admin privileges bypass all checks
        if (isAdmin(user)) {
            log.debug("✅ canAccessMember: ALLOWED - user={} is ADMIN", user.getUsername());
            return true;
        }

        Optional<Member> memberOpt = memberRepository.findById(memberId);
        if (memberOpt.isEmpty()) {
            log.warn("❌ canAccessMember: DENIED - member {} not found", memberId);
            return false;
        }

        Member member = memberOpt.get();

        // EMPLOYER_ADMIN: Check employer match
        if (isEmployerAdmin(user)) {
            if (user.getEmployerId() == null) {
                log.warn("❌ canAccessMember: DENIED - EMPLOYER_ADMIN user {} has no employerId", user.getUsername());
                return false;
            }
            if (member.getEmployerOrganization() == null
                    || !user.getEmployerId().equals(member.getEmployerOrganization().getId())) {
                log.warn("❌ canAccessMember: DENIED - user {} attempted to access member {} from different employer",
                        user.getUsername(), memberId);
                return false;
            }
            log.debug("✅ canAccessMember: ALLOWED - user={} employer matches", user.getUsername());
            return true;
        }

        log.warn("❌ canAccessMember: DENIED - user {} has no valid role for member access", user.getUsername());
        return false;
    }

    /**
     * Check if user can access a specific claim.
     * 
     * AUTHORIZATION RULES:
     * - SUPER_ADMIN: ✅ Full access (always TRUE)
     * - INSURANCE_ADMIN: ✅ Full access (always TRUE)
     * - REVIEWER: ✅ Full access for review purposes
     * - EMPLOYER_ADMIN: ✅ Only if claim.member.employerId == user.employerId
     * - PROVIDER: ✅ Can access claims (provider-specific logic TBD)
     * - Others: ❌ No access
     * 
     * @param user    Current user
     * @param claimId ID of the claim to access
     * @return true if user can access the claim
     */
    public boolean canAccessClaim(User user, Long claimId) {
        if (user == null || claimId == null) {
            log.warn("❌ canAccessClaim: DENIED - null user or claimId");
            return false;
        }

        // Admin privileges bypass all checks
        if (isAdmin(user)) {
            log.debug("✅ canAccessClaim: ALLOWED - user={} is ADMIN", user.getUsername());
            return true;
        }

        // REVIEWER can access all claims for review
        if (isReviewer(user)) {
            log.debug("✅ canAccessClaim: ALLOWED - user={} is REVIEWER", user.getUsername());
            return true;
        }

        Optional<Claim> claimOpt = claimRepository.findById(claimId);
        if (claimOpt.isEmpty()) {
            log.warn("❌ canAccessClaim: DENIED - claim {} not found", claimId);
            return false;
        }

        Claim claim = claimOpt.get();

        // PROVIDER: Can access claims ONLY if they belong to their provider
        if (isProvider(user)) {
            if (user.getProviderId() == null) {
                log.warn("❌ canAccessClaim: DENIED - PROVIDER user {} has no providerId", user.getUsername());
                return false;
            }
            if (!user.getProviderId().equals(claim.getProviderId())) {
                log.warn(
                        "❌ canAccessClaim: DENIED - user {} (provider={}) attempted to access claim {} from provider {}",
                        user.getUsername(), user.getProviderId(), claimId, claim.getProviderId());
                return false;
            }
            log.debug("✅ canAccessClaim: ALLOWED - user={} provider matches", user.getUsername());
            return true;
        }

        // EMPLOYER_ADMIN: Check if claim's member belongs to their employer
        if (isEmployerAdmin(user)) {
            if (user.getEmployerId() == null) {
                log.warn("❌ canAccessClaim: DENIED - EMPLOYER_ADMIN user {} has no employerId", user.getUsername());
                return false;
            }
            if (claim.getMember() == null || claim.getMember().getEmployerOrganization() == null ||
                    !user.getEmployerId().equals(claim.getMember().getEmployerOrganization().getId())) {
                log.warn("❌ canAccessClaim: DENIED - user {} attempted to access claim {} from different employer",
                        user.getUsername(), claimId);
                return false;
            }
            log.debug("✅ canAccessClaim: ALLOWED - user={} employer matches", user.getUsername());
            return true;
        }

        log.warn("❌ canAccessClaim: DENIED - user {} has no valid role for claim access", user.getUsername());
        return false;
    }

    /**
     * Check if user can access a specific visit.
     * 
     * AUTHORIZATION RULES:
     * - SUPER_ADMIN: ✅ Full access (always TRUE)
     * - INSURANCE_ADMIN: ✅ Full access (always TRUE)
     * - EMPLOYER_ADMIN: ✅ Only if visit.member.employerId == user.employerId
     * - Others: ❌ No access
     * 
     * @param user    Current user
     * @param visitId ID of the visit to access
     * @return true if user can access the visit
     */

    public boolean canAccessVisit(User user, Long visitId) {
        if (user == null || visitId == null) {
            log.warn("❌ canAccessVisit: DENIED - null user or visitId");
            return false;
        }

        // Admin privileges bypass all checks
        if (isAdmin(user)) {
            log.debug("✅ canAccessVisit: ALLOWED - user={} is ADMIN", user.getUsername());
            return true;
        }

        Optional<Visit> visitOpt = visitRepository.findById(visitId);
        if (visitOpt.isEmpty()) {
            log.warn("❌ canAccessVisit: DENIED - visit {} not found", visitId);
            return false;
        }

        Visit visit = visitOpt.get();

        // EMPLOYER_ADMIN: Check if visit's member belongs to their employer
        if (isEmployerAdmin(user)) {
            if (user.getEmployerId() == null) {
                log.warn("❌ canAccessVisit: DENIED - EMPLOYER_ADMIN user {} has no employerId", user.getEmployerId());
                return false;
            }
            if (visit.getMember() == null || visit.getMember().getEmployerOrganization() == null ||
                    !user.getEmployerId().equals(visit.getMember().getEmployerOrganization().getId())) {
                log.warn("❌ canAccessVisit: DENIED - user {} attempted to access visit {} from different employer",
                        user.getUsername(), visitId);
                return false;
            }
            log.debug("✅ canAccessVisit: ALLOWED - user={} employer matches", user.getUsername());
            return true;
        }

        // PROVIDER: Check if visit belongs to their provider
        if (isProvider(user)) {
            if (user.getProviderId() == null) {
                log.warn("❌ canAccessVisit: DENIED - PROVIDER user {} has no providerId", user.getUsername());
                return false;
            }
            if (!user.getProviderId().equals(visit.getProviderId())) {
                log.warn(
                        "❌ canAccessVisit: DENIED - user {} (provider={}) attempted to access visit {} from provider {}",
                        user.getUsername(), user.getProviderId(), visitId, visit.getProviderId());
                return false;
            }
            log.debug("✅ canAccessVisit: ALLOWED - user={} provider matches", user.getUsername());
            return true;
        }

        log.warn("❌ canAccessVisit: DENIED - user {} has no valid role for visit access", user.getUsername());
        return false;
    }

    /**
     * Check if user can access a specific pre-authorization.
     * 
     * AUTHORIZATION RULES:
     * - SUPER_ADMIN: ✅ Full access
     * - INSURANCE_ADMIN: ✅ Full access
     * - PROVIDER: ✅ Only if preAuth.providerId == user.providerId
     * - EMPLOYER_ADMIN: ✅ Only if preAuth.member.employerId == user.employerId
     * - Others: ❌ No access
     * 
     * @param user      Current user
     * @param preAuthId ID of the pre-authorization to access
     * @return true if user can access the pre-authorization
     */
    public boolean canAccessPreAuthorization(User user, Long preAuthId) {
        if (user == null || preAuthId == null) {
            log.warn("❌ canAccessPreAuthorization: DENIED - null user or preAuthId");
            return false;
        }

        // Admin privileges bypass all checks
        if (isAdmin(user)) {
            log.debug("✅ canAccessPreAuthorization: ALLOWED - user={} is ADMIN", user.getUsername());
            return true;
        }

        Optional<PreAuthorization> preAuthOpt = preAuthorizationRepository.findById(preAuthId);
        if (preAuthOpt.isEmpty()) {
            log.warn("❌ canAccessPreAuthorization: DENIED - preAuth {} not found", preAuthId);
            return false;
        }

        PreAuthorization preAuth = preAuthOpt.get();

        // PROVIDER: Check if preAuth belongs to their provider
        if (isProvider(user)) {
            if (user.getProviderId() == null) {
                log.warn("❌ canAccessPreAuthorization: DENIED - PROVIDER user {} has no providerId",
                        user.getUsername());
                return false;
            }
            if (!user.getProviderId().equals(preAuth.getProviderId())) {
                log.warn(
                        "❌ canAccessPreAuthorization: DENIED - user {} (provider={}) attempted to access preAuth {} from provider {}",
                        user.getUsername(), user.getProviderId(), preAuthId, preAuth.getProviderId());
                return false;
            }
            log.debug("✅ canAccessPreAuthorization: ALLOWED - user={} provider matches", user.getUsername());
            return true;
        }

        // EMPLOYER_ADMIN: Check if preAuth's member belongs to their employer
        if (isEmployerAdmin(user)) {
            if (user.getEmployerId() == null) {
                log.warn("❌ canAccessPreAuthorization: DENIED - EMPLOYER_ADMIN user {} has no employerId",
                        user.getUsername());
                return false;
            }

            // Check member via repository since preAuth only has memberId (not full member
            // object with employer joined usually)
            Optional<Member> memberOpt = memberRepository.findById(preAuth.getMemberId());
            if (memberOpt.isEmpty() || memberOpt.get().getEmployerOrganization() == null ||
                    !user.getEmployerId().equals(memberOpt.get().getEmployerOrganization().getId())) {
                log.warn(
                        "❌ canAccessPreAuthorization: DENIED - user {} attempted to access preAuth {} from different employer",
                        user.getUsername(), preAuthId);
                return false;
            }
            log.debug("✅ canAccessPreAuthorization: ALLOWED - user={} employer matches", user.getUsername());
            return true;
        }

        log.warn("❌ canAccessPreAuthorization: DENIED - user {} has no valid role for preAuth access",
                user.getUsername());
        return false;
    }

    /**
     * Check if CURRENT user can access a specific pre-authorization.
     */
    public boolean canAccessPreAuthorization(Long id) {
        return canAccessPreAuthorization(getCurrentUser(), id);
    }

    /**
     * Check if user can access a specific provider.
     * 
     * AUTHORIZATION RULES:
     * - SUPER_ADMIN: ✅ Full access
     * - INSURANCE_ADMIN: ✅ Full access
     * - PROVIDER: ✅ Only if user.providerId == providerId
     * - Others: ❌ No access (unless they have specific VIEW_PROVIDERS authority
     * checked elsewhere)
     * 
     * @param user       Current user
     * @param providerId ID of the provider to access
     * @return true if user can access the provider
     */
    public boolean canAccessProvider(User user, Long providerId) {
        if (user == null || providerId == null) {
            log.warn("❌ canAccessProvider: DENIED - null user or providerId");
            return false;
        }

        // Admin privileges bypass all checks
        if (isAdmin(user)) {
            log.debug("✅ canAccessProvider: ALLOWED - user={} is ADMIN", user.getUsername());
            return true;
        }

        // PROVIDER: Check provider match
        if (isProvider(user)) {
            if (user.getProviderId() == null) {
                log.warn("❌ canAccessProvider: DENIED - PROVIDER user {} has no providerId", user.getUsername());
                return false;
            }
            if (!user.getProviderId().equals(providerId)) {
                log.warn("❌ canAccessProvider: DENIED - user {} (provider={}) attempted to access provider {}",
                        user.getUsername(), user.getProviderId(), providerId);
                return false;
            }
            log.debug("✅ canAccessProvider: ALLOWED - user={} provider matches", user.getUsername());
            return true;
        }

        // Allow if user explicitly has VIEW_PROVIDERS permission (handled by caller or
        // authority check)
        return false;
    }

    /**
     * Check if CURRENT user can access a specific provider.
     * Convenience method for SpEL security expressions.
     * usage: @PreAuthorize("@authorizationService.canAccessProvider(#id)")
     * 
     * @param providerId ID of the provider to access
     * @return true if current user can access the provider
     */
    public boolean canAccessProvider(Long providerId) {
        return canAccessProvider(getCurrentUser(), providerId);
    }
    // =============================================================================================
    // QUERY FILTERING METHODS (FOR SERVICE LAYER)
    // =============================================================================================

    /**
     * Get employer filter for queries.
     * 
     * USE THIS IN SERVICE LAYER TO FILTER QUERIES BY EMPLOYER.
     * 
     * FILTERING LOGIC:
     * - SUPER_ADMIN: NULL (no filter - sees everything)
     * - INSURANCE_ADMIN: NULL (no filter - sees everything)
     * - EMPLOYER_ADMIN: user.employerId (filter by their employer)
     * - Others: NULL (no filter - controlled by other means)
     * 
     * USAGE IN SERVICE:
     * 
     * <pre>
     * Long employerFilter = authorizationService.getEmployerFilterForUser(currentUser);
     * if (employerFilter != null) {
     *     return repository.findByEmployerId(employerFilter);
     * } else {
     *     return repository.findAll();
     * }
     * </pre>
     * 
     * @param user Current user
     * @return employerId to filter by, or NULL if no filtering needed
     */
    public Long getEmployerFilterForUser(User user) {
        if (user == null) {
            log.warn("⚠️ getEmployerFilterForUser: user is null, returning null filter");
            return null;
        }

        // Admin privileges see ALL data - no filter
        if (isAdmin(user)) {
            log.debug("🔓 getEmployerFilterForUser: user={} is ADMIN - NO FILTER", user.getUsername());
            return null;
        }

        // EMPLOYER_ADMIN sees only THEIR employer's data
        if (isEmployerAdmin(user)) {
            Long employerId = user.getEmployerId();
            if (employerId == null) {
                log.warn("⚠️ getEmployerFilterForUser: EMPLOYER_ADMIN user={} has no employerId!", user.getUsername());
            } else {
                log.debug("🔒 getEmployerFilterForUser: user={} filtered by employerId={}", user.getUsername(),
                        employerId);
            }
            return employerId;
        }

        // Other roles: no filtering (for now)
        log.debug("🔓 getEmployerFilterForUser: user={} has other role - NO FILTER", user.getUsername());
        return null;
    }

    /**
     * Get provider filter for current user.
     * Used to filter visits and claims by provider.
     * 
     * AUTHORIZATION MODEL:
     * - SUPER_ADMIN: NO FILTER (sees all providers)
     * - INSURANCE_ADMIN: NO FILTER (sees all providers)
     * - PROVIDER: FILTER by user.providerId (sees only their provider's data)
     * - Others: NO FILTER
     * 
     * USAGE IN SERVICE:
     * 
     * <pre>
     * Long providerFilter = authorizationService.getProviderFilterForUser(currentUser);
     * if (providerFilter != null) {
     *     return repository.findByProviderId(providerFilter);
     * } else {
     *     return repository.findAll();
     * }
     * </pre>
     * 
     * @param user Current user
     * @return providerId to filter by, or NULL if no filtering needed
     */
    public Long getProviderFilterForUser(User user) {
        if (user == null) {
            log.warn("⚠️ getProviderFilterForUser: user is null, returning null filter");
            return null;
        }

        // Admin privileges see ALL data - no filter
        if (isAdmin(user)) {
            log.debug("🔓 getProviderFilterForUser: user={} is ADMIN - NO FILTER", user.getUsername());
            return null;
        }

        // PROVIDER sees only THEIR provider's data
        if (isProvider(user)) {
            Long providerId = user.getProviderId();
            if (providerId == null) {
                log.warn("⚠️ getProviderFilterForUser: PROVIDER user={} has no providerId!", user.getUsername());
            } else {
                log.debug("🔒 getProviderFilterForUser: user={} filtered by providerId={}", user.getUsername(),
                        providerId);
            }
            return providerId;
        }

        // Other roles: no filtering
        log.debug("🔓 getProviderFilterForUser: user={} has other role - NO FILTER", user.getUsername());
        return null;
    }

    /**
     * Check if user can modify a claim (approve/reject).
     * 
     * AUTHORIZATION RULES:
     * - SUPER_ADMIN: ✅ Can modify
     * - INSURANCE_ADMIN: ✅ Can modify
     * - REVIEWER: ✅ Can modify
     * - Others: ❌ Cannot modify
     * 
     * @param user    Current user
     * @param claimId ID of the claim to modify
     * @return true if user can modify the claim
     */
    public boolean canModifyClaim(User user, Long claimId) {
        if (user == null || claimId == null) {
            log.warn("❌ canModifyClaim: DENIED - null user or claimId");
            return false;
        }

        // Admin privileges can modify
        if (isAdmin(user)) {
            log.debug("✅ canModifyClaim: ALLOWED - user={} is ADMIN", user.getUsername());
            return true;
        }

        // REVIEWER can modify
        if (isReviewer(user)) {
            log.debug("✅ canModifyClaim: ALLOWED - user={} is REVIEWER", user.getUsername());
            return true;
        }

        log.warn("❌ canModifyClaim: DENIED - user {} cannot modify claim {}", user.getUsername(), claimId);
        return false;
    }

    /**
     * Get the set of employer IDs that a user is permitted to see.
     * Handles ADMIN (null), EMPLOYER_ADMIN (single), and PROVIDER (set).
     * 
     * @param user Current user
     * @return Set of permitted employer IDs, or NULL if user can see everything
     *         (Admin/Full Access)
     */
    public Set<Long> getPermittedEmployerIdsForUser(User user) {
        if (user == null) {
            return java.util.Collections.emptySet();
        }

        // Admin roles bypass all data filters
        if (isAdmin(user)) {
            return null;
        }

        // EMPLOYER_ADMIN: Restricted to their specific employer
        if (isEmployerAdmin(user)) {
            return user.getEmployerId() != null
                    ? java.util.Collections.singleton(user.getEmployerId())
                    : java.util.Collections.emptySet();
        }

        // PROVIDER: Restricted based on allow_all_companies and permitted_organizations
        if (isProvider(user)) {
            if (Boolean.TRUE.equals(user.getAllowAllCompanies())) {
                log.debug("🔓 User {} is PROVIDER with Full Access - NO FILTER", user.getUsername());
                return null;
            }

            Set<Long> ids = user.getPermittedOrganizations().stream()
                    .map(com.waad.tba.common.entity.Organization::getId)
                    .collect(Collectors.toSet());

            log.debug("🔒 User {} is PROVIDER with Restricted Access ({} organizations)",
                    user.getUsername(), ids.size());
            return ids;
        }

        // Other roles: No default access to members/employers
        return java.util.Collections.emptySet();
    }

    // =============================================================================================
    // FEATURE TOGGLE METHODS (EMPLOYER-SPECIFIC PERMISSIONS)
    // =============================================================================================
    //
    // These methods check feature flags that control what EMPLOYER_ADMIN users can
    // do.
    // Feature toggles work ON TOP of RBAC permissions.
    //
    // KEY POINT: Non-employer users (SUPER_ADMIN, INSURANCE_ADMIN) always pass
    // these checks.
    // =============================================================================================

    /**
     * Check if EMPLOYER_ADMIN user can view claims based on feature toggle.
     * 
     * LOGIC:
     * - SUPER_ADMIN: ✅ Always allowed (feature flags don't apply)
     * - INSURANCE_ADMIN: ✅ Always allowed (feature flags don't apply)
     * - EMPLOYER_ADMIN: ✅ Allowed only if they have the 'PORTAL_CLAIM_VIEW'
     * permission
     * - Others: ✅ Always allowed (controlled by RBAC)
     * 
     * @param user Current user
     * @return true if user can view claims
     */
    public boolean canEmployerViewClaims(User user) {
        if (user == null) {
            log.warn("⚠️ FeatureCheck: user=null feature=CLAIM_VIEW result=DENIED (null user)");
            return false;
        }

        // Admin privileges bypass feature flags
        if (isAdmin(user)) {
            return true;
        }

        // Non-employer users: always allow (controlled by RBAC)
        if (!isEmployerAdmin(user)) {
            return true;
        }

        // EMPLOYER_ADMIN: check RBAC permission 'CLAIM_PORTAL_VIEW'
        // This replaces the old legacy 'companySettingsService.canEmployerViewClaims'
        // Now, permissions are assigned to Roles, and Roles are assigned to Users.
        // We check if the user has this specific permission.
        return hasPermission(user, AppPermission.CLAIM_PORTAL_VIEW.name());
    }

    /**
     * Helper to check if a user has a specific permission by name.
     * Iterates through user roles -> permissions.
     */
    public boolean hasPermission(User user, String permissionName) {
        if (user.getRoles() == null)
            return false;

        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(permission -> permission.getName().equals(permissionName));
    }

    public boolean canEmployerViewVisits(User user) {
        if (user == null) {
            log.warn("⚠️ FeatureCheck: user=null feature=VISIT_VIEW result=DENIED (null user)");
            return false;
        }

        if (isSuperAdmin(user) || isInsuranceAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=VISIT_VIEW result=ALLOWED (admin role)", user.getUsername());
            return true;
        }

        // Non-employer users: always allow (controlled by RBAC)
        if (!isEmployerAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=VISIT_VIEW result=ALLOWED (not EMPLOYER_ADMIN)",
                    user.getUsername());
            return true;
        }

        // EMPLOYER_ADMIN: check RBAC permission 'VISIT_PORTAL_VIEW'
        return hasPermission(user, AppPermission.VISIT_PORTAL_VIEW.name());
    }

    /**
     * Check if EMPLOYER_ADMIN user can view members based on feature toggle.
     * 
     * SECURITY (2026-01-16):
     * - SUPER_ADMIN/INSURANCE_ADMIN: Always allowed
     * - EMPLOYER_ADMIN: Based on canViewMembers feature flag
     * - Others: Always allowed (controlled by RBAC)
     * 
     * @param user Current user
     * @return true if user can view members
     */
    public boolean canEmployerViewMembers(User user) {
        if (user == null) {
            log.warn("⚠️ FeatureCheck: user=null feature=MEMBER_VIEW result=DENIED (null user)");
            return false;
        }

        // SUPER_ADMIN and INSURANCE_ADMIN bypass feature flags
        if (isSuperAdmin(user) || isInsuranceAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=MEMBER_VIEW result=ALLOWED (admin role)", user.getUsername());
            return true;
        }

        // Non-employer users: always allow (controlled by RBAC)
        if (!isEmployerAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=MEMBER_VIEW result=ALLOWED (not EMPLOYER_ADMIN)",
                    user.getUsername());
            return true;
        }

        // UNIFIED RBAC: Check 'MEMBER_PORTAL_VIEW' permission
        boolean result = hasPermission(user, AppPermission.MEMBER_PORTAL_VIEW.name());

        log.info("🔧 FeatureCheck: employerId={} user={} feature=MEMBER_VIEW result={}",
                user.getEmployerId(), user.getUsername(), result ? "ALLOWED" : "DENIED");

        return result;
    }

    public boolean canEmployerEditMembers(User user) {
        if (user == null) {
            log.warn("⚠️ FeatureCheck: user=null feature=EDIT_MEMBERS result=DENIED (null user)");
            return false;
        }

        // SUPER_ADMIN and INSURANCE_ADMIN bypass feature flags
        if (isSuperAdmin(user) || isInsuranceAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=EDIT_MEMBERS result=ALLOWED (admin role)", user.getUsername());
            return true;
        }

        // Non-employer users: always allow (controlled by RBAC)
        if (!isEmployerAdmin(user)) {
            return true;
        }

        // EMPLOYER_ADMIN: check RBAC permission 'MEMBER_PORTAL_EDIT'
        return hasPermission(user, AppPermission.MEMBER_PORTAL_EDIT.name());
    }

    /**
     * Check if EMPLOYER_ADMIN user can download attachments based on feature
     * toggle.
     * 
     * @param user Current user
     * @return true if user can download attachments
     */
    public boolean canEmployerDownloadAttachments(User user) {
        if (user == null)
            return false;
        if (isAdmin(user))
            return true;
        if (!isEmployerAdmin(user))
            return true;

        // EMPLOYER_ADMIN: check RBAC permission 'MEMBER_PORTAL_DOWNLOAD_ATTACHMENTS'
        return hasPermission(user, AppPermission.MEMBER_PORTAL_DOWNLOAD_ATTACHMENTS.name());
    }

    /**
     * Check if EMPLOYER_ADMIN user can view benefit policies based on feature
     * toggle.
     * 
     * SECURITY (2026-01-16):
     * - SUPER_ADMIN/INSURANCE_ADMIN: Always allowed
     * - EMPLOYER_ADMIN: Based on canViewBenefitPolicies feature flag in User entity
     * - Others: Always allowed (controlled by RBAC)
     * 
     * @param user Current user
     * @return true if user can view benefit policies
     */
    public boolean canEmployerViewBenefitPolicies(User user) {
        if (user == null) {
            log.warn("⚠️ FeatureCheck: user=null feature=BENEFIT_POLICY_VIEW result=DENIED (null user)");
            return false;
        }

        // SUPER_ADMIN and INSURANCE_ADMIN bypass feature flags
        if (isSuperAdmin(user) || isInsuranceAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=BENEFIT_POLICY_VIEW result=ALLOWED (admin role)",
                    user.getUsername());
            return true;
        }

        // Non-employer users: always allow (controlled by RBAC)
        if (!isEmployerAdmin(user)) {
            log.debug("✅ FeatureCheck: user={} feature=BENEFIT_POLICY_VIEW result=ALLOWED (not EMPLOYER_ADMIN)",
                    user.getUsername());
            return true;
        }

        // UNIFIED RBAC: Check 'BENEFIT_POLICY_PORTAL_VIEW' permission
        boolean result = hasPermission(user, AppPermission.BENEFIT_POLICY_PORTAL_VIEW.name());

        log.info("🔧 FeatureCheck: employerId={} user={} feature=BENEFIT_POLICY_VIEW result={}",
                user.getEmployerId(), user.getUsername(), result ? "ALLOWED" : "DENIED");

        return result;
    }
}
