package com.waad.tba.modules.provider.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.dto.PaginationResponse;
import com.waad.tba.modules.provider.dto.*;
import com.waad.tba.modules.providercontract.dto.ProviderContractCreateDto;
import com.waad.tba.modules.providercontract.dto.ProviderContractResponseDto;
import com.waad.tba.modules.providercontract.dto.ProviderContractUpdateDto;
import com.waad.tba.modules.provider.service.ProviderService;
import com.waad.tba.modules.provider.service.ProviderServiceService;
import com.waad.tba.modules.providercontract.service.ProviderContractService;
import com.waad.tba.security.AuthorizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/providers")
@RequiredArgsConstructor
public class ProviderController {

    private final ProviderService providerService;
    private final ProviderServiceService providerServiceService;
    private final ProviderContractService providerContractService;
    private final AuthorizationService authorizationService;

    @GetMapping("/selector")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<List<ProviderSelectorDto>>> getSelectorOptions() {
        List<ProviderSelectorDto> options = providerService.getSelectorOptions();
        
        // Filter for Provider Users
        var currentUser = authorizationService.getCurrentUser();
        if (currentUser != null && authorizationService.isProvider(currentUser)) {
            Long providerId = authorizationService.getProviderFilterForUser(currentUser);
            if (providerId != null) {
                options = options.stream()
                        .filter(p -> p.getId().equals(providerId))
                        .collect(Collectors.toList());
            }
        }
        
        return ResponseEntity.ok(ApiResponse.success(options));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<ProviderViewDto>> createProvider(@Valid @RequestBody ProviderCreateDto dto) {
        ProviderViewDto provider = providerService.createProvider(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Provider created successfully", provider));
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<ApiResponse<ProviderViewDto>> updateProvider(
            @PathVariable Long id,
            @Valid @RequestBody ProviderUpdateDto dto) {
        ProviderViewDto provider = providerService.updateProvider(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Provider updated successfully", provider));
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<ApiResponse<ProviderViewDto>> getProvider(@PathVariable Long id) {
        ProviderViewDto provider = providerService.getProvider(id);
        return ResponseEntity.ok(ApiResponse.success("Provider retrieved successfully", provider));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<PaginationResponse<ProviderViewDto>>> listProviders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        Page<ProviderViewDto> providers = providerService.listProviders(Math.max(0, page - 1), size, search);

        PaginationResponse<ProviderViewDto> response = PaginationResponse.<ProviderViewDto>builder()
                .items(providers.getContent())
                .total(providers.getTotalElements())
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<Void>> deleteProvider(@PathVariable Long id) {
        providerService.deleteProvider(id);
        return ResponseEntity.ok(ApiResponse.success("Provider deleted successfully", null));
    }

    @GetMapping("/active")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<List<ProviderViewDto>>> getAllActiveProviders() {
        List<ProviderViewDto> providers = providerService.getAllActiveProviders();
        return ResponseEntity.ok(ApiResponse.success("Active providers retrieved successfully", providers));
    }

    @GetMapping("/count")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<Long>> countProviders() {
        long count = providerService.countProviders();
        return ResponseEntity.ok(ApiResponse.success("Provider count retrieved successfully", count));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<List<ProviderViewDto>>> search(@RequestParam String query) {
        List<ProviderViewDto> results = providerService.search(query);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SERVICE ASSIGNMENT ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/{id:\\d+}/allowed-employer-ids")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<ApiResponse<List<Long>>> getAllowedEmployerIds(@PathVariable Long id) {
        List<Long> ids = providerService.getAllowedEmployerIds(id);
        return ResponseEntity.ok(ApiResponse.success(ids));
    }

    /**
     * Assign a medical service to a provider
     */
    @PostMapping("/{id}/services")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<ProviderServiceResponseDto>> assignService(
            @PathVariable Long id,
            @Valid @RequestBody ProviderServiceAssignDto dto) {
        
        log.info("[PROVIDER-SERVICES] POST /api/providers/{}/services - serviceCode={}", 
                id, dto.getServiceCode());
        
        ProviderServiceResponseDto result = providerServiceService.assignService(id, dto);
        
        return ResponseEntity.ok(ApiResponse.success("Service assigned successfully", result));
    }

    /**
     * Remove a service from a provider
     */
    @DeleteMapping("/{id}/services/{serviceCode}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<Void>> removeService(
            @PathVariable Long id,
            @PathVariable String serviceCode) {
        
        log.info("[PROVIDER-SERVICES] DELETE /api/providers/{}/services/{}", id, serviceCode);
        
        providerServiceService.removeService(id, serviceCode);
        
        return ResponseEntity.ok(ApiResponse.success("Service removed successfully", null));
    }

    /**
     * Get all services offered by a provider
     */
    @GetMapping("/{id}/services")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<ApiResponse<List<ProviderServiceResponseDto>>> getProviderServices(
            @PathVariable Long id) {
        
        log.info("[PROVIDER-SERVICES] GET /api/providers/{}/services", id);
        
        List<ProviderServiceResponseDto> services = providerServiceService.getProviderServices(id);
        
        return ResponseEntity.ok(ApiResponse.success(services));
    }

    /**
     * Get service codes for a provider (lightweight)
     */
    @GetMapping("/{id}/service-codes")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<List<String>>> getProviderServiceCodes(@PathVariable Long id) {
        log.info("[PROVIDER-SERVICES] GET /api/providers/{}/service-codes", id);
        
        List<String> serviceCodes = providerServiceService.getProviderServiceCodes(id);
        
        return ResponseEntity.ok(ApiResponse.success(serviceCodes));
    }

    /**
     * Check if provider offers a specific service
     */
    @GetMapping("/{id}/services/{serviceCode}/check")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<Boolean>> checkProviderService(
            @PathVariable Long id,
            @PathVariable String serviceCode) {
        
        log.info("[PROVIDER-SERVICES] GET /api/providers/{}/services/{}/check", id, serviceCode);
        
        boolean offers = providerServiceService.providerOffersService(id, serviceCode);
        
        return ResponseEntity.ok(ApiResponse.success(offers));
    }

    // ==================== PROVIDER CONTRACT ENDPOINTS ====================

    /**
     * Create a new provider contract
     */
    @PostMapping("/{id}/contracts")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<ProviderContractResponseDto>> createContract(
            @PathVariable Long id,
            @Valid @RequestBody ProviderContractCreateDto dto) {
        
        log.info("[PROVIDER-CONTRACTS] POST /api/providers/{}/contracts", id);
        
        ProviderContractResponseDto contract = providerContractService.createContract(id, dto);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Provider contract created successfully", contract));
    }

    /**
     * Update an existing provider contract
     */
    @PutMapping("/{id}/contracts/{contractId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<ProviderContractResponseDto>> updateContract(
            @PathVariable Long id,
            @PathVariable Long contractId,
            @Valid @RequestBody ProviderContractUpdateDto dto) {
        
        log.info("[PROVIDER-CONTRACTS] PUT /api/providers/{}/contracts/{}", id, contractId);
        
        ProviderContractResponseDto contract = providerContractService.updateContract(id, contractId, dto);
        
        return ResponseEntity.ok(ApiResponse.success("Provider contract updated successfully", contract));
    }

    /**
     * Delete a provider contract (soft delete)
     */
    @DeleteMapping("/{id}/contracts/{contractId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDERS')")
    public ResponseEntity<ApiResponse<Void>> deleteContract(
            @PathVariable Long id,
            @PathVariable Long contractId) {
        
        log.info("[PROVIDER-CONTRACTS] DELETE /api/providers/{}/contracts/{}", id, contractId);
        
        providerContractService.deleteContract(id, contractId);
        
        return ResponseEntity.ok(ApiResponse.<Void>success("Provider contract deleted successfully", null));
    }

    /**
     * Get all contracts for a provider (paginated)
     */
    @GetMapping("/{id}/contracts")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<PaginationResponse<ProviderContractResponseDto>> getProviderContracts(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean activeOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "startDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        
        log.info("[PROVIDER-CONTRACTS] GET /api/providers/{}/contracts?activeOnly={}&page={}&size={}", 
                id, activeOnly, page, size);
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, 
                sortDir.equalsIgnoreCase("ASC") 
                    ? org.springframework.data.domain.Sort.by(sortBy).ascending()
                    : org.springframework.data.domain.Sort.by(sortBy).descending()
        );
        
        Page<ProviderContractResponseDto> contracts = providerContractService.getProviderContracts(
                id, activeOnly, pageable);
        
        return ResponseEntity.ok(PaginationResponse.of(contracts));
    }

    /**
     * Get currently effective contracts for a provider
     */
    @GetMapping("/{id}/contracts/current")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<List<ProviderContractResponseDto>>> getCurrentContracts(
            @PathVariable Long id) {
        
        log.info("[PROVIDER-CONTRACTS] GET /api/providers/{}/contracts/current", id);
        
        List<ProviderContractResponseDto> contracts = providerContractService.getCurrentlyEffectiveContracts(id);
        
        return ResponseEntity.ok(ApiResponse.success(contracts));
    }

    /**
     * Get contract by ID
     */
    @GetMapping("/{id}/contracts/{contractId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<ApiResponse<ProviderContractResponseDto>> getContractById(
            @PathVariable Long id,
            @PathVariable Long contractId) {
        
        log.info("[PROVIDER-CONTRACTS] GET /api/providers/{}/contracts/{}", id, contractId);
        
        ProviderContractResponseDto contract = providerContractService.getContractById(id, contractId);
        
        return ResponseEntity.ok(ApiResponse.success(contract));
    }

    /**
     * Get effective price for a service on a specific date
     */
    @GetMapping("/{id}/services/{serviceCode}/price")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS')")
    public ResponseEntity<ApiResponse<EffectivePriceResponseDto>> getEffectivePrice(
            @PathVariable Long id,
            @PathVariable String serviceCode,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) 
            java.time.LocalDate date) {
        
        log.info("[PROVIDER-CONTRACTS] GET /api/providers/{}/services/{}/price?date={}", 
                id, serviceCode, date);
        
        EffectivePriceResponseDto price = providerContractService.getEffectivePrice(id, serviceCode, date);
        
        return ResponseEntity.ok(ApiResponse.success(price));
    }

    /**
     * Get count of active contracts
     */
    @GetMapping("/{id}/contracts/count")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDERS') or @authorizationService.canAccessProvider(#id)")
    public ResponseEntity<ApiResponse<Long>> getContractCount(@PathVariable Long id) {
        log.info("[PROVIDER-CONTRACTS] GET /api/providers/{}/contracts/count", id);
        
        long count = providerContractService.countActiveContracts(id);
        
        return ResponseEntity.ok(ApiResponse.success(count));
    }
    
    /**
     * Get services requiring pre-approval for a member from provider's active contract.
     * 
     * This endpoint returns ONLY services that:
     * 1. Are in the provider's active contract (with contract pricing)
     * 2. Require pre-approval based on the MEMBER's benefit policy rules
     * 
     * GET /api/providers/{id}/contract/services/requiring-preauth?memberId=X
     */
    @GetMapping("/{id}/contract/services/requiring-preauth")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSURANCE_ADMIN') or hasRole('REVIEWER') or hasAuthority('VIEW_PROVIDERS') or hasAuthority('REVIEW_PREAPPROVALS')")
    public ResponseEntity<ApiResponse<java.util.List<ProviderServiceDto>>> getServicesRequiringPreAuth(
            @PathVariable Long id,
            @RequestParam Long memberId) {
        
        log.info("[PROVIDER-CONTRACTS] GET /api/providers/{}/contract/services/requiring-preauth?memberId={}", 
                id, memberId);
        
        java.util.List<ProviderServiceDto> services = providerContractService.getServicesRequiringPreAuth(id, memberId);
        
        return ResponseEntity.ok(ApiResponse.success(
            "Services requiring pre-approval retrieved", 
            services
        ));
    }
}
