package com.waad.tba.modules.preauthorization.controller;

import com.waad.tba.modules.preauthorization.dto.*;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization.PreAuthStatus;
import com.waad.tba.modules.preauthorization.entity.PreAuthorizationAttachment;
import com.waad.tba.modules.preauthorization.service.PreAuthorizationService;
import com.waad.tba.modules.preauthorization.service.PreAuthorizationAttachmentService;
import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.dto.PaginationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST Controller for PreAuthorization management
 */
@RestController
@RequestMapping("/api/pre-authorizations")
@RequiredArgsConstructor
@Slf4j
public class PreAuthorizationController {

    private final PreAuthorizationService preAuthorizationService;
    private final PreAuthorizationAttachmentService attachmentService;

    // ==================== CREATE ====================

    /**
     * Create a new pre-authorization
     * POST /api/pre-authorizations
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CREATE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> createPreAuthorization(
            @Valid @RequestBody PreAuthorizationCreateDto dto,
            Authentication authentication) {
        
        log.info("[API] Creating pre-authorization for member {}", dto.getMemberId());
        
        String createdBy = authentication != null ? authentication.getName() : "system";
        PreAuthorizationResponseDto response = preAuthorizationService.createPreAuthorization(dto, createdBy);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Pre-authorization created successfully", response));
    }

    // ==================== UPDATE ====================

    /**
     * Update pre-authorization
     * PUT /api/pre-authorizations/{id}
     */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('UPDATE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> updatePreAuthorization(
            @PathVariable Long id,
            @Valid @RequestBody PreAuthorizationUpdateDto dto,
            Authentication authentication) {
        
        log.info("[API] Updating pre-authorization {}", id);
        
        String updatedBy = authentication != null ? authentication.getName() : "system";
        PreAuthorizationResponseDto response = preAuthorizationService.updatePreAuthorization(id, dto, updatedBy);
        
        return ResponseEntity.ok(ApiResponse.success("Pre-authorization updated successfully", response));
    }

    // ==================== APPROVE ====================

    /**
     * Approve pre-authorization
     * POST /api/pre-authorizations/{id}/approve
     */
    @PostMapping("/{id:\\d+}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('APPROVE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> approvePreAuthorization(
            @PathVariable Long id,
            @Valid @RequestBody PreAuthorizationApproveDto dto,
            Authentication authentication) {
        
        log.info("[API] Approving pre-authorization {}", id);
        
        String approvedBy = authentication != null ? authentication.getName() : "system";
        PreAuthorizationResponseDto response = preAuthorizationService.approvePreAuthorization(id, dto, approvedBy);
        
        return ResponseEntity.ok(ApiResponse.success("Pre-authorization approved successfully", response));
    }

    // ==================== REJECT ====================

    /**
     * Reject pre-authorization
     * POST /api/pre-authorizations/{id}/reject
     */
    @PostMapping("/{id:\\d+}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('REJECT_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> rejectPreAuthorization(
            @PathVariable Long id,
            @Valid @RequestBody PreAuthorizationRejectDto dto,
            Authentication authentication) {
        
        log.info("[API] Rejecting pre-authorization {}", id);
        
        String rejectedBy = authentication != null ? authentication.getName() : "system";
        PreAuthorizationResponseDto response = preAuthorizationService.rejectPreAuthorization(id, dto, rejectedBy);
        
        return ResponseEntity.ok(ApiResponse.success("Pre-authorization rejected", response));
    }

    // ==================== CANCEL ====================

    /**
     * Cancel pre-authorization
     * POST /api/pre-authorizations/{id}/cancel
     */
    @PostMapping("/{id:\\d+}/cancel")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CANCEL_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> cancelPreAuthorization(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        
        log.info("[API] Cancelling pre-authorization {}", id);
        
        String cancelledBy = authentication != null ? authentication.getName() : "system";
        String cancelReason = reason != null ? reason : "Cancelled by user";
        PreAuthorizationResponseDto response = preAuthorizationService.cancelPreAuthorization(id, cancelReason, cancelledBy);
        
        return ResponseEntity.ok(ApiResponse.success("Pre-authorization cancelled", response));
    }

    // ==================== DELETE ====================

    /**
     * Delete pre-authorization (soft delete)
     * DELETE /api/pre-authorizations/{id}
     */
    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasAuthority('DELETE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<Void>> deletePreAuthorization(
            @PathVariable Long id,
            Authentication authentication) {
        
        log.info("[API] Deleting pre-authorization {}", id);
        
        String deletedBy = authentication != null ? authentication.getName() : "system";
        preAuthorizationService.deletePreAuthorization(id, deletedBy);
        
        return ResponseEntity.ok(ApiResponse.<Void>success("Pre-authorization deleted successfully", null));
    }

    // ==================== ATTACHMENTS ====================

    /**
     * Upload attachment for pre-authorization
     * POST /api/pre-authorizations/{id}/attachments
     */
    @PostMapping(value = "/{id:\\d+}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('CREATE_PRE_AUTH') or hasAuthority('UPDATE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationAttachment>> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "attachmentType", defaultValue = "OTHER") String attachmentType,
            Authentication authentication) {
        
        log.info("[API] Uploading attachment for pre-authorization {}, type: {}", id, attachmentType);
        
        String uploadedBy = authentication != null ? authentication.getName() : "system";
        PreAuthorizationAttachment attachment = attachmentService.uploadAttachment(id, file, attachmentType, uploadedBy);
        
        return ResponseEntity.ok(ApiResponse.success("Attachment uploaded successfully", attachment));
    }

    // ==================== GET ALL (PAGINATED) ====================

    /**
     * Get all pre-authorizations with pagination
     * GET /api/pre-authorizations
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<Page<PreAuthorizationResponseDto>>> getAllPreAuthorizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        log.info("[API] Fetching all pre-authorizations, page: {}, size: {}", page, size);
        
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<PreAuthorizationResponseDto> preAuthsPage = preAuthorizationService.getAllPreAuthorizations(pageable);
        
        return ResponseEntity.ok(ApiResponse.success(preAuthsPage));
    }

    // ==================== INBOX - PENDING PRE-AUTHORIZATIONS ====================

    /**
     * Get pending pre-authorizations for inbox (Operations Queue)
     * GET /api/pre-authorizations/inbox/pending
     * 
     * Returns pre-authorizations with PENDING status for review.
     * Ordered by createdAt ASC (FIFO - First In First Out) by default.
     */
    @GetMapping("/inbox/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<Page<PreAuthorizationResponseDto>>> getPendingInbox(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDir) {
        
        log.info("[API] Fetching pending pre-authorizations for inbox, page: {}, size: {}", page, size);
        
        Sort.Direction direction = Sort.Direction.fromString(sortDir);
        // Convert 1-based page to 0-based for Spring Data (like ClaimController does)
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), size, Sort.by(direction, sortBy));
        
        Page<PreAuthorizationResponseDto> pageResult = preAuthorizationService.getPendingInbox(pageable);
        
        return ResponseEntity.ok(ApiResponse.success(pageResult));
    }

    // ==================== GET BY ID ====================

    /**
     * Get pre-authorization by ID
     * GET /api/pre-authorizations/{id}
     */
    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> getPreAuthorizationById(@PathVariable Long id) {
        log.info("[API] Fetching pre-authorization {}", id);
        
        PreAuthorizationResponseDto response = preAuthorizationService.getPreAuthorizationById(id);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ==================== GET BY REFERENCE ====================

    /**
     * Get pre-authorization by reference number
     * GET /api/pre-authorizations/reference/{referenceNumber}
     */
    @GetMapping("/reference/{referenceNumber}")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> getPreAuthorizationByReference(
            @PathVariable String referenceNumber) {
        
        log.info("[API] Fetching pre-authorization by reference {}", referenceNumber);
        
        PreAuthorizationResponseDto response = preAuthorizationService.getPreAuthorizationByReference(referenceNumber);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ==================== GET BY MEMBER ====================

    /**
     * Get pre-authorizations by member
     * GET /api/pre-authorizations/member/{memberId}
     */
    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<PaginationResponse<PreAuthorizationResponseDto>> getPreAuthorizationsByMember(
            @PathVariable Long memberId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        log.info("[API] Fetching pre-authorizations for member {}", memberId);
        
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<PreAuthorizationResponseDto> preAuthsPage = preAuthorizationService.getPreAuthorizationsByMember(memberId, pageable);
        
        return ResponseEntity.ok(PaginationResponse.of(preAuthsPage));
    }

    // ==================== GET BY PROVIDER ====================

    /**
     * Get pre-authorizations by provider
     * GET /api/pre-authorizations/provider/{providerId}
     */
    @GetMapping("/provider/{providerId}")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<PaginationResponse<PreAuthorizationResponseDto>> getPreAuthorizationsByProvider(
            @PathVariable Long providerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        log.info("[API] Fetching pre-authorizations for provider {}", providerId);
        
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<PreAuthorizationResponseDto> preAuthsPage = preAuthorizationService.getPreAuthorizationsByProvider(providerId, pageable);
        
        return ResponseEntity.ok(PaginationResponse.of(preAuthsPage));
    }

    // ==================== GET BY STATUS ====================

    /**
     * Get pre-authorizations by status
     * GET /api/pre-authorizations/status/{status}
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<PaginationResponse<PreAuthorizationResponseDto>> getPreAuthorizationsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        log.info("[API] Fetching pre-authorizations with status {}", status);
        
        PreAuthStatus preAuthStatus = PreAuthStatus.valueOf(status.toUpperCase());
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<PreAuthorizationResponseDto> preAuthsPage = preAuthorizationService.getPreAuthorizationsByStatus(preAuthStatus, pageable);
        
        return ResponseEntity.ok(PaginationResponse.of(preAuthsPage));
    }

    // ==================== FIND VALID FOR CLAIM ====================

    /**
     * Find valid pre-authorization for claim submission
     * GET /api/pre-authorizations/valid
     */
    @GetMapping("/valid")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> findValidPreAuthorization(
            @RequestParam Long memberId,
            @RequestParam Long providerId,
            @RequestParam String serviceCode) {
        
        log.info("[API] Finding valid pre-authorization for member {}, provider {}, service {}", 
                 memberId, providerId, serviceCode);
        
        PreAuthorizationResponseDto response = preAuthorizationService.findValidPreAuthorization(
                memberId, providerId, serviceCode
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ==================== MAINTENANCE ====================

    /**
     * Mark expired pre-authorizations (admin/scheduled task)
     * POST /api/pre-authorizations/maintenance/mark-expired
     */
    @PostMapping("/maintenance/mark-expired")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> markExpiredPreAuthorizations() {
        log.info("[API] Marking expired pre-authorizations");
        
        int count = preAuthorizationService.markExpiredPreAuthorizations();
        
        return ResponseEntity.ok(ApiResponse.success(count + " pre-authorizations marked as expired", Integer.valueOf(count)));
    }

    // ==================== START REVIEW ====================

    /**
     * Start review of a pre-authorization (PENDING → UNDER_REVIEW)
     * POST /api/pre-authorizations/{id}/start-review
     */
    @PostMapping("/{id:\\d+}/start-review")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH') or hasAuthority('APPROVE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> startReview(
            @PathVariable Long id,
            Authentication authentication) {
        
        log.info("[API] Starting review for pre-authorization {}", id);
        
        String reviewedBy = authentication != null ? authentication.getName() : "system";
        PreAuthorizationResponseDto response = preAuthorizationService.startReview(id, reviewedBy);
        
        return ResponseEntity.ok(ApiResponse.success("تم استلام طلب الموافقة المسبقة للمراجعة", response));
    }

    // ==================== CHECK VALIDITY ====================

    /**
     * Check if member has valid pre-authorization for service
     * GET /api/pre-authorizations/check-validity
     */
    @GetMapping("/check-validity")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> checkValidity(
            @RequestParam Long memberId,
            @RequestParam String serviceCode) {
        
        log.info("[API] Checking validity for member {}, service {}", memberId, serviceCode);
        
        PreAuthorizationResponseDto response = preAuthorizationService.checkValidity(memberId, serviceCode);
        
        if (response != null) {
            return ResponseEntity.ok(ApiResponse.success("يوجد موافقة مسبقة صالحة", response));
        } else {
            return ResponseEntity.ok(ApiResponse.success("لا توجد موافقة مسبقة صالحة", null));
        }
    }

    // ==================== ATTACHMENTS ====================

    /**
     * Upload attachment to pre-authorization
     * POST /api/pre-authorizations/{id}/attachments
     */


    /**
     * Get all attachments for a pre-authorization
     * GET /api/pre-authorizations/{id}/attachments
     */
    @GetMapping("/{id:\\d+}/attachments")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<ApiResponse<List<PreAuthorizationAttachment>>> getAttachments(@PathVariable Long id) {
        log.info("[API] Getting attachments for pre-authorization {}", id);
        
        List<PreAuthorizationAttachment> attachments = attachmentService.getAttachments(id);
        return ResponseEntity.ok(ApiResponse.success("تم استرجاع المرفقات", attachments));
    }

    /**
     * Download specific attachment
     * GET /api/pre-authorizations/{id}/attachments/{attachmentId}
     */
    @GetMapping("/{id:\\d+}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable Long attachmentId) {
        
        log.info("[API] Downloading attachment {} from pre-authorization {}", attachmentId, id);
        
        try {
            PreAuthorizationAttachment attachment = attachmentService.getAttachment(attachmentId);
            byte[] fileContent = attachmentService.downloadAttachment(attachmentId);
            
            ByteArrayResource resource = new ByteArrayResource(fileContent);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(attachment.getFileType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + attachment.getOriginalFileName() + "\"")
                    .contentLength(fileContent.length)
                    .body(resource);
        } catch (RuntimeException e) {
            log.error("Failed to download attachment {}: {}", attachmentId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete attachment
     * DELETE /api/pre-authorizations/{id}/attachments/{attachmentId}
     */
    @DeleteMapping("/{id:\\d+}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('UPDATE_PRE_AUTH') or hasAuthority('DELETE_PRE_AUTH')")
    public ResponseEntity<ApiResponse<Void>> deleteAttachment(
            @PathVariable Long id,
            @PathVariable Long attachmentId) {
        
        log.info("[API] Deleting attachment {} from pre-authorization {}", attachmentId, id);
        
        try {
            attachmentService.deleteAttachment(attachmentId);
            return ResponseEntity.ok(ApiResponse.<Void>success("تم حذف المرفق بنجاح", null));
        } catch (RuntimeException e) {
            log.error("Failed to delete attachment {}: {}", attachmentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("فشل في حذف المرفق: " + e.getMessage()));
        }
    }
}
