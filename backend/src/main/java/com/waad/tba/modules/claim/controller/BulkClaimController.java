package com.waad.tba.modules.claim.controller;

import com.waad.tba.modules.claim.dto.BulkUploadResultDto;
import com.waad.tba.modules.claim.service.BulkClaimService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/claims/bulk")
@RequiredArgsConstructor
@Tag(name = "Bulk Claims", description = "API for bulk operations on claims")
public class BulkClaimController {

    private final BulkClaimService bulkClaimService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload Bulk Claims Excel", description = "Upload an Excel file containing multiple claims")
    public ResponseEntity<BulkUploadResultDto> uploadClaims(
            @RequestParam("file") MultipartFile file,
            @RequestParam("providerId") Long providerId) {
        
        // In production, providerId should be extracted from security context
        BulkUploadResultDto result = bulkClaimService.processBulkUpload(file, providerId);
        return ResponseEntity.ok(result);
    }
}
