package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceCreateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceLookupDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceUpdateDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.entity.ReclassificationAudit;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ReclassificationAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing Medical Services (Reference Data).
 * 
 * Business Rules:
 * 1. Code must be unique and immutable
 * 2. Category must exist and be active
 * 3. Base price must be >= 0 (if provided)
 * 4. No coverage, policy, provider, or network logic
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalServiceService {

    private final MedicalServiceRepository serviceRepository;
    private final MedicalCategoryRepository categoryRepository;
    private final com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository benefitPolicyRepository;
    private final com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository benefitPolicyRuleRepository;
    private final com.waad.tba.modules.benefitpolicy.service.BenefitPolicyRuleService benefitPolicyRuleService;
    private final ReclassificationAuditRepository reclassificationAuditRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public MedicalServiceResponseDto create(MedicalServiceCreateDto dto) {
        log.info("Creating medical service: {}", dto.getCode());

        // Validate code uniqueness
        if (serviceRepository.existsByCode(dto.getCode())) {
            throw new BusinessRuleException("Service code already exists: " + dto.getCode());
        }

        // Validate category exists and is active
        MedicalCategory category = categoryRepository.findActiveById(dto.getCategoryId())
                .orElseThrow(() -> new BusinessRuleException("Category not found or inactive: " + dto.getCategoryId()));

        // Validate base price (if provided)
        if (dto.getBasePrice() != null && dto.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleException("Base price must be >= 0");
        }

        // Create entity
        // DEFAULT: requiresPA = false (DEPRECATED - use BenefitPolicyRule.requiresPreApproval instead)
        // Pre-approval requirements are now defined per-policy, not per-service
        MedicalService service = MedicalService.builder()
                .code(dto.getCode())
                .name(dto.getName())
                .nameEn(dto.getNameEn())
                .isMaster(dto.getIsMaster() != null ? dto.getIsMaster() : true)
                .categoryId(dto.getCategoryId())
                .description(dto.getDescription())
                .basePrice(dto.getBasePrice())
                .requiresPA(dto.getRequiresPA() != null ? dto.getRequiresPA() : false)
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        service = serviceRepository.save(service);
        log.info("✅ Created medical service: {} (ID: {})", service.getCode(), service.getId());

        return toDto(service, category);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public MedicalServiceResponseDto findById(Long id) {
        log.debug("Finding medical service by ID: {}", id);
        MedicalService service = serviceRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical service not found: " + id));
        return toDto(service);
    }

    @Transactional(readOnly = true)
    public MedicalServiceResponseDto findByCode(String code) {
        log.debug("Finding medical service by code: {}", code);
        MedicalService service = serviceRepository.findByCode(code)
                .orElseThrow(() -> new BusinessRuleException("Medical service not found: " + code));
        return toDto(service);
    }

    @Transactional(readOnly = true)
    public Page<MedicalServiceResponseDto> findAll(Pageable pageable, Boolean active, Boolean isMaster, String searchTerm) {
        log.debug("Finding medical services by filters: page={}, active={}, isMaster={}, search={}", 
                pageable.getPageNumber(), active, isMaster, searchTerm);
        
        return serviceRepository.findAllByFilters(active, isMaster, searchTerm, pageable)
                .map(this::toDto);
    }

    /**
     * Find all medical services with optional status filter
     * 
     * @param pageable pagination info
     * @param active null = all, true = active only, false = inactive only
     */
    @Transactional(readOnly = true)
    public Page<MedicalServiceResponseDto> findAll(Pageable pageable, Boolean active) {
        log.debug("Finding medical services, page: {}, active filter: {}", pageable.getPageNumber(), active);
        
        Page<MedicalService> services;
        if (active == null) {
            // Optimized find all with categories
            services = serviceRepository.findAllOptimized(pageable);
        } else if (active) {
            // Optimized find active only
            services = serviceRepository.findAllOptimized(pageable); // findAllOptimized already filters for active if using @Where or explicit condition
        } else {
            // Return only inactive services (native bypass)
            services = serviceRepository.findByActiveFalse(pageable);
        }
        
        return services.map(this::toDto);
    }

    /**
     * Get statistics about medical services
     * 
     * @return Map with counts: total, active, inactive
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getStats() {
        long total = serviceRepository.count();
        long active = serviceRepository.countByActiveTrue();
        long inactive = serviceRepository.countByActiveFalse();
        
        return java.util.Map.of(
            "total", total,
            "active", active,
            "inactive", inactive
        );
    }

    /**
     * Get all active medical services (for dropdowns)
     * 
     * @return List of all active services
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "medicalServices")
    public List<MedicalServiceResponseDto> findAllActive() {
        log.debug("Finding all active medical services for dropdown");
        return serviceRepository.findByActiveTrueOrderByCode()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOOKUP (For MedicalServiceSelector Component)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Unified lookup for medical service selection.
     * 
     * ARCHITECTURAL LAW: MedicalService MUST always be represented as:
     *   CODE + NAME + CATEGORY
     * 
     * Features:
     * - Search by: code, nameAr, nameEn, categoryNameAr, categoryNameEn
     * - Optional filter by categoryId
     * - Returns full context for display
     * 
     * @param query Search term (optional)
     * @param categoryId Filter by category (optional)
     * @return List of services with full category context
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "medicalServiceLookups", key = "{#query, #categoryId}", unless = "#result.isEmpty()")
    public List<MedicalServiceLookupDto> lookup(String query, Long categoryId) {
        log.debug("Lookup medical services: query={}, categoryId={}", query, categoryId);
        
        return serviceRepository.lookupServices(query, categoryId)
                .stream()
                .map(p -> MedicalServiceLookupDto.builder()
                        .id(p.getId())
                        .code(p.getCode())
                        .name(p.getName())
                        .categoryId(p.getCategoryId())
                        .categoryName(p.getCategoryName())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MedicalServiceResponseDto> findByCategory(Long categoryId, Pageable pageable) {
        log.debug("Finding services by category: {}", categoryId);
        return serviceRepository.findActiveByCategoryId(categoryId, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<MedicalServiceResponseDto> findServicesRequiringPA(Pageable pageable) {
        log.debug("Finding services requiring PA");
        return serviceRepository.findServicesRequiringPA(pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<MedicalServiceResponseDto> search(
            String searchTerm,
            Long categoryId,
            Boolean requiresPA,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Pageable pageable) {
        
        log.debug("Searching services: term={}, category={}, requiresPA={}, price=[{}, {}]",
                searchTerm, categoryId, requiresPA, minPrice, maxPrice);
        
        return serviceRepository.advancedSearch(searchTerm, categoryId, requiresPA, minPrice, maxPrice, pageable)
                .map(this::toDto);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECLASSIFICATION (Smart Change)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get impact analysis for reclassification.
     * Calculates how many policies might be affected by changing the category.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getReclassificationImpact(Long serviceId, Long newCategoryId) {
        // Simple impact analysis: Count active policies
        // In a real scenario, this would compare coverage/rules between old and new categories
        long activePolicies = benefitPolicyRepository.countByActiveTrue();
        
        // Count existing overrides
        long existingOverrides = benefitPolicyRuleRepository.countByMedicalServiceId(serviceId);
        
        return java.util.Map.of(
            "activePolicies", activePolicies,
            "existingOverrides", existingOverrides,
            "message", "Reclassification will potentially impact " + activePolicies + " active policies."
        );
    }

    /**
     * Reclassify a medical service with a smart coverage strategy.
     */
    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public MedicalServiceResponseDto reclassify(Long id, com.waad.tba.modules.medicaltaxonomy.dto.ReclassifyRequestDto dto) {
        log.info("Reclassifying service {} to category {} with strategy {}", id, dto.getNewClassificationId(), dto.getStrategy());

        MedicalService service = serviceRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical service not found: " + id));

        // 1. Validate New Category
        MedicalCategory newCategory = categoryRepository.findActiveById(dto.getNewClassificationId())
                .orElseThrow(() -> new BusinessRuleException("Category not found or inactive: " + dto.getNewClassificationId()));

        if (newCategory.getId().equals(service.getCategoryId())) {
            throw new BusinessRuleException("Service is already in this category");
        }
        
        Long oldCategoryId = service.getCategoryId();

        // 2. Apply Strategy
        switch (dto.getStrategy()) {
            case "INHERIT":
                applyInheritStrategy(service);
                break;
            case "KEEP_OVERRIDE":
                applyKeepOverrideStrategy(service);
                break;
            case "CUSTOM":
                applyCustomStrategy(service, dto.getCustomCoverage());
                break;
            default:
                throw new BusinessRuleException("Invalid strategy: " + dto.getStrategy());
        }

        // 3. Update Category
        service.setCategoryId(newCategory.getId());
        service = serviceRepository.save(service); // Audited by @EntityListeners
        
        // 4. Log Audit Record
        ReclassificationAudit audit = ReclassificationAudit.builder()
                .serviceId(service.getId())
                .oldCategoryId(oldCategoryId)
                .newCategoryId(newCategory.getId())
                .strategy(dto.getStrategy())
                .reasonCode(dto.getReasonCode())
                .performedBy("SYSTEM_ADMIN") // Placeholder until SecurityContext is integrated
                .build();
        
        reclassificationAuditRepository.save(audit);

        log.info("✅ Service {} reclassified from {} to {} | Strategy: {}", 
                service.getCode(), oldCategoryId, newCategory.getId(), dto.getStrategy());

        return toDto(service, newCategory);
    }

    private void applyInheritStrategy(MedicalService service) {
        // Delete all service-specific rules so it falls back to category rules
        log.info("Strategy INHERIT: Deleting overrides for service {}", service.getId());
        benefitPolicyRuleRepository.deleteByMedicalServiceId(service.getId());
    }

    private void applyKeepOverrideStrategy(MedicalService service) {
        log.info("Strategy KEEP_OVERRIDE: Bulk snapshotting coverage for service {}", service.getId());
        int snapshotsCreated = benefitPolicyRuleRepository.snapshotServiceCoverage(service.getId(), service.getCategoryId());
        log.info("✅ Bulk snapshot complete: Created {} overrides for service {}", snapshotsCreated, service.getId());
    }

    private void applyCustomStrategy(MedicalService service, com.waad.tba.modules.medicaltaxonomy.dto.ReclassifyRequestDto.CustomCoverageDto custom) {
        if (custom == null) {
            throw new BusinessRuleException("Custom coverage details required for CUSTOM strategy");
        }
        
        log.info("Strategy CUSTOM: Applying custom rules to all active policies");
        
        List<com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy> activePolicies = benefitPolicyRepository.findByActiveTrue();
        
        for (var policy : activePolicies) {
            // Check if rule exists
            var existingRule = benefitPolicyRuleRepository.findBestRuleForService(
                policy.getId(), 
                service.getId(), 
                java.util.Collections.emptyList(),
                service.getCategoryId(), 
                null);
            
            com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule ruleToSave;
            
            if (existingRule.isPresent() && existingRule.get().isServiceRule()) {
                // Update existing service rule
                ruleToSave = existingRule.get();
            } else {
                // Create new service rule
                ruleToSave = com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule.builder()
                        .benefitPolicy(policy)
                        .medicalService(service)
                        .active(true)
                        .notes("Auto-generated: Custom Strategy during reclassification")
                        .build();
            }
            
            // Apply custom values
            ruleToSave.setCoveragePercent(custom.getCoveragePercentage());
            ruleToSave.setAmountLimit(custom.getMaxAmount());
            ruleToSave.setTimesLimit(custom.getMaxVisits());
            // Map 'annualLimit' -> maybe amountLimit? The DTO has annualLimit but entity has amountLimit. 
            // Assuming maxAmount is per service, annualLimit is... complicated. 
            // Using maxAmount for amountLimit. Ignoring annualLimit if not supported by entity directly on rule level efficiently.
            
            benefitPolicyRuleRepository.save(ruleToSave);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public MedicalServiceResponseDto update(Long id, MedicalServiceUpdateDto dto) {
        log.info("Updating medical service: {}", id);

        MedicalService service = serviceRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical service not found: " + id));

        // Update fields (only if provided)
        if (dto.getName() != null) {
            service.setName(dto.getName());
        }
        if (dto.getNameEn() != null) {
            service.setNameEn(dto.getNameEn());
        }
        if (dto.getIsMaster() != null) {
            service.setIsMaster(dto.getIsMaster());
        }
        if (dto.getCategoryId() != null) {
            // Validate category exists and is active
            categoryRepository.findActiveById(dto.getCategoryId())
                    .orElseThrow(() -> new BusinessRuleException("Category not found or inactive: " + dto.getCategoryId()));
            service.setCategoryId(dto.getCategoryId());
        }
        if (dto.getBasePrice() != null) {
            if (dto.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessRuleException("Base price must be >= 0");
            }
            service.setBasePrice(dto.getBasePrice());
        }
        if (dto.getDescription() != null) {
            service.setDescription(dto.getDescription());
        }
        if (dto.getRequiresPA() != null) {
            service.setRequiresPA(dto.getRequiresPA());
        }
        if (dto.getActive() != null) {
            service.setActive(dto.getActive());
        }

        service = serviceRepository.save(service);
        log.info("✅ Updated medical service: {}", id);

        return toDto(service);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public void delete(Long id) {
        log.info("Deleting (soft) medical service: {}", id);

        MedicalService service = serviceRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical service not found: " + id));

        // Soft delete (Handled by @SQLDelete on Entity)
        serviceRepository.delete(service);

        log.info("✅ Deleted (soft) medical service: {}", id);
    }

    /**
     * Quick update category only (for inline/table editing)
     * 
     * @param id Service ID
     * @param categoryId New category ID (null to remove category)
     * @return Updated service DTO
     */
    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public MedicalServiceResponseDto updateCategory(Long id, Long categoryId) {
        log.info("Quick update category for service {} to category {}", id, categoryId);

        MedicalService service = serviceRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("الخدمة الطبية غير موجودة: " + id));

        // Validate category if provided
        MedicalCategory category = null;
        if (categoryId != null) {
            category = categoryRepository.findActiveById(categoryId)
                    .orElseThrow(() -> new BusinessRuleException("التصنيف غير موجود أو غير نشط: " + categoryId));
        }

        service.setCategoryId(categoryId);
        service = serviceRepository.save(service);

        log.info("✅ Updated category for service {} to {}", id, categoryId);
        return toDto(service, category);
    }

    /**
     * Bulk update category for multiple services
     * 
     * @param serviceIds List of service IDs
     * @param categoryId New category ID
     * @return Map with updated and failed counts
     */
    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public java.util.Map<String, Object> bulkUpdateCategory(List<Long> serviceIds, Long categoryId) {
        log.info("Bulk update category for {} services to category {}", serviceIds.size(), categoryId);

        // Validate category
        MedicalCategory category = categoryRepository.findActiveById(categoryId)
                .orElseThrow(() -> new BusinessRuleException("التصنيف غير موجود أو غير نشط: " + categoryId));

        int updated = 0;
        int failed = 0;
        List<String> errors = new java.util.ArrayList<>();

        for (Long serviceId : serviceIds) {
            try {
                serviceRepository.findById(serviceId).ifPresentOrElse(
                    service -> {
                        service.setCategoryId(categoryId);
                        serviceRepository.save(service);
                    },
                    () -> errors.add("الخدمة غير موجودة: " + serviceId)
                );
                updated++;
            } catch (Exception e) {
                failed++;
                errors.add("فشل تحديث الخدمة " + serviceId + ": " + e.getMessage());
                log.warn("Failed to update category for service {}: {}", serviceId, e.getMessage());
            }
        }

        log.info("✅ Bulk category update complete: {} updated, {} failed", updated, failed);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("updated", updated);
        result.put("failed", failed);
        result.put("categoryId", categoryId);
        result.put("categoryName", category.getName());
        if (!errors.isEmpty()) {
            result.put("errors", errors);
        }
        return result;
    }

    /**
     * Bulk delete all medical services (soft delete)
     * Sets active = false for all services
     * 
     * @return number of services deactivated
     */
    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public int deactivateAll() {
        log.warn("🔴 BULK DEACTIVATE: Deactivating ALL medical services");
        
        int count = serviceRepository.softDeleteAll();
        
        log.warn("✅ BULK DEACTIVATE: Deactivated {} medical services", count);
        return count;
    }

    /**
     * Bulk activate all medical services
     * Sets active = true for all services
     * 
     * @return number of services activated
     */
    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public int activateAll() {
        log.warn("🟢 BULK ACTIVATE: Activating ALL medical services");
        
        int count = serviceRepository.activateAll();
        
        log.warn("✅ BULK ACTIVATE: Activated {} medical services", count);
        return count;
    }

    /**
     * Permanent delete all medical services
     * ⚠️ WARNING: This is irreversible!
     * 
     * @return number of services permanently deleted
     */
    @Transactional
    @CacheEvict(value = {"medicalServices", "medicalServiceLookups"}, allEntries = true)
    public int permanentDeleteAll() {
        log.warn("🗑️ PERMANENT DELETE: Deleting ALL medical services permanently!");
        
        long count = serviceRepository.count();
        serviceRepository.deleteAll();
        
        log.warn("✅ PERMANENT DELETE: Deleted {} medical services", count);
        return (int) count;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DTO MAPPING
    // ═══════════════════════════════════════════════════════════════════════════

    private MedicalServiceResponseDto toDto(MedicalService service) {
        // Optimized: Use already fetched category if available
        MedicalCategory category = service.getCategory();
        
        if (category == null && service.getCategoryId() != null) {
            log.trace("N+1 Fallback: Fetching category {} for service {}", service.getCategoryId(), service.getId());
            category = categoryRepository.findById(service.getCategoryId()).orElse(null);
        }
        
        return toDto(service, category);
    }

    private MedicalServiceResponseDto toDto(MedicalService service, MedicalCategory category) {
        return MedicalServiceResponseDto.builder()
                .id(service.getId())
                .code(service.getCode())
                .name(service.getName())
                .nameEn(service.getNameEn())
                .isMaster(service.isMaster())
                .categoryId(service.getCategoryId())
                .categoryName(category != null ? category.getName() : null)
                .categoryCode(category != null ? category.getCode() : null)
                .description(service.getDescription())
                .basePrice(service.getBasePrice())
                .requiresPA(service.isRequiresPA())
                .active(service.isActive())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .build();
    }
}
