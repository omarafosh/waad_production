package com.waad.tba.modules.member.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.member.dto.ChronicConditionCreateDto;
import com.waad.tba.modules.member.dto.ChronicConditionResponseDto;
import com.waad.tba.modules.member.dto.ChronicConditionUpdateDto;
import com.waad.tba.modules.member.enums.ChronicConditionType;
import com.waad.tba.modules.member.enums.ChronicCoverageStatus;
import com.waad.tba.modules.member.service.MemberChronicConditionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for Member Chronic Conditions Management.
 * 
 * Provides comprehensive API for:
 * - Managing chronic conditions for members
 * - Coverage validation
 * - Statistics and reporting
 */
@Slf4j
@RestController
@RequestMapping("/api/chronic-conditions")
@RequiredArgsConstructor
@Tag(name = "Chronic Conditions", description = "إدارة الأمراض المزمنة للأعضاء")
public class MemberChronicConditionController {

    private final MemberChronicConditionService conditionService;

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/condition-types")
    @Operation(summary = "Get all chronic condition types", description = "الحصول على جميع أنواع الأمراض المزمنة")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConditionTypes() {
        List<Map<String, Object>> types = Arrays.stream(ChronicConditionType.values())
                .map(type -> Map.<String, Object>of(
                        "code", type.getCode(),
                        "value", type.name(),
                        "nameAr", type.getNameAr(),
                        "nameEn", type.getNameEn(),
                        "icd10Code", type.getIcd10Code() != null ? type.getIcd10Code() : "",
                        "defaultWaitingPeriodDays", type.getDefaultWaitingPeriodDays()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("أنواع الأمراض المزمنة", types));
    }

    @GetMapping("/coverage-statuses")
    @Operation(summary = "Get all coverage statuses", description = "الحصول على جميع حالات التغطية")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCoverageStatuses() {
        List<Map<String, Object>> statuses = Arrays.stream(ChronicCoverageStatus.values())
                .map(status -> Map.<String, Object>of(
                        "value", status.name(),
                        "labelAr", status.getLabelAr(),
                        "labelEn", status.getLabelEn(),
                        "allowsClaims", status.allowsClaims(),
                        "requiresPreApproval", status.requiresPreApproval()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("حالات التغطية", statuses));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CRUD OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MEDICAL_REVIEWER')")
    @Operation(summary = "Add chronic condition", description = "إضافة مرض مزمن للعضو")
    public ResponseEntity<ApiResponse<ChronicConditionResponseDto>> create(
            @Valid @RequestBody ChronicConditionCreateDto dto) {
        log.info("[API] Creating chronic condition for member: {}", dto.getMemberId());

        ChronicConditionResponseDto result = conditionService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("تم إضافة المرض المزمن بنجاح", result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get condition by ID", description = "الحصول على مرض مزمن بالمعرف")
    public ResponseEntity<ApiResponse<ChronicConditionResponseDto>> getById(@PathVariable Long id) {
        ChronicConditionResponseDto result = conditionService.findById(id);
        return ResponseEntity.ok(ApiResponse.success("بيانات المرض المزمن", result));
    }

    @GetMapping("/member/{memberId}")
    @Operation(summary = "Get conditions for member", description = "الحصول على الأمراض المزمنة للعضو")
    public ResponseEntity<ApiResponse<List<ChronicConditionResponseDto>>> getByMemberId(
            @PathVariable Long memberId) {
        List<ChronicConditionResponseDto> result = conditionService.findByMemberId(memberId);
        return ResponseEntity.ok(ApiResponse.success("الأمراض المزمنة للعضو", result));
    }

    @GetMapping("/member/{memberId}/paged")
    @Operation(summary = "Get conditions for member (paged)", description = "الحصول على الأمراض المزمنة للعضو مع صفحات")
    public ResponseEntity<ApiResponse<Page<ChronicConditionResponseDto>>> getByMemberIdPaged(
            @PathVariable Long memberId,
            Pageable pageable) {
        Page<ChronicConditionResponseDto> result = conditionService.findByMemberId(memberId, pageable);
        return ResponseEntity.ok(ApiResponse.success("الأمراض المزمنة للعضو", result));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('INSURANCE_ADMIN', 'SUPER_ADMIN', 'MEDICAL_REVIEWER')")
    @Operation(summary = "Update condition", description = "تحديث بيانات المرض المزمن")
    public ResponseEntity<ApiResponse<ChronicConditionResponseDto>> update(
            @PathVariable Long id,
            @Valid @RequestBody ChronicConditionUpdateDto dto) {
        log.info("[API] Updating chronic condition: {}", id);

        ChronicConditionResponseDto result = conditionService.update(id, dto);
        return ResponseEntity.ok(ApiResponse.success("تم تحديث المرض المزمن بنجاح", result));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('INSURANCE_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete condition", description = "حذف المرض المزمن (حذف منطقي)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        log.info("[API] Deleting chronic condition: {}", id);

        conditionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("تم حذف المرض المزمن بنجاح", null));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    @PatchMapping("/{id}/coverage-status")
    @PreAuthorize("hasAnyRole('INSURANCE_ADMIN', 'SUPER_ADMIN', 'MEDICAL_REVIEWER')")
    @Operation(summary = "Update coverage status", description = "تحديث حالة التغطية")
    public ResponseEntity<ApiResponse<ChronicConditionResponseDto>> updateCoverageStatus(
            @PathVariable Long id,
            @RequestParam ChronicCoverageStatus status,
            @RequestParam(required = false) String reason) {
        log.info("[API] Updating coverage status for condition: {} to {}", id, status);

        ChronicConditionResponseDto result = conditionService.updateCoverageStatus(id, status, reason);
        return ResponseEntity.ok(ApiResponse.success("تم تحديث حالة التغطية بنجاح", result));
    }

    @PatchMapping("/{id}/verify-documentation")
    @PreAuthorize("hasAnyRole('INSURANCE_ADMIN', 'SUPER_ADMIN', 'MEDICAL_REVIEWER')")
    @Operation(summary = "Verify documentation", description = "التحقق من المستندات الطبية")
    public ResponseEntity<ApiResponse<ChronicConditionResponseDto>> verifyDocumentation(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("[API] Verifying documentation for condition: {}", id);

        String verifiedBy = userDetails != null ? userDetails.getUsername() : "system";
        ChronicConditionResponseDto result = conditionService.verifyDocumentation(id, verifiedBy);
        return ResponseEntity.ok(ApiResponse.success("تم التحقق من المستندات بنجاح", result));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/member/{memberId}/has-conditions")
    @Operation(summary = "Check if member has chronic conditions", description = "التحقق من وجود أمراض مزمنة للعضو")
    public ResponseEntity<ApiResponse<Boolean>> hasChronicConditions(@PathVariable Long memberId) {
        boolean result = conditionService.memberHasChronicConditions(memberId);
        return ResponseEntity.ok(ApiResponse.success(
                result ? "العضو لديه أمراض مزمنة" : "العضو ليس لديه أمراض مزمنة", result));
    }

    @GetMapping("/validate-claim")
    @Operation(summary = "Validate claim for chronic condition", description = "التحقق من صلاحية المطالبة للمرض المزمن")
    public ResponseEntity<ApiResponse<MemberChronicConditionService.ChronicClaimValidationResult>> validateClaim(
            @RequestParam Long memberId,
            @RequestParam ChronicConditionType conditionType,
            @RequestParam(required = false) BigDecimal claimAmount) {

        var result = conditionService.validateClaimForChronicCondition(memberId, conditionType, claimAmount);
        
        String message = result.isApproved() 
                ? (result.requiresPreApproval() ? "المطالبة تتطلب موافقة مسبقة" : "المطالبة مقبولة")
                : "المطالبة مرفوضة: " + result.rejectionReason();

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    @GetMapping("/member/{memberId}/is-covered")
    @Operation(summary = "Check if condition is covered", description = "التحقق من تغطية المرض المزمن")
    public ResponseEntity<ApiResponse<Boolean>> isConditionCovered(
            @PathVariable Long memberId,
            @RequestParam ChronicConditionType conditionType) {
        boolean result = conditionService.isConditionCovered(memberId, conditionType);
        return ResponseEntity.ok(ApiResponse.success(
                result ? "المرض مغطى" : "المرض غير مغطى", result));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH & REPORTS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/pending-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MEDICAL_REVIEWER')")
    @Operation(summary = "Get conditions pending review", description = "الحصول على الأمراض المزمنة قيد المراجعة")
    public ResponseEntity<ApiResponse<List<ChronicConditionResponseDto>>> getPendingReview() {
        List<ChronicConditionResponseDto> result = conditionService.findPendingReview();
        return ResponseEntity.ok(ApiResponse.success("الأمراض المزمنة قيد المراجعة", result));
    }

    @GetMapping("/search")
    @Operation(summary = "Search conditions", description = "البحث في الأمراض المزمنة")
    public ResponseEntity<ApiResponse<Page<ChronicConditionResponseDto>>> search(
            @Parameter(description = "نوع المرض المزمن") @RequestParam(required = false) ChronicConditionType conditionType,
            @Parameter(description = "حالة التغطية") @RequestParam(required = false) ChronicCoverageStatus coverageStatus,
            @Parameter(description = "معرف صاحب العمل") @RequestParam(required = false) Long employerId,
            @Parameter(description = "تم التحقق من المستندات") @RequestParam(required = false) Boolean verified,
            Pageable pageable) {

        Page<ChronicConditionResponseDto> result = conditionService.search(
                conditionType, coverageStatus, employerId, verified, pageable);
        return ResponseEntity.ok(ApiResponse.success("نتائج البحث", result));
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Get statistics", description = "الحصول على إحصائيات الأمراض المزمنة")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatistics() {
        Map<String, Object> stats = conditionService.getStatistics();
        return ResponseEntity.ok(ApiResponse.success("إحصائيات الأمراض المزمنة", stats));
    }
}
