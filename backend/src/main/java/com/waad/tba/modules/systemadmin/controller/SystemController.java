package com.waad.tba.modules.systemadmin.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.exception.SystemConfigurationException;
import com.waad.tba.modules.company.dto.CompanyDto;
import com.waad.tba.modules.company.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * System Controller - Single Company Context
 * 
 * Provides system-level endpoints for single-company operations.
 * This reflects the operational reality that the system operates
 * with exactly one TPA company (TBA).
 * 
 * Design Philosophy:
 * - No company selection needed from frontend
 * - Company context is implicit and system-wide
 * - Eliminates entire class of user errors
 * - Simplifies architecture
 * - Ready for future multi-tenant if needed
 * 
 * @created 2025-01-02
 */
@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "System", description = "System-level configuration and context APIs")
public class SystemController {

    private final CompanyService companyService;

    /**
     * Get the system's single default company.
     * 
     * This endpoint always returns 200 OK with the default company.
     * It never returns 404 - only fails on configuration errors (500).
     * 
     * Frontend should call this once at startup and cache the result.
     * 
     * @return CompanyDto - The default TPA company
     */
    @GetMapping("/company")
    @Operation(
        summary = "Get system default company",
        description = "Returns the single TPA company configured in the system. " +
                     "This endpoint reflects the single-company operational context. " +
                     "Always returns 200 OK unless there is a configuration error."
    )
    public ResponseEntity<ApiResponse<CompanyDto>> getSystemCompany() {
        log.info("REST request to get system default company");

        try {
            // Use getOrCreateDefaultCompany to ensure a company always exists
            CompanyDto company = companyService.getOrCreateDefaultCompany();

            if (company == null) {
                log.error("Failed to get or create default company");
                return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to get or create default company"));
            }

            log.debug("System company retrieved: {} (ID: {})", company.getName(), company.getId());

            return ResponseEntity.ok(ApiResponse.success("System company retrieved successfully", company));
        } catch (SystemConfigurationException e) {
            log.error("System configuration error: No companies found in database", e);
            return ResponseEntity.status(500)
                .body(ApiResponse.error("System configuration error: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error retrieving system company", e);
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Error retrieving system company: " + e.getMessage()));
        }
    }
}
