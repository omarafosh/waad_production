package com.waad.tba.modules.claim.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.dto.PaginationResponse;
import com.waad.tba.modules.claim.dto.ClaimApproveDto;
import com.waad.tba.modules.claim.dto.ClaimCreateDto;
import com.waad.tba.modules.claim.dto.ClaimRejectDto;
import com.waad.tba.modules.claim.dto.ClaimReturnForInfoDto;
import com.waad.tba.modules.claim.dto.ClaimSettleDto;
import com.waad.tba.modules.claim.dto.ClaimUpdateDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
import com.waad.tba.modules.claim.dto.CostBreakdownDto;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.service.ClaimApprovalService;
import com.waad.tba.modules.claim.service.ClaimService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
@Tag(name = "Claims", description = "Claims Management APIs - Full Lifecycle")
public class ClaimController {

    private final ClaimService claimService;
    private final ClaimApprovalService claimApprovalService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAnyAuthority('CLAIM_MANAGE', 'CLAIM_CREATE')")
    public ResponseEntity<ApiResponse<ClaimViewDto>> createClaim(@Valid @RequestBody ClaimCreateDto dto) {
        ClaimViewDto claim = claimService.createClaim(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Claim created successfully", claim));
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAnyAuthority('CLAIM_MANAGE', 'CLAIM_UPDATE')")
    public ResponseEntity<ApiResponse<ClaimViewDto>> updateClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimUpdateDto dto) {
        ClaimViewDto claim = claimService.updateClaim(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Claim updated successfully", claim));
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    public ResponseEntity<ApiResponse<ClaimViewDto>> getClaim(@PathVariable Long id) {
        ClaimViewDto claim = claimService.getClaim(id);
        return ResponseEntity.ok(ApiResponse.success("Claim retrieved successfully", claim));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    public ResponseEntity<ApiResponse<PaginationResponse<ClaimViewDto>>> listClaims(
            @RequestParam(required = false) Long employerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search) {
        Page<ClaimViewDto> claimsPage = claimService.listClaims(
                employerId, Math.max(0, page - 1), size, sortBy, sortDir, search);

        PaginationResponse<ClaimViewDto> response = PaginationResponse.<ClaimViewDto>builder()
                .items(claimsPage.getContent())
                .total(claimsPage.getTotalElements())
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> deleteClaim(@PathVariable Long id) {
        claimService.deleteClaim(id);
        return ResponseEntity.ok(ApiResponse.success("Claim deleted successfully", null));
    }

    @GetMapping("/count")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    public ResponseEntity<ApiResponse<Long>> countClaims(
            @RequestParam(required = false) Long employerId) {
        long count = claimService.countClaims(employerId);
        return ResponseEntity.ok(ApiResponse.success("Claims counted successfully", count));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    public ResponseEntity<ApiResponse<List<ClaimViewDto>>> search(
            @RequestParam(required = false) Long employerId,
            @RequestParam String query) {
        List<ClaimViewDto> results = claimService.search(employerId, query);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    public ResponseEntity<ApiResponse<List<ClaimViewDto>>> getClaimsByMember(@PathVariable Long memberId) {
        List<ClaimViewDto> claims = claimService.getClaimsByMember(memberId);
        return ResponseEntity.ok(ApiResponse.success("Member claims retrieved successfully", claims));
    }

    @GetMapping("/pre-authorization/{preAuthorizationId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    public ResponseEntity<ApiResponse<List<ClaimViewDto>>> getClaimsByPreAuthorization(@PathVariable Long preAuthorizationId) {
        List<ClaimViewDto> claims = claimService.getClaimsByPreAuthorization(preAuthorizationId);
        return ResponseEntity.ok(ApiResponse.success("Pre-authorization claims retrieved successfully", claims));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MVP PHASE: Claim Lifecycle Endpoints
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Submit a draft claim for review.
     * Transitions: DRAFT → SUBMITTED
     */
    @PostMapping("/{id:\\d+}/submit")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAnyAuthority('CLAIM_MANAGE', 'CLAIM_CREATE')")
    @Operation(summary = "Submit claim for review", description = "Submit a draft claim for review. Validates required attachments.")
    public ResponseEntity<ApiResponse<ClaimViewDto>> submitClaim(@PathVariable Long id) {
        ClaimViewDto claim = claimService.submitClaim(id);
        return ResponseEntity.ok(ApiResponse.success("تم تقديم المطالبة للمراجعة بنجاح", claim));
    }

    /**
     * Take a submitted claim for review.
     * Transitions: SUBMITTED → UNDER_REVIEW
     */
    @PostMapping("/{id:\\d+}/start-review")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_APPROVE')")
    @Operation(summary = "Start review", description = "Take a submitted claim for review. Transitions to UNDER_REVIEW status.")
    public ResponseEntity<ApiResponse<ClaimViewDto>> startReview(@PathVariable Long id) {
        ClaimViewDto claim = claimApprovalService.startReview(id);
        return ResponseEntity.ok(ApiResponse.success("تم استلام المطالبة للمراجعة", claim));
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * SPLIT-PHASE APPROVAL: Approve claim asynchronously (non-blocking)
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * POST /api/claims/{id}/approve
     * 
     * Returns immediately with status APPROVAL_IN_PROGRESS.
     * Heavy calculations execute in background.
     * 
     * Client should poll GET /api/claims/{id} to check for final status.
     * 
     * Validates:
     * - Coverage limits (via CoverageValidationService)
     * - Financial snapshot equation: RequestedAmount = PatientCoPay + NetProviderAmount
     */
    @PostMapping("/{id:\\d+}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_APPROVE')")
    @Operation(summary = "Approve claim (async)", description = "Request claim approval. Returns immediately with APPROVAL_IN_PROGRESS status. Poll /api/claims/{id} for final result.")
    public ResponseEntity<ApiResponse<ClaimViewDto>> approveClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimApproveDto dto) {
        ClaimViewDto claim = claimApprovalService.requestApproval(id, dto);
        return ResponseEntity.ok(ApiResponse.success("جاري معالجة الموافقة...", claim));
    }

    /**
     * Reject a claim with mandatory reason.
     * Transitions: SUBMITTED/UNDER_REVIEW → REJECTED (terminal)
     */
    @PostMapping("/{id:\\d+}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_APPROVE')")
    @Operation(summary = "Reject claim", description = "Reject a claim. Rejection reason is mandatory.")
    public ResponseEntity<ApiResponse<ClaimViewDto>> rejectClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimRejectDto dto) {
        ClaimViewDto claim = claimApprovalService.rejectClaim(id, dto);
        return ResponseEntity.ok(ApiResponse.success("تم رفض المطالبة", claim));
    }

    /**
     * Settle a claim (mark ready for payment).
     * Transitions: APPROVED → SETTLED (terminal)
     */
    @PostMapping("/{id:\\d+}/settle")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('SETTLE_CLAIMS')")
    @Operation(summary = "Settle claim", description = "Settle an approved claim. Requires payment reference number.")
    public ResponseEntity<ApiResponse<ClaimViewDto>> settleClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimSettleDto dto) {
        ClaimViewDto claim = claimService.settleClaim(id, dto);
        return ResponseEntity.ok(ApiResponse.success("تمت تسوية المطالبة بنجاح", claim));
    }

    /**
     * Return a claim for additional information.
     * Transitions: UNDER_REVIEW → RETURNED_FOR_INFO
     * 
     * Business Rules:
     * - Claim must be in UNDER_REVIEW status
     * - Reason is mandatory
     * - Member can then edit and resubmit
     */
    @PostMapping("/{id:\\d+}/return-for-info")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_APPROVE')")
    @Operation(summary = "Return for info", description = "Return a claim for additional information. Member can then edit and resubmit.")
    public ResponseEntity<ApiResponse<ClaimViewDto>> returnForInfo(
            @PathVariable Long id,
            @Valid @RequestBody ClaimReturnForInfoDto dto) {
        ClaimViewDto claim = claimApprovalService.returnForInfo(id, dto);
        return ResponseEntity.ok(ApiResponse.success("تم إعادة المطالبة لطلب معلومات إضافية", claim));
    }

    /**
     * Get cost breakdown for a claim (Financial Snapshot).
     * Shows: RequestedAmount | PatientCoPay | NetProviderAmount
     */
    @GetMapping("/{id:\\d+}/cost-breakdown")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    @Operation(summary = "Get cost breakdown", description = "Get detailed cost breakdown including deductible, co-pay, and insurance amount.")
    public ResponseEntity<ApiResponse<CostBreakdownDto>> getCostBreakdown(@PathVariable Long id) {
        CostBreakdownDto breakdown = claimService.getCostBreakdownDto(id);
        return ResponseEntity.ok(ApiResponse.success("تم استرجاع تفاصيل التكلفة", breakdown));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MVP PHASE: Inbox Endpoints (for Operations Staff)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get claims pending review (Inbox for reviewers).
     * Returns claims in SUBMITTED or UNDER_REVIEW status.
     */
    @GetMapping("/inbox/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    @Operation(summary = "Claims pending review", description = "Get claims awaiting review (SUBMITTED or UNDER_REVIEW status)")
    public ResponseEntity<ApiResponse<PaginationResponse<ClaimViewDto>>> getPendingClaims(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Page<ClaimViewDto> claimsPage = claimApprovalService.getPendingClaims(
                Math.max(0, page - 1), size, sortBy, sortDir);

        PaginationResponse<ClaimViewDto> response = PaginationResponse.<ClaimViewDto>builder()
                .items(claimsPage.getContent())
                .total(claimsPage.getTotalElements())
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(ApiResponse.success("المطالبات المعلقة", response));
    }

    /**
     * Get approved claims ready for settlement (Inbox for finance).
     */
    @GetMapping("/inbox/approved")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    @Operation(summary = "Claims ready for settlement", description = "Get approved claims awaiting settlement (APPROVED status)")
    public ResponseEntity<ApiResponse<PaginationResponse<ClaimViewDto>>> getApprovedClaims(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "reviewedAt") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Page<ClaimViewDto> claimsPage = claimApprovalService.getApprovedClaims(
                Math.max(0, page - 1), size, sortBy, sortDir);

        PaginationResponse<ClaimViewDto> response = PaginationResponse.<ClaimViewDto>builder()
                .items(claimsPage.getContent())
                .total(claimsPage.getTotalElements())
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(ApiResponse.success("المطالبات الموافق عليها", response));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ADDITIONAL QUERY ENDPOINTS (Added 2026-01-14)
    // For Contract-First compliance
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get claims by Visit ID.
     * Returns all claims associated with a specific visit.
     */
    @GetMapping("/visit/{visitId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    @Operation(summary = "Get claims by visit", description = "Retrieve all claims for a specific visit")
    public ResponseEntity<ApiResponse<List<ClaimViewDto>>> getClaimsByVisit(@PathVariable Long visitId) {
        List<ClaimViewDto> claims = claimService.getClaimsByVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success("Claims for visit retrieved successfully", claims));
    }

    /**
     * Get claim by claim number.
     * Returns a single claim by its unique identifier.
     */
    @GetMapping("/number/{claimNumber}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    @Operation(summary = "Get claim by number", description = "Retrieve a claim by its unique claim number")
    public ResponseEntity<ApiResponse<ClaimViewDto>> getClaimByNumber(@PathVariable Long claimNumber) {
        ClaimViewDto claim = claimService.getClaimByNumber(claimNumber);
        return ResponseEntity.ok(ApiResponse.success("Claim retrieved successfully", claim));
    }

    /**
     * Get claims by status with pagination.
     * Returns claims filtered by their status.
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CLAIM_VIEW')")
    @Operation(summary = "Get claims by status", description = "Retrieve claims filtered by status with pagination")
    public ResponseEntity<ApiResponse<PaginationResponse<ClaimViewDto>>> getClaimsByStatus(
            @PathVariable ClaimStatus status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Page<ClaimViewDto> claimsPage = claimService.getClaimsByStatus(
                status, Math.max(0, page - 1), size, sortBy, sortDir);

        PaginationResponse<ClaimViewDto> response = PaginationResponse.<ClaimViewDto>builder()
                .items(claimsPage.getContent())
                .total(claimsPage.getTotalElements())
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Claims by status retrieved", response));
    }
}
