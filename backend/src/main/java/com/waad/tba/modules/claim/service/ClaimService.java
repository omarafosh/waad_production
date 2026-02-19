package com.waad.tba.modules.claim.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.service.ArchitecturalGuardService;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.claim.dto.ClaimApproveDto;
import com.waad.tba.modules.claim.dto.ClaimCreateDto;
import com.waad.tba.modules.claim.dto.ClaimLineDto;
import com.waad.tba.modules.claim.dto.ClaimRejectDto;
import com.waad.tba.modules.claim.dto.ClaimReturnForInfoDto;
import com.waad.tba.modules.claim.dto.ClaimSettleDto;
import com.waad.tba.modules.claim.dto.ClaimUpdateDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
import com.waad.tba.modules.claim.dto.CostBreakdownDto;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.entity.ClaimType;
import com.waad.tba.modules.claim.mapper.ClaimMapper;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.provider.service.ProviderNetworkService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.security.ProviderContextGuard;

import com.waad.tba.common.repository.SystemSettingRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Claim Service with Business Flow Validation (Phase 6).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * BUSINESS RULES ENFORCED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. CLAIM CREATION requires:
 *    - Member has active policy (validated by PolicyValidationService)
 *    - Policy covers the service date
 *    - Requested services are covered in benefit package
 *    - Coverage limits not exceeded
 * 
 * 2. CLAIM UPDATE follows state machine:
 *    - Only DRAFT and RETURNED_FOR_INFO allow detail edits
 *    - Status transitions validated by ClaimStateMachine
 * 
 * 3. STATUS TRANSITIONS require appropriate roles:
 *    - DRAFT → SUBMITTED (EMPLOYER, INSURANCE)
 *    - SUBMITTED → UNDER_REVIEW (INSURANCE, REVIEWER)
 *    - UNDER_REVIEW → APPROVED/REJECTED (INSURANCE, REVIEWER)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXAMPLE FLOW: Member → Claim → Review → Decision
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. Member "Ali" visits doctor on 2024-06-15
 * 2. EMPLOYER creates claim (status=DRAFT)
 *    → PolicyValidationService checks Ali's policy is active on 2024-06-15
 *    → CoverageValidationService checks services are covered
 * 3. EMPLOYER submits claim (DRAFT → SUBMITTED)
 * 4. INSURANCE takes for review (SUBMITTED → UNDER_REVIEW)
 * 5. REVIEWER approves with amount (UNDER_REVIEW → APPROVED)
 *    → Must set approvedAmount > 0
 * 6. INSURANCE settles payment (APPROVED → SETTLED)
 *    → Terminal state, no more changes allowed
 * 
 * SECURITY HARDENING (2026-01-16):
 * Provider data isolation enforced via ProviderContextGuard.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final ClaimMapper claimMapper;
    private final AuthorizationService authorizationService;
    private final ProviderContextGuard providerContextGuard;
    private final MemberRepository memberRepository;
    private final ProviderRepository providerRepository;
    
    // Phase 8: BenefitPolicy-based coverage validation (Single Source of Truth)
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;
    private final ClaimStateMachine claimStateMachine;
    
    // Phase 7: Operational completeness services
    private final ProviderNetworkService providerNetworkService;
    private final AttachmentRulesService attachmentRulesService;
    private final CostCalculationService costCalculationService;
    private final ClaimAuditService claimAuditService;
    
    // Phase 1: SLA tracking services
    private final com.waad.tba.common.service.BusinessDaysCalculatorService businessDaysCalculator;
    private final SystemSettingRepository systemSettingRepository;
    
    // Phase 9: Architectural Guards (System Invariants)
    private final ArchitecturalGuardService architecturalGuard;
    
    // Phase 1 (2026-01-28): Atomic Financial Operations
    // Removed atomicFinancialService, providerAccountService, userRepository as they moved to ClaimApprovalService

    /**
     * Search claims with explicit employer filtering.
     * UPDATED 2026-01-05: Added PROVIDER filtering (Global Best Practice)
     * 
     * @param employerId Optional employer ID for filtering (null = show all for admin)
     * @param query Search query string
     */
    public List<ClaimViewDto> search(Long employerId, String query) {
        log.debug("🔍 Searching claims with query: {}, employerId: {}", query, employerId);
        
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            log.warn("⚠️ No authenticated user");
            return Collections.emptyList();
        }
        
        // Check feature flags for EMPLOYER_ADMIN
        if (authorizationService.isEmployerAdmin(currentUser)) {
            if (!authorizationService.canEmployerViewClaims(currentUser)) {
                log.warn("❌ EMPLOYER_ADMIN feature VIEW_CLAIMS disabled");
                return Collections.emptyList();
            }
            // EMPLOYER role is locked to their own employer
            employerId = currentUser.getEmployerId();
        }
        
        // PROVIDER filtering - show only their own claims
        // UPDATED 2026-01-16: Now using ProviderContextGuard for strict validation
        if (authorizationService.isProvider(currentUser)) {
            // Validate provider binding first
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            
            log.info("🔒 Applying provider filter for claims: providerId={} for user {}", 
                providerId, currentUser.getUsername());
            
            // Use provider-specific search method
            List<Claim> providerClaims = claimRepository.searchByProviderId(query, providerId);
            log.info("✅ Found {} claims for provider {}", providerClaims.size(), providerId);
            
            return providerClaims.stream()
                    .map(claimMapper::toViewDto)
                    .collect(Collectors.toList());
        }
        
        List<Claim> claims;
        
        if (employerId != null) {
            log.debug("🔒 Filtering claims by employerId={}", employerId);
            claims = claimRepository.searchByEmployerId(query, employerId);
        } else if (authorizationService.isAdmin(currentUser)) {
            log.debug("🔓 Admin - searching all claims");
            claims = claimRepository.search(query);
        } else {
            log.warn("❌ No employer scope and not admin - Access Denied for user: {}", currentUser.getUsername());
            return Collections.emptyList();
        }
        
        return claims.stream()
                .map(claimMapper::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Create a new claim with business rule validation.
     * 
     * PHASE 6 VALIDATION:
     * 1. Member must have active policy
     * 2. Policy must cover service date
     * 3. Services must be covered in benefit package
     * 4. Coverage limits must not be exceeded
     * 
     * PHASE 7 ADDITIONS:
     * 5. Provider network validation (IN_NETWORK/OUT_OF_NETWORK warning)
     * 6. Cost calculation preview (deductible, co-pay)
     * 7. Audit trail creation
     * 
     * PHASE 8 ADDITIONS:
     * 8. BenefitPolicy validation (new single source of truth)
     * 
     * ═══════════════════════════════════════════════════════════════════════════
     * CANONICAL REBUILD (2026-01-15): Visit-Centric, Contract-Driven
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * NEW ARCHITECTURE:
     * 1. Visit is MANDATORY - all data flows from Visit
     * 2. Member and Provider come from Visit (not DTO)
     * 3. Prices come from ProviderContract (not user input)
     * 4. Services must be selected from MedicalService table
     */
    public ClaimViewDto createClaim(ClaimCreateDto dto) {
        log.info("📝 [CANONICAL] Creating claim with Visit-Centric Architecture");
        
        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 1: Validate Visit exists (MANDATORY)
        // ═══════════════════════════════════════════════════════════════════════════
        if (dto.getVisitId() == null) {
            throw new BusinessRuleException("ARCHITECTURAL VIOLATION: visitId is REQUIRED");
        }
        
        // Get current user for audit
        User currentUser = authorizationService.getCurrentUser();
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ARCHITECTURAL GUARD: Validate system invariants before processing
        // ═══════════════════════════════════════════════════════════════════════════
        List<Long> serviceIds = dto.getLines() != null 
            ? dto.getLines().stream().map(ClaimLineDto::getMedicalServiceId).toList()
            : List.of();
        architecturalGuard.guardClaimCreation(dto.getVisitId(), serviceIds);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 2: ClaimMapper handles all contract-driven logic
        // ═══════════════════════════════════════════════════════════════════════════
        // ClaimMapper.toEntity() now:
        // - Validates Visit exists
        // - Gets Member and Provider from Visit
        // - Resolves contract prices for each line
        // - Calculates total from lines
        Claim claim = claimMapper.toEntity(dto);
        claim.setStatus(ClaimStatus.DRAFT); // Always start as DRAFT
        
        // Get member from the claim (derived from Visit in mapper)
        Member member = claim.getMember();
        LocalDate serviceDate = claim.getServiceDate() != null ? claim.getServiceDate() : LocalDate.now();
        
        log.info("📋 Claim derived: Member={}, Provider={}, ServiceDate={}, Lines={}, Total={}",
                member.getId(), claim.getProviderId(), serviceDate, 
                claim.getLines() != null ? claim.getLines().size() : 0,
                claim.getRequestedAmount());
        
        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 3: BenefitPolicy Validation (Single Source of Truth)
        // ═══════════════════════════════════════════════════════════════════════════
        benefitPolicyCoverageService.validateCanCreateClaim(member, serviceDate);
        log.info("✅ Member {} has valid BenefitPolicy for date {}", member.getCivilId(), serviceDate);
        
        // Validate amount limits using BenefitPolicy
        if (claim.getRequestedAmount() != null && member.getBenefitPolicy() != null) {
            benefitPolicyCoverageService.validateAmountLimits(
                member, 
                member.getBenefitPolicy(), 
                claim.getRequestedAmount(), 
                claim.getLines(),
                serviceDate
            );
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 4: Save and audit
        // ═══════════════════════════════════════════════════════════════════════════
        Claim savedClaim = claimRepository.save(claim);
        
        // Record creation in audit trail
        if (currentUser != null) {
            claimAuditService.recordCreation(savedClaim, currentUser);
        }
        
        log.info("✅ Claim {} created in DRAFT status (Contract-Driven Architecture)", savedClaim.getId());
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Update an existing claim with state machine validation.
     * 
     * ╔═══════════════════════════════════════════════════════════════════════════╗
     * ║           FINANCIAL CLOSURE: FINANCIAL SNAPSHOT IMMUTABILITY             ║
     * ║───────────────────────────────────────────────────────────────────────────║
     * ║ After APPROVED status:                                                    ║
     * ║  - approvedAmount CANNOT be changed                                       ║
     * ║  - netProviderAmount CANNOT be changed                                    ║
     * ║  - patientCoPay CANNOT be changed                                         ║
     * ║ These values are the FINANCIAL SNAPSHOT and must remain immutable.        ║
     * ╚═══════════════════════════════════════════════════════════════════════════╝
     * 
     * PHASE 6 RULES:
     * 1. Only DRAFT and RETURNED_FOR_INFO allow detail edits
     * 2. Status changes go through ClaimStateMachine
     * 3. REJECTED requires reviewer comment
     * 4. APPROVED requires approved amount
     * 
     * PHASE 7 ADDITIONS:
     * 5. Attachment validation before SUBMITTED
     * 6. Cost calculation before APPROVED
     * 7. Audit trail for all changes
     */
    public ClaimViewDto updateClaim(Long id, ClaimUpdateDto dto) {
        log.info("📝 Updating claim {}", id);
        
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        // ══════════════════════════════════════════════════════════════════════════
        // FINANCIAL CLOSURE: FINANCIAL SNAPSHOT IMMUTABILITY GUARD
        // ══════════════════════════════════════════════════════════════════════════
        // After approval, financial fields are FROZEN and CANNOT be changed
        if (isFinanciallyLocked(claim)) {
            validateNoFinancialChanges(claim, dto);
        }
        
        // Phase 6: Check if status change is requested
        if (dto.getStatus() != null && dto.getStatus() != claim.getStatus()) {
            
            // Phase 7: Validate attachments before transitioning to SUBMITTED
            if (dto.getStatus() == ClaimStatus.SUBMITTED) {
                var attachmentResult = attachmentRulesService.validateForSubmission(claim, ClaimType.GENERAL);
                if (!attachmentResult.valid()) {
                    throw new BusinessRuleException(
                        "Cannot submit claim: " + attachmentResult.getErrorMessage()
                    );
                }
            }
            
            // Phase 7: Calculate costs before APPROVED
            if (dto.getStatus() == ClaimStatus.APPROVED) {
                var costBreakdown = costCalculationService.calculateCosts(claim);
                log.info("💰 Cost calculation for approval: {}", costBreakdown.getSummary());
                // Costs are calculated but actual approved amount is set by reviewer
            }
            
            // Use state machine for status transitions
            claimStateMachine.transition(claim, dto.getStatus(), currentUser);
            
            // Phase 7: Record status change in audit trail
            claimAuditService.recordStatusChange(claim, previousStatus, currentUser, dto.getReviewerComment());
            
        } else {
            // Regular update - check if edits are allowed
            if (!claimStateMachine.canEdit(claim)) {
                throw new BusinessRuleException(
                    String.format("Cannot edit claim in %s status. Only DRAFT and RETURNED_FOR_INFO allow edits.",
                        claim.getStatus())
                );
            }
        }
        
        // Validate and apply other changes
        validateUpdateDto(dto, claim);
        claimMapper.updateEntityFromDto(claim, dto);
        
        Claim updatedClaim = claimRepository.save(claim);
        log.info("✅ Claim {} updated, status: {}", id, updatedClaim.getStatus());
        
        return claimMapper.toViewDto(updatedClaim);
    }

    /**
     * Transition claim status using state machine.
     * Dedicated endpoint for status changes.
     * 
     * PHASE 7 ADDITIONS:
     * - Attachment validation before SUBMITTED
     * - Cost calculation before APPROVED
     * - Audit trail recording
     */
    public ClaimViewDto transitionStatus(Long id, ClaimStatus targetStatus, String comment) {
        log.info("🔄 Transitioning claim {} to {}", id, targetStatus);
        
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        // Phase 7: Validate attachments before SUBMITTED
        if (targetStatus == ClaimStatus.SUBMITTED) {
            var attachmentResult = attachmentRulesService.validateForSubmission(claim, ClaimType.GENERAL);
            if (!attachmentResult.valid()) {
                throw new BusinessRuleException(
                    "Cannot submit claim: " + attachmentResult.getErrorMessage()
                );
            }
        }
        
        // Phase 7: Calculate and log costs before approval
        if (targetStatus == ClaimStatus.APPROVED) {
            var costBreakdown = costCalculationService.calculateCosts(claim);
            log.info("💰 Cost breakdown for claim {}: {}", id, costBreakdown.getSummary());
        }
        
        // Set comment before transition (needed for REJECTED validation)
        if (comment != null && !comment.isBlank()) {
            claim.setReviewerComment(comment);
        }
        
        // Perform transition with validation
        claimStateMachine.transition(claim, targetStatus, currentUser);
        
        Claim updatedClaim = claimRepository.save(claim);
        
        // Phase 7: Record in audit trail based on transition type
        if (targetStatus == ClaimStatus.APPROVED) {
            claimAuditService.recordApproval(updatedClaim, previousStatus, null, currentUser, comment);
        } else if (targetStatus == ClaimStatus.REJECTED) {
            claimAuditService.recordRejection(updatedClaim, previousStatus, currentUser, comment);
        } else if (targetStatus == ClaimStatus.SETTLED) {
            claimAuditService.recordSettlement(updatedClaim, currentUser);
        } else {
            claimAuditService.recordStatusChange(updatedClaim, previousStatus, currentUser, comment);
        }
        
        log.info("✅ Claim {} transitioned to {}", id, targetStatus);
        
        return claimMapper.toViewDto(updatedClaim);
    }

    /**
     * Get available status transitions for a claim.
     * Used by frontend to show valid action buttons.
     */
    @Transactional(readOnly = true)
    public Set<ClaimStatus> getAvailableTransitions(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        return claimStateMachine.getAvailableTransitions(claim, currentUser);
    }

    @Transactional(readOnly = true)
    public ClaimViewDto getClaim(Long id) {
        log.debug("📋 Getting claim by id: {}", id);
        
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        
        // Check feature flags for EMPLOYER_ADMIN
        if (authorizationService.isEmployerAdmin(currentUser)) {
            if (!authorizationService.canEmployerViewClaims(currentUser)) {
                log.warn("❌ EMPLOYER_ADMIN feature VIEW_CLAIMS disabled");
                throw new AccessDeniedException("Your employer account does not have permission to view claims");
            }
        }
        
        // Check access authorization
        if (!authorizationService.canAccessClaim(currentUser, id)) {
            log.warn("❌ Access denied: user {} attempted to access claim {}", 
                currentUser.getUsername(), id);
            throw new AccessDeniedException("Access denied to this claim");
        }
        
        Claim claim = claimRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found with id: " + id));
        
        ClaimViewDto dto = claimMapper.toViewDto(claim);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // BACKEND-DRIVEN WORKFLOW: Add allowed transitions for UI
        // ═══════════════════════════════════════════════════════════════════════════
        dto.setAllowedNextStatuses(claimStateMachine.getAvailableTransitions(claim, currentUser));
        dto.setCanEdit(claimStateMachine.canEdit(claim));
        
        return dto;
    }

    @Transactional(readOnly = true)
    public Page<ClaimViewDto> listClaims(Long employerId, int page, int size, String sortBy, String sortDir, String search) {
        log.debug("📋 Listing claims with pagination. employerId={}, page={}, size={}, sortBy={}, sortDir={}, search={}", 
                employerId, page, size, sortBy, sortDir, search);
        
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            return Page.empty();
        }
        
        // Check feature flags for EMPLOYER_ADMIN
        if (authorizationService.isEmployerAdmin(currentUser)) {
            if (!authorizationService.canEmployerViewClaims(currentUser)) {
                log.warn("❌ EMPLOYER_ADMIN feature VIEW_CLAIMS disabled");
                return Page.empty();
            }
            // EMPLOYER role is locked to their own employer
            employerId = currentUser.getEmployerId();
        }
        
        // Build sort direction from string parameter
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        String keyword = (search != null && !search.trim().isEmpty()) ? search.trim() : "";
        
        Page<Claim> claimsPage;
        
        if (employerId != null) {
            log.debug("🔒 Filtering claims by employerId={}", employerId);
            claimsPage = claimRepository.searchPagedByEmployerId(keyword, employerId, pageable);
        } else if (authorizationService.isAdmin(currentUser)) {
            log.debug("🔓 Admin - listing all claims");
            claimsPage = claimRepository.searchPaged(keyword, pageable);
        } else if (authorizationService.isProvider(currentUser)) {
            Long providerId = currentUser.getProviderId();
            // SECURITY: Strong enforcement of provider context
            providerContextGuard.validateProviderBinding(currentUser);
            
            if (providerId == null) {
                log.warn("❌ PROVIDER user {} has no providerId", currentUser.getUsername());
                return Page.empty();
            }
            log.debug("🔒 Filtering claims by providerId={}", providerId);
            claimsPage = claimRepository.searchPagedByProviderId(keyword, providerId, pageable);
        } else {
            log.warn("❌ No employer scope and not admin - Access Denied for user: {}", currentUser.getUsername());
            return Page.empty();
        }
        
        return claimsPage.map(claimMapper::toViewDto);
    }

    @Transactional(readOnly = true)
    public List<ClaimViewDto> getClaimsByMember(Long memberId) {
        log.debug("📋 Getting claims for member: {}", memberId);
        
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            return Collections.emptyList();
        }
        
        // Check if user can access this member
        if (!authorizationService.canAccessMember(currentUser, memberId)) {
            log.warn("❌ Access denied to member {}", memberId);
            return Collections.emptyList();
        }
        
        List<Claim> claims = claimRepository.findByMemberId(memberId);
        return claims.stream()
                .map(claimMapper::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get claims by Pre-Authorization ID.
     * ARCHITECTURAL UPDATE (2026-01-15): Renamed from getClaimsByPreApproval to align with PreAuthorization module.
     */
    @Transactional(readOnly = true)
    public List<ClaimViewDto> getClaimsByPreAuthorization(Long preAuthorizationId) {
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser != null && !authorizationService.canAccessPreAuthorization(currentUser, preAuthorizationId)) {
            log.warn("❌ Access denied: user {} attempted to access claims for preAuth {}",
                    currentUser.getUsername(), preAuthorizationId);
            return Collections.emptyList();
        }

        List<Claim> claims = claimRepository.findByPreAuthorizationId(preAuthorizationId);
        return claims.stream()
                .map(claimMapper::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get cost breakdown preview for a claim (Phase 7).
     * Returns deductible, co-pay, and insurance coverage amounts.
     */
    @Transactional(readOnly = true)
    public CostCalculationService.CostBreakdown getCostBreakdown(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        return costCalculationService.calculateCosts(claim);
    }

    /**
     * Get cost breakdown as DTO for API response.
     */
    @Transactional(readOnly = true)
    public CostBreakdownDto getCostBreakdownDto(Long id) {
        CostCalculationService.CostBreakdown breakdown = getCostBreakdown(id);
        return CostBreakdownDto.from(breakdown);
    }

    // Methods approveClaim, requestApproval, processApprovalAsync consolidated into ClaimApprovalService


    /**
     * Settle a claim (mark ready for payment).
     * 
     * POST /api/claims/{id}/settle
     * 
     * ╔═══════════════════════════════════════════════════════════════════════════╗
     * ║           FINANCIAL CLOSURE: SETTLEMENT INTEGRITY LOCK                   ║
     * ║───────────────────────────────────────────────────────────────────────────║
     * ║ Uses SELECT ... FOR UPDATE to prevent:                                    ║
     * ║  - Double settlement (race condition)                                     ║
     * ║  - Settlement exceeding approved amount                                   ║
     * ║  - Concurrent modifications during settlement                             ║
     * ╚═══════════════════════════════════════════════════════════════════════════╝
     * 
     * Business Rules:
     * 1. Claim must be in APPROVED status
     * 2. Payment reference must be provided
     * 3. Settlement amount cannot exceed approved amount
     * 4. Status transitions to SETTLED (terminal state)
     * 5. Uses pessimistic locking to prevent race conditions
     * 
     * @param id Claim ID
     * @param dto Settlement details
     * @return Updated claim
     */
    @Transactional
    public ClaimViewDto settleClaim(Long id, ClaimSettleDto dto) {
        log.info("💳 [SETTLEMENT] Starting settlement for claim {} with pessimistic lock", id);
        
        // ══════════════════════════════════════════════════════════════════════════
        // STEP 1: PESSIMISTIC LOCK - SELECT ... FOR UPDATE
        // ══════════════════════════════════════════════════════════════════════════
        // This MUST be used for all financial operations to prevent double settlement
        Claim claim = claimRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        log.info("🔒 [SETTLEMENT] Acquired pessimistic lock on claim {}", id);
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        // ══════════════════════════════════════════════════════════════════════════
        // STEP 2: VALIDATE CLAIM STATUS
        // ══════════════════════════════════════════════════════════════════════════
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new BusinessRuleException(
                String.format("لا يمكن تسوية المطالبة. الحالة الحالية: %s. يجب أن تكون: APPROVED", 
                    claim.getStatus())
            );
        }
        
        // ══════════════════════════════════════════════════════════════════════════
        // STEP 3: VALIDATE PAYMENT REFERENCE
        // ══════════════════════════════════════════════════════════════════════════
        if (dto.getPaymentReference() == null || dto.getPaymentReference().trim().isEmpty()) {
            throw new BusinessRuleException("رقم مرجع الدفع مطلوب");
        }
        
        // ══════════════════════════════════════════════════════════════════════════
        // STEP 4: VALIDATE SETTLEMENT AMOUNT (FINANCIAL INTEGRITY)
        // ══════════════════════════════════════════════════════════════════════════
        // Settlement amount MUST NOT exceed the approved amount
        BigDecimal netProviderAmount = claim.getNetProviderAmount() != null 
            ? claim.getNetProviderAmount() 
            : claim.getApprovedAmount();
        
        if (dto.getSettlementAmount() != null) {
            if (dto.getSettlementAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("مبلغ التسوية يجب أن يكون أكبر من صفر");
            }
            if (dto.getSettlementAmount().compareTo(netProviderAmount) > 0) {
                log.error("🚫 [SETTLEMENT VIOLATION] Settlement amount {} exceeds net provider amount {}", 
                    dto.getSettlementAmount(), netProviderAmount);
                throw new BusinessRuleException(
                    String.format("مبلغ التسوية (%s) يتجاوز المبلغ المستحق للمقدم (%s)", 
                        dto.getSettlementAmount(), netProviderAmount)
                );
            }
        }
        
        // ══════════════════════════════════════════════════════════════════════════
        // STEP 5: SET SETTLEMENT DETAILS
        // ══════════════════════════════════════════════════════════════════════════
        claim.setPaymentReference(dto.getPaymentReference());
        claim.setSettledAt(LocalDateTime.now());
        
        if (dto.getNotes() != null) {
            claim.setSettlementNotes(dto.getNotes());
        }
        
        // ══════════════════════════════════════════════════════════════════════════
        // STEP 6: TRANSITION TO SETTLED STATUS (TERMINAL)
        // ══════════════════════════════════════════════════════════════════════════
        claimStateMachine.transition(claim, ClaimStatus.SETTLED, currentUser);
        
        // Update visit status if linked
        if (claim.getVisit() != null) {
            claim.getVisit().setStatus(com.waad.tba.modules.visit.entity.VisitStatus.COMPLETED);
            log.info("✅ Updated visit {} status to COMPLETED after settlement", claim.getVisit().getId());
        }
        
        Claim savedClaim = claimRepository.save(claim);
        
        // Record in audit trail
        claimAuditService.recordSettlement(savedClaim, currentUser);
        
        log.info("💳 [SETTLEMENT COMPLETE] Claim {} settled. Payment Ref: {}, Amount: {}", 
            id, dto.getPaymentReference(), netProviderAmount);
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Submit a draft claim for review.
     * 
     * POST /api/claims/{id}/submit
     * 
     * Business Rules:
     * 1. Claim must be in DRAFT or RETURNED_FOR_INFO status
     * 2. All required attachments must be present
     * 3. Status transitions to SUBMITTED
     */
    @Transactional
    public ClaimViewDto submitClaim(Long id) {
        log.info("📤 Submitting claim {}", id);
        
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        // Validate current status allows submission
        if (claim.getStatus() != ClaimStatus.DRAFT && 
            claim.getStatus() != ClaimStatus.RETURNED_FOR_INFO) {
            throw new BusinessRuleException(
                String.format("لا يمكن تقديم المطالبة. الحالة الحالية: %s", claim.getStatus())
            );
        }
        
        // Validate attachments
        var attachmentResult = attachmentRulesService.validateForSubmission(claim, ClaimType.GENERAL);
        if (!attachmentResult.valid()) {
            throw new BusinessRuleException(
                "لا يمكن تقديم المطالبة: " + attachmentResult.getErrorMessage()
            );
        }
        
        // Transition to SUBMITTED status
        claimStateMachine.transition(claim, ClaimStatus.SUBMITTED, currentUser);
        
        // Retrieve SLA from system settings (fallback to 7 days)
        int slaDays = systemSettingRepository.findBySettingKey("CLAIM_SLA_DAYS")
                .map(com.waad.tba.common.entity.SystemSetting::getValueAsInteger)
                .orElse(7);
        LocalDate submissionDate = LocalDate.now();
        LocalDate expectedCompletionDate = businessDaysCalculator.calculateExpectedCompletionDate(submissionDate, slaDays);
        
        claim.setExpectedCompletionDate(expectedCompletionDate);
        claim.setSlaDaysConfigured(slaDays);  // Store SLA value at submission time
        
        log.info("📅 Claim {} submitted on {}. Expected completion: {} ({} business days SLA)",
            id, submissionDate, expectedCompletionDate, slaDays);
        
        Claim savedClaim = claimRepository.save(claim);
        
        // Record in audit trail
        claimAuditService.recordStatusChange(savedClaim, previousStatus, currentUser, "تم تقديم المطالبة للمراجعة");
        
        log.info("📤 Claim {} submitted for review", id);
        
        return claimMapper.toViewDto(savedClaim);
    }

    // Methods startReview, getPendingClaims, getApprovedClaims consolidated into ClaimApprovalService


    /**
     * Get audit history for a claim (Phase 7).
     * Returns all state changes and actions performed on the claim.
     */
    @Transactional(readOnly = true)
    public List<com.waad.tba.modules.claim.entity.ClaimAuditLog> getAuditHistory(Long id) {
        // Verify claim exists
        if (!claimRepository.existsById(id)) {
            throw new ResourceNotFoundException("Claim", "id", id);
        }
        return claimAuditService.getAuditHistory(id);
    }

    /**
     * Get attachment requirements for a claim type (Phase 7).
     */
    @Transactional(readOnly = true)
    public AttachmentRulesService.AttachmentRequirements getAttachmentRequirements(ClaimType claimType) {
        return attachmentRulesService.getRequirements(claimType);
    }

    /**
     * Validate attachments for a claim (Phase 7).
     * Can be called before submission to check if all required documents are present.
     */
    @Transactional(readOnly = true)
    public AttachmentRulesService.AttachmentValidationResult validateAttachments(Long id, ClaimType claimType) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        return attachmentRulesService.validateForSubmission(claim, claimType);
    }

    /**
     * Get provider network status for a claim (Phase 7).
     */
    @Transactional(readOnly = true)
    public ProviderNetworkService.ProviderValidationResult getProviderNetworkStatus(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        return providerNetworkService.validateProviderForClaim(claim.getProviderName());
    }

    public void deleteClaim(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found with id: " + id));
        claim.setActive(false);
        claimRepository.save(claim);
    }

    @Transactional(readOnly = true)
    public long countClaims(Long employerId) {
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            return 0;
        }
        
        // EMPLOYER role is locked to their own employer
        if (authorizationService.isEmployerAdmin(currentUser)) {
            employerId = currentUser.getEmployerId();
        }
        
        if (employerId != null) {
            return claimRepository.countByMemberEmployerId(employerId);
        }
        
        if (authorizationService.isAdmin(currentUser)) {
            return claimRepository.countActive();
        }
        
        // PROVIDER: Filter by providerId
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            return claimRepository.countByProviderId(currentUser.getProviderId());
        }
        
        return 0;
    }

    private void validateCreateDto(ClaimCreateDto dto) {
        // VISIT-CENTRIC ARCHITECTURE (2026-01-16): visitId is MANDATORY
        if (dto.getVisitId() == null) {
            throw new IllegalArgumentException("ARCHITECTURAL VIOLATION: visitId is REQUIRED - Claims must be linked to a Visit");
        }
        
        // CANONICAL: lines with medicalServiceId are MANDATORY - amount calculated from contract
        if (dto.getLines() == null || dto.getLines().isEmpty()) {
            throw new IllegalArgumentException("ARCHITECTURAL VIOLATION: At least one claim line with medicalServiceId is REQUIRED");
        }
        
        // Validate each line has medicalServiceId
        for (ClaimLineDto line : dto.getLines()) {
            if (line.getMedicalServiceId() == null) {
                throw new IllegalArgumentException("ARCHITECTURAL VIOLATION: Each line MUST have medicalServiceId - no free-text services");
            }
        }
    }

    /**
     * PROVIDER PORTAL (2026-01-16):
     * Validate and enforce provider ID based on user role.
     * 
     * Rules (HARDENED 2026-01-16):
     * - PROVIDER users: providerId ALWAYS comes from ProviderContextGuard (session)
     *   ANY providerId from request is IGNORED to prevent data leakage
     * - SUPER_ADMIN/INSURANCE_ADMIN can set any providerId
     * - Other users can set any providerId
     * 
     * @param dto The claim creation DTO
     * @param currentUser The currently authenticated user
     */
    private void validateAndEnforceProviderId(ClaimCreateDto dto, User currentUser) {
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
            
            log.info("🔒 PROVIDER {} creating claim with their providerId: {} (enforced by ProviderContextGuard)", 
                currentUser.getUsername(), userProviderId);
        } else if (authorizationService.isAdmin(currentUser)) {
            // ADMIN user (SUPER or INSURANCE) can set any provider
            log.info("🔓 ADMIN user {} creating claim - any providerId allowed", currentUser.getUsername());
        }
        // Other roles: no restriction on providerId
    }

    private void validateUpdateDto(ClaimUpdateDto dto, Claim claim) {
        // CANONICAL (2026-01-16): requestedAmount is calculated from ClaimLines, not user-updateable
        // Only validate status-related fields

        ClaimStatus newStatus = dto.getStatus() != null ? dto.getStatus() : claim.getStatus();
        BigDecimal newApprovedAmount = dto.getApprovedAmount() != null ? dto.getApprovedAmount() : claim.getApprovedAmount();
        String newReviewerComment = dto.getReviewerComment() != null ? dto.getReviewerComment() : claim.getReviewerComment();

        // Phase 6: Validation for status transitions
        // Note: State transitions are now handled by ClaimStateMachine
        // These validations are kept for backwards compatibility with direct updates
        
        if (newStatus == ClaimStatus.APPROVED || newStatus == ClaimStatus.SETTLED) {
            if (newApprovedAmount == null || newApprovedAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Approved/Settled status requires approved amount greater than zero");
            }
        }

        // Note: Partial approval is now represented as APPROVED with approvedAmount < requestedAmount
        // The UI can show "Partial" badge based on approvedAmount < requestedAmount

        if (newStatus == ClaimStatus.REJECTED) {
            if (newReviewerComment == null || newReviewerComment.trim().isEmpty()) {
                throw new IllegalArgumentException("Rejected status requires reviewer comment");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // RETURN FOR INFO (Added for complete workflow)
    // ═══════════════════════════════════════════════════════════════════════════════

    // Method returnForInfo consolidated into ClaimApprovalService


    // ═══════════════════════════════════════════════════════════════════════════════
    // ADDITIONAL QUERY METHODS (Added 2026-01-14)
    // For Contract-First compliance
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get claims by visit ID.
     * Returns all claims associated with a specific visit.
     */
    public List<ClaimViewDto> getClaimsByVisit(Long visitId) {
        log.info("🔍 Fetching claims for visit: {}", visitId);
        List<Claim> claims = claimRepository.findByVisitId(visitId);
        return claims.stream()
                .map(claimMapper::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Get claim by claim number (which is the claim ID in this system).
     * Returns a single claim by its unique identifier.
     */
    public ClaimViewDto getClaimByNumber(Long claimNumber) {
        log.info("🔍 Fetching claim by number: {}", claimNumber);
        
        User currentUser = authorizationService.getCurrentUser();
        Claim claim = claimRepository.findByClaimNumber(claimNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found with number: " + claimNumber));
        
        ClaimViewDto dto = claimMapper.toViewDto(claim);
        
        // BACKEND-DRIVEN WORKFLOW: Add allowed transitions for UI
        if (currentUser != null) {
            dto.setAllowedNextStatuses(claimStateMachine.getAvailableTransitions(claim, currentUser));
            dto.setCanEdit(claimStateMachine.canEdit(claim));
        }
        
        return dto;
    }

    /**
     * Get claims by status with pagination.
     * Returns claims filtered by their status.
     */
    public Page<ClaimViewDto> getClaimsByStatus(ClaimStatus status, int page, int size, String sortBy, String sortDir) {
        log.info("🔍 Fetching claims by status: {}", status);
        Sort sort = sortDir.equalsIgnoreCase("desc") 
                ? Sort.by(sortBy).descending() 
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        User currentUser = authorizationService.getCurrentUser();
        // PROVIDER: Filter by providerId
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            return claimRepository.findByProviderIdAndStatus(providerId, status, pageable)
                    .map(claimMapper::toViewDto);
        }
        
        Page<Claim> claims = claimRepository.findByStatus(status, pageable);
        return claims.map(claimMapper::toViewDto);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FINANCIAL CLOSURE: IMMUTABILITY GUARDS
    // ═══════════════════════════════════════════════════════════════════════════════
    // These methods enforce that financial data CANNOT be changed after approval.
    // This is a MANDATORY requirement for financial system integrity.
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Check if claim is in a financially locked state.
     * Financial data is frozen after APPROVED status (includes SETTLED).
     * 
     * @param claim The claim to check
     * @return true if financial fields are immutable
     */
    private boolean isFinanciallyLocked(Claim claim) {
        ClaimStatus status = claim.getStatus();
        return status == ClaimStatus.APPROVED || status == ClaimStatus.SETTLED;
    }

    /**
     * Validate that no financial fields are being changed on an approved claim.
     * 
     * ╔═══════════════════════════════════════════════════════════════════════════╗
     * ║           FINANCIAL SNAPSHOT RULE (GOLDEN RULE)                          ║
     * ║───────────────────────────────────────────────────────────────────────────║
     * ║ Claim.approvedAmount NEVER changes after approval.                        ║
     * ║ Claim.netProviderAmount NEVER changes after approval.                     ║
     * ║ Claim.patientCoPay NEVER changes after approval.                          ║
     * ╚═══════════════════════════════════════════════════════════════════════════╝
     * 
     * @param claim Current claim state
     * @param dto Update DTO with requested changes
     * @throws BusinessRuleException if financial changes are attempted
     */
    private void validateNoFinancialChanges(Claim claim, ClaimUpdateDto dto) {
        // Check if approvedAmount is being modified
        if (dto.getApprovedAmount() != null) {
            if (claim.getApprovedAmount() != null && 
                dto.getApprovedAmount().compareTo(claim.getApprovedAmount()) != 0) {
                log.error("🚫 [FINANCIAL VIOLATION] Attempt to modify approvedAmount on {} claim {}. " +
                         "Current: {}, Attempted: {}", 
                    claim.getStatus(), claim.getId(), 
                    claim.getApprovedAmount(), dto.getApprovedAmount());
                throw new BusinessRuleException(
                    "لا يمكن تعديل المبلغ المعتمد بعد الموافقة على المطالبة. " +
                    "المطالبات الموافق عليها غير قابلة للتعديل مالياً."
                );
            }
        }
        
        log.debug("✅ [FINANCIAL GUARD] No financial changes detected for claim {}", claim.getId());
    }

    /**
     * Check if DTO contains any financial field changes.
     * Used for audit logging and validation.
     * 
     * @param dto The update DTO
     * @return true if any financial field is being modified
     */
    private boolean hasFinancialChanges(ClaimUpdateDto dto) {
        return dto.getApprovedAmount() != null;
    }
}
