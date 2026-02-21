package com.waad.tba.modules.visit.service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.common.audit.service.AuditLogService;
import com.waad.tba.modules.visit.dto.VisitCreateDto;
import com.waad.tba.modules.visit.dto.VisitResponseDto;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.mapper.VisitMapper;
import com.waad.tba.modules.visit.repository.VisitRepository;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.security.ProviderContextGuard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Visit Service with Policy Validation (Phase 6).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * BUSINESS RULES ENFORCED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. VISIT CREATION requires:
 *    - Member has active policy on visit date
 *    - Member status is ACTIVE
 *    - Policy covers the visit date (within start/end date range)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SMOKE TEST SCENARIO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Scenario: Visit with Active Policy
 *   Given: Member "Ali" has policy P001 valid from 2024-01-01 to 2024-12-31
 *   When: Creating visit for Ali on 2024-06-15
 *   Then: Visit created successfully
 * 
 * Scenario: Visit Without Policy
 *   Given: Member "Sara" has no policy
 *   When: Creating visit for Sara
 *   Then: BusinessRuleException("Member has no active policy")
 * 
 * Scenario: Visit Outside Policy Dates
 *   Given: Member "Omar" has policy valid until 2024-12-31
 *   When: Creating visit for Omar on 2025-01-15
 *   Then: PolicyNotActiveException("Policy is not active on 2025-01-15")
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitRepository repository;
    private final MemberRepository memberRepository;
    private final VisitMapper mapper;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;
    private final com.waad.tba.modules.provider.repository.ProviderRepository providerRepository;
    private final ProviderContextGuard providerContextGuard;
    
    // BenefitPolicy validation (canonical source for all coverage decisions)
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;

    @Transactional(readOnly = true)
    public List<VisitResponseDto> findAll() {
        log.debug("📋 Finding all visits with data-level filtering");
        
        // Get current user and apply role-based filtering
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            log.warn("⚠️ No authenticated user found when accessing visits list");
            return Collections.emptyList();
        }
        
        List<Visit> visits;
        
        if (authorizationService.isAdmin(currentUser)) {
            // ADMIN (SUPER or INSURANCE): Access to ALL visits
            log.debug("✅ ADMIN access: returning all visits");
            visits = repository.findAll();
            
        } else if (authorizationService.isEmployerAdmin(currentUser)) {
            // EMPLOYER_ADMIN: Check feature toggle first
            if (!authorizationService.canEmployerViewVisits(currentUser)) {
                log.warn("❌ FeatureCheck: EMPLOYER_ADMIN user {} attempted to view visits but feature VIEW_VISITS is disabled", 
                    currentUser.getUsername());
                return Collections.emptyList();
            }
            
            // Feature enabled: Filter by employer
            Long employerId = authorizationService.getEmployerFilterForUser(currentUser);
            if (employerId == null) {
                log.warn("⚠️ EMPLOYER_ADMIN user {} has no employerId assigned", currentUser.getUsername());
                return Collections.emptyList();
            }
            
            log.info("🔒 Applying employer filter for visits: employerId={} for user {}", 
                employerId, currentUser.getUsername());
            visits = repository.findByMemberEmployerId(employerId);
            
        } else if (authorizationService.isProvider(currentUser)) {
            // PROVIDER: Filter by providerId
            Long providerId = authorizationService.getProviderFilterForUser(currentUser);
            if (providerId == null) {
                log.warn("⚠️ PROVIDER user {} has no providerId assigned", currentUser.getUsername());
                return Collections.emptyList();
            }
            
            log.info("🔒 Applying provider filter for visits: providerId={} for user {}", 
                providerId, currentUser.getUsername());
            visits = repository.findByProviderId(providerId);
            
        } else {
            // REVIEWER, USER: No access to visits list
            log.warn("❌ Access denied: user {} with roles {} attempted to access visits list", 
                currentUser.getUsername(), 
                currentUser.getRoles().stream()
                    .map(r -> r.getName())
                    .collect(Collectors.joining(", ")));
            return Collections.emptyList();
        }
        
        return visits.stream()
                .map(mapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VisitResponseDto findById(Long id) {
        log.debug("Finding visit by id: {}", id);
        
        // Get current user and validate access
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            log.warn("No authenticated user found when accessing visit: {}", id);
            throw new AccessDeniedException("Authentication required");
        }
        
        // Phase 9: Check feature toggle for EMPLOYER_ADMIN
        if (authorizationService.isEmployerAdmin(currentUser)) {
            if (!authorizationService.canEmployerViewVisits(currentUser)) {
                log.warn("FeatureCheck: EMPLOYER_ADMIN user {} attempted to view visit {} but feature VIEW_VISITS is disabled", 
                    currentUser.getUsername(), id);
                throw new AccessDeniedException("Your employer account does not have permission to view visits");
            }
        }
        
        // Check if user can access this visit
        if (!authorizationService.canAccessVisit(currentUser, id)) {
            log.warn("Access denied: user {} attempted to view visit {}", 
                currentUser.getUsername(), id);
            throw new AccessDeniedException("Access denied to this visit");
        }
        
        Visit entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visit", "id", id));
        
        // Audit log: Visit viewed
        auditLogService.createAuditLog("VIEW", "VISIT", id, 
            "Visit viewed by " + currentUser.getUsername(),
            currentUser.getId(), currentUser.getUsername(), null, null);
        
        log.debug("Visit {} accessed successfully by user {}", id, currentUser.getUsername());
        return mapper.toResponseDto(entity);
    }

    @Transactional
    public VisitResponseDto create(VisitCreateDto dto) {
        log.info("📝 Creating new visit for member id: {}", dto.getMemberId());

        // ═══════════════════════════════════════════════════════════════════════════
        // PROVIDER PORTAL (2026-01-15): Validate and enforce provider ID
        // ═══════════════════════════════════════════════════════════════════════════
        User currentUser = authorizationService.getCurrentUser();
        validateAndEnforceProviderId(dto, currentUser);

        Member member = memberRepository.findById(dto.getMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Member", "id", dto.getMemberId()));

        // Validate member has active BenefitPolicy for visit date (Single Source of Truth)
        LocalDate visitDate = dto.getVisitDate() != null ? dto.getVisitDate() : LocalDate.now();
        
        if (member.getBenefitPolicy() != null) {
            benefitPolicyCoverageService.validateCanCreateClaim(member, visitDate);
            log.debug("✅ BenefitPolicy validation passed for visit");
        } else {
            log.warn("⚠️ Member {} has no BenefitPolicy, skipping policy validation for visit", member.getCivilId());
        }

        Visit entity = mapper.toEntity(dto, member);
        Visit saved = repository.save(entity);
        
        log.info("✅ Visit created successfully with id: {}", saved.getId());
        return mapper.toResponseDto(saved);
    }

    @Transactional
    public VisitResponseDto update(Long id, VisitCreateDto dto) {
        log.info("Updating visit with id: {}", id);
        
        Visit entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visit", "id", id));

        Member member = memberRepository.findById(dto.getMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Member", "id", dto.getMemberId()));

        mapper.updateEntityFromDto(entity, dto, member);
        Visit updated = repository.save(entity);
        
        log.info("Visit updated successfully: {}", id);
        return mapper.toResponseDto(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting visit with id: {}", id);
        
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Visit", "id", id);
        }
        
        repository.deleteById(id);
        log.info("Visit deleted successfully: {}", id);
    }

    @Transactional(readOnly = true)
    public List<VisitResponseDto> search(String query) {
        log.debug("Searching visits with query: {}", query);
        
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            return Collections.emptyList();
        }

        if (authorizationService.isProvider(currentUser)) {
            // PROVIDER: Filter by strict provider context
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            log.info("🔒 PROVIDER user {} searching visits - enforced providerId={}", currentUser.getUsername(), providerId);
            return repository.searchByProviderId(query, providerId).stream()
                    .map(mapper::toResponseDto)
                    .collect(Collectors.toList());

        } else if (authorizationService.isEmployerAdmin(currentUser)) {
            // EMPLOYER_ADMIN: Filter by employer
            if (!authorizationService.canEmployerViewVisits(currentUser)) {
                return Collections.emptyList();
            }
            Long employerId = authorizationService.getEmployerFilterForUser(currentUser);
            log.info("🔒 EMPLOYER_ADMIN user {} searching visits - enforced employerId={}", currentUser.getUsername(), employerId);
            return repository.searchByMemberEmployerId(query, employerId).stream()
                    .map(mapper::toResponseDto)
                    .collect(Collectors.toList());

        } else if (authorizationService.isAdmin(currentUser)) {
            // ADMIN: Full search
            return repository.search(query).stream()
                    .map(mapper::toResponseDto)
                    .collect(Collectors.toList());
        }

        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public Page<VisitResponseDto> findAllPaginated(Long employerId, Pageable pageable, String search) {
        log.debug("Finding visits with pagination. employerId={}, search={}", employerId, search);
        
        User currentUser = authorizationService.getCurrentUser();
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PROVIDER DATA ISOLATION (2026-01-16): Enforce provider filter
        // PROVIDER users can ONLY see their own provider's visits
        // ═══════════════════════════════════════════════════════════════════════════
        if (currentUser != null && authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            
            log.info("🔒 PROVIDER user {} - filtering visits by providerId={}", 
                currentUser.getUsername(), providerId);
            
            // PROVIDER cannot filter by employer, only by their own provider
            if (search == null || search.isBlank()) {
                return repository.findByProviderId(providerId, pageable).map(mapper::toResponseDto);
            } else {
                return repository.searchPagedByProviderId(search, providerId, pageable).map(mapper::toResponseDto);
            }
        }
        
        if (employerId != null) {
            // Filter by employer
            if (search == null || search.isBlank()) {
                return repository.findByMemberEmployerId(employerId, pageable).map(mapper::toResponseDto);
            } else {
                return repository.searchPagedByEmployerId(search, employerId, pageable).map(mapper::toResponseDto);
            }
        } else {
            // No employer filter - return all (admin only should reach here)
            if (search == null || search.isBlank()) {
                return repository.findAll(pageable).map(mapper::toResponseDto);
            } else {
                return repository.searchPaged(search, pageable).map(mapper::toResponseDto);
            }
        }
    }

    @Transactional(readOnly = true)
    public long count(Long employerId) {
        User currentUser = authorizationService.getCurrentUser();
        
        if (currentUser != null && authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            return repository.countByProviderId(currentUser.getProviderId());
        }
        
        if (employerId != null) {
            return repository.countByMemberEmployerId(employerId);
        }
        return repository.count();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PROVIDER PORTAL (2026-01-16): Provider Context Enforcement with Guard
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * Validate and enforce provider ID based on user role.
     * 
     * ARCHITECTURAL RULES (HARDENED 2026-01-16):
     * - PROVIDER users: providerId ALWAYS comes from ProviderContextGuard (session)
     *   ANY providerId from request is IGNORED to prevent data leakage
     * - SUPER_ADMIN/INSURANCE_ADMIN: can set any providerId (REQUIRED)
     * - providerId is REQUIRED for all visits
     * 
     * @param dto The visit creation DTO
     * @param currentUser The currently authenticated user
     */
    private void validateAndEnforceProviderId(VisitCreateDto dto, User currentUser) {
        if (currentUser == null) {
            log.warn("⚠️ No authenticated user - skipping provider validation");
            return;
        }

        // Check if user is a PROVIDER - use ProviderContextGuard for strict enforcement
        if (authorizationService.isProvider(currentUser)) {
            // ═══════════════════════════════════════════════════════════════════════════
            // SECURITY HARDENING: Use ProviderContextGuard for validation
            // This ensures provider binding is validated and providerId is enforced
            // ═══════════════════════════════════════════════════════════════════════════
            providerContextGuard.validateProviderBinding(currentUser);
            Long userProviderId = currentUser.getProviderId();
            
            // Log if request contained different providerId (potential attack/bug)
            if (dto.getProviderId() != null && !dto.getProviderId().equals(userProviderId)) {
                log.warn("🚨 PROVIDER_ID_OVERRIDE: User {} requested providerId={} but enforced to {} (potential security issue)", 
                    currentUser.getUsername(), dto.getProviderId(), userProviderId);
            }
            
            // ALWAYS override with user's providerId - NO EXCEPTIONS
            dto.setProviderId(userProviderId);
            
            log.info("🔒 PROVIDER {} creating visit with their providerId: {} (enforced by ProviderContextGuard)", 
                currentUser.getUsername(), userProviderId);
        } else if (authorizationService.isAdmin(currentUser)) {
            // SUPER_ADMIN and INSURANCE_ADMIN can set any provider but MUST provide providerId
            if (dto.getProviderId() == null) {
                throw new IllegalArgumentException(
                    "يجب تحديد مقدم الخدمة للمستخدمين الإداريين / Provider ID is required for admin users"
                );
            }
            
            log.info("🔓 ADMIN user {} creating visit - any providerId allowed", currentUser.getUsername());
            
            // Validate provider exists
            providerRepository.findById(dto.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("Provider", "id", dto.getProviderId()));
        } else {
            // Other roles: providerId is required
            if (dto.getProviderId() == null) {
                throw new IllegalArgumentException(
                    "يجب تحديد مقدم الخدمة / Provider ID is required"
                );
            }
        }
    }
}
