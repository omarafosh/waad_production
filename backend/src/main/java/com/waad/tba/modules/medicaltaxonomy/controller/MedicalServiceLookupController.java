package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.dto.CatalogStatsDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.service.MedicalServiceLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/medical-services")
@Tag(name = "Medical Service Lookup", description = "Endpoints for looking up medical services from the enterprise dictionary")
@RequiredArgsConstructor
@Slf4j
public class MedicalServiceLookupController {

    private final MedicalServiceLookupService lookupService;
    private final com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository serviceRepository;

    @GetMapping
    @Operation(summary = "Get paginated services", description = "Return paginated medical services from the master dictionary")
    public ResponseEntity<ApiResponse<Page<MedicalServiceResponseDto>>> getServices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) Boolean isMaster) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("code").ascending());
        Page<MedicalServiceResponseDto> services = lookupService.getServices(true, isMaster, searchTerm, pageRequest);

        return ResponseEntity.ok(ApiResponse.success(services));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get service statistics", description = "Returns counts for master services, raw services, and mapping progress")
    public ResponseEntity<ApiResponse<CatalogStatsDto>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(lookupService.getStats()));
    }

    @GetMapping("/lookup")
    @Operation(summary = "Lookup service by code", description = "Returns detail for a specific medical service")
    public ResponseEntity<ApiResponse<MedicalServiceResponseDto>> lookupService(@RequestParam String code) {
        return lookupService.getServiceByCode(code)
                .map(s -> ResponseEntity.ok(ApiResponse.success(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get service by ID", description = "Returns details for a specific medical service by its numeric ID")
    public ResponseEntity<ApiResponse<MedicalServiceResponseDto>> getServiceById(@PathVariable Long id) {
        return lookupService.getServiceById(id)
                .map(s -> ResponseEntity.ok(ApiResponse.success(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update medical service", description = "Updates an existing medical service")
    public ResponseEntity<ApiResponse<MedicalServiceResponseDto>> updateService(
            @PathVariable Long id, 
            @RequestBody MedicalServiceResponseDto dto) {
        
        return serviceRepository.findById(id).map(service -> {
            service.setName(dto.getName());
            service.setNameEn(dto.getNameEn());
            // Map category name back to system category if needed, or update based on categoryId
            service.setActive(dto.isActive());
            
            MedicalService saved = serviceRepository.save(service);
            return ResponseEntity.ok(ApiResponse.success(lookupService.mapToDto(saved)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete medical service", description = "Deletes a medical service from the enterprise dictionary")
    public ResponseEntity<ApiResponse<Void>> deleteService(@PathVariable Long id) {
        if (!serviceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        serviceRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
