package com.waad.tba.modules.medicaltaxonomy.enterprise.controller;

import com.waad.tba.modules.medicaltaxonomy.enterprise.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.enterprise.dto.MappingSuggestionDto;
import com.waad.tba.modules.medicaltaxonomy.enterprise.service.MappingEnterpriseService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.service.ServiceMappingEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/mappings")
@RequiredArgsConstructor
public class MappingController {

    private final MappingEnterpriseService mappingService;
    private final ServiceMappingEngine mappingEngine;

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN', 'APPROVER')")
    public ResponseEntity<Void> manualMap(
            @RequestBody MappingRequestDto request,
            @AuthenticationPrincipal UserDetails userDetails) {
        mappingService.performManualMapping(request, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/suggestions/{rawServiceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAPPER')")
    public ResponseEntity<List<MappingSuggestionDto>> getSuggestions(
            @PathVariable Long rawServiceId,
            @RequestParam String rawName,
            @RequestParam String rawCode) {
        return ResponseEntity.ok(mappingEngine.getSuggestions(rawName, rawCode));
    }
}
