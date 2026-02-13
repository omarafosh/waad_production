package com.waad.tba.modules.pdf.controller;

import com.waad.tba.modules.pdf.service.ProviderInvoicePdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Provider Invoice PDF Report Controller
 * 
 * Provides endpoints for generating PDF reports for provider invoices.
 * 
 * @since 2026-02-04
 */
@Slf4j
@RestController
@RequestMapping("/api/reports/provider-invoices")
@RequiredArgsConstructor
@Tag(name = "Provider Invoice Reports", description = "PDF report generation for provider invoices")
public class ProviderInvoicePdfController {
    
    private final ProviderInvoicePdfService pdfService;
    
    /**
     * Generate PDF report for all provider invoices within a date range
     */
    @GetMapping("/{providerId}/all")
    @PreAuthorize("hasAnyAuthority('VIEW_CLAIMS', 'VIEW_SETTLEMENTS', 'MANAGE_PROVIDERS') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Generate all invoices report", description = "Generate PDF report for all provider invoices within the specified date range")
    public ResponseEntity<byte[]> generateAllInvoicesReport(
            @PathVariable Long providerId,
            @Parameter(description = "Start date (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "End date (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        log.info("[ProviderInvoicePdf] Request: All invoices for provider {} from {} to {}", 
                providerId, fromDate, toDate);
        
        byte[] pdfBytes = pdfService.generateProviderInvoicesReport(providerId, fromDate, toDate);
        
        String filename = String.format("provider_%d_invoices_%s_%s.pdf", 
                providerId, fromDate.toString(), toDate.toString());
        
        return buildPdfResponse(pdfBytes, filename);
    }
    
    /**
     * Generate quarterly PDF report for provider (3 months)
     */
    @GetMapping("/{providerId}/quarterly")
    @PreAuthorize("hasAnyAuthority('VIEW_CLAIMS', 'VIEW_SETTLEMENTS', 'MANAGE_PROVIDERS') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Generate quarterly report", description = "Generate PDF report for provider invoices for a specific quarter")
    public ResponseEntity<byte[]> generateQuarterlyReport(
            @PathVariable Long providerId,
            @Parameter(description = "Year (e.g., 2026)")
            @RequestParam int year,
            @Parameter(description = "Quarter (1-4)")
            @RequestParam int quarter
    ) {
        log.info("[ProviderInvoicePdf] Request: Quarterly report for provider {} - Q{} {}", 
                providerId, quarter, year);
        
        byte[] pdfBytes = pdfService.generateQuarterlyReport(providerId, year, quarter);
        
        String filename = String.format("provider_%d_Q%d_%d_report.pdf", 
                providerId, quarter, year);
        
        return buildPdfResponse(pdfBytes, filename);
    }
    
    /**
     * Generate PDF report for rejected invoices
     */
    @GetMapping("/{providerId}/rejected")
    @PreAuthorize("hasAnyAuthority('VIEW_CLAIMS', 'VIEW_SETTLEMENTS', 'MANAGE_PROVIDERS') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Generate rejected invoices report", description = "Generate PDF report for rejected or partially approved invoices")
    public ResponseEntity<byte[]> generateRejectedInvoicesReport(
            @PathVariable Long providerId,
            @Parameter(description = "Start date (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "End date (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        log.info("[ProviderInvoicePdf] Request: Rejected invoices for provider {} from {} to {}", 
                providerId, fromDate, toDate);
        
        byte[] pdfBytes = pdfService.generateRejectedInvoicesReport(providerId, fromDate, toDate);
        
        String filename = String.format("provider_%d_rejected_%s_%s.pdf", 
                providerId, fromDate.toString(), toDate.toString());
        
        return buildPdfResponse(pdfBytes, filename);
    }
    
    // Helper method to build PDF response
    private ResponseEntity<byte[]> buildPdfResponse(byte[] pdfBytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", filename);
        headers.setCacheControl("no-cache, no-store, must-revalidate");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
