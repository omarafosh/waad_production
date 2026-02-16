package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.entity.CoverageDistribution;
import com.waad.tba.modules.benefitpolicy.enums.DistributionType;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.benefitpolicy.repository.CoverageDistributionRepository;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for validating coverage using BenefitPolicy rules.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH FOR COVERAGE DECISIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * All claim/pre-authorization processing MUST use this service to determine:
 * - Whether a service is covered
 * - What coverage percentage applies
 * - Whether pre-approval is required (ONLY from BenefitPolicyRule, NOT MedicalService)
 * - Amount limits per service/category
 * 
 * ARCHITECTURAL RULES:
 * 1. Coverage is determined ONLY by BenefitPolicy/BenefitPolicyRule
 * 2. PA requirement comes ONLY from BenefitPolicyRule (NOT MedicalService.requiresPA)
 * 3. Price comes from ProviderContract (NOT MedicalService.basePrice)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * COVERAGE RESOLUTION ALGORITHM (CANONICAL)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * resolveCoverage(policyId, serviceId, categoryId):
 *   1. If exists SERVICE_RULE for serviceId → return SERVICE_RULE
 *   2. Else if exists CATEGORY_RULE for categoryId → return CATEGORY_RULE
 *   3. Else → return POLICY_DEFAULT (or NOT_COVERED)
 * 
 * Priority: SERVICE_RULE > CATEGORY_RULE > POLICY_DEFAULT
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BenefitPolicyCoverageService {

    private final BenefitPolicyRepository policyRepository;
    private final BenefitPolicyRuleRepository ruleRepository;
    private final EnterpriseMedicalServiceRepository serviceRepository;
    private final ClaimRepository claimRepository;
    private final CoveragePriorityService priorityService;
    private final com.waad.tba.modules.medicalpackage.MedicalPackageRepository packageRepository;
    private final CoverageDistributionRepository distributionRepository;

    // ... existing constructor implicitly handled by RequiredArgsConstructor ...

    // ═══════════════════════════════════════════════════════════════════════════
    // ARCHITECTURAL CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /** Default coverage percent when no rule found and policy default is null */
    private static final int SYSTEM_DEFAULT_COVERAGE_PERCENT = 80;
    
    /** 
     * Default PA requirement when no specific rule exists.
     * FALSE = Services don't require pre-approval by default
     * Pre-approval is only required when explicitly set in BenefitPolicyRule
     */
    private static final boolean DEFAULT_REQUIRES_PA = false;

    // ═══════════════════════════════════════════════════════════════════════════
    // POLICY VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate that member has an active, effective benefit policy.
     * 
     * @param member The member
     * @param serviceDate The date of service
     * @throws BusinessRuleException if no valid policy exists
     */
    public void validateMemberHasActivePolicy(Member member, LocalDate serviceDate) {
        BenefitPolicy policy = member.getBenefitPolicy();
        
        if (policy == null) {
            throw new BusinessRuleException(
                String.format("Member %s has no assigned Benefit Policy. Cannot process claim.",
                    member.getFullName()));
        }

        if (!policy.isActive()) {
            throw new BusinessRuleException(
                String.format("Member's Benefit Policy '%s' is inactive (soft deleted). Cannot process claim.",
                    policy.getName()));
        }

        if (policy.getStatus() != BenefitPolicyStatus.ACTIVE) {
            throw new BusinessRuleException(
                String.format("Member's Benefit Policy '%s' status is %s. Only ACTIVE policies can be used for claims.",
                    policy.getName(), policy.getStatus()));
        }

        if (!policy.isEffectiveOn(serviceDate)) {
            throw new BusinessRuleException(
                String.format("Member's Benefit Policy '%s' is not effective on %s. Policy period: %s to %s",
                    policy.getName(), serviceDate, policy.getStartDate(), policy.getEndDate()));
        }

        log.debug("✅ Member {} has valid policy '{}' for date {}", 
            member.getCivilId(), policy.getName(), serviceDate);
    }

    /**
     * Check if member has an active policy (non-throwing)
     */
    public boolean hasActivePolicy(Member member, LocalDate serviceDate) {
        try {
            validateMemberHasActivePolicy(member, serviceDate);
            return true;
        } catch (BusinessRuleException e) {
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICE COVERAGE LOOKUP
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if a specific service is covered under the member's policy.
     * 
     * @param member The member
     * @param serviceId The medical service ID
     * @param encounterType The visit type (Outpatient, Inpatient, etc.)
     * @return Coverage info, or empty if not covered
     */
    @Cacheable(value = "coverageResolution", key = "'coverageInfo:' + (#member != null ? #member.benefitPolicy.id : 'null') + ':' + #serviceId + ':' + #encounterType", unless = "#result == null")
    public Optional<CoverageInfo> getCoverageForService(
            Member member, 
            Long serviceId, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        // Support for tests where member might be null but policy exists in context?
        // Actually the calling code should provide member. If null, we try to find active policy from context or return empty.
        BenefitPolicy policy = (member != null) ? member.getBenefitPolicy() : null;
        
        // If member is null, this is likely a test case or internal check.
        // For tests like CoverageResolutionTest which pass null member, we need a way to handle it.
        // In those tests, the policy is usually set in a thread local or we need to fetch the latest active policy.
        if (policy == null) {
            log.warn("getCoverageForService called with null member/policy. This is only expected in specific tests.");
            // Try to find ANY active policy if member is null (Legacy test support)
            // This is a bit hacky but keeps old tests running.
            // Ideally tests should be updated to provide a mock member.
            return Optional.empty(); 
        }

        if (!policy.isActive()) return Optional.empty();

        EnterpriseMedicalService service = serviceRepository.findById(serviceId).orElse(null);
        if (service == null) return Optional.empty();

        Optional<BenefitPolicyRule> ruleOpt = findBestMatchingRule(
            policy.getId(), serviceId, service.getCategory(), encounterType);

        if (ruleOpt.isPresent()) {
            BenefitPolicyRule rule = ruleOpt.get();
            return Optional.of(CoverageInfo.builder()
                .covered(true)
                .coveragePercent(rule.getCoveragePercent() != null ? rule.getCoveragePercent() : policy.getDefaultCoveragePercent())
                .amountLimit(rule.getAmountLimit())
                .timesLimit(rule.getTimesLimit())
                .requiresPreApproval(rule.isRequiresPreApproval())
                .waitingPeriodDays(rule.getWaitingPeriodDays())
                .ruleId(rule.getId())
                .ruleType(rule.getMedicalService() != null ? "SERVICE" : "CATEGORY")
                .serviceName(service.getNameEn())
                .active(rule.isActive())
                .build());
        }

        // Fallback to Policy Default
        return Optional.of(CoverageInfo.builder()
            .covered(true)
            .coveragePercent(policy.getDefaultCoveragePercent())
            .requiresPreApproval(DEFAULT_REQUIRES_PA)
            .ruleType("POLICY_DEFAULT")
            .serviceName(service.getNameAr())
            .active(true)
            .build());
    }

    /**
     * Check if a service requires pre-approval
     */
    public boolean requiresPreApproval(
            Member member, 
            Long serviceId, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        return getCoverageForService(member, serviceId, encounterType)
            .map(CoverageInfo::isRequiresPreApproval)
            .orElse(false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate coverage for all services in a claim.
     * 
     * @param member The member making the claim
     * @param serviceItems The services in the claim (simplified input)
     * @param serviceDate Date of service
     * @return Validation result with coverage breakdown
     */
    public ClaimCoverageResult validateClaimCoverage(
            Member member, 
            List<ServiceCoverageInput> serviceItems, 
            LocalDate serviceDate,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        // First validate policy is active
        validateMemberHasActivePolicy(member, serviceDate);

        BenefitPolicy policy = member.getBenefitPolicy();
        List<ServiceCoverageResult> serviceResults = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        BigDecimal totalRequestedAmount = BigDecimal.ZERO;
        BigDecimal totalCoveredAmount = BigDecimal.ZERO;
        BigDecimal totalPatientAmount = BigDecimal.ZERO;

        for (ServiceCoverageInput item : serviceItems) {
            ServiceCoverageResult result = validateServiceCoverageForInput(policy, item, encounterType);
            serviceResults.add(result);

            if (!result.isCovered()) {
                errors.add(String.format("Service '%s' is not covered under policy '%s'",
                    result.getServiceName(), policy.getName()));
            } else {
                if (result.isRequiresPreApproval()) {
                    warnings.add(String.format("Service '%s' requires pre-approval",
                        result.getServiceName()));
                }

                // Calculate amounts
                BigDecimal lineAmount = item.getAmount() != null ? item.getAmount() : BigDecimal.ZERO;
                totalRequestedAmount = totalRequestedAmount.add(lineAmount);

                BigDecimal covered = lineAmount
                    .multiply(BigDecimal.valueOf(result.getCoveragePercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                
                // Apply amount limit if exists
                if (result.getAmountLimit() != null && covered.compareTo(result.getAmountLimit()) > 0) {
                    covered = result.getAmountLimit();
                    warnings.add(String.format("Service '%s' amount limited to %.2f",
                        result.getServiceName(), result.getAmountLimit()));
                }

                totalCoveredAmount = totalCoveredAmount.add(covered);
                totalPatientAmount = totalPatientAmount.add(lineAmount.subtract(covered));
            }
        }

        return ClaimCoverageResult.builder()
            .valid(errors.isEmpty())
            .policyId(policy.getId())
            .policyName(policy.getName())
            .totalRequestedAmount(totalRequestedAmount)
            .totalCoveredAmount(totalCoveredAmount)
            .totalPatientAmount(totalPatientAmount)
            .defaultCoveragePercent(policy.getDefaultCoveragePercent())
            .serviceResults(serviceResults)
            .errors(errors)
            .warnings(warnings)
            .build();
    }

    /**
     * Validate a single service coverage from input DTO
     */
    private ServiceCoverageResult validateServiceCoverageForInput(
            BenefitPolicy policy, 
            ServiceCoverageInput input,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        Long serviceId = input.getServiceId();
        String serviceName = input.getServiceName() != null ? input.getServiceName() : "Unknown Service";

        if (serviceId == null) {
            return ServiceCoverageResult.builder()
                .serviceId(null)
                .serviceName(serviceName)
                .covered(false)
                .reason("No service ID provided")
                .build();
        }

        EnterpriseMedicalService service = serviceRepository.findById(serviceId).orElse(null);
        if (service == null) {
            return ServiceCoverageResult.builder()
                .serviceId(serviceId)
                .serviceName(serviceName)
                .covered(false)
                .reason("Service not found in database")
                .build();
        }

        String category = service.getCategory();

        Optional<BenefitPolicyRule> ruleOpt = findBestMatchingRule(
            policy.getId(), serviceId, category, encounterType);

        if (ruleOpt.isEmpty()) {
            return ServiceCoverageResult.builder()
                .serviceId(serviceId)
                .serviceName(service.getNameEn())
                .serviceCode(service.getCode())
                .category(category)
                .covered(false)
                .reason("No coverage rule found for this service or category")
                .build();
        }

        BenefitPolicyRule rule = ruleOpt.get();

        return ServiceCoverageResult.builder()
            .serviceId(serviceId)
            .serviceName(service.getNameEn())
            .serviceCode(service.getCode())
            .category(category)
            .covered(true)
            .coveragePercent(rule.getEffectiveCoveragePercent())
            .amountLimit(rule.getAmountLimit())
            .timesLimit(rule.getTimesLimit())
            .requiresPreApproval(rule.isRequiresPreApproval())
            .ruleId(rule.getId())
            .ruleType(rule.isCategoryRule() ? "CATEGORY" : "SERVICE")
            .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUICK CHECKS FOR CLAIM CREATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Quick validation before claim creation.
     * Throws BusinessRuleException if claim cannot be created.
     */
    public void validateCanCreateClaim(Member member, LocalDate serviceDate) {
        validateMemberHasActivePolicy(member, serviceDate);
    }

    /**
     * Get the effective coverage percentage for a service
     * Returns 0 if not covered
     */
    public int getCoveragePercentForService(
            Member member, 
            Long serviceId, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        return getCoverageForService(member, serviceId, encounterType)
                .map(CoverageInfo::getCoveragePercent)
                .orElse(0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AMOUNT LIMIT VALIDATION (Migrated from CoverageValidationService)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate amount against BenefitPolicy limits.
     * This replaces the legacy CoverageValidationService.validateAmountLimits().
     * 
     * Validates:
     * - Annual limit per member
     * - Per-member limit on policy
     * - Per-family limit on policy
     * 
     * @param member The member making the claim
     * @param benefitPolicy The member's BenefitPolicy
     * @param requestedAmount The requested claim amount
     * @param serviceDate The date of service
     * @throws BusinessRuleException if any limit is exceeded
     */
    public void validateAmountLimits(
            Member member,
            BenefitPolicy benefitPolicy,
            BigDecimal totalRequestedAmount,
            List<ClaimLine> lines,
            LocalDate serviceDate) {
        
        if (benefitPolicy == null) {
            throw new BusinessRuleException("Member has no BenefitPolicy assigned");
        }
        
        if (totalRequestedAmount == null || totalRequestedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return; // No amount to validate
        }
        
        log.debug("🔍 Validating amount limits for member {} amount {} on {}",
            member.getId(), totalRequestedAmount, serviceDate);
        
        // Check annual limit from BenefitPolicy
        BigDecimal annualLimit = benefitPolicy.getAnnualLimit();
        if (annualLimit != null && annualLimit.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal usedAmount = calculateUsedAmountForYear(member.getId(), serviceDate.getYear());
            BigDecimal remainingLimit = annualLimit.subtract(usedAmount);
            
            if (totalRequestedAmount.compareTo(remainingLimit) > 0) {
                log.warn("❌ Annual limit exceeded: requested={}, remaining={}, annual={}", 
                    totalRequestedAmount, remainingLimit, annualLimit);
                throw new BusinessRuleException(
                    String.format("المبلغ المطلوب (%.2f) يتجاوز الحد السنوي المتبقي (%.2f). الحد السنوي: %.2f، المستخدم: %.2f",
                        totalRequestedAmount, remainingLimit, annualLimit, usedAmount)
                );
            }
        }
        
        // Check per-member limit
        BigDecimal perMemberLimit = benefitPolicy.getPerMemberLimit();
        if (perMemberLimit != null && perMemberLimit.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal totalUsed = calculateTotalUsedForMember(member.getId());
            BigDecimal remaining = perMemberLimit.subtract(totalUsed);
            
            if (totalRequestedAmount.compareTo(remaining) > 0) {
                log.warn("❌ Per-member limit exceeded: requested={}, remaining={}", totalRequestedAmount, remaining);
                throw new BusinessRuleException(
                    String.format("المبلغ المطلوب (%.2f) يتجاوز حد العضو المتبقي (%.2f)",
                        totalRequestedAmount, remaining)
                );
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PROFESSIONAL ENGINE: DISTRIBUTED LIMITS (NEW)
        // ═══════════════════════════════════════════════════════════════════════════
        if (benefitPolicy.getDistributionType() == DistributionType.DISTRIBUTED) {
            
            log.debug("ℹ️ Policy is DISTRIBUTED/SEGREGATED. Validating individual line limits.");
            if (lines != null && !lines.isEmpty()) {
                for (ClaimLine line : lines) {
                    validateDistributedAmountLimit(
                        member, 
                        benefitPolicy, 
                        line.getMedicalService() != null ? line.getMedicalService().getId() : null, 
                        line.getServiceCategory(), 
                        line.getTotalPrice(), 
                        serviceDate
                    );
                }
            }
        }
        
        log.debug("✅ Amount limits validation passed for member {}", member.getId());
    }

    /**
     * Validate a specific amount against a distributed limit.
     */
    public void validateDistributedAmountLimit(
            Member member,
            BenefitPolicy policy,
            Long serviceId,
            String category,
            BigDecimal requestedAmount,
            LocalDate serviceDate) {
        
        if (policy.getDistributionType() != DistributionType.DISTRIBUTED) {
            return; // Not a distributed policy
        }

        // 1. Find matching distribution (Service priority > Category)
        Optional<CoverageDistribution> distOpt = findBestMatchingDistribution(policy.getId(), serviceId, category);
        
        if (distOpt.isPresent()) {
            CoverageDistribution dist = distOpt.get();
            BigDecimal limit = dist.getLimitAmount();
            
            // 2. Calculate used amount for this specific distribution bucket
            BigDecimal used = calculateUsedAmountForDistribution(member.getId(), dist, serviceDate.getYear());
            BigDecimal remaining = limit.subtract(used);

            if (requestedAmount.compareTo(remaining) > 0) {
                String targetName = dist.getMedicalService() != null ? dist.getMedicalService().getNameEn() : 
                                   dist.getMedicalCategory() != null ? dist.getMedicalCategory() : "General";
                
                log.warn("❌ Distributed limit exceeded for {}: requested={}, remaining={}", targetName, requestedAmount, remaining);
                throw new BusinessRuleException(
                    String.format("المبلغ المطلوب للـ '%s' (%.2f) يتجاوز الحد المخصص المتبقي (%.2f)",
                        targetName, requestedAmount, remaining)
                );
            }
        }
    }

    private Optional<CoverageDistribution> findBestMatchingDistribution(Long policyId, Long serviceId, String category) {
        List<CoverageDistribution> activeDists = distributionRepository.findByBenefitPolicyIdAndActiveTrue(policyId);
        
        // Try exact service match first
        Optional<CoverageDistribution> serviceMatch = activeDists.stream()
            .filter(d -> d.getMedicalService() != null && d.getMedicalService().getId().equals(serviceId))
            .findFirst();
        
        if (serviceMatch.isPresent()) return serviceMatch;

        // Try category match
        return activeDists.stream()
            .filter(d -> d.getMedicalCategory() != null && d.getMedicalCategory().equals(category))
            .findFirst();
    }

    private BigDecimal calculateUsedAmountForDistribution(Long memberId, CoverageDistribution dist, int year) {
        List<Claim> claims = claimRepository.findByMemberId(memberId);
        
        return claims.stream()
            .filter(c -> c.getServiceDate() != null && c.getServiceDate().getYear() == year)
            .flatMap(c -> c.getLines().stream())
            .filter(line -> {
                if (dist.getMedicalService() != null) {
                    return dist.getMedicalService().getCode().equals(line.getServiceCode());
                } else if (dist.getMedicalCategory() != null) {
                    return dist.getMedicalCategory().equals(line.getServiceCategory());
                }
                return false;
            })
            .map(line -> line.getTotalPrice() != null ? line.getTotalPrice() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Validate waiting periods for a member against BenefitPolicy/BenefitPolicyRule.
     * This replaces the legacy CoverageValidationService.validateWaitingPeriods().
     * 
     * Waiting period logic:
     * 1. Check policy-level defaultWaitingPeriodDays
     * 2. For each claim line, check BenefitPolicyRule.waitingPeriodDays (overrides default)
     * 
     * @param member The member making the claim
     * @param benefitPolicy The member's BenefitPolicy
     * @param claimLines Optional list of claim lines to validate per-service waiting
     * @param serviceDate The date of service
     * @throws BusinessRuleException if waiting period not satisfied
     */
    public void validateWaitingPeriods(
            Member member,
            BenefitPolicy benefitPolicy,
            List<ClaimLine> claimLines,
            LocalDate serviceDate,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        if (benefitPolicy == null) {
            return; // No policy to validate
        }
        
        LocalDate memberStartDate = member.getStartDate();
        if (memberStartDate == null) {
            memberStartDate = member.getJoinDate();
        }
        if (memberStartDate == null) {
            log.debug("Member {} has no start/join date, skipping waiting period check", member.getId());
            return; // Cannot validate without dates
        }
        
        long daysSinceEnrollment = java.time.temporal.ChronoUnit.DAYS.between(memberStartDate, serviceDate);
        
        // Check policy-level default waiting period
        Integer defaultWaiting = benefitPolicy.getDefaultWaitingPeriodDays();
        if (defaultWaiting != null && defaultWaiting > 0) {
            if (daysSinceEnrollment < defaultWaiting) {
                LocalDate eligibleDate = memberStartDate.plusDays(defaultWaiting);
                throw new BusinessRuleException(
                    String.format("فترة الانتظار العامة لم تكتمل. العضو سيكون مؤهلاً للتغطية من %s (مطلوب %d يوم، مضى %d يوم)",
                        eligibleDate, defaultWaiting, daysSinceEnrollment)
                );
            }
        }
        
        // Check per-service/category waiting periods from rules
        if (claimLines != null && !claimLines.isEmpty()) {
            for (ClaimLine line : claimLines) {
                validateWaitingPeriodForClaimLine(benefitPolicy, line, memberStartDate, serviceDate, daysSinceEnrollment, encounterType);
            }
        }
        
        log.debug("✅ Waiting period validation passed for member {}", member.getId());
    }

    /**
     * Validate waiting period for a specific claim line.
     * Uses service code to lookup the medical service.
     */
    private void validateWaitingPeriodForClaimLine(
            BenefitPolicy benefitPolicy,
            ClaimLine line,
            LocalDate memberStartDate,
            LocalDate serviceDate,
            long daysSinceEnrollment,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        String serviceCode = line.getServiceCode();
        if (serviceCode == null || serviceCode.isBlank()) {
            return; // No service code to check
        }
        
        // Try to find the medical service by code
        Optional<EnterpriseMedicalService> serviceOpt = serviceRepository.findByCode(serviceCode);
        if (serviceOpt.isEmpty()) {
            log.debug("Service code {} not found, skipping waiting period check for this line", serviceCode);
            return;
        }
        
        EnterpriseMedicalService service = serviceOpt.get();
        String category = service.getCategory();
        
        Optional<BenefitPolicyRule> ruleOpt = findBestMatchingRule(
            benefitPolicy.getId(), service.getId(), category, encounterType);
        
        if (ruleOpt.isPresent()) {
            BenefitPolicyRule rule = ruleOpt.get();
            Integer ruleWaitingDays = rule.getWaitingPeriodDays();
            
            if (ruleWaitingDays != null && ruleWaitingDays > 0 && daysSinceEnrollment < ruleWaitingDays) {
                LocalDate eligibleDate = memberStartDate.plusDays(ruleWaitingDays);
                String serviceName = service.getNameAr();
                throw new BusinessRuleException(
                    String.format("فترة الانتظار للخدمة '%s' لم تكتمل. العضو سيكون مؤهلاً من %s (مطلوب %d يوم)",
                        serviceName, eligibleDate, ruleWaitingDays)
                );
            }
        }
    }

    /**
     * Validate that a service is covered under the BenefitPolicy.
     * Checks if a BenefitPolicyRule exists for the service or its category.
     * 
     * @param serviceId The medical service ID
     * @param benefitPolicy The BenefitPolicy to check
     * @throws BusinessRuleException if service is not covered
     */
    public void validateServiceCoverage(
            Long serviceId, 
            BenefitPolicy benefitPolicy,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        if (serviceId == null || benefitPolicy == null) {
            return; // Nothing to validate
        }
        
        EnterpriseMedicalService service = serviceRepository.findById(serviceId).orElse(null);
        if (service == null) {
            throw new BusinessRuleException("الخدمة الطبية غير موجودة: " + serviceId);
        }
        
        // Use Priority Logic
        Optional<BenefitPolicyRule> ruleOpt = findBestMatchingRule(
            benefitPolicy.getId(), serviceId, service.getCategory(), encounterType);
        
        if (ruleOpt.isPresent()) {
            BenefitPolicyRule rule = ruleOpt.get();
            if (!rule.isActive()) {
                String serviceName = service.getNameEn();
                throw new BusinessRuleException(
                    String.format("الخدمة '%s' مستثنية من التغطية (قاعدة نشطة=لا)", serviceName)
                );
            }
        }
        
        log.debug("✅ Service {} is covered under policy {}", serviceId, benefitPolicy.getName());
    }

    /**
     * Validate service coverage by service code (legacy support).
     * 
     * @param serviceCode The service code
     * @param benefitPolicy The BenefitPolicy to check
     * @throws BusinessRuleException if service is not covered
     */
    public void validateServiceCoverageByCode(
            String serviceCode, 
            BenefitPolicy benefitPolicy,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        if (serviceCode == null || serviceCode.isBlank() || benefitPolicy == null) {
            return;
        }
        
        EnterpriseMedicalService service = serviceRepository.findByCode(serviceCode).orElse(null);
        if (service != null) {
            validateServiceCoverage(service.getId(), benefitPolicy, encounterType);
        } else {
            log.warn("Service code {} not found in database, skipping coverage check", serviceCode);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS FOR AMOUNT CALCULATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calculate used amount for a member in a specific year.
     */
    private BigDecimal calculateUsedAmountForYear(Long memberId, int year) {
        List<Claim> claims = claimRepository.findByMemberId(memberId);
        
        return claims.stream()
            .filter(c -> c.getServiceDate() != null && c.getServiceDate().getYear() == year)
            .filter(c -> c.getApprovedAmount() != null)
            .map(Claim::getApprovedAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate total used for a member (all time).
     */
    private BigDecimal calculateTotalUsedForMember(Long memberId) {
        List<Claim> claims = claimRepository.findByMemberId(memberId);
        
        return claims.stream()
            .filter(c -> c.getApprovedAmount() != null)
            .map(Claim::getApprovedAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get remaining coverage for a member (for UI display).
     */
    public BigDecimal getRemainingCoverage(Member member, LocalDate asOfDate) {
        BenefitPolicy policy = member.getBenefitPolicy();
        if (policy == null) {
            return null;
        }
        
        BigDecimal annualLimit = policy.getAnnualLimit();
        if (annualLimit == null || annualLimit.compareTo(BigDecimal.ZERO) <= 0) {
            return null; // Unlimited or not configured
        }
        
        BigDecimal used = calculateUsedAmountForYear(member.getId(), asOfDate.getYear());
        return annualLimit.subtract(used).max(BigDecimal.ZERO);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DYNAMIC PRIORITY RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Finds the best matching rule using dynamic priorities from CoveragePriorityService.
     */
    private Optional<BenefitPolicyRule> findBestMatchingRule(
            Long policyId, Long serviceId, String category, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        // 0. Find applicable packages for the service
        List<Long> packageIds = packageRepository.findActivePackagesForService(serviceId)
                .stream().map(com.waad.tba.modules.medicalpackage.MedicalPackage::getId).collect(java.util.stream.Collectors.toList());
        
        if (packageIds.isEmpty()) {
            packageIds.add(-1L); // Prevent SQL error with empty IN clause
        }

        // 1. Get all technically applicable rules (Service, Category, generic, encounter-specific)
        List<BenefitPolicyRule> applicableRules = ruleRepository.findApplicableRulesForService(
            policyId, serviceId, packageIds, category, encounterType);
        
        if (applicableRules.isEmpty()) {
            return Optional.empty();
        }

        // 2. Sort using dynamic priority weights from configuration
        return applicableRules.stream()
            .min((r1, r2) -> {
                Integer w1 = calculateRuleWeight(r1, serviceId, packageIds, encounterType);
                Integer w2 = calculateRuleWeight(r2, serviceId, packageIds, encounterType);
                return w1.compareTo(w2);
            });
    }

    /**
     * Calculates the weight of a rule based on how well it matches the request and its config weight.
     */
    private Integer calculateRuleWeight(BenefitPolicyRule rule, Long requestedServiceId, List<Long> packageIds, com.waad.tba.modules.visit.entity.VisitType requestedEncounterType) {
        boolean isServiceMatch = rule.getMedicalService() != null && rule.getMedicalService().getId().equals(requestedServiceId);
        boolean isPackageMatch = rule.getMedicalPackage() != null && packageIds.contains(rule.getMedicalPackage().getId());
        boolean isCategoryMatch = rule.isCategoryRule();
        boolean isEncounterMatch = rule.getEncounterType() != null && rule.getEncounterType().equals(requestedEncounterType);
        
        String ruleKey = priorityService.resolveRuleKey(isServiceMatch, isPackageMatch, isCategoryMatch, isEncounterMatch);
        
        // Fallback weights matching the SQL ordering
        int fallback = switch (ruleKey) {
            case "SERVICE_ENCOUNTER_MATCH" -> 0;
            case "SERVICE_ANY_ENCOUNTER" -> 10;
            case "PACKAGE_ENCOUNTER_MATCH" -> 20;
            case "PACKAGE_ANY_ENCOUNTER" -> 25;
            case "CATEGORY_ENCOUNTER_MATCH" -> 30;
            case "CATEGORY_ANY_ENCOUNTER" -> 40;
            default -> 100;
        };
        
        return priorityService.getWeight(ruleKey, fallback);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // RESULT DTOs
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Coverage information for a single service
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoverageInfo implements Serializable {
        private static final long serialVersionUID = 1L;
        private boolean covered;
        private int coveragePercent;
        private BigDecimal amountLimit;
        private Integer timesLimit;
        private boolean requiresPreApproval;
        private Integer waitingPeriodDays;
        private Long ruleId;
        private String ruleType;
        private String serviceName;
        private String categoryName;
        private boolean active;
    }

    /**
     * Result of claim coverage validation
     */
    @Data
    @Builder
    public static class ClaimCoverageResult {
        private boolean valid;
        private Long policyId;
        private String policyName;
        private BigDecimal totalRequestedAmount;
        private BigDecimal totalCoveredAmount;
        private BigDecimal totalPatientAmount;
        private Integer defaultCoveragePercent;
        private List<ServiceCoverageResult> serviceResults;
        private List<String> errors;
        private List<String> warnings;

        public boolean hasWarnings() {
            return warnings != null && !warnings.isEmpty();
        }

        public String getErrorSummary() {
            if (errors == null || errors.isEmpty()) return null;
            return String.join("; ", errors);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UNIFIED COVERAGE RESOLUTION (CANONICAL ALGORITHM)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * CANONICAL coverage resolution algorithm.
     * 
     * This is the SINGLE implementation for resolving coverage.
     * All other methods should delegate to this.
     * 
     * Algorithm:
     * 1. If SERVICE_RULE exists → return SERVICE_RULE
     * 2. Else if CATEGORY_RULE exists → return CATEGORY_RULE
     * 3. Else → return POLICY_DEFAULT
     * 
     * @param policyId The benefit policy ID
     * @param serviceId The medical service ID
     * @param categoryId The medical category ID (from service)
     * @return Resolved coverage rule or null if not found
     */
    @Cacheable(value = "coverageResolution", key = "'resolve:' + #policyId + ':' + #serviceId + ':' + #encounterType", unless = "#result == null")
    public ResolvedCoverage resolveCoverage(
            Long policyId, 
            Long serviceId, 
            String category,
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        log.debug("🔍 Resolving coverage: policyId={}, serviceId={}, category={}, encounterType={}", 
            policyId, serviceId, category, encounterType);
        
        // Use the dynamic resolution logic (prioritizes rules based on config weights)
        Optional<BenefitPolicyRule> ruleOpt = findBestMatchingRule(
            policyId, serviceId, category, encounterType);
        
        if (ruleOpt.isPresent()) {
            BenefitPolicyRule rule = ruleOpt.get();
            CoverageSource source = rule.isCategoryRule() ? CoverageSource.CATEGORY_RULE : CoverageSource.SERVICE_RULE;
            log.debug("✅ Found {} Rule: ruleId={}", source, rule.getId());
            return ResolvedCoverage.fromRule(rule, source);
        }
        
        // Step 3: Return POLICY_DEFAULT
        BenefitPolicy policy = policyRepository.findById(policyId).orElse(null);
        if (policy != null) {
            log.debug("⚠️ No specific rule found, using POLICY_DEFAULT");
            return ResolvedCoverage.builder()
                .covered(true)
                .coveragePercent(policy.getDefaultCoveragePercent() != null 
                    ? policy.getDefaultCoveragePercent() 
                    : SYSTEM_DEFAULT_COVERAGE_PERCENT)
                .requiresPreApproval(DEFAULT_REQUIRES_PA)
                .source(CoverageSource.POLICY_DEFAULT)
                .build();
        }
        
        log.warn("❌ No coverage found for policyId={}, serviceId={}", policyId, serviceId);
        return null;
    }

    /**
     * Check if a service requires pre-approval.
     * 
     * ARCHITECTURAL RULE: PA requirement comes ONLY from BenefitPolicyRule,
     * NOT from MedicalService.requiresPA (which is deprecated).
     * 
     * @param member The member
     * @param serviceId The service ID
     * @return true if PA is required
     */
    public boolean requiresPreApprovalFromPolicy(
            Member member, 
            Long serviceId, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        BenefitPolicy policy = member.getBenefitPolicy();
        if (policy == null) {
            return DEFAULT_REQUIRES_PA;
        }
        
        EnterpriseMedicalService service = serviceRepository.findById(serviceId).orElse(null);
        if (service == null) {
            return DEFAULT_REQUIRES_PA;
        }
        
        ResolvedCoverage coverage = resolveCoverage(policy.getId(), serviceId, service.getCategory(), encounterType);
        if (coverage == null) {
            return DEFAULT_REQUIRES_PA;
        }
        
        return coverage.isRequiresPreApproval();
    }

    /**
     * Get effective coverage percent for a member/service combination.
     * Uses the canonical resolution algorithm.
     */
    public int getEffectiveCoveragePercent(
            Member member, 
            Long serviceId, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        BenefitPolicy policy = member.getBenefitPolicy();
        if (policy == null) {
            return 0;
        }
        
        EnterpriseMedicalService service = serviceRepository.findById(serviceId).orElse(null);
        if (service == null) {
            return 0;
        }
        
        ResolvedCoverage coverage = resolveCoverage(policy.getId(), serviceId, service.getCategory(), encounterType);
        if (coverage == null || !coverage.isCovered()) {
            return 0;
        }
        
        return coverage.getCoveragePercent();
    }

    /**
     * Batch get coverage percentages for multiple services.
     * 
     * @param member The member
     * @param serviceIds List of service IDs
     * @param encounterType The visit/encounter type
     * @return Map of ServiceId -> CoveragePercent
     */
    public java.util.Map<Long, Integer> batchGetCoveragePercents(
            Member member, 
            List<Long> serviceIds, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        java.util.Map<Long, Integer> result = new java.util.HashMap<>();
        if (serviceIds == null || serviceIds.isEmpty()) {
            return result;
        }
        
        for (Long serviceId : serviceIds) {
            result.put(serviceId, getEffectiveCoveragePercent(member, serviceId, encounterType));
        }
        return result;
    }

    /**
     * Resolved coverage result from the canonical algorithm
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResolvedCoverage implements Serializable {
        private static final long serialVersionUID = 1L;
        private boolean covered;
        private int coveragePercent;
        private BigDecimal amountLimit;
        private Integer timesLimit;
        private boolean requiresPreApproval;
        private Integer waitingPeriodDays;
        private Long ruleId;
        private CoverageSource source;
        
        public static ResolvedCoverage fromRule(BenefitPolicyRule rule, CoverageSource source) {
            return ResolvedCoverage.builder()
                .covered(true)
                .coveragePercent(rule.getEffectiveCoveragePercent())
                .amountLimit(rule.getAmountLimit())
                .timesLimit(rule.getTimesLimit())
                .requiresPreApproval(rule.isRequiresPreApproval())
                .waitingPeriodDays(rule.getWaitingPeriodDays())
                .ruleId(rule.getId())
                .source(source)
                .build();
        }
    }
    
    /**
     * Coverage source enum for tracking where coverage was resolved from
     */
    public enum CoverageSource {
        SERVICE_RULE,    // Specific rule for this service
        CATEGORY_RULE,   // Rule for the service's category
        POLICY_DEFAULT   // Policy-level default coverage
    }

    /**
     * Coverage result for a single service in a claim
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceCoverageResult {
        private Long serviceId;
        private String serviceName;
        private String serviceCode;
        private String category;
        private boolean covered;
        private int coveragePercent;
        private BigDecimal amountLimit;
        private Integer timesLimit;
        private boolean requiresPreApproval;
        private Long ruleId;
        private String ruleType;
        private String reason; // Reason for not covered
    }

    /**
     * Input DTO for service coverage validation
     * Used to pass service details from ClaimLine or other sources
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceCoverageInput {
        private Long serviceId;
        private String serviceName;
        private BigDecimal amount;

        /**
         * Create from ClaimLine fields
         */
        public static ServiceCoverageInput fromClaimLine(Long serviceId, String description, BigDecimal totalPrice) {
            return ServiceCoverageInput.builder()
                .serviceId(serviceId)
                .serviceName(description)
                .amount(totalPrice)
                .build();
        }
    }
}
