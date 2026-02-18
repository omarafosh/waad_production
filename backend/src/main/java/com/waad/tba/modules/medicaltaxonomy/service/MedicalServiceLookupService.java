package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.modules.medicaltaxonomy.dto.CatalogStatsDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.dto.ServiceCategoryMappingDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderRawServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderServiceMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicalServiceLookupService {

    private final MedicalServiceRepository serviceRepository;
    private final MedicalCategoryRepository categoryRepository;
    private final ProviderRawServiceRepository rawServiceRepository;
    private final ProviderServiceMappingRepository mappingRepository;

    private final Map<String, Long> categoryMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        refreshCategoryMap();
    }

    public void refreshCategoryMap() {
        log.info("[MEDICAL-SERVICES-SERVICE] Refreshing category map");
        categoryRepository.findAll().forEach(cat -> 
            categoryMap.put(cat.getName(), cat.getId())
        );
    }

    @Transactional(readOnly = true)
    public Page<MedicalServiceResponseDto> getServices(Boolean active, Boolean isMaster, Long categoryId, String searchTerm, Pageable pageable) {
        Page<MedicalService> services = serviceRepository.findAllByFilters(active, isMaster, categoryId, searchTerm, pageable);
        return services.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Optional<MedicalServiceResponseDto> getServiceByCode(String code) {
        return serviceRepository.findByCode(code).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Optional<MedicalServiceResponseDto> getServiceById(Long id) {
        return serviceRepository.findById(id).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<MedicalServiceResponseDto> lookupServices(String query, Long categoryId) {
        // Use existing filter method — increased page size to 500 to show all services in autocomplete
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 500, org.springframework.data.domain.Sort.by("code"));
        return serviceRepository.findAllByFilters(true, true, categoryId, query, pageable)
                .map(this::mapToDto)
                .getContent();
    }

    @Transactional(readOnly = true)
    public CatalogStatsDto getStats() {
        long totalMaster = serviceRepository.count();
        long totalRaw = rawServiceRepository.count();
        long mappedCount = mappingRepository.countByActiveTrue();
        
        double completionRate = totalRaw > 0 ? (double) mappedCount / totalRaw * 100 : 0;
        
        return CatalogStatsDto.builder()
                .totalMaster(totalMaster)
                .totalRaw(totalRaw)
                .mappedCount(mappedCount)
                .completionRate(Math.round(completionRate * 10.0) / 10.0)
                .build();
    }

    public MedicalServiceResponseDto mapToDto(MedicalService entity) {
        Long catId = categoryMap.get(entity.getCategoryName() != null ? entity.getCategoryName() : "");
        
        List<ServiceCategoryMappingDto> mappingDtos = entity.getCategoryMappings() != null 
            ? entity.getCategoryMappings().stream()
                .filter(m -> m.getCategory() != null)
                .map(m -> ServiceCategoryMappingDto.builder()
                        .categoryId(m.getCategory().getId())
                        .categoryCode(m.getCategory().getCode())
                        .categoryName(m.getCategory().getName())
                        .isPrimary(m.isPrimary())
                        .context(m.getContext())
                        .build())
                .collect(Collectors.toList())
            : List.of();

        ServiceCategoryMappingDto primaryMapping = mappingDtos.stream()
                .filter(ServiceCategoryMappingDto::isPrimary)
                .findFirst()
                .orElse(null);

        return MedicalServiceResponseDto.builder()
                .id(entity.getId()) 
                .code(entity.getCode())
                .name(entity.getName()) 
                .nameEn(entity.getNameEn())
                .categoryId(entity.getCategoryId() != null ? entity.getCategoryId() : catId) 
                .categoryName(entity.getCategoryName()) 
                .categoryCode(entity.getCategory() != null ? entity.getCategory().getCode() : null)
                .categories(mappingDtos)
                .primaryCategoryMapping(primaryMapping)
                .subCategory(entity.getSubCategory()) 
                .active(entity.isActive())
                .isMaster(entity.getIsMaster())
                .build();
    }
}
