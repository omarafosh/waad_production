package com.waad.tba.modules.claim.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.SystemSettingRepository;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.claim.dto.ClaimApproveDto;
import com.waad.tba.modules.claim.dto.ClaimRejectDto;
import com.waad.tba.modules.claim.dto.ClaimReturnForInfoDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.mapper.ClaimMapper;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.security.ProviderContextGuard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Claim Approval Service - Handles the status lifecycle and financial approvals.
 * Separated from ClaimService to reduce complexity and improve maintainability.
 * 
 * @since Phase 2 - Architectural Refactoring (2026-02-19)
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ClaimApprovalService {

    private final ClaimRepository claimRepository;
    private final ClaimMapper claimMapper;
    private final AuthorizationService authorizationService;
    private final ClaimStateMachine claimStateMachine;
    private final AtomicFinancialService atomicFinancialService;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;
    private final ClaimAuditService claimAuditService;
    private final com.waad.tba.common.service.BusinessDaysCalculatorService businessDaysCalculator;
    private final SystemSettingRepository systemSettingRepository;
    private final UserRepository userRepository;
    private final ProviderContextGuard providerContextGuard;
    private final com.waad.tba.modules.settlement.service.ProviderAccountService providerAccountService;

    /**
     * Approve a claim with financial validation (Synchronous).
     */
    @Transactional
    public ClaimViewDto approveClaim(Long id, ClaimApproveDto dto) {
        log.info("✅ [FINANCIAL-LOCK] Approving claim {} with pessimistic lock", id);
        
        Claim claim = claimRepository.findByIdForFinancialUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        log.info("🔒 [FINANCIAL-LOCK] Acquired pessimistic lock on claim {}", id);
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        CostCalculationService.CostBreakdown breakdown = atomicFinancialService.calculateCostsWithAtomicDeductible(claim);
        log.info("💰 [ATOMIC] Cost breakdown for claim {}: {}", id, breakdown.getSummary());
        
        BigDecimal approvedAmount;
        if (Boolean.TRUE.equals(dto.getUseSystemCalculation()) || dto.getApprovedAmount() == null) {
            approvedAmount = breakdown.insuranceAmount();
        } else {
            approvedAmount = dto.getApprovedAmount();
        }
        
        atomicFinancialService.validatePositiveAmount(approvedAmount, "المبلغ المعتمد (Approved Amount)");
        atomicFinancialService.validateApprovedAmount(approvedAmount, claim.getRequestedAmount());
        
        BigDecimal patientCoPay = breakdown.patientResponsibility();
        BigDecimal netProviderAmount = breakdown.insuranceAmount();
        BigDecimal total = patientCoPay.add(netProviderAmount);
        
        if (total.compareTo(claim.getRequestedAmount()) != 0) {
            netProviderAmount = claim.getRequestedAmount().subtract(patientCoPay);
        }
        
        Member member = claim.getMember();
        LocalDate serviceDate = claim.getServiceDate() != null ? claim.getServiceDate() : LocalDate.now();
        
        if (member.getBenefitPolicy() != null) {
            benefitPolicyCoverageService.validateAmountLimits(
                member, 
                member.getBenefitPolicy(), 
                approvedAmount, 
                claim.getLines(),
                serviceDate
            );
        }
        
        claim.setApprovedAmount(approvedAmount);
        claim.setPatientCoPay(patientCoPay);
        claim.setNetProviderAmount(netProviderAmount);
        claim.setCoPayPercent(breakdown.coPayPercent());
        claim.setDeductibleApplied(breakdown.deductibleApplied());
        claim.setDifferenceAmount(claim.getRequestedAmount().subtract(approvedAmount));
        
        if (dto.getNotes() != null && !dto.getNotes().isBlank()) {
            claim.setReviewerComment(dto.getNotes());
        }
        
        claimStateMachine.transition(claim, ClaimStatus.APPROVED, currentUser);
        
        if (claim.getVisit() != null) {
            claim.getVisit().setStatus(com.waad.tba.modules.visit.entity.VisitStatus.COMPLETED);
        }
        
        LocalDate completionDate = LocalDate.now();
        claim.setActualCompletionDate(completionDate);
        
        if (claim.getExpectedCompletionDate() != null && claim.getSlaDaysConfigured() != null) {
            LocalDate submissionDate = claim.getCreatedAt().toLocalDate();
            int daysTaken = businessDaysCalculator.calculateBusinessDays(submissionDate, completionDate);
            claim.setBusinessDaysTaken(daysTaken);
            claim.setWithinSla(daysTaken <= claim.getSlaDaysConfigured());
        }
        
        Claim savedClaim = claimRepository.save(claim);
        claimAuditService.recordApproval(savedClaim, previousStatus, null, currentUser, dto.getNotes());
        
        providerAccountService.creditOnClaimApproval(savedClaim.getId(), currentUser.getId());
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Request approval (Asynchronous Phase 1).
     */
    @Transactional
    public ClaimViewDto requestApproval(Long id, ClaimApproveDto dto) {
        log.info("🚀 [SPLIT-PHASE] Phase 1: Requesting approval for claim {}", id);
        
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        if (currentUser == null) {
            throw new BusinessRuleException("لا يمكن معالجة الموافقة: المستخدم الحالي غير محدد.");
        }
        
        if (claim.getStatus() != ClaimStatus.UNDER_REVIEW && claim.getStatus() != ClaimStatus.SUBMITTED) {
            throw new BusinessRuleException("لا يمكن الموافقة على المطالبة في الحالة الحالية: " + claim.getStatus().getArabicLabel());
        }
        
        if (dto.getNotes() != null && !dto.getNotes().isBlank()) {
            claim.setReviewerComment(dto.getNotes());
        }
        
        claimStateMachine.transition(claim, ClaimStatus.APPROVAL_IN_PROGRESS, currentUser);
        Claim savedClaim = claimRepository.save(claim);
        
        final Long approverId = currentUser.getId();
        processApprovalAsync(id, dto, approverId);
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Process approval asynchronously (Phase 2).
     */
    @org.springframework.scheduling.annotation.Async("approvalTaskExecutor")
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,
                   isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public void processApprovalAsync(Long id, ClaimApproveDto dto, Long approverId) {
        log.info("⚙️ [SPLIT-PHASE] Phase 2: Starting async approval processing for claim {}", id);
        
        try {
            Claim claim = claimRepository.findByIdForFinancialUpdate(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
            
            User currentUser = authorizationService.getCurrentUser();
            if (currentUser == null && approverId != null) {
                currentUser = userRepository.findById(approverId).orElse(null);
            }
            if (currentUser == null) {
                throw new BusinessRuleException("فشل تحديد المعتمِد: لا يمكن معالجة الموافقة بدون مستخدم محدد.");
            }
            
            CostCalculationService.CostBreakdown breakdown = atomicFinancialService.calculateCostsWithAtomicDeductible(claim);
            
            BigDecimal approvedAmount;
            if (Boolean.TRUE.equals(dto.getUseSystemCalculation()) || dto.getApprovedAmount() == null) {
                approvedAmount = breakdown.insuranceAmount();
            } else {
                approvedAmount = dto.getApprovedAmount();
            }
            
            atomicFinancialService.validatePositiveAmount(approvedAmount, "المبلغ المعتمد (Approved Amount)");
            atomicFinancialService.validateApprovedAmount(approvedAmount, claim.getRequestedAmount());
            
            BigDecimal patientCoPay = breakdown.patientResponsibility();
            BigDecimal netProviderAmount = breakdown.insuranceAmount();
            BigDecimal total = patientCoPay.add(netProviderAmount);
            
            if (total.compareTo(claim.getRequestedAmount()) != 0) {
                netProviderAmount = claim.getRequestedAmount().subtract(patientCoPay);
            }
            
            Member member = claim.getMember();
            LocalDate serviceDate = claim.getServiceDate() != null ? claim.getServiceDate() : LocalDate.now();
            
            if (member.getBenefitPolicy() != null) {
                benefitPolicyCoverageService.validateAmountLimits(
                    member, 
                    member.getBenefitPolicy(), 
                    approvedAmount, 
                    claim.getLines(),
                    serviceDate
                );
            }
            
            claim.setApprovedAmount(approvedAmount);
            claim.setPatientCoPay(patientCoPay);
            claim.setNetProviderAmount(netProviderAmount);
            claim.setCoPayPercent(breakdown.coPayPercent());
            claim.setDeductibleApplied(breakdown.deductibleApplied());
            claim.setDifferenceAmount(claim.getRequestedAmount().subtract(approvedAmount));
            
            claimStateMachine.transition(claim, ClaimStatus.APPROVED, currentUser);
            
            if (claim.getVisit() != null) {
                claim.getVisit().setStatus(com.waad.tba.modules.visit.entity.VisitStatus.COMPLETED);
            }
            
            LocalDate completionDate = LocalDate.now();
            claim.setActualCompletionDate(completionDate);
            
            if (claim.getExpectedCompletionDate() != null && claim.getSlaDaysConfigured() != null) {
                LocalDate submissionDate = claim.getCreatedAt().toLocalDate();
                int daysTaken = businessDaysCalculator.calculateBusinessDays(submissionDate, completionDate);
                claim.setBusinessDaysTaken(daysTaken);
                claim.setWithinSla(daysTaken <= claim.getSlaDaysConfigured());
            }
            
            Claim savedClaim = claimRepository.save(claim);
            claimAuditService.recordApproval(savedClaim, ClaimStatus.APPROVAL_IN_PROGRESS, null, currentUser, dto.getNotes());
            providerAccountService.creditOnClaimApproval(savedClaim.getId(), currentUser.getId());
            
            log.info("✅ [SPLIT-PHASE] Phase 2 complete: Claim {} approved successfully", id);
            
        } catch (Exception e) {
            log.error("❌ [SPLIT-PHASE] Phase 2 failed for claim {}: {}", id, e.getMessage(), e);
            try {
                Claim failedClaim = claimRepository.findById(id).orElse(null);
                if (failedClaim != null && failedClaim.getStatus() == ClaimStatus.APPROVAL_IN_PROGRESS) {
                    User fallbackUser = (approverId != null) ? userRepository.findById(approverId).orElse(null) : null;
                    failedClaim.setReviewerComment("⚠️ فشل المعالجة التلقائية: " + e.getMessage() + ". يرجى إعادة المحاولة.");
                    claimStateMachine.transition(failedClaim, ClaimStatus.UNDER_REVIEW, fallbackUser);
                    claimRepository.save(failedClaim);
                }
            } catch (Exception rollbackError) {
                log.error("❌ [CRITICAL] Failed to revert claim {} to UNDER_REVIEW", id);
            }
        }
    }

    /**
     * Reject a claim.
     */
    @Transactional
    public ClaimViewDto rejectClaim(Long id, ClaimRejectDto dto) {
        log.info("❌ [FINANCIAL-LOCK] Rejecting claim {}", id);
        
        Claim claim = claimRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        if (dto.getRejectionReason() == null || dto.getRejectionReason().trim().isEmpty()) {
            throw new BusinessRuleException("سبب الرفض مطلوب");
        }
        
        claim.setReviewerComment(dto.getRejectionReason());
        claim.setApprovedAmount(BigDecimal.ZERO);
        claim.setNetProviderAmount(BigDecimal.ZERO);
        
        claimStateMachine.transition(claim, ClaimStatus.REJECTED, currentUser);
        
        if (claim.getVisit() != null) {
            claim.getVisit().setStatus(com.waad.tba.modules.visit.entity.VisitStatus.CANCELLED);
        }
        
        LocalDate completionDate = LocalDate.now();
        claim.setActualCompletionDate(completionDate);
        
        if (claim.getExpectedCompletionDate() != null && claim.getSlaDaysConfigured() != null) {
            LocalDate submissionDate = claim.getCreatedAt().toLocalDate();
            int daysTaken = businessDaysCalculator.calculateBusinessDays(submissionDate, completionDate);
            claim.setBusinessDaysTaken(daysTaken);
            claim.setWithinSla(daysTaken <= claim.getSlaDaysConfigured());
        }
        
        Claim savedClaim = claimRepository.save(claim);
        claimAuditService.recordRejection(savedClaim, previousStatus, currentUser, dto.getRejectionReason());
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Return for additional info.
     */
    @Transactional
    public ClaimViewDto returnForInfo(Long id, ClaimReturnForInfoDto dto) {
        log.info("📝 Returning claim {} for additional information", id);
        
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        if (claim.getStatus() != ClaimStatus.UNDER_REVIEW) {
            throw new BusinessRuleException("لا يمكن إعادة المطالبة للاستكمال. الحالة الحالية: " + claim.getStatus());
        }
        
        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            throw new BusinessRuleException("سبب طلب المعلومات الإضافية مطلوب");
        }
        
        String fullComment = "طلب معلومات إضافية: " + dto.getReason();
        if (dto.getRequiredDocuments() != null && !dto.getRequiredDocuments().trim().isEmpty()) {
            fullComment += "\n\nالمستندات المطلوبة: " + dto.getRequiredDocuments();
        }
        claim.setReviewerComment(fullComment);
        
        claimStateMachine.transition(claim, ClaimStatus.RETURNED_FOR_INFO, currentUser);
        Claim savedClaim = claimRepository.save(claim);
        
        claimAuditService.recordStatusChange(savedClaim, previousStatus, currentUser, fullComment);
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Start review.
     */
    @Transactional
    public ClaimViewDto startReview(Long id) {
        log.info("📋 Starting review of claim {}", id);
        
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", "id", id));
        
        User currentUser = authorizationService.getCurrentUser();
        ClaimStatus previousStatus = claim.getStatus();
        
        if (claim.getStatus() != ClaimStatus.SUBMITTED) {
            throw new BusinessRuleException("لا يمكن بدء المراجعة. الحالة الحالية: " + claim.getStatus());
        }
        
        claimStateMachine.transition(claim, ClaimStatus.UNDER_REVIEW, currentUser);
        
        if (claim.getVisit() != null) {
            claim.getVisit().setStatus(com.waad.tba.modules.visit.entity.VisitStatus.IN_PROGRESS);
        }
        
        Claim savedClaim = claimRepository.save(claim);
        claimAuditService.recordStatusChange(savedClaim, previousStatus, currentUser, "تم استلام المطالبة للمراجعة");
        
        return claimMapper.toViewDto(savedClaim);
    }

    /**
     * Get pending claims for inbox.
     */
    @Transactional(readOnly = true)
    public Page<ClaimViewDto> getPendingClaims(int page, int size, String sortBy, String sortDir) {
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        List<ClaimStatus> pendingStatuses = List.of(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW);
        User currentUser = authorizationService.getCurrentUser();
        
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            return claimRepository.findByProviderIdAndStatusIn(currentUser.getProviderId(), pendingStatuses, pageable)
                    .map(claimMapper::toViewDto);
        }

        return claimRepository.findByStatusIn(pendingStatuses, pageable).map(claimMapper::toViewDto);
    }

    /**
     * Get approved claims.
     */
    @Transactional(readOnly = true)
    public Page<ClaimViewDto> getApprovedClaims(int page, int size, String sortBy, String sortDir) {
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        User currentUser = authorizationService.getCurrentUser();
        if (authorizationService.isProvider(currentUser)) {
            providerContextGuard.validateProviderBinding(currentUser);
            return claimRepository.findByProviderIdAndStatus(currentUser.getProviderId(), ClaimStatus.APPROVED, pageable)
                    .map(claimMapper::toViewDto);
        }
        
        return claimRepository.findByStatus(ClaimStatus.APPROVED, pageable).map(claimMapper::toViewDto);
    }
}
