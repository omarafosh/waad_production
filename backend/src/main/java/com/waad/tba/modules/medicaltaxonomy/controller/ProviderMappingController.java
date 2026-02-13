package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.dto.CatalogStatsDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.dto.ProviderRawServiceDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MappingAuditLog;
import com.waad.tba.modules.medicaltaxonomy.service.ProviderMappingService;
import com.waad.tba.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
@Slf4j
public class ProviderMappingController {

    private final ProviderMappingService mappingService;

    @GetMapping("/unmapped")
    @PreAuthorize("hasAuthority('MANAGE_TAXONOMY')")
    public ResponseEntity<Page<ProviderRawServiceDto>> getUnmappedServices(
            @RequestParam Long providerId,
            Pageable pageable) {
        return ResponseEntity.ok(mappingService.getUnmappedServices(providerId, pageable));
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAuthority('MANAGE_TAXONOMY')")
    public ResponseEntity<Page<MappingAuditLog>> getMappingAuditLogs(Pageable pageable) {
        return ResponseEntity.ok(mappingService.getMappingAuditLogs(pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('MANAGE_TAXONOMY')")
    public ResponseEntity<ApiResponse> getCatalogStats() {
        return ResponseEntity.ok(ApiResponse.success("Stats retrieved", mappingService.getCatalogStats()));
    }

    @PostMapping("/map")
    @PreAuthorize("hasAuthority('MANAGE_TAXONOMY')")
    public ResponseEntity<ApiResponse> mapService(
            @Valid @RequestBody MappingRequestDto request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        mappingService.mapService(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Service mapped successfully", null));
    }

    @PostMapping("/upload-raw")
    @PreAuthorize("hasAuthority('MANAGE_TAXONOMY')")
    public ResponseEntity<ApiResponse> uploadRawServices(
            @RequestParam("file") MultipartFile file,
            @RequestParam("providerId") Long providerId) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("File is empty"));
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int count = 0;
            // Skip header if present (simple check)
            boolean firstLine = true;
            
            while ((line = reader.readLine()) != null) {
                if (firstLine && line.toLowerCase().contains("code")) {
                   firstLine = false;
                   continue; 
                }
                
                String[] parts = line.split(",");
                if (parts.length >= 2) {
                    String code = parts[0].trim();
                    String name = parts[1].trim();
                    String desc = parts.length > 2 ? parts[2].trim() : null;
                    
                    if (!code.isEmpty()) {
                        mappingService.uploadRawService(providerId, code, name, desc);
                        count++;
                    }
                }
            }
            return ResponseEntity.ok(ApiResponse.success("Processed " + count + " raw services", null));
        } catch (Exception e) {
            log.error("Failed to upload raw services", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to process file: " + e.getMessage()));
        }
    }
}
