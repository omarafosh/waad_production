package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/medical-services")
@Tag(name = "Medical Service Lookup", description = "Endpoints for looking up medical services from the enterprise dictionary")
@RequiredArgsConstructor
@Slf4j
public class MedicalServiceLookupController {

    private final EnterpriseMedicalServiceRepository serviceRepository;
    private final MedicalCategoryRepository categoryRepository;
    
    // Cache for mapping category names to legacy IDs
    private Map<String, Long> categoryMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        refreshCategoryMap();
    }

    private void refreshCategoryMap() {
        log.info("[MEDICAL-SERVICES] Refreshing category name-to-id map");
        try {
            categoryRepository.findAll().forEach(cat -> 
                categoryMap.put(cat.getName(), cat.getId())
            );
        } catch (Exception e) {
            log.error("Failed to load categories into map: {}", e.getMessage());
        }
    }

    @GetMapping
    @Operation(summary = "Get paginated services", description = "Return paginated medical services from the master dictionary")
    public ResponseEntity<ApiResponse<Page<MedicalServiceResponseDto>>> getServices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) Boolean isMaster) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("code").ascending());
        Page<EnterpriseMedicalService> services;
        
        if (searchTerm != null && !searchTerm.isEmpty()) {
            services = serviceRepository.searchActive(searchTerm, categoryId, pageRequest);
        } else {
            services = serviceRepository.findAll(pageRequest);
        }

        return ResponseEntity.ok(ApiResponse.success(services.map(this::mapToDto)));
    }

    @GetMapping("/lookup")
    @Operation(summary = "Lookup service by code", description = "Returns detail for a specific medical service")
    public ResponseEntity<ApiResponse<MedicalServiceResponseDto>> lookupService(@RequestParam String code) {
        return serviceRepository.findByCode(code)
                .map(s -> ResponseEntity.ok(ApiResponse.success(mapToDto(s))))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search medical services", description = "Advanced search for medical services")
    public ResponseEntity<ApiResponse<List<MedicalServiceResponseDto>>> searchServices(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String categoryId) {
        
        PageRequest pageRequest = PageRequest.of(0, 50, Sort.by("code").ascending());
        Page<EnterpriseMedicalService> services = serviceRepository.searchActive(searchTerm != null ? searchTerm : "", categoryId, pageRequest);
        
        return ResponseEntity.ok(ApiResponse.success(
            services.getContent().stream().map(this::mapToDto).collect(Collectors.toList())
        ));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get service statistics", description = "Returns total, active, and inactive service counts")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        long total = serviceRepository.count();
        // Adjust based on your repository methods
        long active = serviceRepository.countByActive(true);
        long inactive = total - active;
        
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "total", total,
            "active", active,
            "inactive", inactive
        )));
    }

    private MedicalServiceResponseDto mapToDto(EnterpriseMedicalService entity) {
        Long catId = categoryMap.get(entity.getCategory());
        
        return MedicalServiceResponseDto.builder()
                .id(0L) // Placeholder for legacy compatibility
                .code(entity.getCode())
                .name(entity.getNameAr()) 
                .nameEn(entity.getNameEn())
                .categoryId(catId) 
                .categoryName(entity.getSubCategory()) // entity.sub_category ("Broad") -> "التصنيف"
                .subCategory(entity.getCategory()) // entity.category ("Specialization") -> "التخصص"
                .active(entity.isActive())
                .isMaster(entity.isMaster())
                .build();
    }
}
