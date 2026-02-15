package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medical-services")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Medical Service Lookup", description = "Lookup services for UI selectors")
public class MedicalServiceLookupController {

    private final EnterpriseMedicalServiceRepository serviceRepository;

    @GetMapping("/lookup")
    @Operation(summary = "Lookup active medical services", description = "Search active services by name/code and optional category")
    public ResponseEntity<List<EnterpriseMedicalService>> lookupServices(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String categoryId) {
        
        log.debug("Looking up medical services. Query: {}, Category: {}", query, categoryId);

        // Map frontend "categoryId" param to backend "category" name if needed
        // The repository method expects "categoryId" as the param name for the substring match/exact match
        
        List<EnterpriseMedicalService> services = serviceRepository.searchActive(
                query, 
                categoryId, // We expect the frontend to pass the NAME here, despite the param name
                PageRequest.of(0, 50));

        return ResponseEntity.ok(services);
    }
}
