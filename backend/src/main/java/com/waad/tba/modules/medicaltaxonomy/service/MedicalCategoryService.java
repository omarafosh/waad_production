package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalCategoryCreateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalCategoryResponseDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalCategoryUpdateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ServiceCategoryMappingRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.ServiceCategoryMapping;
import com.waad.tba.modules.medicaltaxonomy.dto.ServiceCategoryMappingDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing Medical Categories (Reference Data).
 * 
 * Business Rules:
 * 1. Code must be unique and immutable
 * 2. Parent category must exist and be active
 * 3. Cannot create circular references
 * 4. Cannot delete category with active services
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalCategoryService {

    private final MedicalCategoryRepository categoryRepository;
    private final MedicalServiceRepository serviceRepository;
    private final ServiceCategoryMappingRepository mappingRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public MedicalCategoryResponseDto create(MedicalCategoryCreateDto dto) {
        log.info("Creating medical category: {}", dto.getCode());

        // Validate code uniqueness
        if (categoryRepository.existsByCode(dto.getCode())) {
            throw new BusinessRuleException("Category code already exists: " + dto.getCode());
        }

        // Validate parent category (if provided)
        String parentName = null;
        if (dto.getParentId() != null) {
            MedicalCategory parent = categoryRepository.findActiveById(dto.getParentId())
                    .orElseThrow(() -> new BusinessRuleException("Parent category not found or inactive: " + dto.getParentId()));
            parentName = parent.getName();
        }

        // Create entity
        MedicalCategory category = MedicalCategory.builder()
                .code(dto.getCode())
                .name(dto.getName())
                .parentId(dto.getParentId())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        category = categoryRepository.save(category);
        log.info("✅ Created medical category: {} (ID: {})", category.getCode(), category.getId());

        return toDto(category, parentName);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public MedicalCategoryResponseDto findById(Long id) {
        log.debug("Finding medical category by ID: {}", id);
        MedicalCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + id));
        return toDto(category);
    }

    @Transactional(readOnly = true)
    public MedicalCategoryResponseDto findByCode(String code) {
        log.debug("Finding medical category by code: {}", code);
        MedicalCategory category = categoryRepository.findByCode(code)
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + code));
        return toDto(category);
    }

    @Transactional(readOnly = true)
    public Page<MedicalCategoryResponseDto> findAll(Pageable pageable) {
        log.debug("Finding all medical categories, page: {}", pageable.getPageNumber());
        return categoryRepository.findAll(pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<MedicalCategoryResponseDto> findAll(Pageable pageable, Long parentId) {
        log.debug("Finding all medical categories, page: {}, parentId: {}", pageable.getPageNumber(), parentId);
        if (parentId != null) {
            return categoryRepository.findByParentId(parentId, pageable)
                    .map(this::toDto);
        }
        return categoryRepository.findAll(pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<MedicalCategoryResponseDto> findRootCategories() {
        log.debug("Finding root categories");
        return categoryRepository.findRootCategories().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MedicalCategoryResponseDto> findChildren(Long parentId) {
        log.debug("Finding children of category: {}", parentId);
        return categoryRepository.findActiveChildrenByParentId(parentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MedicalCategoryResponseDto> findAllList() {
        log.debug("Finding all active categories");
        return categoryRepository.findByActiveTrue().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MedicalCategoryResponseDto> getCategoryTree() {
        log.debug("Building category tree");
        
        // Get all active categories
        List<MedicalCategory> allCategories = categoryRepository.findByActiveTrue();
        
        // Build parent map for efficient lookup
        Map<Long, String> parentNames = allCategories.stream()
                .collect(Collectors.toMap(MedicalCategory::getId, MedicalCategory::getName));
        
        // Convert to DTOs
        List<MedicalCategoryResponseDto> allDtos = allCategories.stream()
                .map(cat -> toDto(cat, parentNames.get(cat.getParentId())))
                .collect(Collectors.toList());
        
        // Build hierarchy
        Map<Long, List<MedicalCategoryResponseDto>> childrenMap = allDtos.stream()
                .filter(dto -> dto.getParentId() != null)
                .collect(Collectors.groupingBy(MedicalCategoryResponseDto::getParentId));
        
        // Attach children to parents
        allDtos.forEach(dto -> {
            dto.setChildren(childrenMap.getOrDefault(dto.getId(), new ArrayList<>()));
        });
        
        // Return only root categories
        return allDtos.stream()
                .filter(dto -> dto.getParentId() == null)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public MedicalCategoryResponseDto update(Long id, MedicalCategoryUpdateDto dto) {
        log.info("Updating medical category: {}", id);

        MedicalCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + id));

        // Update fields (only if provided)
        if (dto.getName() != null) {
            category.setName(dto.getName());
        }
        if (dto.getParentId() != null) {
            // Validate parent category exists and is active
            categoryRepository.findActiveById(dto.getParentId())
                    .orElseThrow(() -> new BusinessRuleException("Parent category not found or inactive: " + dto.getParentId()));
            
            // Prevent circular reference
            if (dto.getParentId().equals(id)) {
                throw new BusinessRuleException("Category cannot be its own parent");
            }
            
            category.setParentId(dto.getParentId());
        }
        if (dto.getActive() != null) {
            category.setActive(dto.getActive());
        }

        category = categoryRepository.save(category);
        log.info("✅ Updated medical category: {}", id);

        return toDto(category);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void delete(Long id) {
        log.info("Deleting (soft) medical category: {}", id);

        MedicalCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + id));

        // Check if category has active services
        long serviceCount = serviceRepository.countActiveByCategoryId(id);
        if (serviceCount > 0) {
            throw new BusinessRuleException("Cannot delete category with active services: " + serviceCount + " services found");
        }

        // Soft delete
        category.setActive(false);
        categoryRepository.save(category);

        log.info("✅ Deleted (soft) medical category: {}", id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<MedicalCategoryResponseDto> search(String searchTerm) {
        log.debug("Searching categories: {}", searchTerm);
        return categoryRepository.searchByName(searchTerm).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEDICAL SERVICES BY CATEGORY (CANONICAL)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all active medical services belonging to a specific category.
     * 
     * ARCHITECTURAL LAW:
     * This method is the canonical way to retrieve services for selection.
     * Services MUST be filtered by category before selection.
     * 
     * @param categoryId The category ID
     * @return List of services with category info populated
     */
    @Transactional(readOnly = true)
    public List<MedicalServiceResponseDto> findServicesByCategory(Long categoryId) {
        return findServicesByCategory(categoryId, null);
    }

    /**
     * Find services by category and optional context.
     * Updated to use multi-category mapping table.
     */
    @Transactional(readOnly = true)
    public List<MedicalServiceResponseDto> findServicesByCategory(Long categoryId, String context) {
        log.debug("Finding services for category: {} (context: {})", categoryId, context);
        
        // Get category info
        MedicalCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + categoryId));
        
        // Get all services in this category via the new many-to-many junction
        List<MedicalService> services = serviceRepository.findActiveByCategoryIdInMultiMapping(categoryId, context);
        
        // Convert to DTOs
        return services.stream()
                .map(this::toServiceResponseDto)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-CATEGORY MANAGEMENT (NEW 2026-02-18)
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public void addCategoryToService(Long serviceId, Long categoryId, boolean isPrimary, String context) {
        log.info("Adding category {} to service {} (context: {})", categoryId, serviceId, context);
        
        MedicalService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new BusinessRuleException("Medical service not found: " + serviceId));
        
        MedicalCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + categoryId));

        // Check for existing mapping
        mappingRepository.findByServiceIdAndCategoryIdAndContext(serviceId, categoryId, context)
                .ifPresent(m -> { throw new BusinessRuleException("Mapping already exists for this context"); });

        // If setting as primary, unset other primaries for this service
        if (isPrimary) {
            mappingRepository.findByServiceIdAndIsPrimaryTrue(serviceId)
                .ifPresent(m -> { m.setPrimary(false); mappingRepository.save(m); });
        }

        ServiceCategoryMapping mapping = ServiceCategoryMapping.builder()
                .service(service)
                .category(category)
                .isPrimary(isPrimary)
                .context(context != null ? context : "ANY")
                .build();

        mappingRepository.save(mapping);
        
        // Update legacy field for backward compatibility if primary
        if (isPrimary) {
            service.setCategoryId(categoryId);
            service.setCategoryName(category.getName());
            serviceRepository.save(service);
        }
    }

    @Transactional
    public void removeCategoryFromService(Long serviceId, Long categoryId, String context) {
        log.info("Removing category {} from service {} (context: {})", categoryId, serviceId, context);
        
        ServiceCategoryMapping mapping = mappingRepository.findByServiceIdAndCategoryIdAndContext(serviceId, categoryId, context)
                .orElseThrow(() -> new BusinessRuleException("Mapping not found"));

        if (mapping.isPrimary()) {
            throw new BusinessRuleException("Cannot remove primary category mapping. Set another category as primary first.");
        }

        mappingRepository.delete(mapping);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DTO MAPPING
    // ═══════════════════════════════════════════════════════════════════════════

    private MedicalCategoryResponseDto toDto(MedicalCategory category) {
        return toDto(category, null);
    }

    private MedicalCategoryResponseDto toDto(MedicalCategory category, String parentName) {
        if (parentName == null && category.getParentId() != null) {
            parentName = categoryRepository.findById(category.getParentId())
                    .map(MedicalCategory::getName)
                    .orElse(null);
        }

        return MedicalCategoryResponseDto.builder()
                .id(category.getId())
                .code(category.getCode())
                .name(category.getName())
                .parentId(category.getParentId())
                .parentName(parentName)
                .serviceCount((int) serviceRepository.countActiveByCategoryId(category.getId()))
                .active(category.isActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
    
    /**
     * Convert MedicalService entity to DTO with all category mappings.
     */
    private MedicalServiceResponseDto toServiceResponseDto(MedicalService service) {
        List<ServiceCategoryMappingDto> mappingDtos = service.getCategoryMappings().stream()
                .map(m -> ServiceCategoryMappingDto.builder()
                        .categoryId(m.getCategory().getId())
                        .categoryCode(m.getCategory().getCode())
                        .categoryName(m.getCategory().getName())
                        .isPrimary(m.isPrimary())
                        .context(m.getContext())
                        .build())
                .collect(Collectors.toList());

        ServiceCategoryMappingDto primary = mappingDtos.stream()
                .filter(ServiceCategoryMappingDto::isPrimary)
                .findFirst()
                .orElse(null);

        return MedicalServiceResponseDto.builder()
                .id(service.getId())
                .code(service.getCode())
                .name(service.getName())
                .nameEn(service.getNameEn())
                .categoryId(primary != null ? primary.getCategoryId() : null)
                .categoryName(primary != null ? primary.getCategoryName() : null)
                .categoryCode(primary != null ? primary.getCategoryCode() : null)
                .categories(mappingDtos)
                .primaryCategoryMapping(primary)
                .description(service.getDescription())
                .basePrice(service.getBasePrice())
                .requiresPA(true)
                .active(service.isActive())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .build();
    }
    
    // Legacy support
    private MedicalServiceResponseDto toServiceDto(MedicalService service, MedicalCategory category) {
        return toServiceResponseDto(service);
    }
}
