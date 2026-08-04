package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.modules.medicaltaxonomy.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MappingSuggestionDto;
import com.waad.tba.modules.medicaltaxonomy.service.ProviderMappingService;
import com.waad.tba.modules.medicaltaxonomy.service.ServiceMappingEngine;
import com.waad.tba.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v2/mappings")
@RequiredArgsConstructor
public class MappingController {
    private final ProviderMappingService mappingService;
    private final ServiceMappingEngine mappingEngine;

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN', 'APPROVER')")
    public ResponseEntity<Void> manualMap(@RequestBody MappingRequestDto request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        mappingService.mapService(request, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/suggestions/{rawServiceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAPPER')")
    public ResponseEntity<List<MappingSuggestionDto>> getSuggestions(
            @PathVariable Long rawServiceId,
            @RequestParam(required=false) String rawName,
            @RequestParam(required=false) String rawCode) {
        // rawName/rawCode are accepted only for backward compatibility; the engine loads
        // the authoritative values from provider_raw_services by rawServiceId.
        return ResponseEntity.ok(mappingEngine.getSuggestions(rawServiceId, rawName, rawCode));
    }
}
