package com.waad.tba.modules.pdf.service;

import com.lowagie.text.pdf.BaseFont;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.pdf.entity.PdfCompanySettings;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Provider Invoice PDF Report Service
 * 
 * Generates PDF reports for provider invoices:
 * 1. All invoices for a provider (date range)
 * 2. Quarterly report (3 months)
 * 3. Rejected invoices report
 * 
 * @since 2026-02-04
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderInvoicePdfService {
    
    private final TemplateEngine templateEngine;
    private final PdfCompanySettingsService pdfCompanySettingsService;
    private final ClaimRepository claimRepository;
    private final ProviderRepository providerRepository;
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    
    // ========== Report Type 1: All Provider Invoices ==========
    
    /**
     * Generate PDF report for all provider invoices within a date range
     */
    public byte[] generateProviderInvoicesReport(Long providerId, LocalDate fromDate, LocalDate toDate) {
        log.info("[ProviderInvoicePdf] Generating all invoices report for provider {} from {} to {}", 
                providerId, fromDate, toDate);
        
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        
        List<Claim> claims = claimRepository.findByProviderIdAndServiceDateBetween(
                providerId, fromDate, toDate);
        
        return generateProviderReport(
                provider,
                claims,
                "تقرير فواتير مقدم الخدمة",
                fromDate,
                toDate,
                "PROVIDER_ALL_INVOICES"
        );
    }
    
    // ========== Report Type 2: Quarterly Report ==========
    
    /**
     * Generate quarterly PDF report for provider (3 months)
     */
    public byte[] generateQuarterlyReport(Long providerId, int year, int quarter) {
        log.info("[ProviderInvoicePdf] Generating quarterly report for provider {} - Q{} {}", 
                providerId, quarter, year);
        
        if (quarter < 1 || quarter > 4) {
            throw new IllegalArgumentException("Quarter must be between 1 and 4");
        }
        
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        
        // Calculate quarter date range
        LocalDate fromDate = LocalDate.of(year, (quarter - 1) * 3 + 1, 1);
        LocalDate toDate = fromDate.plusMonths(3).minusDays(1);
        
        List<Claim> claims = claimRepository.findByProviderIdAndServiceDateBetween(
                providerId, fromDate, toDate);
        
        String title = String.format("التقرير الربع سنوي - الربع %d من %d", quarter, year);
        
        return generateProviderReport(
                provider,
                claims,
                title,
                fromDate,
                toDate,
                "PROVIDER_QUARTERLY"
        );
    }
    
    // ========== Report Type 3: Rejected Invoices ==========
    
    /**
     * Generate PDF report for rejected invoices
     */
    public byte[] generateRejectedInvoicesReport(Long providerId, LocalDate fromDate, LocalDate toDate) {
        log.info("[ProviderInvoicePdf] Generating rejected invoices report for provider {} from {} to {}", 
                providerId, fromDate, toDate);
        
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        
        // Get all claims
        List<Claim> allClaims = claimRepository.findByProviderIdAndServiceDateBetween(
                providerId, fromDate, toDate);
        
        // Filter claims with rejected status or claims where approved < requested (partial rejection)
        List<Claim> rejectedClaims = allClaims.stream()
                .filter(claim -> 
                    claim.getStatus() == ClaimStatus.REJECTED || 
                    hasPartialRejection(claim)
                )
                .collect(Collectors.toList());
        
        return generateProviderReport(
                provider,
                rejectedClaims,
                "تقرير الفواتير المرفوضة",
                fromDate,
                toDate,
                "PROVIDER_REJECTED"
        );
    }
    
    // ========== Private Helpers ==========
    
    /**
     * Check if claim has partial rejection (approved amount < requested amount)
     */
    private boolean hasPartialRejection(Claim claim) {
        if (claim.getApprovedAmount() == null || claim.getRequestedAmount() == null) {
            return false;
        }
        return claim.getApprovedAmount().compareTo(claim.getRequestedAmount()) < 0;
    }
    
    private byte[] generateProviderReport(Provider provider, List<Claim> claims, 
            String title, LocalDate fromDate, LocalDate toDate, String reportType) {
        
        try {
            PdfCompanySettings company = pdfCompanySettingsService.getActiveSettings();
            
            // Calculate summary
            Map<String, Object> summary = calculateSummary(claims);
            
            // Convert claims to report DTOs
            List<Map<String, Object>> claimRows = claims.stream()
                    .map(this::claimToReportRow)
                    .collect(Collectors.toList());
            
            // Build template context
            Context context = new Context(new Locale("ar"));
            context.setVariable("company", company);
            context.setVariable("provider", provider);
            context.setVariable("claims", claimRows);
            context.setVariable("reportTitle", title);
            context.setVariable("reportType", reportType);
            context.setVariable("fromDate", fromDate.format(DATE_FORMATTER));
            context.setVariable("toDate", toDate.format(DATE_FORMATTER));
            context.setVariable("reportDate", LocalDate.now().format(DATE_FORMATTER));
            context.setVariable("generatedAt", LocalDateTime.now().format(DATETIME_FORMATTER));
            context.setVariable("claimsCount", claims.size());
            
            // Add summary
            context.setVariable("totalRequestedAmount", summary.get("totalRequested"));
            context.setVariable("totalApprovedAmount", summary.get("totalApproved"));
            context.setVariable("totalRejectedAmount", summary.get("totalRejected"));
            context.setVariable("totalPendingAmount", summary.get("totalPending"));
            context.setVariable("approvedCount", summary.get("approvedCount"));
            context.setVariable("rejectedCount", summary.get("rejectedCount"));
            context.setVariable("pendingCount", summary.get("pendingCount"));
            
            // Render HTML
            String html = templateEngine.process("pdf/provider-invoices-report", context);
            
            // Convert to PDF
            return htmlToPdf(html);
            
        } catch (Exception e) {
            log.error("[ProviderInvoicePdf] Error generating report: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
        }
    }
    
    private Map<String, Object> calculateSummary(List<Claim> claims) {
        Map<String, Object> summary = new HashMap<>();
        
        BigDecimal totalRequested = BigDecimal.ZERO;
        BigDecimal totalApproved = BigDecimal.ZERO;
        BigDecimal totalRejected = BigDecimal.ZERO;
        BigDecimal totalPending = BigDecimal.ZERO;
        int approvedCount = 0;
        int rejectedCount = 0;
        int pendingCount = 0;
        
        for (Claim claim : claims) {
            BigDecimal requested = claim.getRequestedAmount() != null ? claim.getRequestedAmount() : BigDecimal.ZERO;
            BigDecimal approved = claim.getApprovedAmount() != null ? claim.getApprovedAmount() : BigDecimal.ZERO;
            
            totalRequested = totalRequested.add(requested);
            
            // Use actual ClaimStatus values from the enum
            switch (claim.getStatus()) {
                case APPROVED, SETTLED -> {
                    totalApproved = totalApproved.add(approved);
                    // Check if it's partial approval
                    if (approved.compareTo(requested) < 0) {
                        totalRejected = totalRejected.add(requested.subtract(approved));
                    }
                    approvedCount++;
                }
                case REJECTED -> {
                    totalRejected = totalRejected.add(requested);
                    rejectedCount++;
                }
                default -> {
                    // DRAFT, SUBMITTED, UNDER_REVIEW, RETURNED_FOR_INFO, APPROVAL_IN_PROGRESS
                    totalPending = totalPending.add(requested);
                    pendingCount++;
                }
            }
        }
        
        summary.put("totalRequested", totalRequested);
        summary.put("totalApproved", totalApproved);
        summary.put("totalRejected", totalRejected);
        summary.put("totalPending", totalPending);
        summary.put("approvedCount", approvedCount);
        summary.put("rejectedCount", rejectedCount);
        summary.put("pendingCount", pendingCount);
        
        return summary;
    }
    
    private Map<String, Object> claimToReportRow(Claim claim) {
        Map<String, Object> row = new HashMap<>();
        
        row.put("id", claim.getId());
        // Member uses getFullName(), not getName()
        row.put("memberName", claim.getMember() != null ? claim.getMember().getFullName() : "-");
        row.put("memberCardNumber", claim.getMember() != null ? claim.getMember().getCardNumber() : "-");
        row.put("serviceDate", claim.getServiceDate());
        row.put("diagnosisCode", claim.getDiagnosisCode());
        row.put("diagnosisDescription", claim.getDiagnosisDescription());
        row.put("doctorName", claim.getDoctorName());
        row.put("requestedAmount", claim.getRequestedAmount());
        row.put("approvedAmount", claim.getApprovedAmount());
        row.put("differenceAmount", claim.getDifferenceAmount());
        row.put("status", translateStatus(claim.getStatus()));
        row.put("statusCode", claim.getStatus().name());
        
        // Add lines summary
        if (claim.getLines() != null && !claim.getLines().isEmpty()) {
            row.put("lineCount", claim.getLines().size());
            row.put("lines", claim.getLines().stream()
                    .map(this::lineToRow)
                    .collect(Collectors.toList()));
        } else {
            row.put("lineCount", 0);
            row.put("lines", Collections.emptyList());
        }
        
        return row;
    }
    
    private Map<String, Object> lineToRow(ClaimLine line) {
        Map<String, Object> row = new HashMap<>();
        row.put("serviceName", line.getServiceName());
        row.put("serviceCode", line.getServiceCode());
        row.put("quantity", line.getQuantity());
        row.put("unitPrice", line.getUnitPrice());
        row.put("totalPrice", line.getTotalPrice());
        // ClaimLine doesn't have approvedAmount or rejectionReason
        // Use totalPrice as the basis and calculate difference at claim level
        row.put("approvedAmount", line.getTotalPrice()); // Default to full approval at line level
        row.put("rejectionReason", null); // No rejection reason at line level in current entity
        return row;
    }
    
    private String translateStatus(ClaimStatus status) {
        // Use getArabicLabel() from ClaimStatus enum
        return status.getArabicLabel();
    }
    
    private byte[] htmlToPdf(String html) throws Exception {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();
            
            // Add Arabic font support
            try {
                String fontPath = new ClassPathResource("fonts/NotoSansArabic-Regular.ttf").getFile().getAbsolutePath();
                renderer.getFontResolver().addFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            } catch (Exception e) {
                log.warn("[ProviderInvoicePdf] Could not load Arabic font, using fallback: {}", e.getMessage());
            }
            
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(baos);
            
            return baos.toByteArray();
        }
    }
}
