package com.waad.tba.modules.provider.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.provider.dto.ProviderClaimReportDto;
import com.waad.tba.modules.provider.dto.ProviderPreAuthReportDto;
import com.waad.tba.modules.provider.dto.ProviderVisitReportDto;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Provider Reports Service
 * 
 * Generates provider-specific reports with proper scoping and filtering.
 * All reports are strictly limited to the provider's own data.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProviderReportsService {
    
    private final EntityManager entityManager;
    
    /**
     * Get claims report for provider
     */
    public Page<ProviderClaimReportDto> getClaimsReport(
            Long providerId, 
            LocalDate fromDate, 
            LocalDate toDate,
            String status,
            String memberBarcode,
            Pageable pageable) {
        
        log.debug("Generating claims report: provider={}, fromDate={}, toDate={}", 
                providerId, fromDate, toDate);
        
        StringBuilder jpql = new StringBuilder(
            "SELECT c FROM Claim c WHERE c.providerId = :providerId");
        
        if (fromDate != null) {
            jpql.append(" AND c.createdAt >= :fromDate");
        }
        if (toDate != null) {
            jpql.append(" AND c.createdAt <= :toDate");
        }
        if (status != null && !status.isEmpty()) {
            jpql.append(" AND c.status = :status");
        }
        if (memberBarcode != null && !memberBarcode.isEmpty()) {
            jpql.append(" AND c.member.barcode = :memberBarcode");
        }
        
        jpql.append(" ORDER BY c.createdAt DESC");
        
        TypedQuery<Claim> query = entityManager.createQuery(jpql.toString(), Claim.class);
        query.setParameter("providerId", providerId);
        
        if (fromDate != null) {
            query.setParameter("fromDate", fromDate.atStartOfDay());
        }
        if (toDate != null) {
            query.setParameter("toDate", toDate.atTime(23, 59, 59));
        }
        if (status != null && !status.isEmpty()) {
            query.setParameter("status", status);
        }
        if (memberBarcode != null && !memberBarcode.isEmpty()) {
            query.setParameter("memberBarcode", memberBarcode);
        }
        
        // Get total count
        String countJpql = jpql.toString().replace("SELECT c FROM", "SELECT COUNT(c) FROM");
        countJpql = countJpql.substring(0, countJpql.indexOf("ORDER BY"));
        TypedQuery<Long> countQuery = entityManager.createQuery(countJpql, Long.class);
        countQuery.setParameter("providerId", providerId);
        if (fromDate != null) countQuery.setParameter("fromDate", fromDate.atStartOfDay());
        if (toDate != null) countQuery.setParameter("toDate", toDate.atTime(23, 59, 59));
        if (status != null && !status.isEmpty()) countQuery.setParameter("status", status);
        if (memberBarcode != null && !memberBarcode.isEmpty()) countQuery.setParameter("memberBarcode", memberBarcode);
        
        Long total = countQuery.getSingleResult();
        
        // Get paginated results
        List<Claim> claims = query
                .setFirstResult((int) pageable.getOffset())
                .setMaxResults(pageable.getPageSize())
                .getResultList();
        
        // Map to DTOs
        List<ProviderClaimReportDto> dtos = claims.stream()
                .map(this::mapClaimToReportDto)
                .toList();
        
        return new PageImpl<>(dtos, pageable, total);
    }
    
    /**
     * Get pre-auth report for provider
     */
    public Page<ProviderPreAuthReportDto> getPreAuthReport(
            Long providerId,
            LocalDate fromDate,
            LocalDate toDate,
            String status,
            String memberBarcode,
            Pageable pageable) {
        
        log.debug("Generating pre-auth report: provider={}", providerId);
        
        // TODO: Implement pre-auth report when PreAuthorization entity is available
        // For now, return empty page
        return new PageImpl<>(new ArrayList<>(), pageable, 0);
    }
    
    /**
     * Get visits report for provider
     */
    public Page<ProviderVisitReportDto> getVisitsReport(
            Long providerId,
            LocalDate fromDate,
            LocalDate toDate,
            String status,
            String memberBarcode,
            Pageable pageable) {
        
        log.debug("Generating visits report: provider={}", providerId);
        
        // TODO: Implement visits report when ProviderVisit entity is available
        // For now, return empty page
        return new PageImpl<>(new ArrayList<>(), pageable, 0);
    }
    
    /**
     * Map Claim entity to report DTO
     */
    private ProviderClaimReportDto mapClaimToReportDto(Claim claim) {
        return ProviderClaimReportDto.builder()
                .claimId(claim.getId())
                .claimNumber(String.valueOf(claim.getId()))
                .claimDate(claim.getServiceDate())
                .submissionDate(claim.getCreatedAt() != null ? claim.getCreatedAt().toLocalDate() : null)
                .memberName(claim.getMember().getFullName())
                .memberBarcode(claim.getMember().getBarcode())
                .civilId(claim.getMember().getNationalNumber() != null ? 
                    claim.getMember().getNationalNumber() : 
                    (claim.getMember().getCivilId() != null ? claim.getMember().getCivilId() : ""))
                .employerName(claim.getMember().getEmployer() != null ? 
                        claim.getMember().getEmployer().getName() : null)
                .claimedAmount(claim.getRequestedAmount() != null ? claim.getRequestedAmount() : BigDecimal.ZERO)
                .approvedAmount(claim.getApprovedAmount() != null ? claim.getApprovedAmount() : BigDecimal.ZERO)
                .rejectedAmount(claim.getDifferenceAmount() != null ? claim.getDifferenceAmount() : BigDecimal.ZERO)
                .netAmount(claim.getNetProviderAmount() != null ? claim.getNetProviderAmount() : BigDecimal.ZERO)
                .status(claim.getStatus() != null ? claim.getStatus().name() : "UNKNOWN")
                .statusLabel(getClaimStatusLabel(claim.getStatus() != null ? claim.getStatus().name() : ""))
                .servicesCount(claim.getLines() != null ? claim.getLines().size() : 0)
                .diagnosis(claim.getDiagnosisCode())
                .reviewerNotes(claim.getReviewerComment())
                .build();
    }
    
    private String getClaimStatusLabel(String status) {
        return switch (status != null ? status : "") {
            case "DRAFT" -> "مسودة";
            case "SUBMITTED" -> "مقدمة";
            case "UNDER_REVIEW" -> "قيد المراجعة";
            case "APPROVED" -> "موافق عليها";
            case "PARTIALLY_APPROVED" -> "موافق عليها جزئياً";
            case "REJECTED" -> "مرفوضة";
            case "PAID" -> "مدفوعة";
            default -> status;
        };
    }
}
