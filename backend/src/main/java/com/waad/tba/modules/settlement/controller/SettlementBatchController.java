package com.waad.tba.modules.settlement.controller;

import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.settlement.dto.*;
import com.waad.tba.modules.settlement.entity.SettlementBatch;
import com.waad.tba.modules.settlement.entity.SettlementBatch.BatchStatus;
import com.waad.tba.modules.settlement.entity.SettlementBatch.PaymentMethod;
import com.waad.tba.modules.settlement.service.SettlementBatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Settlement Batch Management API
 * 
 * Provides endpoints for the full lifecycle of settlement batches.
 */
@RestController
@RequestMapping("/api/v1/settlement/batches")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Settlement Batches", description = "Manage settlement batches (Create, Add Claims, Confirm, Pay)")
public class SettlementBatchController {

    private final SettlementBatchService batchService;

    // TODO: Use a proper UserDetails/Principal object to get ID. 
    // For now assuming a placeholder or adapting to existing security context.
    // In real app: @AuthenticationPrincipal UserPrincipal user
    private Long getCurrentUserId() {
        return 1L; // Mock ID for development if security not fully integrated yet, or extract from context
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create a new draft batch
     */
    @PostMapping
    @PreAuthorize("hasAuthority('SETTLEMENT_CREATE')")
    @Operation(summary = "Create a new settlement batch", description = "Creates a DRAFT batch for a provider")
    public ResponseEntity<BatchSummaryDTO> createBatch(
            @Valid @RequestBody CreateBatchRequest request) {
        
        BatchSummaryDTO batch = batchService.createBatch(request, getCurrentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(batch);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFY (DRAFT ONLY)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add claims to batch
     */
    @PostMapping("/{batchId}/claims")
    @PreAuthorize("hasAuthority('SETTLEMENT_EDIT')")
    @Operation(summary = "Add claims to batch", description = "Adds multiple claims to an existing DRAFT batch")
    public ResponseEntity<Void> addClaims(
            @PathVariable Long batchId,
            @Valid @RequestBody AddClaimsToBatchRequest request) {
        
        batchService.addClaimsToBatch(batchId, request.getClaimIds(), getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    /**
     * Remove claims from batch
     */
    @DeleteMapping("/{batchId}/claims")
    @PreAuthorize("hasAuthority('SETTLEMENT_EDIT')")
    @Operation(summary = "Remove claims from batch", description = "Removes claims from a DRAFT batch")
    public ResponseEntity<Void> removeClaims(
            @PathVariable Long batchId,
            @Valid @RequestBody RemoveClaimsFromBatchRequest request) {
        
        batchService.removeClaimsFromBatch(batchId, request.getClaimIds(), getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WORKFLOW TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Confirm batch (Lock it)
     */
    @PutMapping("/{batchId}/confirm")
    @PreAuthorize("hasAuthority('SETTLEMENT_CONFIRM')")
    @Operation(summary = "Confirm batch", description = "Transitions batch from DRAFT to CONFIRMED. Locks aggregation.")
    public ResponseEntity<Void> confirmBatch(
            @PathVariable Long batchId,
            @RequestBody(required = false) ConfirmSettlementBatchRequest request) {
        
        String notes = request != null ? request.getNotes() : null;
        batchService.confirmBatch(batchId, notes, getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    /**
     * Pay batch (Financial Transaction)
     */
    @PutMapping("/{batchId}/pay")
    @PreAuthorize("hasAuthority('SETTLEMENT_PAY')")
    @Operation(summary = "Pay batch", description = "Transitions batch from CONFIRMED to PAID. Debits provider account.")
    public ResponseEntity<Void> payBatch(
            @PathVariable Long batchId,
            @Valid @RequestBody PaySettlementBatchRequest request) {
        
        PaymentMethod method = PaymentMethod.valueOf(request.getPaymentMethod());
        batchService.payBatch(batchId, request.getPaymentReference(), method, getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    /**
     * Cancel batch
     */
    @PutMapping("/{batchId}/cancel")
    @PreAuthorize("hasAuthority('SETTLEMENT_CANCEL')")
    @Operation(summary = "Cancel batch", description = "Cancels a DRAFT or CONFIRMED batch.")
    public ResponseEntity<Void> cancelBatch(
            @PathVariable Long batchId,
            @Valid @RequestBody CancelSettlementBatchRequest request) {
        
        batchService.cancelBatch(batchId, request.getReason(), getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get batch details
     */
    @GetMapping("/{batchId}")
    @PreAuthorize("hasAuthority('SETTLEMENT_VIEW')")
    @Operation(summary = "Get batch details", description = "Returns full details of a batch")
    public ResponseEntity<BatchSummaryDTO> getBatch(@PathVariable Long batchId) {
        BatchSummaryDTO batch = batchService.getBatchSummary(batchId);
        return ResponseEntity.ok(batch);
    }

    /**
     * List batches with filtering
     */
    @GetMapping
    @PreAuthorize("hasAuthority('SETTLEMENT_VIEW')")
    @Operation(summary = "List batches", description = "Paginated list of batches with optional status filter")
    public ResponseEntity<SettlementBatchListResponse> listBatches(
            @Parameter(description = "Filter by status (DRAFT, CONFIRMED, PAID, CANCELLED)") 
            @RequestParam(required = false) BatchStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<SettlementBatch> page = batchService.listBatches(status, pageable);
        
        // Manual mapping to DTO list response
        List<SettlementBatchListResponse.BatchSummaryItem> items = page.getContent().stream()
                .map(this::mapToSummaryItem)
                .collect(Collectors.toList());
        
        SettlementBatchListResponse response = SettlementBatchListResponse.builder()
                .batches(items)
                .currentPage(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
        
        return ResponseEntity.ok(response);
    }
    
    // Mapper helper
    private SettlementBatchListResponse.BatchSummaryItem mapToSummaryItem(SettlementBatch batch) {
        String providerName = "Unknown";
        try {
            Provider provider = batchService.getProviderForBatch(batch);
            if (provider != null) {
                providerName = provider.getName();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch provider for batch {}", batch.getId(), e);
        }
        
        String createdAtStr = "N/A";
        if (batch.getCreatedAt() != null) {
            createdAtStr = batch.getCreatedAt().toLocalDate().toString();
        }
        
        return SettlementBatchListResponse.BatchSummaryItem.builder()
                .batchId(batch.getId())
                .batchNumber(batch.getBatchNumber())
                .providerName(providerName)
                .status(batch.getStatus().name())
                .statusArabic(batch.getStatus().getArabicLabel())
                .claimCount(batch.getTotalClaimsCount())
                .totalNetAmount(batch.getTotalNetAmount())
                .paymentReference(batch.getPaymentReference())
                .createdByName("User #" + batch.getCreatedBy()) // Placeholder
                .createdAt(createdAtStr)
                .modifiable(batch.isModifiable())
                .build();
    }
}
