package com.waad.tba.modules.member.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.common.excel.dto.ExcelColumnDetectionDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto;
import com.waad.tba.modules.member.service.ExcelColumnMappingService;
import com.waad.tba.modules.member.service.MemberExcelImportService;
import com.waad.tba.modules.member.service.MemberExcelTemplateService;
import com.waad.tba.modules.rbac.util.SecurityConstants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Controller for Members Excel template download and import
 * 
 * NEW ARCHITECTURE:
 * - System-generated templates only
 * - Create-only imports (Phase 1)
 * - Strict validation with detailed error reporting
 */
@Slf4j
@RestController
@RequestMapping("/api/unified-members/import")
@RequiredArgsConstructor
@Tag(name = "Member Excel Import", description = "System-generated Excel template download and import")
public class MemberExcelTemplateController {

    private final MemberExcelTemplateService templateService;
    private final MemberExcelImportService importService;
    private final ExcelColumnMappingService columnMappingService;
    private final com.waad.tba.security.AuthorizationService authorizationService;

    /**
     * Download Excel template for members import
     * 
     * GET /api/members/import/template
     */
    @GetMapping("/template")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Download Members Import Template", description = "Downloads a system-generated Excel template for importing members. "
            +
            "Only files downloaded from this endpoint are accepted for import.")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        log.info("[MemberImport] Template download requested");

        byte[] excelData = templateService.generateTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "Members_Import_Template.xlsx");
        headers.setContentLength(excelData.length);

        log.info("[MemberImport] Template generated: {} bytes", excelData.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelData);
    }

    /**
     * Import members from Excel file
     * 
     * POST /api/members/import
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Import Members from Excel", description = "Imports members from a system-generated Excel template. "
            +
            "Only creates new members (no updates in Phase 1). " +
            "Card numbers are auto-generated. Employer lookup is mandatory.")
    public ResponseEntity<ApiResponse<ExcelImportResult>> importMembers(
            @RequestParam("file") MultipartFile file) {
        log.info("[MemberImport] Import requested: {}", file.getOriginalFilename());

        ExcelImportResult result = templateService.importFromExcel(file);

        log.info("[MemberImport] Import completed - Created: {}, Rejected: {}, Failed: {}",
                result.getSummary().getCreated(),
                result.getSummary().getRejected(),
                result.getSummary().getFailed());

        if (result.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.success(result.getMessageEn(), result));
        } else {
            // FIX: Return 200 OK even for validation errors so frontend can display the
            // error report
            return ResponseEntity.ok()
                    .body(ApiResponse.<ExcelImportResult>builder()
                            .status("error")
                            .message(result.getMessageEn())
                            .data(result)
                            .timestamp(java.time.LocalDateTime.now())
                            .build());
        }
    }

    /**
     * Detect columns and suggest mapping.
     */
    @PostMapping(value = "/detect-columns", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Detect Excel columns and suggest mappings")
    public ResponseEntity<ApiResponse<ExcelColumnDetectionDto>> detectColumns(
            @RequestParam("file") MultipartFile file) {
        log.info("[MemberImport] Column detection requested: {}", file.getOriginalFilename());
        try {
            ExcelColumnDetectionDto detection = columnMappingService.detectColumns(file);
            return ResponseEntity.ok(ApiResponse.success("تم تحليل الملف واكتشاف الأعمدة بنجاح", detection));
        } catch (Throwable t) {
            log.error("[MemberImport] Column detection critical error: {}", t.getMessage(), t);
            String errorMsg = (t instanceof Exception) ? "خطأ في تحليل الملف: " + t.getMessage()
                    : "خطأ تقني في معالجة الملف. يرجى مراجعة الدعم الفني.";
            return ResponseEntity.status(500).body(ApiResponse.error(errorMsg));
        }
    }

    /**
     * Upload Excel and get preview.
     */
    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Preview Excel import")
    public ResponseEntity<ApiResponse<MemberImportPreviewDto>> previewImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "customMappings", required = false) String customMappingsJson,
            @RequestParam(value = "headerRowNumber", required = false) Integer headerRowNumber) {
        log.info("[MemberImport] Preview requested: {} (header: {})", file.getOriginalFilename(), headerRowNumber);
        try {
            MemberImportPreviewDto preview = importService.parseAndPreview(file, customMappingsJson, headerRowNumber);
            return ResponseEntity.ok(ApiResponse.success("تم تحليل المعاينة بنجاح", preview));
        } catch (Throwable t) {
            log.error("[MemberImport] Preview critical error: {}", t.getMessage(), t);
            String errorMsg = (t instanceof Exception) ? "خطأ في تحليل المعاينة: " + t.getMessage()
                    : "خطأ تقني في معالجة المعاينة. يرجى مراجعة الدعم الفني.";
            return ResponseEntity.status(500).body(ApiResponse.error(errorMsg));
        }
    }

    /**
     * Execute import after confirmation.
     */
    @PostMapping(value = "/execute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Execute Excel import")
    public ResponseEntity<ApiResponse<MemberImportResultDto>> executeImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "employerId", required = false) Long employerId,
            @RequestParam(value = "benefitPolicyId", required = false) Long benefitPolicyId,
            @RequestParam(value = "batchId", required = false) String batchId,
            @RequestParam(value = "headerRowNumber", required = false) Integer headerRowNumber,
            @RequestParam(value = "importPolicy", defaultValue = "UPDATE") String importPolicy) {
        log.info("[MemberImport] Execute requested: employer={}, policy={}, header={}, policy={}", employerId,
                benefitPolicyId, headerRowNumber, importPolicy);
        try {
            if (batchId == null || batchId.isBlank()) {
                batchId = java.util.UUID.randomUUID().toString();
            }

            // Save MultipartFile to a stable temp file for background processing
            java.io.File tempFile = importService.saveToTempFile(file);

            // Fetch current user details BEFORE going async
            com.waad.tba.modules.rbac.entity.User currentUser = authorizationService.getCurrentUser();
            String username = currentUser != null ? currentUser.getUsername() : SecurityConstants.SYSTEM_USER;
            Long userId = currentUser != null ? currentUser.getId() : null;

            // Trigger background import with stable file and user context
            importService.executeImport(tempFile, batchId, employerId, benefitPolicyId, headerRowNumber, importPolicy,
                    username, userId);

            // Return batchId immediately so frontend can monitor progress
            MemberImportResultDto result = MemberImportResultDto.builder()
                    .batchId(batchId)
                    .message("تم بدء الاستيراد في الخلفية بنجاح")
                    .build();
            return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
        } catch (Throwable t) {
            log.error("[MemberImport] Execute critical error: {}", t.getMessage(), t);
            String errorMsg = "فشل تنفيذ الاستيراد: " + t.getMessage();
            if (t.getMessage() == null || t.getMessage().isBlank()) {
                errorMsg = "خطأ تقني غير معروف في تنفيذ الاستيراد. يرجى مراجعة سجلات النظام.";
            }
            return ResponseEntity.status(500).body(ApiResponse.error(errorMsg));
        }
    }

    /**
     * Get import status for polling.
     */
    @GetMapping("/status/{batchId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Get import status")
    public ResponseEntity<ApiResponse<Object>> getImportStatus(@PathVariable String batchId) {
        return ResponseEntity.ok(ApiResponse.success(importService.getImportLog(batchId)));
    }

    @GetMapping("/errors/{batchId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_IMPORT')")
    @Operation(summary = "Get import errors")
    public ResponseEntity<ApiResponse<List<com.waad.tba.modules.member.dto.MemberImportResultDto.ImportErrorDetailDto>>> getImportErrors(
            @PathVariable String batchId) {
        return ResponseEntity.ok(ApiResponse.success(importService.getImportErrors(batchId)));
    }
}
