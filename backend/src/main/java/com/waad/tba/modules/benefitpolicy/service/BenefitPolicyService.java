package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.dto.*;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyAudit;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for managing Benefit Policies.
 * 
 * Business Rules:
 * 1. startDate must be before endDate
 * 2. annualLimit must be >= 0
 * 3. Only one ACTIVE policy per employer at any given date range
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BenefitPolicyService {

    private final BenefitPolicyRepository benefitPolicyRepository;
    private final OrganizationRepository organizationRepository;
    private final com.waad.tba.modules.member.repository.MemberRepository memberRepository;
    private final com.waad.tba.modules.claim.repository.ClaimRepository claimRepository;
    private final BenefitPolicyAuditRepository benefitPolicyAuditRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // READ OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all benefit policies (paginated)
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyResponseDto> findAll(Pageable pageable) {
        log.debug("Finding all benefit policies, page: {}", pageable.getPageNumber());
        Page<BenefitPolicy> page = benefitPolicyRepository.findAllOptimized(pageable);
        
        // Populate financial stats
        page.forEach(this::populateFinancialStats);
        
        Page<BenefitPolicyResponseDto> result = page.map(BenefitPolicyResponseDto::fromEntity);
        log.info("[BENEFIT-POLICIES] Retrieved {} records (total: {})", 
                result.getContent().size(), result.getTotalElements());
        return result;
    }

    /**
     * Helper to populate transient financial statistics
     */
    private void populateFinancialStats(BenefitPolicy policy) {
        if (policy.getId() == null) return;
        
        java.math.BigDecimal used = claimRepository.sumApprovedAmountByPolicyId(policy.getId());
        if (used == null) used = java.math.BigDecimal.ZERO;
        
        policy.setUsedAmount(used);
        
        if (policy.getAnnualLimit() != null && policy.getAnnualLimit().compareTo(java.math.BigDecimal.ZERO) > 0) {
            double percentage = used.divide(policy.getAnnualLimit(), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(java.math.BigDecimal.valueOf(100)).doubleValue();
            policy.setUsagePercentage(percentage);
        } else {
            policy.setUsagePercentage(0.0);
        }
    }

    /**
     * Get all benefit policies (paginated) with optional deleted items
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyResponseDto> findAll(boolean includeDeleted, Pageable pageable) {
        log.debug("Finding all benefit policies, includeDeleted: {}, page: {}", includeDeleted, pageable.getPageNumber());
        Page<BenefitPolicy> page;
        if (includeDeleted) {
            page = benefitPolicyRepository.findAllIncludingDeleted(pageable);
            log.info("[BENEFIT-POLICIES-SVC] findAll(includeDeleted=true) fetched {} elements, total: {}", 
                    page.getContent().size(), page.getTotalElements());
        } else {
            page = benefitPolicyRepository.findAllOptimized(pageable);
            log.info("[BENEFIT-POLICIES-SVC] findAll(includeDeleted=false) fetched {} elements", 
                    page.getContent().size());
        }
        return page.map(BenefitPolicyResponseDto::fromEntity);
    }

    /**
     * Get benefit policy by ID
     */
    @Transactional(readOnly = true)
    public BenefitPolicyResponseDto findById(Long id) {
        log.debug("Finding benefit policy by ID: {}", id);
        BenefitPolicy policy = benefitPolicyRepository.findByIdIncludeDeleted(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));
        populateFinancialStats(policy);
        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    /**
     * Get benefit policy by policy code
     */
    @Transactional(readOnly = true)
    public BenefitPolicyResponseDto findByPolicyCode(String policyCode) {
        log.debug("Finding benefit policy by code: {}", policyCode);
        BenefitPolicy policy = benefitPolicyRepository.findByPolicyCode(policyCode)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة للرمز: " + policyCode));
        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    /**
     * Get all policies for an employer
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyResponseDto> findByEmployer(Long employerOrgId) {
        log.debug("Finding benefit policies for employer: {}", employerOrgId);
        List<BenefitPolicy> policies = benefitPolicyRepository.findByEmployerOrganizationIdAndActiveTrue(employerOrgId);
        policies.forEach(this::populateFinancialStats);
        return policies.stream()
                .map(BenefitPolicyResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get paginated policies for an employer
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyResponseDto> findByEmployer(Long employerOrgId, Pageable pageable) {
        return findByEmployer(employerOrgId, false, pageable);
    }

    /**
     * Get paginated policies for an employer with optional deleted items
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyResponseDto> findByEmployer(Long employerOrgId, boolean includeDeleted, Pageable pageable) {
        log.debug("Finding benefit policies for employer: {}, includeDeleted: {}, page: {}", 
                employerOrgId, includeDeleted, pageable.getPageNumber());
        
        Page<BenefitPolicy> page;
        if (includeDeleted) {
            page = benefitPolicyRepository.findByEmployerOrganizationIdNative(employerOrgId, pageable);
            log.info("[BENEFIT-POLICIES-SVC] findByEmployer(id={}, includeDeleted=true) fetched {} elements, total: {}", 
                    employerOrgId, page.getContent().size(), page.getTotalElements());
        } else {
            page = benefitPolicyRepository.findByEmployerOrganizationIdAndActiveTrue(employerOrgId, pageable);
            log.info("[BENEFIT-POLICIES-SVC] findByEmployer(id={}, includeDeleted=false) fetched {} elements", 
                    employerOrgId, page.getContent().size());
        }
        
        page.forEach(this::populateFinancialStats);
        return page.map(BenefitPolicyResponseDto::fromEntity);
    }

    /**
     * Get active policies with a specific status
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyResponseDto> findByStatus(BenefitPolicyStatus status) {
        log.debug("Finding benefit policies with status: {}", status);
        return benefitPolicyRepository.findByStatusAndActiveTrue(status)
                .stream()
                .map(BenefitPolicyResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get effective policy for an employer on a specific date
     */
    @Transactional(readOnly = true)
    public BenefitPolicyResponseDto findEffectiveForEmployer(Long employerOrgId, LocalDate date) {
        log.debug("Finding effective policy for employer {} on {}", employerOrgId, date);
        return benefitPolicyRepository.findActiveEffectivePolicyForEmployer(employerOrgId, date)
                .map(BenefitPolicyResponseDto::fromEntity)
                .orElse(null);
    }

    /**
     * Search policies by name or code
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyResponseDto> search(String search, Pageable pageable) {
        log.debug("Searching benefit policies: {}", search);
        return benefitPolicyRepository.searchByNameOrCode(search, pageable)
                .map(BenefitPolicyResponseDto::fromEntity);
    }

    /**
     * Get selector list for dropdowns
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicySelectorDto> getSelectors() {
        log.debug("Getting benefit policy selectors");
        return benefitPolicyRepository.findByActiveTrue()
                .stream()
                .map(bp -> BenefitPolicySelectorDto.builder()
                        .id(bp.getId())
                        .label(bp.getName())
                        .policyCode(bp.getPolicyCode())
                        .effective(bp.isEffective())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get selector list for an employer
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicySelectorDto> getSelectorsForEmployer(Long employerOrgId) {
        log.debug("Getting benefit policy selectors for employer: {}", employerOrgId);
        return benefitPolicyRepository.findByEmployerOrganizationIdAndActiveTrue(employerOrgId)
                .stream()
                .map(bp -> BenefitPolicySelectorDto.builder()
                        .id(bp.getId())
                        .label(bp.getName())
                        .policyCode(bp.getPolicyCode())
                        .effective(bp.isEffective())
                        .build())
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE OPERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create a new benefit policy
     */
    @Transactional
    public BenefitPolicyResponseDto create(BenefitPolicyCreateDto dto) {
        log.info("Creating new benefit policy: {}", dto.getName());

        // Validate dates
        validateDates(dto.getStartDate(), dto.getEndDate());

        // Validate name uniqueness GLOBALLY
        if (benefitPolicyRepository.existsByNameAndActiveTrue(dto.getName())) {
            throw new BusinessRuleException("اسم الوثيقة '" + dto.getName() + "' موجود مسبقاً في النظام");
        }

        // Validate code uniqueness GLOBALLY if provided
        if (dto.getPolicyCode() != null && !dto.getPolicyCode().trim().isEmpty()) {
            if (benefitPolicyRepository.existsByPolicyCodeAndActiveTrue(dto.getPolicyCode())) {
                throw new BusinessRuleException("رمز الوثيقة '" + dto.getPolicyCode() + "' موجود مسبقاً في النظام");
            }
        }

        // Get employer organization
        Organization employer = organizationRepository.findById(dto.getEmployerOrgId())
                .orElseThrow(() -> new BusinessRuleException("جهة العمل غير موجودة: " + dto.getEmployerOrgId()));

        // Get insurance organization (optional)
        Organization insurance = null;
        if (dto.getInsuranceOrgId() != null) {
            insurance = organizationRepository.findById(dto.getInsuranceOrgId())
                    .orElseThrow(() -> new BusinessRuleException("شركة التأمين غير موجودة: " + dto.getInsuranceOrgId()));
        }

        // Determine initial status
        BenefitPolicyStatus status = BenefitPolicyStatus.DRAFT;
        if (dto.getStatus() != null) {
            try {
                status = BenefitPolicyStatus.valueOf(dto.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessRuleException("حالة غير صالحة: " + dto.getStatus());
            }
        }

        // If activating, check for overlapping active policies
        if (status == BenefitPolicyStatus.ACTIVE) {
            checkOverlappingActivePolicy(dto.getEmployerOrgId(), dto.getStartDate(), dto.getEndDate(), null);
        }

        // Auto-generate policyCode if not provided
        String policyCode = dto.getPolicyCode();
        if (policyCode == null || policyCode.isBlank()) {
            policyCode = generatePolicyCode();
            log.debug("Auto-generated policy code: {}", policyCode);
        } else {
            // Validate format if provided
            if (!policyCode.matches("POL-\\d{4}-\\d{3}")) {
                throw new BusinessRuleException("يجب أن يتبع رمز الوثيقة التنسيق POL-YYYY-XXX (مثال: POL-2025-001)");
            }
            // Check uniqueness
            if (benefitPolicyRepository.findByPolicyCode(policyCode).isPresent()) {
                throw new BusinessRuleException("رمز الوثيقة موجود مسبقاً: " + policyCode);
            }
        }

        // Build entity
        BenefitPolicy policy = BenefitPolicy.builder()
                .name(dto.getName())
                .policyCode(policyCode)
                .description(dto.getDescription())
                .employerOrganization(employer)
                .insuranceOrganization(insurance)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .annualLimit(dto.getAnnualLimit())
                .defaultCoveragePercent(dto.getDefaultCoveragePercent() != null ? dto.getDefaultCoveragePercent() : 80)
                .perMemberLimit(dto.getPerMemberLimit())
                .perFamilyLimit(dto.getPerFamilyLimit())
                .distributionType(dto.getDistributionType() != null ? dto.getDistributionType() : com.waad.tba.modules.benefitpolicy.enums.DistributionType.UNIFIED)
                .status(status)
                .notes(dto.getNotes())
                .active(true)
                .build();

        policy = benefitPolicyRepository.save(policy);
        log.info("✅ Created benefit policy: {} (ID: {})", policy.getName(), policy.getId());

        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE OPERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update an existing benefit policy
     */
    @Transactional
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public BenefitPolicyResponseDto update(Long id, BenefitPolicyUpdateDto dto) {
        log.info("Updating benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        // Update fields if provided
        if (dto.getName() != null) {
            // Validate name uniqueness GLOBALLY if changing
            if (!dto.getName().equals(policy.getName()) && 
                benefitPolicyRepository.existsByNameAndIdNotAndActiveTrue(dto.getName(), policy.getId())) {
                throw new BusinessRuleException("اسم الوثيقة '" + dto.getName() + "' موجود مسبقاً في النظام");
            }
            policy.setName(dto.getName());
        }
        if (dto.getPolicyCode() != null) {
            // Validate code uniqueness GLOBALLY if changing
            if (!dto.getPolicyCode().equals(policy.getPolicyCode()) && 
                benefitPolicyRepository.existsByPolicyCodeAndIdNotAndActiveTrue(dto.getPolicyCode(), policy.getId())) {
                throw new BusinessRuleException("رمز الوثيقة '" + dto.getPolicyCode() + "' موجود مسبقاً في النظام");
            }
            policy.setPolicyCode(dto.getPolicyCode());
        }
        if (dto.getDescription() != null) {
            policy.setDescription(dto.getDescription());
        }
        if (dto.getAnnualLimit() != null) {
            policy.setAnnualLimit(dto.getAnnualLimit());
        }
        if (dto.getDefaultCoveragePercent() != null) {
            policy.setDefaultCoveragePercent(dto.getDefaultCoveragePercent());
        }
        if (dto.getPerMemberLimit() != null) {
            policy.setPerMemberLimit(dto.getPerMemberLimit());
        }
        if (dto.getPerFamilyLimit() != null) {
            policy.setPerFamilyLimit(dto.getPerFamilyLimit());
        }
        if (dto.getNotes() != null) {
            policy.setNotes(dto.getNotes());
        }
        if (dto.getDistributionType() != null) {
            policy.setDistributionType(dto.getDistributionType());
        }

        // Handle date changes with validation
        LocalDate newStartDate = dto.getStartDate() != null ? dto.getStartDate() : policy.getStartDate();
        LocalDate newEndDate = dto.getEndDate() != null ? dto.getEndDate() : policy.getEndDate();
        
        if (dto.getStartDate() != null || dto.getEndDate() != null) {
            validateDates(newStartDate, newEndDate);
            
            // If policy is active, check for overlapping
            if (policy.getStatus() == BenefitPolicyStatus.ACTIVE) {
                checkOverlappingActivePolicy(
                        policy.getEmployerOrganization().getId(),
                        newStartDate, newEndDate, policy.getId());
            }
            
            policy.setStartDate(newStartDate);
            policy.setEndDate(newEndDate);
        }

        policy = benefitPolicyRepository.save(policy);
        log.info("✅ Updated benefit policy: {}", id);

        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Activate a benefit policy
     */
    @Transactional
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public BenefitPolicyResponseDto activate(Long id) {
        log.info("Activating benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        // Check for overlapping active policies
        checkOverlappingActivePolicy(
                policy.getEmployerOrganization().getId(),
                policy.getStartDate(),
                policy.getEndDate(),
                policy.getId());

        policy.activate();
        policy = benefitPolicyRepository.save(policy);
        log.info("✅ Activated benefit policy: {}", id);

        // Re-assign all members of this employer to the newly activated policy
        int updatedCount = memberRepository.updateBenefitPolicyForEmployer(
                policy.getEmployerOrganization().getId(), 
                policy);
        log.info("🔄 Auto-assigned {} members to the new active policy", updatedCount);

        // Log status change audit
        benefitPolicyAuditRepository.save(BenefitPolicyAudit.builder()
                .benefitPolicyId(policy.getId())
                .eventType("STATUS_CHANGE")
                .oldValue("DRAFT")
                .newValue("ACTIVE")
                .notes("Policy activated and members auto-assigned")
                .performedBy("SYSTEM_ADMIN")
                .build());

        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    /**
     * Deactivate (expire) a benefit policy
     */
    @Transactional
    public BenefitPolicyResponseDto deactivate(Long id) {
        log.info("Deactivating benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        policy.deactivate();
        policy = benefitPolicyRepository.save(policy);
        
        benefitPolicyAuditRepository.save(BenefitPolicyAudit.builder()
                .benefitPolicyId(policy.getId())
                .eventType("STATUS_CHANGE")
                .oldValue("ACTIVE")
                .newValue("EXPIRED")
                .notes("Policy manually deactivated")
                .performedBy("SYSTEM_ADMIN")
                .build());
                
        log.info("✅ Deactivated benefit policy: {}", id);

        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    /**
     * Suspend a benefit policy
     */
    @Transactional
    public BenefitPolicyResponseDto suspend(Long id) {
        log.info("Suspending benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        String oldStatus = policy.getStatus().name();
        policy.suspend();
        policy = benefitPolicyRepository.save(policy);
        
        benefitPolicyAuditRepository.save(BenefitPolicyAudit.builder()
                .benefitPolicyId(policy.getId())
                .eventType("STATUS_CHANGE")
                .oldValue(oldStatus)
                .newValue("SUSPENDED")
                .notes("Policy manually suspended")
                .performedBy("SYSTEM_ADMIN")
                .build());
                
        log.info("✅ Suspended benefit policy: {}", id);

        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    /**
     * Cancel a benefit policy
     */
    @Transactional
    public BenefitPolicyResponseDto cancel(Long id) {
        log.info("Cancelling benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        String oldStatus = policy.getStatus().name();
        policy.setStatus(BenefitPolicyStatus.CANCELLED);
        policy = benefitPolicyRepository.save(policy);
        
        benefitPolicyAuditRepository.save(BenefitPolicyAudit.builder()
                .benefitPolicyId(policy.getId())
                .eventType("STATUS_CHANGE")
                .oldValue(oldStatus)
                .newValue("CANCELLED")
                .notes("Policy manually cancelled")
                .performedBy("SYSTEM_ADMIN")
                .build());
                
        log.info("✅ Cancelled benefit policy: {}", id);

        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE OPERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Soft delete a benefit policy
     */
    @Transactional
    public void delete(Long id) {
        log.info("Deleting benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        // Soft delete
        String oldStatus = policy.getStatus().name();
        policy.setActive(false);
        policy.setStatus(BenefitPolicyStatus.CANCELLED);
        benefitPolicyRepository.save(policy);

        benefitPolicyAuditRepository.save(BenefitPolicyAudit.builder()
                .benefitPolicyId(policy.getId())
                .eventType("DELETED")
                .oldValue(oldStatus)
                .newValue("CANCELLED_DELETED")
                .notes("Policy soft-deleted")
                .performedBy("SYSTEM_ADMIN")
                .build());

        log.info("✅ Soft deleted benefit policy: {}", id);
    }

    /**
     * Restore a soft-deleted benefit policy
     */
    @Transactional
    public BenefitPolicyResponseDto restore(Long id) {
        log.info("Restoring benefit policy: {}", id);

        BenefitPolicy policy = benefitPolicyRepository.findByIdIncludeDeleted(id)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + id));

        // Restore
        policy.setActive(true);
        // Reset to INACTIVE so it doesn't immediately conflict with existing active policies
        policy.setStatus(BenefitPolicyStatus.INACTIVE); 
        
        policy = benefitPolicyRepository.save(policy);
        log.info("✅ Restored benefit policy: {}", id);
        
        return BenefitPolicyResponseDto.fromEntity(policy);
    }

    /**
     * Deep clone a benefit policy including all rules
     */
    @Transactional
    public BenefitPolicyResponseDto clone(Long id, PolicyCloneRequestDto dto) {
        log.info("Cloning benefit policy: {} to new name: {}", id, dto.getNewName());

        BenefitPolicy source = benefitPolicyRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Source policy not found: " + id));

        // 1. Prepare New Policy
        String newName = (dto.getNewName() != null && !dto.getNewName().isBlank()) 
                ? dto.getNewName() : source.getName() + " (Copy)";
        
        Organization targetEmployer = (dto.getTargetEmployerOrgId() != null)
                ? organizationRepository.findById(dto.getTargetEmployerOrgId())
                    .orElseThrow(() -> new BusinessRuleException("Target employer not found"))
                : source.getEmployerOrganization();

        BenefitPolicy clone = BenefitPolicy.builder()
                .name(newName)
                .policyCode(generatePolicyCode())
                .description(source.getDescription())
                .employerOrganization(targetEmployer)
                .insuranceOrganization(source.getInsuranceOrganization())
                .startDate(dto.getStartDate() != null ? dto.getStartDate() : source.getStartDate())
                .endDate(dto.getEndDate() != null ? dto.getEndDate() : source.getEndDate())
                .annualLimit(source.getAnnualLimit())
                .defaultCoveragePercent(source.getDefaultCoveragePercent())
                .perMemberLimit(source.getPerMemberLimit())
                .perFamilyLimit(source.getPerFamilyLimit())
                .defaultWaitingPeriodDays(source.getDefaultWaitingPeriodDays())
                .status(BenefitPolicyStatus.DRAFT) // Always start as DRAFT
                .notes("Cloned from policy ID: " + id)
                .active(true)
                .rules(new java.util.ArrayList<>())
                .build();

        // 2. Clone Rules (Deep Copy)
        if (source.getRules() != null) {
            for (BenefitPolicyRule sourceRule : source.getRules()) {
                if (!sourceRule.isActive()) continue; // Only clone active rules
                
                BenefitPolicyRule clonedRule = BenefitPolicyRule.builder()
                        .benefitPolicy(clone)
                        .medicalCategory(sourceRule.getMedicalCategory())
                        .medicalService(sourceRule.getMedicalService())
                        .coveragePercent(sourceRule.getCoveragePercent())

                        .timesLimit(sourceRule.getTimesLimit())
                        .waitingPeriodDays(sourceRule.getWaitingPeriodDays())
                        .requiresPreApproval(sourceRule.isRequiresPreApproval())
                        .encounterType(sourceRule.getEncounterType())
                        .active(true)
                        .notes(sourceRule.getNotes())
                        .build();
                
                clone.addRule(clonedRule);
            }
        }

        clone = benefitPolicyRepository.save(clone);
        log.info("✅ Policy cloned successfully: {} (New ID: {})", clone.getPolicyCode(), clone.getId());

        // 3. Log Audit
        benefitPolicyAuditRepository.save(BenefitPolicyAudit.builder()
                .benefitPolicyId(clone.getId())
                .eventType("CLONED")
                .oldValue("Source Policy ID: " + id)
                .newValue("New Policy ID: " + clone.getId())
                .notes("Policy deep-cloned from: " + source.getName() + " (" + source.getPolicyCode() + ")")
                .performedBy("SYSTEM_ADMIN")
                .build());

        return BenefitPolicyResponseDto.fromEntity(clone);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAINTENANCE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Auto-expire policies that have passed their end date
     */
    @Transactional
    public int expireOldPolicies() {
        log.info("Running auto-expiration of old policies");
        
        List<BenefitPolicy> expiredPolicies = benefitPolicyRepository.findExpiredActivePolicies(LocalDate.now());
        
        for (BenefitPolicy policy : expiredPolicies) {
            policy.setStatus(BenefitPolicyStatus.EXPIRED);
            benefitPolicyRepository.save(policy);
            log.debug("Auto-expired policy: {} (ID: {})", policy.getName(), policy.getId());
        }
        
        log.info("✅ Auto-expired {} policies", expiredPolicies.size());
        return expiredPolicies.size();
    }

    /**
     * Get policies expiring within N days
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyResponseDto> getPoliciesExpiringSoon(int days) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(days);
        
        return benefitPolicyRepository.findPoliciesExpiringSoon(today, futureDate)
                .stream()
                .map(BenefitPolicyResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate that startDate is before endDate
     */
    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessRuleException("تاريخ البدء وتاريخ الانتهاء مطلوبان");
        }
        if (!startDate.isBefore(endDate)) {
            throw new BusinessRuleException("يجب أن يكون تاريخ البدء قبل تاريخ الانتهاء");
        }
    }

    /**
     * Check if there's an overlapping active policy for the employer
     */
    /**
     * Check for any other active policies and AUTO-DEACTIVATE them.
     * Enforces strictly ONE active policy per employer.
     */
    private void checkOverlappingActivePolicy(Long employerOrgId, LocalDate startDate, LocalDate endDate, Long excludeId) {
        // Find ALL active policies for this employer, regardless of date
        List<BenefitPolicy> activePolicies = benefitPolicyRepository.findByEmployerOrganizationIdAndStatusAndActiveTrue(
                employerOrgId, BenefitPolicyStatus.ACTIVE);
        
        if (!activePolicies.isEmpty()) {
            for (BenefitPolicy conflict : activePolicies) {
                // Skip the current policy we are working on (if it exists)
                if (excludeId != null && conflict.getId().equals(excludeId)) {
                    continue;
                }

                log.info("Auto-deactivating policy '{}' (ID: {}) to DRAFT to enforce single active policy rule", 
                        conflict.getName(), conflict.getId());
                
                // Safety Scenario: Check for pending claims before deactivating
                long pendingClaims = claimRepository.countByStatus(com.waad.tba.modules.claim.entity.ClaimStatus.UNDER_REVIEW);
                if (pendingClaims > 0) {
                    log.warn("⚠️ Policy '{}' has {} pending claims. Moving to DRAFT may affect these claims.", 
                            conflict.getName(), pendingClaims);
                }

                // Requirement: Convert old ACTIVE to DRAFT
                conflict.setStatus(BenefitPolicyStatus.DRAFT);
                benefitPolicyRepository.save(conflict);
            }
        }
    }

    /**
     * Generate a unique policy code in format POL-YYYY-XXX
     * Example: POL-2025-001, POL-2025-002, etc.
     */
    private String generatePolicyCode() {
        int year = LocalDate.now().getYear();
        String yearPrefix = String.format("POL-%d-", year);
        
        // Find the highest existing code for this year
        Optional<String> maxCode = benefitPolicyRepository.findMaxPolicyCodeByYearPrefix(yearPrefix);
        
        int nextSequence = 1;
        if (maxCode.isPresent()) {
            // Extract sequence number from code (e.g., "POL-2025-005" → 5)
            String code = maxCode.get();
            String sequencePart = code.substring(code.lastIndexOf('-') + 1);
            try {
                nextSequence = Integer.parseInt(sequencePart) + 1;
            } catch (NumberFormatException e) {
                log.warn("Failed to parse sequence from policy code: {}, starting from 1", code);
                nextSequence = 1;
            }
        }
        
        // Format: POL-YYYY-XXX (zero-padded to 3 digits)
        String generatedCode = String.format("POL-%d-%03d", year, nextSequence);
        log.debug("Generated policy code: {}", generatedCode);
        return generatedCode;
    }
}
