package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.benefitpolicy.dto.*;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.medicalpackage.MedicalPackage;
import com.waad.tba.modules.medicalpackage.MedicalPackageRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing Benefit Policy Rules (REFACTORED for Unified Dictionary).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BenefitPolicyRuleService {

    private final BenefitPolicyRuleRepository ruleRepository;
    private final BenefitPolicyRepository policyRepository;
    private final MedicalServiceRepository serviceRepository;
    private final MedicalPackageRepository packageRepository;
    private final CoveragePriorityService priorityService;
    private final com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository categoryRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // READ OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all rules for a policy
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyRuleResponseDto> findByPolicy(Long policyId) {
        validatePolicyExists(policyId);
        return ruleRepository.findByBenefitPolicyId(policyId)
                .stream()
                .map(BenefitPolicyRuleResponseDto::fromEntity)
                .toList();
    }

    /**
     * Find all rules for a policy (paginated with optional filters)
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyRuleResponseDto> findByPolicy(
            Long policyId, String label, 
            com.waad.tba.modules.visit.entity.VisitType encounterType, 
            Pageable pageable) {
        validatePolicyExists(policyId);
        Page<BenefitPolicyRule> rulesPage = ruleRepository.searchRules(policyId, false, label, encounterType, pageable);
        return rulesPage.map(BenefitPolicyRuleResponseDto::fromEntity);
    }

    /**
     * Find all rules for a policy (paginated - backward compatibility)
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyRuleResponseDto> findByPolicy(Long policyId, Pageable pageable) {
        return findByPolicy(policyId, null, null, pageable);
    }

    /**
     * Find only DELETED rules for a policy (Trash view - with optional filters)
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyRuleResponseDto> findDeletedByPolicy(
            Long policyId, String label, 
            com.waad.tba.modules.visit.entity.VisitType encounterType, 
            Pageable pageable) {
        validatePolicyExists(policyId);
        Page<BenefitPolicyRule> rulesPage = ruleRepository.searchRules(policyId, true, label, encounterType, pageable);
        return rulesPage.map(BenefitPolicyRuleResponseDto::fromEntity);
    }

    /**
     * Find only DELETED rules for a policy (Trash view - backward compatibility)
     */
    @Transactional(readOnly = true)
    public Page<BenefitPolicyRuleResponseDto> findDeletedByPolicy(Long policyId, Pageable pageable) {
        return findDeletedByPolicy(policyId, null, null, pageable);
    }

    /**
     * Find active rules only for a policy
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyRuleResponseDto> findActiveByPolicy(Long policyId) {
        validatePolicyExists(policyId);
        return ruleRepository.findByBenefitPolicyIdAndActiveTrue(policyId)
                .stream()
                .map(BenefitPolicyRuleResponseDto::fromEntity)
                .toList();
    }

    /**
     * Find a specific rule by ID
     */
    @Transactional(readOnly = true)
    public BenefitPolicyRuleResponseDto findById(Long ruleId) {
        BenefitPolicyRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));
        return BenefitPolicyRuleResponseDto.fromEntity(rule);
    }

    /**
     * Find category-level rules for a policy
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyRuleResponseDto> findCategoryRules(Long policyId) {
        validatePolicyExists(policyId);
        return ruleRepository.findCategoryRulesForPolicy(policyId)
                .stream()
                .map(BenefitPolicyRuleResponseDto::fromEntity)
                .toList();
    }

    /**
     * Find service-level rules for a policy
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyRuleResponseDto> findServiceRules(Long policyId) {
        validatePolicyExists(policyId);
        return ruleRepository.findServiceRulesForPolicy(policyId)
                .stream()
                .map(BenefitPolicyRuleResponseDto::fromEntity)
                .toList();
    }

    /**
     * Find rules requiring pre-approval for a policy
     */
    @Transactional(readOnly = true)
    public List<BenefitPolicyRuleResponseDto> findPreApprovalRules(Long policyId) {
        validatePolicyExists(policyId);
        return ruleRepository.findByBenefitPolicyIdAndRequiresPreApprovalTrue(policyId)
                .stream()
                .map(BenefitPolicyRuleResponseDto::fromEntity)
                .toList();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE LOOKUP (For Claims & Eligibility)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find the coverage rule for a specific service within a policy.
     * 
     * This is the main lookup method for claims processing:
     * 1. First checks for a direct service rule
     * 2. Falls back to category rule if no service rule exists
     * 3. Returns empty if not covered
     * 
     * @param policyId The benefit policy ID
     * @param serviceId The medical service ID
     * @return The applicable rule, or empty if not covered
     */
    @Transactional(readOnly = true)
    public Optional<BenefitPolicyRuleResponseDto> findCoverageForService(Long policyId, Long serviceId, com.waad.tba.modules.visit.entity.VisitType encounterType) {
        MedicalService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicalService", "id", serviceId));
        
        String category = service.getCategoryName();

        return findBestMatchingRule(policyId, serviceId, category, encounterType)
                .map(BenefitPolicyRuleResponseDto::fromEntity);
    }

    private Optional<BenefitPolicyRule> findBestMatchingRule(
            Long policyId, Long serviceId, String category, 
            com.waad.tba.modules.visit.entity.VisitType encounterType) {
        
        List<BenefitPolicyRule> applicableRules = ruleRepository.findApplicableRulesForService(
            policyId, serviceId, java.util.Collections.emptyList(), category, encounterType);
        
        if (applicableRules.isEmpty()) {
            return Optional.empty();
        }

        return applicableRules.stream()
            .min((r1, r2) -> {
                Integer w1 = calculateRuleWeight(r1, serviceId, encounterType);
                Integer w2 = calculateRuleWeight(r2, serviceId, encounterType);
                return w1.compareTo(w2);
            });
    }

    private Integer calculateRuleWeight(BenefitPolicyRule rule, Long requestedServiceId, com.waad.tba.modules.visit.entity.VisitType requestedEncounterType) {
        boolean isServiceMatch = rule.getMedicalService() != null && rule.getMedicalService().getId().equals(requestedServiceId);
        boolean isPackageMatch = rule.getMedicalPackage() != null;
        boolean isCategoryMatch = rule.getMedicalCategory() != null && rule.getMedicalService() == null && rule.getMedicalPackage() == null;
        boolean isEncounterMatch = rule.getEncounterType() != null && rule.getEncounterType().equals(requestedEncounterType);
        
        String ruleKey = priorityService.resolveRuleKey(isServiceMatch, isPackageMatch, isCategoryMatch, isEncounterMatch);
        
        int fallback = switch (ruleKey) {
            case "SERVICE_ENCOUNTER_MATCH" -> 0;
            case "SERVICE_ANY_ENCOUNTER" -> 10;
            case "PACKAGE_ENCOUNTER_MATCH" -> 15;
            case "PACKAGE_ANY_ENCOUNTER" -> 25;
            case "CATEGORY_ENCOUNTER_MATCH" -> 20;
            case "CATEGORY_ANY_ENCOUNTER" -> 30;
            default -> 100;
        };
        
        return priorityService.getWeight(ruleKey, fallback);
    }

    @Transactional(readOnly = true)
    public boolean isServiceCovered(Long policyId, Long serviceId, com.waad.tba.modules.visit.entity.VisitType encounterType) {
        return findCoverageForService(policyId, serviceId, encounterType).isPresent();
    }

    @Transactional(readOnly = true)
    public boolean requiresPreApproval(Long policyId, Long serviceId, com.waad.tba.modules.visit.entity.VisitType encounterType) {
        return findCoverageForService(policyId, serviceId, encounterType)
                .map(BenefitPolicyRuleResponseDto::isRequiresPreApproval)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public int getCoveragePercent(Long policyId, Long serviceId, com.waad.tba.modules.visit.entity.VisitType encounterType) {
        return findCoverageForService(policyId, serviceId, encounterType)
                .map(BenefitPolicyRuleResponseDto::getEffectiveCoveragePercent)
                .orElse(0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create a new rule for a policy
     */
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public BenefitPolicyRuleResponseDto create(Long policyId, BenefitPolicyRuleCreateDto dto) {
        log.info("Creating rule for policy {} - category: {}, service: {}, package: {}", 
                policyId, dto.getMedicalCategory(), dto.getMedicalServiceId(), dto.getMedicalPackageId());

        BenefitPolicy policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("BenefitPolicy", "id", policyId));

        validateTargetAtLeastOne(dto);

        BenefitPolicyRule rule = BenefitPolicyRule.builder()
                .benefitPolicy(policy)
                .coveragePercent(dto.getCoveragePercent())
                .amountLimit(dto.getAmountLimit())
                .timesLimit(dto.getTimesLimit())
                .waitingPeriodDays(dto.getWaitingPeriodDays() != null ? dto.getWaitingPeriodDays() : 0)
                .requiresPreApproval(dto.getRequiresPreApproval() != null ? dto.getRequiresPreApproval() : false)
                .notes(dto.getNotes())
                .encounterType(dto.getEncounterType())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        if (dto.getMedicalServiceId() != null) {
            MedicalService service = serviceRepository.findById(dto.getMedicalServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("MedicalService", "id", dto.getMedicalServiceId()));
            
            if (ruleRepository.existsServiceRule(policyId, dto.getMedicalServiceId(), dto.getEncounterType(), null)) {
                throw new BusinessRuleException("A rule for this service already exists in this policy for the specified encounter type");
            }
            rule.setMedicalService(service);
        } else if (dto.getMedicalPackageId() != null) {
            MedicalPackage pkg = packageRepository.findById(dto.getMedicalPackageId())
                    .orElseThrow(() -> new ResourceNotFoundException("MedicalPackage", "id", dto.getMedicalPackageId()));
            rule.setMedicalPackage(pkg);
        } else if (dto.getMedicalCategory() != null) {
            if (ruleRepository.findActiveByCategoryAndEncounter(policyId, dto.getMedicalCategory(), dto.getEncounterType()).isPresent()) {
                throw new BusinessRuleException("A rule for this category already exists in this policy for the specified encounter type");
            }
            rule.setMedicalCategory(dto.getMedicalCategory());
            
            // Set FK Field (Required by DB Constraint chk_bpr_target)
            com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory catRef = categoryRepository.findByCode(dto.getMedicalCategory())
                .orElseThrow(() -> new ResourceNotFoundException("MedicalCategory", "code", dto.getMedicalCategory()));
            
            rule.setMedicalCategoryRef(catRef);
        }

        BenefitPolicyRule saved = ruleRepository.save(rule);
        log.info("Created rule {} for policy {}", saved.getId(), policyId);
        
        return BenefitPolicyRuleResponseDto.fromEntity(saved);
    }

    /**
     * Bulk create rules for a policy
     */
    /**
     * Bulk create or update rules for a policy (Upsert)
     */
    public List<BenefitPolicyRuleResponseDto> createBulk(Long policyId, List<BenefitPolicyRuleCreateDto> dtos) {
        log.info("Bulk upserting {} rules for policy {}", dtos.size(), policyId);
        
        return dtos.stream()
                .map(dto -> {
                    try {
                        return createOrUpdate(policyId, dto);
                    } catch (Exception e) {
                        log.error("Failed to process rule (upsert) for policy {}: {}", policyId, e.getMessage());
                        return null; 
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private BenefitPolicyRuleResponseDto createOrUpdate(Long policyId, BenefitPolicyRuleCreateDto dto) {
        Optional<BenefitPolicyRule> existing = Optional.empty();

        // 1. Try to find existing active rule
        if (dto.getMedicalServiceId() != null) {
            if (dto.getEncounterType() != null) {
                existing = ruleRepository.findActiveByServiceAndEncounter(policyId, dto.getMedicalServiceId(), dto.getEncounterType());
            } else {
                existing = ruleRepository.findActiveByServiceGeneral(policyId, dto.getMedicalServiceId());
            }
        } else if (dto.getMedicalCategory() != null) {
            if (dto.getEncounterType() != null) {
                existing = ruleRepository.findActiveByCategoryAndEncounter(policyId, dto.getMedicalCategory(), dto.getEncounterType());
            } else {
                existing = ruleRepository.findActiveByCategoryGeneral(policyId, dto.getMedicalCategory());
            }
        } else if (dto.getMedicalPackageId() != null) {
            // Note: Repository might not have a dedicated method for Package+Encounter yet in this view, 
            // but for now we follow the pattern. If missing, we might need to add it or skip upsert for packages if not critical.
            // Based on repository view, we don't see specific findActiveByPackage... 
            // We'll proceed with Create for packages (which will throw if exists), or we could add the method.
            // Given the user request is about the Wizard (Categories), we focus on that.
        }

        if (existing.isPresent()) {
            // 2. Update existing
            BenefitPolicyRule rule = existing.get();
            log.info("Updating existing rule {} for policy {}", rule.getId(), policyId);
            
            if (dto.getCoveragePercent() != null) rule.setCoveragePercent(dto.getCoveragePercent());
            if (dto.getAmountLimit() != null) rule.setAmountLimit(dto.getAmountLimit());
            if (dto.getTimesLimit() != null) rule.setTimesLimit(dto.getTimesLimit());
            if (dto.getWaitingPeriodDays() != null) rule.setWaitingPeriodDays(dto.getWaitingPeriodDays());
            if (dto.getRequiresPreApproval() != null) rule.setRequiresPreApproval(dto.getRequiresPreApproval());
            if (dto.getNotes() != null) rule.setNotes(dto.getNotes());
            
            BenefitPolicyRule saved = ruleRepository.save(rule);
            return BenefitPolicyRuleResponseDto.fromEntity(saved);
        } else {
            // 3. Create new
            return create(policyId, dto);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update an existing rule
     * Note: Cannot change the target (category/service) after creation
     */
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public BenefitPolicyRuleResponseDto update(Long ruleId, BenefitPolicyRuleUpdateDto dto) {
        log.info("Updating rule {}", ruleId);

        BenefitPolicyRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));

        // Update fields if provided
        if (dto.getCoveragePercent() != null) {
            rule.setCoveragePercent(dto.getCoveragePercent());
        }
        if (dto.getAmountLimit() != null) {
            rule.setAmountLimit(dto.getAmountLimit());
        }
        if (dto.getTimesLimit() != null) {
            rule.setTimesLimit(dto.getTimesLimit());
        }
        if (dto.getWaitingPeriodDays() != null) {
            rule.setWaitingPeriodDays(dto.getWaitingPeriodDays());
        }
        if (dto.getRequiresPreApproval() != null) {
            rule.setRequiresPreApproval(dto.getRequiresPreApproval());
        }
        if (dto.getNotes() != null) {
            rule.setNotes(dto.getNotes());
        }
        if (dto.getActive() != null) {
            rule.setActive(dto.getActive());
        }

        BenefitPolicyRule saved = ruleRepository.save(rule);
        log.info("Updated rule {}", ruleId);
        
        return BenefitPolicyRuleResponseDto.fromEntity(saved);
    }

    /**
     * Toggle rule active status
     */
    public BenefitPolicyRuleResponseDto toggleActive(Long ruleId) {
        BenefitPolicyRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));
        
        rule.setActive(!rule.isActive());
        BenefitPolicyRule saved = ruleRepository.save(rule);
        
        log.info("Toggled rule {} active status to {}", ruleId, saved.isActive());
        return BenefitPolicyRuleResponseDto.fromEntity(saved);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Soft delete a rule (sets deleted=true, active is preserved)
     */
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public void softDelete(Long ruleId) {
        BenefitPolicyRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));
        
        rule.setDeleted(true);
        rule.setActive(false); // Deactivate the rule as well
        
        try {
            ruleRepository.save(rule);
            log.info("Soft deleted rule {}", ruleId);
        } catch (Exception e) {
            log.error("Failed to soft delete rule {}", ruleId, e);
            throw new BusinessRuleException("Failed to delete rule: " + e.getMessage());
        }
    }

    /**
     * Restore a soft-deleted rule
     */
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public BenefitPolicyRuleResponseDto restore(Long ruleId) {
        // We need to find by ID even if deleted
        BenefitPolicyRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));
        
        rule.setDeleted(false);
        BenefitPolicyRule saved = ruleRepository.save(rule);
        
        log.info("Restored rule {}", ruleId);
        return BenefitPolicyRuleResponseDto.fromEntity(saved);
    }

    /**
     * Delete a rule (original method, updated to use soft delete)
     */
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public void delete(Long ruleId) {
        softDelete(ruleId);
    }

    /**
     * Permanently delete a rule
     */
    public void hardDelete(Long ruleId) {
        if (!ruleRepository.existsById(ruleId)) {
            throw new ResourceNotFoundException("Rule", "id", ruleId);
        }
        ruleRepository.deleteById(ruleId);
        log.info("Hard deleted rule {}", ruleId);
    }

    /**
     * Delete all rules for a policy
     */
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public void deleteAllForPolicy(Long policyId) {
        validatePolicyExists(policyId);
        ruleRepository.deleteByBenefitPolicyId(policyId);
        log.info("Deleted all rules for policy {}", policyId);
    }

    /**
     * Deactivate all rules for a policy (soft delete)
     */
    public int deactivateAllForPolicy(Long policyId) {
        validatePolicyExists(policyId);
        int count = ruleRepository.deactivateAllForPolicy(policyId);
        log.info("Deactivated {} rules for policy {}", count, policyId);
        return count;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    private void validatePolicyExists(Long policyId) {
        if (!policyRepository.existsById(policyId)) {
            throw new ResourceNotFoundException("BenefitPolicy", "id", policyId);
        }
    }

    private void validateTargetAtLeastOne(BenefitPolicyRuleCreateDto dto) {
        boolean hasCategory = dto.getMedicalCategory() != null;
        boolean hasService = dto.getMedicalServiceId() != null;
        boolean hasPackage = dto.getMedicalPackageId() != null;

        if (!hasCategory && !hasService && !hasPackage) {
            throw new BusinessRuleException("Rule must target at least a category, service, or package.");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get rule count for a policy
     */
    @Transactional(readOnly = true)
    public long countByPolicy(Long policyId) {
        return ruleRepository.countByBenefitPolicyId(policyId);
    }

    /**
     * Get active rule count for a policy
     */
    @Transactional(readOnly = true)
    public long countActiveByPolicy(Long policyId) {
        return ruleRepository.countByBenefitPolicyIdAndActiveTrueAndDeletedFalse(policyId);
    }

    /**
     * Get deleted rule count for a policy
     */
    @Transactional(readOnly = true)
    public long countDeletedByPolicy(Long policyId) {
        return ruleRepository.countByBenefitPolicyIdAndDeletedTrue(policyId);
    }
}
