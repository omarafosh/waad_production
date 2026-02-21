package com.waad.tba.modules.providercontract.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.modules.providercontract.service.PriceListExcelTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.waad.tba.modules.providercontract.dto.PricingImportPreviewDto;
import com.waad.tba.modules.providercontract.entity.PricingImportLog;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.common.exception.BusinessRuleException;
import org.springframework.http.HttpStatus;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for Price List Excel Template
 * 
 * ARCHITECTURAL FIX (2026-01-06):
 * - Template generation now uses DTO (ContractTemplateContext) instead of JPA Entity
 * - This prevents LazyInitializationException outside transactions
 * - Contract data is extracted within Service layer, then passed as DTO
 * 
 * Pattern:
 * 1. Service loads Entity + eager fetches required relations
 * 2. Service extracts data to DTO
 * 3. Service passes DTO (NOT Entity) to ExcelTemplateService
 * 
 * Endpoints:
 * - GET /api/provider-contracts/{contractId}/pricing/import/template (contract-specific template)
 * - POST /api/provider-contracts/{contractId}/pricing/import (import with contract context)
 * 
 * @version 3.0
 * @since 2026-01-06
 */
@Slf4j
@RestController
@RequestMapping("/api/provider-contracts")
@RequiredArgsConstructor
@Tag(name = "Price List Excel Import", description = "System-generated Excel template download and import for contract pricing")
@SecurityRequirement(name = "bearer-jwt")
public class ProviderContractPricingExcelController {

    private final PriceListExcelTemplateService templateService;
    private final AuthorizationService authorizationService;

    /**
     * Download contract-specific Excel template for pricing import
     * 
     * ARCHITECTURAL FIX: Service now uses DTO instead of Entity to prevent LazyInitializationException
     * 
     * GET /api/provider-contracts/{contractId}/pricing/import/template
     */
    @GetMapping("/{contractId}/pricing/import/template")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('MANAGE_PROVIDER_CONTRACTS')")
    @Operation(
        summary = "Download Price List Template",
        description = "Downloads a contract-specific Excel template for importing pricing items. " +
                     "Template includes contract code and provider name in header row. " +
                     "Uses DTO internally to prevent LazyInitializationException. " +
                     "Only files downloaded from this endpoint are accepted for import."
    )
    public ResponseEntity<?> downloadTemplate(
            @Parameter(description = "Provider contract ID", required = true)
            @PathVariable Long contractId
    ) {
        log.info("[PriceListImport] Template download requested for contract ID: {}", contractId);
        try {
            byte[] excelData = templateService.generateTemplate(contractId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", 
                    String.format("Price_List_Contract_%d.xlsx", contractId));
            headers.setContentLength(excelData.length);
            
            log.info("[PriceListImport] Template generated: {} bytes", excelData.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (BusinessRuleException e) {
            log.warn("[PriceListImport] Business rule violation during template download for contract {}: {}", contractId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Throwable t) {
            log.error("[PriceListImport] CRITICAL ERROR during template download for contract " + contractId, t);
            String errorType = t.getClass().getSimpleName();
            String errorMsg = t.getMessage() != null ? t.getMessage() : "No message provided";
            
            // If it's a LinkageError/NoClassDefFound, it's a dependency/library issue
            if (t instanceof LinkageError || t instanceof NoClassDefFoundError) {
                errorMsg = "Library error: " + errorMsg + ". Check Apache POI dependencies.";
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("خطأ تقني أثناء توليد القالب (Contract: " + contractId + ") [" + errorType + "]: " + errorMsg));
        }
    }

    /**
     * Import pricing items from system-generated template
     * 
     * POST /api/provider-contracts/{contractId}/pricing/import
     */
    @PostMapping(
        value = "/{contractId}/pricing/import",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDER_CONTRACTS')")
    @Operation(
        summary = "Import Price List from Template",
        description = "Imports pricing items from a system-generated Excel template. " +
                     "Supports upsert mode (create or update by contract + service). " +
                     "Auto-calculates discount percentage."
    )
    public ResponseEntity<ApiResponse<ExcelImportResult>> importPriceList(
            @Parameter(description = "Provider contract ID", required = true)
            @PathVariable Long contractId,
            
            @Parameter(description = "Excel template file", required = true)
            @RequestParam("file") MultipartFile file
    ) {
        log.info("[PriceListImport] Legacy import request for contract: {}", contractId);
        ExcelImportResult result = templateService.importFromExcel(contractId, file);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Preview pricing import
     */
    @PostMapping(value = "/{contractId}/pricing/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDER_CONTRACTS')")
    @Operation(summary = "Preview Price List Import", description = "Parses Excel and returns preview data for confirmation.")
    public ResponseEntity<ApiResponse<PricingImportPreviewDto>> previewPricingImport(
            @PathVariable Long contractId,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        log.info("[PriceListImport] Preview request for contract: {}", contractId);
        PricingImportPreviewDto preview = templateService.parseAndPreview(contractId, file);
        return ResponseEntity.ok(ApiResponse.success(preview));
    }

    /**
     * Execute pricing import in background
     */
    @PostMapping(value = "/{contractId}/pricing/import/execute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDER_CONTRACTS')")
    @Operation(summary = "Execute Price List Import", description = "Starts background import process.")
    public ResponseEntity<ApiResponse<Map<String, String>>> executePricingImport(
            @PathVariable Long contractId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("batchId") String batchId
    ) throws Exception {
        log.info("[PriceListImport] Execute request for batch: {}", batchId);
        
        File tempFile = templateService.saveToTempFile(file);
        
        // Correcting AuthorizationService usage
        com.waad.tba.modules.rbac.entity.User currentUser = authorizationService.getCurrentUser();
        String username = (currentUser != null) ? currentUser.getUsername() : "system";
        Long userId = (currentUser != null) ? currentUser.getId() : null;
        
        // Fix: Create log synchronously BEFORE async process starts
        // This ensures the record exists when frontend starts polling immediately
        templateService.createImportLog(batchId, contractId, file.getOriginalFilename(), file.getSize(), username, userId);
        
        templateService.executeImport(tempFile, batchId, contractId, username, userId);
        
        Map<String, String> response = new HashMap<>();
        response.put("batchId", batchId);
        response.put("status", "PROCESSING");
        
        return ResponseEntity.ok(ApiResponse.success("تم بدء الاستيراد في الخلفية", response));
    }

    /**
     * Get import status
     */
    @GetMapping("/pricing/import/status/{batchId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDER_CONTRACTS')")
    @Operation(summary = "Get Price List Import Status", description = "Returns current progress of the background import.")
    public ResponseEntity<ApiResponse<PricingImportLog>> getImportStatus(@PathVariable String batchId) {
        PricingImportLog logEntry = templateService.getImportLog(batchId);
        if (logEntry == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("سجل الاستيراد غير موجود"));
        }
        return ResponseEntity.ok(ApiResponse.success(logEntry));
    }
}
