package com.waad.tba.modules.member.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.member.dto.ChronicConditionCreateDto;
import com.waad.tba.modules.member.dto.ChronicConditionResponseDto;
import com.waad.tba.modules.member.dto.ChronicConditionUpdateDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberChronicCondition;
import com.waad.tba.modules.member.enums.ChronicConditionType;
import com.waad.tba.modules.member.enums.ChronicCoverageStatus;
import com.waad.tba.modules.member.repository.MemberChronicConditionRepository;
import com.waad.tba.modules.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing member chronic conditions.
 * Provides comprehensive business logic for:
 * - CRUD operations
 * - Coverage validation
 * - Claim integration
 * - Statistics and reporting
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberChronicConditionService {

    private final MemberChronicConditionRepository conditionRepository;
    private final MemberRepository memberRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add a new chronic condition for a member.
     * 
     * Business Rules:
     * 1. Member must exist and be active
     * 2. Cannot add duplicate condition type for same member
     * 3. If condition type is OTHER, customConditionName is required
     * 4. Waiting period is calculated based on condition type defaults
     */
    @Transactional
    public ChronicConditionResponseDto create(ChronicConditionCreateDto dto) {
        log.info("[ChronicCondition] Creating condition for member: {}, type: {}", 
                dto.getMemberId(), dto.getConditionType());

        // Validate member exists
        Member member = memberRepository.findById(dto.getMemberId())
                .orElseThrow(() -> new BusinessRuleException("العضو غير موجود: " + dto.getMemberId()));

        // Check for duplicate
        if (conditionRepository.existsByMemberIdAndConditionType(dto.getMemberId(), dto.getConditionType())) {
            throw new BusinessRuleException("هذا المرض المزمن مسجل بالفعل لهذا العضو");
        }

        // Validate OTHER type requires custom name
        if (dto.getConditionType() == ChronicConditionType.OTHER 
            && (dto.getCustomConditionName() == null || dto.getCustomConditionName().trim().isEmpty())) {
            throw new BusinessRuleException("اسم المرض مطلوب عند اختيار 'حالة مزمنة أخرى'");
        }

        // Build entity
        MemberChronicCondition condition = MemberChronicCondition.builder()
                .member(member)
                .conditionType(dto.getConditionType())
                .customConditionName(dto.getCustomConditionName())
                .icd10Code(dto.getIcd10Code() != null ? dto.getIcd10Code() : dto.getConditionType().getIcd10Code())
                .diagnosisDate(dto.getDiagnosisDate())
                .disclosureDate(dto.getDisclosureDate() != null ? dto.getDisclosureDate() : LocalDate.now())
                .severityLevel(dto.getSeverityLevel() != null ? dto.getSeverityLevel() : 3)
                .coverageStatus(dto.getCoverageStatus() != null ? dto.getCoverageStatus() : ChronicCoverageStatus.PENDING_REVIEW)
                .waitingPeriodDays(dto.getWaitingPeriodDays() != null ? dto.getWaitingPeriodDays() : dto.getConditionType().getDefaultWaitingPeriodDays())
                .coveragePercentage(dto.getCoveragePercentage())
                .annualLimit(dto.getAnnualLimit())
                .usedAmount(BigDecimal.ZERO)
                .coverageReason(dto.getCoverageReason())
                .documentationPath(dto.getDocumentationPath())
                .diagnosingPhysician(dto.getDiagnosingPhysician())
                .diagnosingFacility(dto.getDiagnosingFacility())
                .documentationVerified(false)
                .currentMedications(dto.getCurrentMedications())
                .treatmentPlan(dto.getTreatmentPlan())
                .notes(dto.getNotes())
                .internalNotes(dto.getInternalNotes())
                .active(true)
                .build();

        // Calculate waiting period end date
        LocalDate enrollmentDate = member.getCreatedAt() != null ? member.getCreatedAt().toLocalDate() : LocalDate.now();
        condition.calculateWaitingPeriodEndDate(enrollmentDate);

        // If waiting period and end date passed, auto-set to WAITING_PERIOD
        if (condition.getWaitingPeriodDays() != null && condition.getWaitingPeriodDays() > 0
            && condition.getCoverageStatus() == ChronicCoverageStatus.PENDING_REVIEW) {
            condition.setCoverageStatus(ChronicCoverageStatus.WAITING_PERIOD);
        }

        condition = conditionRepository.save(condition);
        log.info("[ChronicCondition] ✅ Created condition ID: {} for member: {}", 
                condition.getId(), member.getId());

        return ChronicConditionResponseDto.fromEntity(condition);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get condition by ID
     */
    @Transactional(readOnly = true)
    public ChronicConditionResponseDto findById(Long id) {
        MemberChronicCondition condition = conditionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("المرض المزمن غير موجود: " + id));
        return ChronicConditionResponseDto.fromEntity(condition);
    }

    /**
     * Get all conditions for a member
     */
    @Transactional(readOnly = true)
    public List<ChronicConditionResponseDto> findByMemberId(Long memberId) {
        return conditionRepository.findByMemberIdAndActiveTrue(memberId)
                .stream()
                .map(ChronicConditionResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get all conditions for a member (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ChronicConditionResponseDto> findByMemberId(Long memberId, Pageable pageable) {
        return conditionRepository.findByMemberId(memberId, pageable)
                .map(ChronicConditionResponseDto::fromEntity);
    }

    /**
     * Check if member has any chronic conditions
     */
    @Transactional(readOnly = true)
    public boolean memberHasChronicConditions(Long memberId) {
        return conditionRepository.existsByMemberIdAndActiveTrue(memberId);
    }

    /**
     * Get conditions pending review
     */
    @Transactional(readOnly = true)
    public List<ChronicConditionResponseDto> findPendingReview() {
        return conditionRepository.findPendingReview()
                .stream()
                .map(ChronicConditionResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Search conditions with filters
     */
    @Transactional(readOnly = true)
    public Page<ChronicConditionResponseDto> search(
            ChronicConditionType conditionType,
            ChronicCoverageStatus coverageStatus,
            Long employerId,
            Boolean verified,
            Pageable pageable) {
        return conditionRepository.search(conditionType, coverageStatus, employerId, verified, pageable)
                .map(ChronicConditionResponseDto::fromEntity);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update an existing condition
     */
    @Transactional
    public ChronicConditionResponseDto update(Long id, ChronicConditionUpdateDto dto) {
        log.info("[ChronicCondition] Updating condition: {}", id);

        MemberChronicCondition condition = conditionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("المرض المزمن غير موجود: " + id));

        // Update fields if provided
        if (dto.getCustomConditionName() != null) condition.setCustomConditionName(dto.getCustomConditionName());
        if (dto.getIcd10Code() != null) condition.setIcd10Code(dto.getIcd10Code());
        if (dto.getDiagnosisDate() != null) condition.setDiagnosisDate(dto.getDiagnosisDate());
        if (dto.getDisclosureDate() != null) condition.setDisclosureDate(dto.getDisclosureDate());
        if (dto.getSeverityLevel() != null) condition.setSeverityLevel(dto.getSeverityLevel());
        if (dto.getCoverageStatus() != null) {
            condition.updateCoverageStatus(dto.getCoverageStatus(), dto.getCoverageReason());
        }
        if (dto.getWaitingPeriodDays() != null) condition.setWaitingPeriodDays(dto.getWaitingPeriodDays());
        if (dto.getWaitingPeriodEndDate() != null) condition.setWaitingPeriodEndDate(dto.getWaitingPeriodEndDate());
        if (dto.getCoveragePercentage() != null) condition.setCoveragePercentage(dto.getCoveragePercentage());
        if (dto.getAnnualLimit() != null) condition.setAnnualLimit(dto.getAnnualLimit());
        if (dto.getCoverageReason() != null) condition.setCoverageReason(dto.getCoverageReason());
        if (dto.getDocumentationPath() != null) condition.setDocumentationPath(dto.getDocumentationPath());
        if (dto.getDiagnosingPhysician() != null) condition.setDiagnosingPhysician(dto.getDiagnosingPhysician());
        if (dto.getDiagnosingFacility() != null) condition.setDiagnosingFacility(dto.getDiagnosingFacility());
        if (dto.getCurrentMedications() != null) condition.setCurrentMedications(dto.getCurrentMedications());
        if (dto.getTreatmentPlan() != null) condition.setTreatmentPlan(dto.getTreatmentPlan());
        if (dto.getLastReviewDate() != null) condition.setLastReviewDate(dto.getLastReviewDate());
        if (dto.getNextReviewDate() != null) condition.setNextReviewDate(dto.getNextReviewDate());
        if (dto.getActive() != null) condition.setActive(dto.getActive());
        if (dto.getResolvedDate() != null) condition.setResolvedDate(dto.getResolvedDate());
        if (dto.getNotes() != null) condition.setNotes(dto.getNotes());
        if (dto.getInternalNotes() != null) condition.setInternalNotes(dto.getInternalNotes());

        condition = conditionRepository.save(condition);
        log.info("[ChronicCondition] ✅ Updated condition: {}", id);

        return ChronicConditionResponseDto.fromEntity(condition);
    }

    /**
     * Update coverage status
     */
    @Transactional
    public ChronicConditionResponseDto updateCoverageStatus(Long id, ChronicCoverageStatus status, String reason) {
        log.info("[ChronicCondition] Updating coverage status: {} -> {}", id, status);

        MemberChronicCondition condition = conditionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("المرض المزمن غير موجود: " + id));

        // Validate status transition
        validateStatusTransition(condition.getCoverageStatus(), status);

        condition.updateCoverageStatus(status, reason);
        condition = conditionRepository.save(condition);

        log.info("[ChronicCondition] ✅ Updated coverage status: {} -> {}", id, status);
        return ChronicConditionResponseDto.fromEntity(condition);
    }

    /**
     * Verify documentation
     */
    @Transactional
    public ChronicConditionResponseDto verifyDocumentation(Long id, String verifiedBy) {
        log.info("[ChronicCondition] Verifying documentation for: {}", id);

        MemberChronicCondition condition = conditionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("المرض المزمن غير موجود: " + id));

        if (condition.getDocumentationPath() == null || condition.getDocumentationPath().isEmpty()) {
            throw new BusinessRuleException("لا يوجد مستند مرفق للتحقق منه");
        }

        condition.setDocumentationVerified(true);
        condition.setVerificationDate(LocalDate.now());
        condition.setVerifiedBy(verifiedBy);

        condition = conditionRepository.save(condition);
        log.info("[ChronicCondition] ✅ Documentation verified for: {}", id);

        return ChronicConditionResponseDto.fromEntity(condition);
    }

    /**
     * Add to used amount (called when claim is approved)
     */
    @Transactional
    public void addToUsedAmount(Long id, BigDecimal amount) {
        MemberChronicCondition condition = conditionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("المرض المزمن غير موجود: " + id));

        condition.addToUsedAmount(amount);
        conditionRepository.save(condition);
        log.info("[ChronicCondition] Added {} to used amount for condition: {}", amount, id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Soft delete a condition
     */
    @Transactional
    public void delete(Long id) {
        MemberChronicCondition condition = conditionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("المرض المزمن غير موجود: " + id));

        condition.setActive(false);
        condition.setResolvedDate(LocalDate.now());
        conditionRepository.save(condition);

        log.info("[ChronicCondition] ✅ Soft deleted condition: {}", id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if a condition is covered for claims
     */
    @Transactional(readOnly = true)
    public boolean isConditionCovered(Long memberId, ChronicConditionType conditionType) {
        return conditionRepository.isConditionCovered(memberId, conditionType);
    }

    /**
     * Check if condition requires pre-approval
     */
    @Transactional(readOnly = true)
    public boolean conditionRequiresPreApproval(Long memberId, ChronicConditionType conditionType) {
        return conditionRepository.conditionRequiresPreApproval(memberId, conditionType);
    }

    /**
     * Validate claim against chronic condition
     * Returns validation result with rejection reason if applicable
     */
    @Transactional(readOnly = true)
    public ChronicClaimValidationResult validateClaimForChronicCondition(
            Long memberId, 
            ChronicConditionType conditionType,
            BigDecimal claimAmount) {
        
        var conditionOpt = conditionRepository.findForClaimValidation(memberId, conditionType);
        
        if (conditionOpt.isEmpty()) {
            return ChronicClaimValidationResult.notChronicRelated();
        }

        MemberChronicCondition condition = conditionOpt.get();

        // Check if claims are allowed
        if (!condition.canSubmitClaims()) {
            String reason = switch (condition.getCoverageStatus()) {
                case EXCLUDED -> "هذا المرض المزمن مستثنى من التغطية";
                case WAITING_PERIOD -> "المرض في فترة الانتظار حتى " + condition.getWaitingPeriodEndDate();
                case PENDING_REVIEW -> "المرض قيد المراجعة من اللجنة الطبية";
                default -> "حالة التغطية لا تسمح بتقديم مطالبات";
            };
            return ChronicClaimValidationResult.rejected(condition.getId(), reason);
        }

        // Check annual limit
        if (condition.getAnnualLimit() != null && claimAmount != null) {
            BigDecimal remaining = condition.getRemainingLimit();
            if (remaining != null && claimAmount.compareTo(remaining) > 0) {
                return ChronicClaimValidationResult.rejected(condition.getId(),
                        "تجاوز الحد السنوي للمرض المزمن. المتبقي: " + remaining);
            }
        }

        // Check if requires PA
        if (condition.requiresPreApproval()) {
            return ChronicClaimValidationResult.requiresPreApproval(condition.getId(),
                    condition.getCoveragePercentage());
        }

        return ChronicClaimValidationResult.approved(condition.getId(), condition.getCoveragePercentage());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get statistics for dashboard
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStatistics() {
        List<Object[]> byType = conditionRepository.countByConditionType();
        List<Object[]> byStatus = conditionRepository.countByCoverageStatus();
        long totalMembers = conditionRepository.countDistinctMembers();

        Map<String, Long> typeStats = byType.stream()
                .collect(Collectors.toMap(
                        arr -> ((ChronicConditionType) arr[0]).getNameAr(),
                        arr -> (Long) arr[1]
                ));

        Map<String, Long> statusStats = byStatus.stream()
                .collect(Collectors.toMap(
                        arr -> ((ChronicCoverageStatus) arr[0]).getLabelAr(),
                        arr -> (Long) arr[1]
                ));

        return Map.of(
                "byConditionType", typeStats,
                "byCoverageStatus", statusStats,
                "totalMembersWithConditions", totalMembers,
                "totalConditions", conditionRepository.count()
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCHEDULED TASKS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Auto-activate conditions where waiting period has ended.
     * Runs daily at midnight.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void processWaitingPeriodExpirations() {
        log.info("[ChronicCondition] Processing waiting period expirations...");
        
        int updated = conditionRepository.activateWaitingPeriodConditions(LocalDate.now());
        
        log.info("[ChronicCondition] ✅ Activated {} conditions after waiting period", updated);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate coverage status transitions
     */
    private void validateStatusTransition(ChronicCoverageStatus from, ChronicCoverageStatus to) {
        // EXCLUDED can only transition to PENDING_REVIEW (for re-evaluation)
        if (from == ChronicCoverageStatus.EXCLUDED && to != ChronicCoverageStatus.PENDING_REVIEW) {
            throw new BusinessRuleException("لا يمكن تغيير حالة 'مستثنى' إلا إلى 'قيد المراجعة'");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INNER CLASSES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Result of chronic condition claim validation
     */
    public record ChronicClaimValidationResult(
            boolean isChronicRelated,
            boolean isApproved,
            boolean requiresPreApproval,
            Long conditionId,
            BigDecimal coveragePercentage,
            String rejectionReason
    ) {
        public static ChronicClaimValidationResult notChronicRelated() {
            return new ChronicClaimValidationResult(false, true, false, null, null, null);
        }

        public static ChronicClaimValidationResult approved(Long conditionId, BigDecimal coveragePercentage) {
            return new ChronicClaimValidationResult(true, true, false, conditionId, coveragePercentage, null);
        }

        public static ChronicClaimValidationResult requiresPreApproval(Long conditionId, BigDecimal coveragePercentage) {
            return new ChronicClaimValidationResult(true, true, true, conditionId, coveragePercentage, null);
        }

        public static ChronicClaimValidationResult rejected(Long conditionId, String reason) {
            return new ChronicClaimValidationResult(true, false, false, conditionId, null, reason);
        }
    }
}
