package com.waad.tba.modules.preauthorization.service;

import com.waad.tba.modules.preauthorization.dto.*;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization.PreAuthStatus;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization.Priority;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.providercontract.service.ProviderContractService;
import com.waad.tba.modules.provider.dto.EffectivePriceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.repository.VisitRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.security.ProviderContextGuard;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.service.ArchitecturalGuardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service for PreAuthorization business logic
 * Integrates with ProviderContract for price lookup and validation
 * 
 * ARCHITECTURAL RULE (2026-01-14):
 * Pre-authorizations MUST be created via Visit (Visit-Centric Architecture).
 * visitId is REQUIRED on all create operations.
 * 
 * SECURITY HARDENING (2026-01-16):
 * Provider data isolation enforced via ProviderContextGuard.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PreAuthorizationService {

    private final PreAuthorizationRepository preAuthorizationRepository;
    private final ProviderRepository providerRepository;
    private final MemberRepository memberRepository;
    private final EnterpriseMedicalServiceRepository medicalServiceRepository;
    private final VisitRepository visitRepository;
    private final ProviderContractService providerContractService;
    private final PreAuthorizationAuditService auditService;
    private final AuthorizationService authorizationService;
    private final ProviderContextGuard providerContextGuard;
    private final ArchitecturalGuardService architecturalGuard;

    // ==================== CREATE ====================

    /**
     * Create a new pre-authorization with contract price lookup (CANONICAL REBUILD 2026-01-16)
     * 
     * ARCHITECTURAL LAWS:
     * 1. Pre-authorization MUST be linked to an existing Visit
     * 2. Medical Service MUST be selected from Provider Contract (no free-text)
     * 3. Price is AUTO-RESOLVED from Provider Contract (no manual entry)
     * 4. Provider ID is validated for PROVIDER users (must match their session)
     * 
     * Data Flow: Visit → MedicalService (from Contract) → ContractPrice (auto)
     */
    @Transactional
    public PreAuthorizationResponseDto createPreAuthorization(PreAuthorizationCreateDto dto, String createdBy) {
        log.info("[PRE-AUTH] Creating pre-authorization: visitId={}, medicalServiceId={}", 
                 dto.getVisitId(), dto.getMedicalServiceId());

        // ═══════════════════════════════════════════════════════════════════════════
        // PROVIDER PORTAL: Validate and enforce provider ID from JWT
        // ═══════════════════════════════════════════════════════════════════════════
        User currentUser = authorizationService.getCurrentUser();
        validateAndEnforceProviderId(dto, currentUser);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ARCHITECTURAL GUARD: Validate system invariants before processing
        // ═══════════════════════════════════════════════════════════════════════════
        architecturalGuard.guardPreAuthCreation(dto.getVisitId(), dto.getMedicalServiceId());

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 1: Validate Visit exists (ARCHITECTURAL LAW: Visit-Centric)
        // ═══════════════════════════════════════════════════════════════════════════
        Visit visit = visitRepository.findById(dto.getVisitId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "ARCHITECTURAL VIOLATION: Visit not found with ID: " + dto.getVisitId() + 
                    ". Pre-authorization MUST be created from an existing Visit."));
        
        if (visit.getStatus() != null && "CANCELLED".equals(visit.getStatus().toString())) {
            throw new IllegalArgumentException("Cannot create pre-authorization for a cancelled visit");
        }
        
        // Get member from visit
        Member member = visit.getMember();
        if (member == null) {
            throw new IllegalArgumentException("Visit has no associated member");
        }
        
        if (!member.getActive()) {
            throw new IllegalArgumentException("Member is not active");
        }
        
        log.info("[PRE-AUTH] Visit {} validated. Member: {}", dto.getVisitId(), member.getId());

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 2: Validate Provider
        // ═══════════════════════════════════════════════════════════════════════════
        Provider provider = providerRepository.findById(dto.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with ID: " + dto.getProviderId()));
        
        if (!provider.getActive()) {
            throw new IllegalArgumentException("Provider is not active");
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 3: Validate MedicalService (ARCHITECTURAL LAW: No free-text services)
        EnterpriseMedicalService service = medicalServiceRepository.findById(dto.getMedicalServiceId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "ARCHITECTURAL VIOLATION: Medical Service not found with ID: " + dto.getMedicalServiceId() + 
                    ". Service MUST be selected from catalog."));
        
        if (!service.isActive()) {
            throw new IllegalArgumentException("Medical service is not active");
        }
        
        // NOTE: requiresPA check removed from MedicalService.
        // PA requirement is now determined by BenefitPolicyRule.requiresPreApproval.
        // Providers can submit PreAuthorization for ANY service - the insurance company
        // will decide whether to approve based on policy rules.
        
        log.info("[PRE-AUTH] Medical Service validated: {} ({})", service.getCode(), service.getNameAr());

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 4: Get Contract Price (ARCHITECTURAL LAW: No manual pricing)
        // ═══════════════════════════════════════════════════════════════════════════
        LocalDate requestDate = dto.getRequestDate() != null ? dto.getRequestDate() : LocalDate.now();
        BigDecimal contractPrice = null;
        
        try {
            EffectivePriceResponseDto priceResponse = providerContractService.getEffectivePrice(
                    dto.getProviderId(),
                    service.getCode(),
                    requestDate
            );
            
            if (priceResponse.isHasContract()) {
                contractPrice = priceResponse.getContractPrice();
                log.info("[PRE-AUTH] Contract price resolved: {} LYD for service {}", 
                         contractPrice, service.getCode());
            } else {
                // ARCHITECTURAL LAW: Service MUST be in Provider Contract
                throw new IllegalArgumentException(
                    "ARCHITECTURAL VIOLATION: Service '" + service.getCode() + 
                    "' is not covered by Provider's contract. Select a covered service.");
            }
        } catch (ResourceNotFoundException e) {
            throw new IllegalArgumentException(
                "ARCHITECTURAL VIOLATION: No active contract found for provider " + dto.getProviderId() + 
                ". Provider must have an active contract to create pre-authorizations.");
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 5: Build PreAuthorization Entity
        // ═══════════════════════════════════════════════════════════════════════════
        String referenceNumber = generateUniqueReferenceNumber();
        LocalDate expiryDate = requestDate.plusDays(dto.getExpiryDays() != null ? dto.getExpiryDays() : 30);

        Priority priority = Priority.NORMAL;
        if (dto.getPriority() != null) {
            try {
                priority = Priority.valueOf(dto.getPriority().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("[PRE-AUTH] Invalid priority: {}, using NORMAL", dto.getPriority());
            }
        }

        // Determine service type from category or use default
        String serviceType = "MEDICAL";
        if (service.getCategory() != null) {
            serviceType = "CATEGORY_" + service.getCategory();
        }

        PreAuthorization preAuth = PreAuthorization.builder()
                .preAuthNumber(referenceNumber)      // Legacy column (required by database)
                .referenceNumber(referenceNumber)
                .memberId(member.getId())
                .providerId(dto.getProviderId())
                .visit(visit)                        // FK to Visit
                .medicalService(service)             // FK to MedicalService (NO FREE-TEXT)
                .serviceCode(service.getCode())      // Denormalized snapshot
                .serviceName(service.getNameAr())      // Denormalized snapshot
                .serviceType(serviceType)            // Legacy column (required by database)
                .serviceCategory(service.getCategory())
                .requestDate(requestDate)
                .expectedServiceDate(requestDate)    // Default: same as request date
                .expiryDate(expiryDate)
                .contractPrice(contractPrice)        // AUTO-RESOLVED from contract
                .requiresPA(true)                    // PreAuthorization always requires PA (that's why it exists)
                .currency(dto.getCurrency() != null ? dto.getCurrency() : "LYD")
                .status(PreAuthStatus.PENDING)
                .priority(priority)
                .diagnosisCode(dto.getDiagnosisCode() != null ? dto.getDiagnosisCode() : "Z00.0")
                .diagnosisDescription(dto.getDiagnosisDescription())
                .notes(dto.getNotes())
                .active(true)
                .createdBy(createdBy)
                .build();

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 6: Save and Return
        // ═══════════════════════════════════════════════════════════════════════════
        preAuth = preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Created pre-authorization: id={}, ref={}, contractPrice={}", 
                 preAuth.getId(), preAuth.getReferenceNumber(), contractPrice);

        // Log audit trail
        auditService.logCreate(preAuth.getId(), preAuth.getReferenceNumber(), createdBy, 
                "Created with contract price: " + contractPrice + " LYD");

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== UPDATE ====================

    /**
     * Update pre-authorization (only if PENDING)
     */
    @Transactional
    public PreAuthorizationResponseDto updatePreAuthorization(Long id, PreAuthorizationUpdateDto dto, String updatedBy) {
        log.info("[PRE-AUTH] Updating pre-authorization {}", id);

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        if (!preAuth.getActive()) {
            throw new IllegalArgumentException("PreAuthorization is not active");
        }

        if (preAuth.getStatus() != PreAuthStatus.PENDING) {
            throw new IllegalArgumentException("Only PENDING pre-authorizations can be updated");
        }

        // Capture old state for audit
        String oldDiagnosisCode = preAuth.getDiagnosisCode();
        String oldDiagnosisDescription = preAuth.getDiagnosisDescription();
        String oldNotes = preAuth.getNotes();

        // Update allowed fields (price CANNOT be changed - canonical law)
        if (dto.getPriority() != null) {
            try {
                preAuth.setPriority(Priority.valueOf(dto.getPriority().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("[PRE-AUTH] Invalid priority: {}", dto.getPriority());
            }
        }
        if (dto.getDiagnosisCode() != null) {
            preAuth.setDiagnosisCode(dto.getDiagnosisCode());
        }
        if (dto.getDiagnosisDescription() != null) {
            preAuth.setDiagnosisDescription(dto.getDiagnosisDescription());
        }
        if (dto.getNotes() != null) {
            preAuth.setNotes(dto.getNotes());
        }
        if (dto.getExpiryDays() != null) {
            preAuth.setExpiryDate(preAuth.getRequestDate().plusDays(dto.getExpiryDays()));
        }

        preAuth.setUpdatedBy(updatedBy);

        // Audit logging
        if (dto.getDiagnosisCode() != null && !dto.getDiagnosisCode().equals(oldDiagnosisCode)) {
            auditService.logUpdate(id, preAuth.getReferenceNumber(), updatedBy, 
                    "diagnosisCode", oldDiagnosisCode, dto.getDiagnosisCode());
        }
        if (dto.getDiagnosisDescription() != null && !dto.getDiagnosisDescription().equals(oldDiagnosisDescription)) {
            auditService.logUpdate(id, preAuth.getReferenceNumber(), updatedBy, 
                    "diagnosisDescription", oldDiagnosisDescription, dto.getDiagnosisDescription());
        }

        preAuth = preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Updated pre-authorization {}", id);

        // Fetch related entities for response
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== APPROVE ====================

    /**
     * Approve pre-authorization with copay calculation
     */
    @Transactional
    public PreAuthorizationResponseDto approvePreAuthorization(Long id, PreAuthorizationApproveDto dto, String approvedBy) {
        log.info("[PRE-AUTH] Approving pre-authorization {}", id);

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        if (!preAuth.canBeApproved()) {
            throw new IllegalStateException("PreAuthorization cannot be approved in current status: " + preAuth.getStatus());
        }

        // Validate approved amount against contract price
        if (preAuth.getContractPrice() != null && dto.getApprovedAmount().compareTo(preAuth.getContractPrice()) > 0) {
            log.warn("[PRE-AUTH] Approved amount {} exceeds contract price {}", 
                     dto.getApprovedAmount(), preAuth.getContractPrice());
        }

        // Calculate copay
        BigDecimal copayPercentage = dto.getCopayPercentage() != null ? dto.getCopayPercentage() : BigDecimal.ZERO;
        BigDecimal copayAmount = preAuth.calculateCopay(dto.getApprovedAmount(), copayPercentage);

        // Approve
        preAuth.approve(dto.getApprovedAmount(), copayAmount, approvedBy);
        preAuth.setCopayPercentage(copayPercentage);
        
        if (dto.getApprovalNotes() != null) {
            preAuth.setNotes((preAuth.getNotes() != null ? preAuth.getNotes() + "\n" : "") + 
                            "Approval Notes: " + dto.getApprovalNotes());
        }

        preAuth = preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Approved pre-authorization {} with amount {} and copay {}", 
                 id, dto.getApprovedAmount(), copayAmount);

        // Update visit status if linked
        if (preAuth.getVisit() != null) {
            Visit visit = preAuth.getVisit();
            visit.setStatus(com.waad.tba.modules.visit.entity.VisitStatus.COMPLETED);
            visitRepository.save(visit);
            log.info("✅ Updated visit {} status to COMPLETED after pre-auth approval", visit.getId());
        }

        // Log audit trail
        auditService.logApprove(id, preAuth.getReferenceNumber(), approvedBy,
                "Approved amount: " + dto.getApprovedAmount() + 
                (dto.getCopayPercentage() != null ? ", Copay: " + dto.getCopayPercentage() + "%" : ""));

        // Fetch related entities for response
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== REJECT ====================

    /**
     * Reject pre-authorization
     */
    @Transactional
    public PreAuthorizationResponseDto rejectPreAuthorization(Long id, PreAuthorizationRejectDto dto, String rejectedBy) {
        log.info("[PRE-AUTH] Rejecting pre-authorization {}", id);

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        preAuth.reject(dto.getRejectionReason(), rejectedBy);

        preAuth = preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Rejected pre-authorization {} with reason: {}", id, dto.getRejectionReason());

        // Update visit status if linked
        if (preAuth.getVisit() != null) {
            Visit visit = preAuth.getVisit();
            visit.setStatus(com.waad.tba.modules.visit.entity.VisitStatus.CANCELLED);
            visitRepository.save(visit);
            log.info("✅ Updated visit {} status to CANCELLED after pre-auth rejection", visit.getId());
        }

        // Log audit trail
        auditService.logReject(id, preAuth.getReferenceNumber(), rejectedBy, dto.getRejectionReason());

        // Fetch related entities for response
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== CANCEL ====================

    /**
     * Cancel pre-authorization
     */
    @Transactional
    public PreAuthorizationResponseDto cancelPreAuthorization(Long id, String cancelReason, String cancelledBy) {
        log.info("[PRE-AUTH] Cancelling pre-authorization {}", id);

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        preAuth.cancel(cancelReason, cancelledBy);

        preAuth = preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Cancelled pre-authorization {}", id);

        // Log audit trail
        auditService.logCancel(id, preAuth.getReferenceNumber(), cancelledBy, cancelReason);

        // Fetch related entities for response
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== DELETE ====================

    /**
     * Soft delete pre-authorization
     */
    @Transactional
    public void deletePreAuthorization(Long id, String deletedBy) {
        log.info("[PRE-AUTH] Deleting pre-authorization {}", id);

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        preAuth.setActive(false);
        preAuth.setUpdatedBy(deletedBy);

        preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Deleted pre-authorization {}", id);
        
        // Log audit trail
        auditService.logDelete(id, preAuth.getReferenceNumber(), deletedBy);
    }

    // ==================== QUERIES ====================

    /**
     * Get pre-authorization by ID
     */
    @Transactional(readOnly = true)
    public PreAuthorizationResponseDto getPreAuthorizationById(Long id) {
        log.info("[PRE-AUTH] Fetching pre-authorization by ID: {}", id);
        
        User currentUser = authorizationService.getCurrentUser();
        if (!authorizationService.canAccessPreAuthorization(currentUser, id)) {
            log.warn("❌ Access denied: user {} attempted to access preAuth {}", 
                currentUser != null ? currentUser.getUsername() : "null", id);
            throw new AccessDeniedException("Access denied to this pre-authorization");
        }

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    /**
     * Get pre-authorization by reference number
     */
    @Transactional(readOnly = true)
    public PreAuthorizationResponseDto getPreAuthorizationByReference(String referenceNumber) {
        PreAuthorization preAuth = preAuthorizationRepository.findByReferenceNumberAndActiveTrue(referenceNumber)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with reference: " + referenceNumber));

        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    /**
     * Get all pre-authorizations (paginated)
     */
    @Transactional(readOnly = true)
    public Page<PreAuthorizationResponseDto> getAllPreAuthorizations(Pageable pageable) {
        User currentUser = authorizationService.getCurrentUser();
        
        // Apply RBAC filtering
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            log.info("🔒 Filtering pre-authorizations for provider: {}", providerId);
            return preAuthorizationRepository.findByProviderIdAndActiveTrue(providerId, pageable)
                    .map(this::mapToResponseDtoLight);
        }
        
        if (authorizationService.isEmployerAdmin(currentUser)) {
            Long employerId = authorizationService.getEmployerFilterForUser(currentUser);
            log.info("🔒 Filtering pre-authorizations for employer: {}", employerId);
            return preAuthorizationRepository.findByMemberEmployerOrganizationIdAndActiveTrue(employerId, pageable)
                    .map(this::mapToResponseDtoLight);
        }

        log.info("[PRE-AUTH] Fetching all active pre-authorizations for admin");
        return preAuthorizationRepository.findByActiveTrue(pageable).map(this::mapToResponseDtoLight);
    }

    /**
     * Get pre-authorizations by member
     */
    @Transactional(readOnly = true)
    public Page<PreAuthorizationResponseDto> getPreAuthorizationsByMember(Long memberId, Pageable pageable) {
        User currentUser = authorizationService.getCurrentUser();
        
        // Validate access to member first
        if (!authorizationService.canAccessMember(currentUser, memberId)) {
            throw new AccessDeniedException("Access denied to member: " + memberId);
        }
        
        Page<PreAuthorization> preAuths = preAuthorizationRepository.findByMemberIdAndActiveTrue(memberId, pageable);
        return preAuths.map(this::mapToResponseDtoLight);
    }

    /**
     * Get pre-authorizations by provider
     */
    @Transactional(readOnly = true)
    public Page<PreAuthorizationResponseDto> getPreAuthorizationsByProvider(Long providerId, Pageable pageable) {
        User currentUser = authorizationService.getCurrentUser();
        
        // Validate access to provider
        if (!authorizationService.canAccessProvider(currentUser, providerId)) {
            throw new AccessDeniedException("Access denied to provider: " + providerId);
        }
        
        Page<PreAuthorization> preAuths = preAuthorizationRepository.findByProviderIdAndActiveTrue(providerId, pageable);
        return preAuths.map(this::mapToResponseDtoLight);
    }

    /**
     * Get pre-authorizations by status
     */
    @Transactional(readOnly = true)
    public Page<PreAuthorizationResponseDto> getPreAuthorizationsByStatus(PreAuthStatus status, Pageable pageable) {
        User currentUser = authorizationService.getCurrentUser();
        
        // Apply RBAC filtering
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            return preAuthorizationRepository.findByProviderIdAndStatusAndActiveTrue(providerId, status, pageable)
                    .map(this::mapToResponseDtoLight);
        }
        
        return preAuthorizationRepository.findByStatusAndActiveTrue(status, pageable)
                .map(this::mapToResponseDtoLight);
    }

    /**
     * Get pending pre-authorizations for inbox (Operations Queue) - CANONICAL 2026-01-26
     * 
     * Returns pre-authorizations with PENDING or UNDER_REVIEW status for processing.
     * Mirrors ClaimService.getPendingClaims() behavior.
     * 
     * FIFO pattern - oldest first for fair processing.
     * 
     * Status Logic:
     * - PENDING: Newly created, awaiting initial review
     * - UNDER_REVIEW: Currently being reviewed by operations staff
     * 
     * @param pageable Pagination parameters (page, size, sort)
     * @return Page of PreAuthorizationResponseDto with all required fields for inbox display
     */
    @Transactional(readOnly = true)
    public Page<PreAuthorizationResponseDto> getPendingInbox(Pageable pageable) {
        log.info("[SERVICE] Fetching pending pre-authorizations for inbox (PENDING + UNDER_REVIEW)");
        
        User currentUser = authorizationService.getCurrentUser();
        List<PreAuthStatus> inboxStatuses = List.of(PreAuthStatus.PENDING, PreAuthStatus.UNDER_REVIEW);
        
        // PROVIDER sees only THEIR pending requests
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            Long providerId = currentUser.getProviderId();
            log.info("🔒 Filtering inbox for provider: {}", providerId);
            
            // This requires a repository method: findByStatusInAndProviderIdAndActiveTrue
            // For now, we'll implement a custom query in repository if needed, or filter here.
            // Let's assume we need to add findByStatusInAndProviderIdAndActiveTrue to repository.
            return preAuthorizationRepository.findByStatusInAndProviderIdAndActiveTrue(inboxStatuses, providerId, pageable)
                    .map(this::mapToResponseDtoLight);
        }

        Page<PreAuthorization> preAuths = preAuthorizationRepository.findByStatusIn(
                inboxStatuses, 
                pageable
        );
        
        log.info("[SERVICE] Found {} pre-authorizations in inbox", preAuths.getTotalElements());
        return preAuths.map(this::mapToResponseDtoLight);
    }

    /**
     * Find valid pre-authorization for claim submission
     */
    @Transactional(readOnly = true)
    public PreAuthorizationResponseDto findValidPreAuthorization(Long memberId, Long providerId, String serviceCode) {
        List<PreAuthorization> validPreAuths = preAuthorizationRepository.findValidPreAuthorizations(
                memberId, providerId, serviceCode, LocalDate.now()
        );

        if (validPreAuths.isEmpty()) {
            throw new ResourceNotFoundException("No valid pre-authorization found for member " + memberId + 
                                               ", provider " + providerId + ", service " + serviceCode);
        }

        // Return the most recent one
        PreAuthorization preAuth = validPreAuths.get(0);
        
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== START REVIEW ====================

    /**
     * Start review of a pre-authorization (PENDING → UNDER_REVIEW)
     * This is typically called by a reviewer taking ownership of the request.
     */
    @Transactional
    public PreAuthorizationResponseDto startReview(Long id, String reviewedBy) {
        log.info("[PRE-AUTH] Starting review for pre-authorization {}", id);

        PreAuthorization preAuth = preAuthorizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PreAuthorization not found with ID: " + id));

        if (!preAuth.getActive()) {
            throw new IllegalArgumentException("PreAuthorization is not active");
        }

        if (preAuth.getStatus() != PreAuthStatus.PENDING) {
            throw new IllegalStateException("Only PENDING pre-authorizations can be started for review. Current status: " + preAuth.getStatus());
        }

        // Transition to UNDER_REVIEW
        preAuth.setStatus(PreAuthStatus.UNDER_REVIEW);
        preAuth.setUpdatedBy(reviewedBy);
        
        preAuth = preAuthorizationRepository.save(preAuth);
        log.info("[PRE-AUTH] Pre-authorization {} is now UNDER_REVIEW by {}", id, reviewedBy);

        // Update visit status if linked
        if (preAuth.getVisit() != null) {
            Visit visit = preAuth.getVisit();
            visit.setStatus(com.waad.tba.modules.visit.entity.VisitStatus.IN_PROGRESS);
            visitRepository.save(visit);
            log.info("✅ Updated visit {} status to IN_PROGRESS", visit.getId());
        }

        // Log audit trail
        auditService.logUpdate(id, preAuth.getReferenceNumber(), reviewedBy, 
                "status", "PENDING", "UNDER_REVIEW");

        // Fetch related entities for response
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== CHECK VALIDITY ====================

    /**
     * Check if a member has a valid pre-authorization for a specific service.
     * Returns the valid pre-authorization if found, null otherwise.
     * 
     * @param memberId The member ID
     * @param serviceCode The medical service code
     * @return Valid PreAuthorizationResponseDto or null if not found
     */
    @Transactional(readOnly = true)
    public PreAuthorizationResponseDto checkValidity(Long memberId, String serviceCode) {
        log.info("[PRE-AUTH] Checking validity for member {} and service {}", memberId, serviceCode);

        // Find approved and valid pre-authorizations for this member and service
        List<PreAuthorization> validPreAuths = preAuthorizationRepository.findAll().stream()
                .filter(pa -> pa.getMemberId().equals(memberId))
                .filter(pa -> pa.getServiceCode().equals(serviceCode))
                .filter(pa -> pa.getActive())
                .filter(pa -> pa.getStatus() == PreAuthStatus.APPROVED)
                .filter(pa -> !pa.isExpired())
                .toList();

        if (validPreAuths.isEmpty()) {
            log.info("[PRE-AUTH] No valid pre-authorization found for member {} and service {}", memberId, serviceCode);
            return null;
        }

        // Return the most recent valid one
        PreAuthorization preAuth = validPreAuths.stream()
                .max((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .orElse(validPreAuths.get(0));

        log.info("[PRE-AUTH] Found valid pre-authorization {} for member {} and service {}", 
                 preAuth.getReferenceNumber(), memberId, serviceCode);

        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);

        return mapToResponseDto(preAuth, member, provider, service);
    }

    // ==================== MAINTENANCE ====================

    /**
     * Mark expired pre-authorizations
     */
    @Transactional
    public int markExpiredPreAuthorizations() {
        log.info("[PRE-AUTH] Marking expired pre-authorizations");
        
        List<PreAuthorization> expiredList = preAuthorizationRepository.findExpiredPreAuthorizations(LocalDate.now());
        
        for (PreAuthorization preAuth : expiredList) {
            preAuth.markAsExpired();
        }
        
        if (!expiredList.isEmpty()) {
            preAuthorizationRepository.saveAll(expiredList);
        }
        
        log.info("[PRE-AUTH] Marked {} expired pre-authorizations", expiredList.size());
        return expiredList.size();
    }

    // ==================== HELPER METHODS ====================

    /**
     * Generate unique reference number
     */
    private String generateUniqueReferenceNumber() {
        String referenceNumber;
        int attempts = 0;
        do {
            referenceNumber = PreAuthorization.generateReferenceNumber();
            attempts++;
        } while (preAuthorizationRepository.existsByReferenceNumber(referenceNumber) && attempts < 10);

        if (attempts >= 10) {
            throw new RuntimeException("Failed to generate unique reference number after 10 attempts");
        }

        return referenceNumber;
    }

    /**
     * Map to response DTO with full details (CANONICAL REBUILD 2026-01-16)
     */
    private PreAuthorizationResponseDto mapToResponseDto(PreAuthorization preAuth, Member member, 
                                                         Provider provider, EnterpriseMedicalService service) {
        Integer daysUntilExpiry = null;
        if (preAuth.getExpiryDate() != null) {
            daysUntilExpiry = (int) ChronoUnit.DAYS.between(LocalDate.now(), preAuth.getExpiryDate());
        }

        // Get visit info
        Visit visit = preAuth.getVisit();
        
        return PreAuthorizationResponseDto.builder()
                .id(preAuth.getId())
                .referenceNumber(preAuth.getReferenceNumber())
                // Visit info
                .visitId(visit != null ? visit.getId() : null)
                .visitDate(visit != null ? visit.getVisitDate() : null)
                .visitType(visit != null && visit.getVisitType() != null ? visit.getVisitType().toString() : null)
                // Member info
                .memberId(preAuth.getMemberId())
                .memberName(member != null ? member.getFullName() : null)
                .memberCardNumber(member != null ? member.getCardNumber() : null)
                .memberNationalNumber(member != null ? member.getCivilId() : null)
                // Employer info (جهة العمل)
                .employerId(member != null && member.getEmployerOrganization() != null ? member.getEmployerOrganization().getId() : null)
                .employerName(member != null && member.getEmployerOrganization() != null ? member.getEmployerOrganization().getName() : null)
                .employerCode(member != null && member.getEmployerOrganization() != null ? member.getEmployerOrganization().getCode() : null)
                // Provider info
                .providerId(preAuth.getProviderId())
                .providerName(provider != null ? provider.getName() : null)
                .providerLicense(provider != null ? provider.getLicenseNumber() : null)
                // Medical Service info (from Contract)
                .medicalServiceId(service != null ? service.getId() : null)
                .serviceCode(preAuth.getServiceCode())
                .serviceName(service != null ? service.getNameAr() : null)
                .serviceCategory(preAuth.getServiceCategory())
                .requiresPA(preAuth.getRequiresPA())
                // Diagnosis
                .diagnosisCode(preAuth.getDiagnosisCode())
                .diagnosisDescription(preAuth.getDiagnosisDescription())
                // Dates
                .requestDate(preAuth.getRequestDate())
                .expiryDate(preAuth.getExpiryDate())
                .daysUntilExpiry(daysUntilExpiry)
                // Pricing (Contract-Driven)
                .contractPrice(preAuth.getContractPrice())
                .approvedAmount(preAuth.getApprovedAmount())
                .copayAmount(preAuth.getCopayAmount())
                .copayPercentage(preAuth.getCopayPercentage())
                .insuranceCoveredAmount(preAuth.getInsuranceCoveredAmount())
                .currency(preAuth.getCurrency())
                // Status
                .status(preAuth.getStatus().toString())
                .priority(preAuth.getPriority().toString())
                // Additional
                .notes(preAuth.getNotes())
                .rejectionReason(preAuth.getRejectionReason())
                // Flags
                .hasContract(preAuth.getContractPrice() != null)
                .isValid(preAuth.isValid())
                .isExpired(preAuth.isExpired())
                .canBeApproved(preAuth.canBeApproved())
                .canBeRejected(preAuth.canBeRejected())
                .canBeCancelled(preAuth.canBeCancelled())
                // Audit
                .createdAt(preAuth.getCreatedAt())
                .updatedAt(preAuth.getUpdatedAt())
                .createdBy(preAuth.getCreatedBy())
                .updatedBy(preAuth.getUpdatedBy())
                .approvedAt(preAuth.getApprovedAt())
                .approvedBy(preAuth.getApprovedBy())
                .active(preAuth.getActive())
                .build();
    }

    /**
     * Map to response DTO (lightweight - for lists)
     * Fetches member, provider and service info for complete display
     */
    private PreAuthorizationResponseDto mapToResponseDtoLight(PreAuthorization preAuth) {
        // Fetch related entities for complete display
        Member member = memberRepository.findById(preAuth.getMemberId()).orElse(null);
        Provider provider = providerRepository.findById(preAuth.getProviderId()).orElse(null);
        EnterpriseMedicalService service = preAuth.getMedicalService();
        
        // Fallback: try to find service by code if not loaded
        if (service == null && preAuth.getServiceCode() != null) {
            service = medicalServiceRepository.findByCode(preAuth.getServiceCode()).orElse(null);
        }
        
        return mapToResponseDto(preAuth, member, provider, service);
    }

    /**
     * PROVIDER PORTAL (2026-01-14):
     * Validate and enforce provider ID based on user role.
     * 
     * Rules (HARDENED 2026-01-16):
     * - PROVIDER users: providerId ALWAYS comes from ProviderContextGuard (session)
     *   ANY providerId from request is IGNORED to prevent data leakage
     * - SUPER_ADMIN/INSURANCE_ADMIN can set any providerId
     * - Other users can set any providerId
     * 
     * @param dto The pre-authorization creation DTO
     * @param currentUser The currently authenticated user
     */
    private void validateAndEnforceProviderId(PreAuthorizationCreateDto dto, User currentUser) {
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
            
            log.info("🔒 PROVIDER {} creating pre-auth with their providerId: {} (enforced by ProviderContextGuard)", 
                currentUser.getUsername(), userProviderId);
        } else if (authorizationService.isAdmin(currentUser)) {
            // ADMIN user (SUPER or INSURANCE) can set any provider
            log.info("🔓 ADMIN user {} creating pre-auth - any providerId allowed", currentUser.getUsername());
        }
        // Other roles: no restriction on providerId
    }
}
