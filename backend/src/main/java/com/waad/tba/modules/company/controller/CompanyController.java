package com.waad.tba.modules.company.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.company.dto.CompanyDto;
import com.waad.tba.modules.company.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for Company management (Single-Tenant Mode)
 * 
 * This controller manages the TPA company in single-tenant mode.
 * Key endpoints for single-tenant:
 * - GET /api/companies/default - Get the default company
 * - PUT /api/companies/default - Update the default company
 */
@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Companies", description = "Company (TPA) Management APIs - Single Tenant Mode")
public class CompanyController {

    private final CompanyService companyService;

    // ============================================================================
    // Single-Tenant Mode Endpoints (Recommended)
    // ============================================================================

    /**
     * Get the default company (for single-tenant mode)
     * Returns the first active company in the system.
     * If no company exists, creates a default one.
     */
    @GetMapping("/default")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Get default company", 
               description = "Get the default company for single-tenant mode. Creates one if none exists.")
    public ResponseEntity<ApiResponse<CompanyDto>> getDefaultCompany() {
        log.info("REST request to get default company");
        
        CompanyDto company = companyService.getOrCreateDefaultCompany();
        
        return ResponseEntity.ok(ApiResponse.success("Default company retrieved successfully", company));
    }

    /**
     * Update the default company (for single-tenant mode)
     * Updates the first/default company without requiring an ID.
     */
    @PutMapping("/default")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
    @Operation(summary = "Update default company", 
               description = "Update the default company for single-tenant mode")
    public ResponseEntity<ApiResponse<CompanyDto>> updateDefaultCompany(
            @Valid @RequestBody CompanyDto companyDto) {
        
        log.info("REST request to update default company");
        
        CompanyDto updatedCompany = companyService.updateDefaultCompany(companyDto);
        
        return ResponseEntity.ok(ApiResponse.success("Company updated successfully", updatedCompany));
    }

    // ============================================================================
    // Standard CRUD Endpoints (for multi-tenant mode if needed in future)
    // ============================================================================

    /**
     * Create a new company
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
    @Operation(summary = "Create new company", description = "Create a new company (tenant) in the system")
    public ResponseEntity<ApiResponse<CompanyDto>> createCompany(
            @Valid @RequestBody CompanyDto companyDto) {

        log.info("REST request to create company: {}", companyDto.getName());

        CompanyDto createdCompany = companyService.createCompany(companyDto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Company created successfully", createdCompany));
    }

    /**
     * Update an existing company by ID
     */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
    @Operation(summary = "Update company by ID", description = "Update an existing company by its ID")
    public ResponseEntity<ApiResponse<CompanyDto>> updateCompany(
            @PathVariable Long id,
            @Valid @RequestBody CompanyDto companyDto) {

        log.info("REST request to update company with ID: {}", id);

        CompanyDto updatedCompany = companyService.updateCompany(id, companyDto);

        return ResponseEntity.ok(ApiResponse.success("Company updated successfully", updatedCompany));
    }

    /**
     * Get company by ID
     */
    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_COMPANIES')")
    @Operation(summary = "Get company by ID", description = "Retrieve a company by its ID")
    public ResponseEntity<ApiResponse<CompanyDto>> getCompany(@PathVariable Long id) {

        log.info("REST request to get company with ID: {}", id);

        CompanyDto company = companyService.getCompany(id);

        return ResponseEntity.ok(ApiResponse.success("Company retrieved successfully", company));
    }

    /**
     * Get company by code
     */
    @GetMapping("/code/{code}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_COMPANIES')")
    @Operation(summary = "Get company by code", description = "Retrieve a company by its code")
    public ResponseEntity<ApiResponse<CompanyDto>> getCompanyByCode(@PathVariable String code) {

        log.info("REST request to get company with code: {}", code);

        CompanyDto company = companyService.getCompanyByCode(code);

        return ResponseEntity.ok(ApiResponse.success("Company retrieved successfully", company));
    }

    /**
     * Get all companies
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_COMPANIES')")
    @Operation(summary = "Get all companies", description = "Retrieve all companies in the system")
    public ResponseEntity<ApiResponse<List<CompanyDto>>> getAllCompanies() {

        log.info("REST request to get all companies");

        List<CompanyDto> companies = companyService.getAllCompanies();

        return ResponseEntity.ok(ApiResponse.success("Companies retrieved successfully", companies));
    }

    /**
     * Activate a company
     */
    @PatchMapping("/{id:\\d+}/activate")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
    @Operation(summary = "Activate company", description = "Activate a deactivated company")
    public ResponseEntity<ApiResponse<CompanyDto>> activateCompany(@PathVariable Long id) {

        log.info("REST request to activate company with ID: {}", id);

        CompanyDto company = companyService.activateCompany(id);

        return ResponseEntity.ok(ApiResponse.success("Company activated successfully", company));
    }

    /**
     * Deactivate a company
     */
    @PatchMapping("/{id:\\d+}/deactivate")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
    @Operation(summary = "Deactivate company", description = "Deactivate an active company")
    public ResponseEntity<ApiResponse<CompanyDto>> deactivateCompany(@PathVariable Long id) {

        log.info("REST request to deactivate company with ID: {}", id);

        CompanyDto company = companyService.deactivateCompany(id);

        return ResponseEntity.ok(ApiResponse.success("Company deactivated successfully", company));
    }

    /**
     * Delete a company
     */
    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
    @Operation(summary = "Delete company", description = "Delete a company from the system")
    public ResponseEntity<ApiResponse<Void>> deleteCompany(@PathVariable Long id) {

        log.info("REST request to delete company with ID: {}", id);

        companyService.deleteCompany(id);

        return ResponseEntity.ok(ApiResponse.success("Company deleted successfully", null));
    }
}
