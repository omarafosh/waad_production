package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderServiceMapping;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderServiceMappingRepository;
import com.waad.tba.modules.medicaltaxonomy.service.MedicalCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-catalog")
@RequiredArgsConstructor
@Tag(name = "Medical Master Catalog", description = "Standardized Medical Services and Provider Mapping Management")
public class MedicalCatalogController {

    private final MedicalCatalogService catalogService;
    private final ProviderServiceMappingRepository mappingRepository;

    @GetMapping("/resolve")
    @PreAuthorize("hasAnyAuthority('VIEW_TAXONOMY', 'MANAGE_CLAIMS')")
    @Operation(summary = "Resolve provider code to master service", description = "Check how a specific provider code maps to our master catalog.")
    public ResponseEntity<ApiResponse<MedicalService>> resolveMapping(
            @RequestParam Long providerId,
            @RequestParam String providerServiceCode) {
        MedicalService service = catalogService.resolveService(providerId, providerServiceCode);
        return ResponseEntity.ok(ApiResponse.success(service));
    }

    @GetMapping("/mappings/provider/{providerId}")
    @PreAuthorize("hasAuthority('VIEW_TAXONOMY')")
    @Operation(summary = "Get all mappings for a provider")
    public ResponseEntity<ApiResponse<List<ProviderServiceMapping>>> getProviderMappings(@PathVariable Long providerId) {
        return ResponseEntity.ok(ApiResponse.success(mappingRepository.findByProviderId(providerId)));
    }

    @PostMapping("/mappings")
    @PreAuthorize("hasAuthority('MANAGE_TAXONOMY')")
    @Operation(summary = "Create or update a provider service mapping")
    public ResponseEntity<ApiResponse<ProviderServiceMapping>> saveMapping(@RequestBody ProviderServiceMapping mapping) {
        // Simple save for now - Phase 1 focuses on infrastructure
        ProviderServiceMapping saved = mappingRepository.save(mapping);
        return ResponseEntity.ok(ApiResponse.success("Mapping saved successfully", saved));
    }
}
