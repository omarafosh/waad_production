package com.waad.tba.modules.eligibility.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.eligibility.domain.EligibilityResult;
import com.waad.tba.modules.eligibility.dto.EligibilityCheckRequest;
import com.waad.tba.modules.eligibility.dto.EligibilityCheckResponse;
import com.waad.tba.modules.eligibility.entity.EligibilityCheck;
import com.waad.tba.modules.eligibility.repository.EligibilityCheckRepository;
import com.waad.tba.modules.eligibility.service.EligibilityEngineService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Eligibility Controller
 * Phase E1 - Eligibility Engine
 * 
 * REST API for eligibility verification.
 * 
 * Endpoints:
 * - POST /api/eligibility/check - Check member eligibility
 * - GET /api/eligibility/logs - View audit logs
 * - GET /api/eligibility/logs/{requestId} - View specific check
 * - GET /api/eligibility/rules - List active rules
 * 
 * @author TBA WAAD System
 * @version 2025.1
 */
@Slf4j
@RestController
@RequestMapping("/api/eligibility")
@RequiredArgsConstructor
@Tag(name = "Eligibility", description = "Eligibility Engine API - Member eligibility verification")
public class EligibilityController {

    private final EligibilityEngineService eligibilityService;
    private final EligibilityCheckRepository eligibilityCheckRepository;
    private final AuthorizationService authorizationService;

    // ============================================
    // Eligibility Check
    // ============================================

    @Operation(
            summary = "Check Member Eligibility",
            description = "Verify if a member is eligible for a medical service on a specific date. " +
                    "Returns eligibility status with detailed reasons and snapshot."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Eligibility check completed",
                    content = @Content(schema = @Schema(implementation = EligibilityCheckResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid request parameters"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Insufficient permissions"
            )
    })
    @PostMapping("/check")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('eligibility.check')")
    public ResponseEntity<ApiResponse<EligibilityCheckResponse>> checkEligibility(
            @Valid @RequestBody EligibilityCheckRequest request) {

        log.info("[EligibilityAPI] Check request - MemberID: {}, ServiceDate: {}",
                request.getMemberId(), request.getServiceDate());

        // Execute eligibility check
        EligibilityResult result = eligibilityService.checkEligibility(request);

        // Convert to DTO
        EligibilityCheckResponse response = EligibilityCheckResponse.from(result);

        // Return appropriate response based on eligibility
        if (result.isEligible()) {
            return ResponseEntity.ok(ApiResponse.success(
                    "تم التحقق من الأهلية بنجاح - مؤهل", response));
        } else {
            return ResponseEntity.ok(ApiResponse.success(
                    "تم التحقق من الأهلية - غير مؤهل", response));
        }
    }

    // ============================================
    // Audit Logs
    // ============================================

    @Operation(
            summary = "Get Eligibility Check Logs",
            description = "View audit trail of eligibility checks. Filterable by member, policy, and date range."
    )
    @GetMapping("/logs")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('eligibility.view_logs')")
    public ResponseEntity<ApiResponse<Page<EligibilityCheck>>> getLogs(
            @Parameter(description = "Filter by member ID")
            @RequestParam(required = false) Long memberId,

            @Parameter(description = "Filter by policy ID")
            @RequestParam(required = false) Long policyId,

            @Parameter(description = "Search by name, civil ID, or request ID")
            @RequestParam(required = false) String search,

            @PageableDefault(size = 20, sort = "checkTimestamp") Pageable pageable) {

        User currentUser = authorizationService.getCurrentUser();
        boolean isAdmin = currentUser != null && authorizationService.isAdmin(currentUser);
        Long companyScopeId = isAdmin ? null : (currentUser != null ? currentUser.getEmployerId() : null);

        Page<EligibilityCheck> logs;

        if (memberId != null) {
            logs = eligibilityCheckRepository.findByMemberId(memberId, pageable);
        } else if (policyId != null) {
            logs = eligibilityCheckRepository.findByPolicyId(policyId, pageable);
        } else if (search != null && !search.isEmpty()) {
            logs = eligibilityCheckRepository.search(companyScopeId, search, pageable);
        } else if (companyScopeId != null) {
            logs = eligibilityCheckRepository.findByCompanyScopeId(companyScopeId, pageable);
        } else {
            logs = eligibilityCheckRepository.findAll(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success("تم جلب سجلات التحقق من الأهلية", logs));
    }

    @Operation(
            summary = "Get Eligibility Check by Request ID",
            description = "Retrieve a specific eligibility check record by its unique request ID."
    )
    @GetMapping("/logs/{requestId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('eligibility.view_logs')")
    public ResponseEntity<ApiResponse<EligibilityCheck>> getLogByRequestId(
            @PathVariable String requestId) {

        return eligibilityCheckRepository.findByRequestId(requestId)
                .map(check -> ResponseEntity.ok(ApiResponse.success("تم جلب سجل التحقق", check)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ============================================
    // Rules Info
    // ============================================

    @Operation(
            summary = "Get Active Eligibility Rules",
            description = "List all active eligibility rules in evaluation order."
    )
    @GetMapping("/rules")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('eligibility.check')")
    public ResponseEntity<ApiResponse<List<String>>> getActiveRules() {
        List<String> rules = eligibilityService.getActiveRules();
        return ResponseEntity.ok(ApiResponse.success("قواعد التحقق من الأهلية النشطة", rules));
    }

    // ============================================
    // Health Check (No auth required)
    // ============================================

    @Operation(
            summary = "Eligibility Engine Health Check",
            description = "Check if the eligibility engine is operational."
    )
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        int ruleCount = eligibilityService.getActiveRules().size();
        return ResponseEntity.ok(ApiResponse.success(
                "محرك الأهلية يعمل بشكل صحيح",
                "OK - " + ruleCount + " rules active"));
    }
}
