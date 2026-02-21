package com.waad.tba.modules.provider.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.provider.dto.ProviderEligibilityRequest;
import com.waad.tba.modules.provider.dto.ProviderEligibilityResponse;
import com.waad.tba.modules.provider.dto.AllowedEmployerDto;
import com.waad.tba.modules.provider.dto.ProviderClaimRequest;
import com.waad.tba.modules.provider.dto.ProviderClaimResponse;
import com.waad.tba.modules.provider.dto.ProviderVisitRegisterRequest;
import com.waad.tba.modules.provider.dto.ProviderVisitResponse;
import com.waad.tba.modules.provider.dto.EffectivePriceResponseDto;
import com.waad.tba.modules.provider.service.ProviderPortalService;
import com.waad.tba.modules.provider.service.ProviderClaimsService;
import com.waad.tba.modules.provider.service.ProviderVisitService;
import com.waad.tba.modules.provider.service.ProviderServiceService;
import com.waad.tba.modules.providercontract.service.ProviderContractService;
import com.waad.tba.modules.providercontract.service.ProviderContractPricingItemService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.security.ProviderContextGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

import com.waad.tba.modules.visit.repository.VisitRepository;
import com.waad.tba.modules.visit.entity.Visit;

import com.waad.tba.common.exception.ResourceNotFoundException;
import org.springframework.validation.annotation.Validated;
import java.util.List;
import java.util.Map;

import java.time.LocalDate;


/**
 * Provider Portal Controller.
 * 
 * Healthcare provider interface for:
 * - Real-time eligibility verification
 * - Member card scanning (QR Code / Manual entry)
 * - Coverage verification
 * - Claims submission (future)
 * - Pre-authorization requests (future)
 * 
 * @since Phase 1 - Provider Portal
 */
@Slf4j
@RestController
@RequestMapping("/api/provider")
@RequiredArgsConstructor
@Validated // Added @Validated
@Tag(name = "بوابة المزود", description = "نقطة الوصول الموحدة لخدمات بوابة المزود (الأهلية، المطالبات، الزيارات)")
public class ProviderPortalController {

        private final ProviderPortalService providerPortalService;
        private final AuthorizationService authorizationService;
        private final ProviderClaimsService providerClaimsService;
        private final VisitRepository visitRepository;
        private final ProviderVisitService providerVisitService;
        private final ProviderServiceService providerServiceService;
        private final ProviderContractService providerContractService;

        private final com.waad.tba.modules.provider.service.ProviderService providerService;
        private final com.waad.tba.modules.provider.service.ProviderDocumentService providerDocumentService;

        // NEW: Modern provider contract module service for my-contract endpoints
        @Qualifier("providerContractModuleService")
        private final com.waad.tba.modules.providercontract.service.ProviderContractService modernContractService;

        private final ProviderContractPricingItemService pricingItemService;

        // For pre-approval services lookup
        private final com.waad.tba.modules.member.repository.MemberRepository memberRepository;
        private final com.waad.tba.modules.benefitpolicy.service.BenefitPolicyRuleService benefitPolicyRuleService;

        private final ProviderContextGuard providerContextGuard;

        /**
         * Check Member Eligibility.
         * 
         * الفحص يتم فقط بـ:
         * - الباركود (WAD-2026-00001234)
         * - رقم البطاقة (Card Number)
         * 
         * ملاحظة: الرقم الوطني لا يُستخدم للفحص - يظهر فقط كمعلومات أساسية
         * 
         * Returns:
         * - Member information
         * - Eligibility status
         * - Coverage details
         * - Available annual limit
         * - Family members (if applicable)
         * 
         * <p>
         * <b>Provider Flow:</b>
         * </p>
         * 1. Scan member card / QR code OR enter barcode/card number
         * 2. System verifies eligibility in real-time
         * 3. Display member + all family members
         * 4. Provider selects patient from family
         * 5. Proceed with service/claim
         * 
         * POST /api/provider/eligibility-check
         */
        @PostMapping("/eligibility-check")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "التحقق من أهلية العضو (بوابة المزود)", description = "التحقق الفوري من الأهلية لمقدمي الرعاية الصحية. "
                        +
                        "يدعم مسح الباركود، رمز الاستجابة السريعة، أو إدخال رقم البطاقة. " +
                        "يعرض معلومات العضو وتفاصيل التغطية وأفراد العائلة.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم التحقق من الأهلية بنجاح", content = @Content(schema = @Schema(implementation = ProviderEligibilityResponse.class)))
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "العضو غير موجود")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "طلب غير صالح - مطلوب باركود أو رقم بطاقة")
        public ResponseEntity<ProviderEligibilityResponse> checkEligibility(
                        @Valid @RequestBody ProviderEligibilityRequest request) {

                // ═══════════════════════════════════════════════════════════════════════════
                // PROVIDER SECURITY HARDENING (2026-01-16): Validate provider binding
                // ═══════════════════════════════════════════════════════════════════════════
                User currentUser = authorizationService.getCurrentUser();
                if (currentUser != null && authorizationService.isProvider(currentUser)) {
                        providerContextGuard.validateProviderBinding(currentUser);
                }

                String provider = currentUser != null
                                ? currentUser.getUsername()
                                : "UNKNOWN";

                log.info("🏥 Provider eligibility check: provider={}, barcode={}",
                                provider,
                                request.getBarcode());

                ProviderEligibilityResponse response = providerPortalService.checkEligibility(request, provider);

                log.info("✅ Eligibility check completed: eligible={}, familySize={}, principal={}",
                                response.getEligible(),
                                response.getFamilyMembers().size(),
                                response.getPrincipalMember() != null ? response.getPrincipalMember().getFullName()
                                                : "N/A");

                return ResponseEntity.ok(response);
        }

        /**
         * Quick Eligibility Check by Barcode (Simplified).
         * 
         * GET /api/provider/eligibility/{barcode}
         * 
         * Example: GET /api/provider/eligibility/WAD-2026-00001234
         */
        @GetMapping("/eligibility/{barcode}")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "تحقق سريع من الأهلية بالباركود (GET)", description = "تحقق مبسط من الأهلية باستخدام الباركود فقط. "
                        +
                        "مفيد لماسحات رمز الاستجابة السريعة التي تطلق طلبات GET.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم التحقق من الأهلية بنجاح")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "العضو غير موجود")
        public ResponseEntity<ProviderEligibilityResponse> checkEligibilityByBarcode(
                        @PathVariable String barcode) {

                String provider = authorizationService.getCurrentUser() != null
                                ? authorizationService.getCurrentUser().getUsername()
                                : "UNKNOWN";

                log.info("🏥 Provider eligibility check (GET): provider={}, barcode={}", provider, barcode);

                ProviderEligibilityRequest request = ProviderEligibilityRequest.builder()
                                .barcode(barcode)
                                .build();

                ProviderEligibilityResponse response = providerPortalService.checkEligibility(request, provider);

                return ResponseEntity.ok(response);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // CLAIMS SUBMISSION
        // ═══════════════════════════════════════════════════════════════════════════

        /**
         * Submit Claim (Provider Portal).
         * 
         * Healthcare provider submits claim for a member after service delivery.
         * 
         * Flow:
         * 1. Select member (from eligibility check results)
         * 2. Enter service details (type, date, amount)
         * 3. Upload attachments (invoices, medical reports)
         * 4. System validates annual limit & service limits
         * 5. Submit claim for review
         * 
         * <p>
         * <b>Validation:</b>
         * </p>
         * - Member must be active
         * - Claimed amount must not exceed annual limit
         * - Service-level limits checked (if applicable)
         * - Warnings shown if approaching 80% limit
         * 
         * POST /api/provider/claims/submit
         */
        @PostMapping("/claims/submit")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "تقديم مطالبة (بوابة المزود)", description = "تقديم مطالبة للعضو مع التحقق التلقائي من الحدود. "
                        +
                        "يدعم المطالبات النقدية والفواتير المباشرة. " +
                        "يعرض استجابة مفصلة مع تحذيرات إذا اقتربت من الحد الأقصى.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم تقديم المطالبة بنجاح (قد تتضمن تحذيرات)", content = @Content(schema = @Schema(implementation = ProviderClaimResponse.class)))
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "طلب غير صالح أو تجاوز الحدود")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "العضو غير موجود")
        public ResponseEntity<ProviderClaimResponse> submitClaim(
                        @Valid @RequestBody ProviderClaimRequest request) {

                String provider = authorizationService.getCurrentUser() != null
                                ? authorizationService.getCurrentUser().getUsername()
                                : "UNKNOWN";

                log.info("🏥 Provider claim submission: provider={}, memberId={}, amount={}, type={}",
                                provider,
                                request.getMemberId(),
                                request.getClaimedAmount(),
                                request.getClaimType());

                ProviderClaimResponse response = providerClaimsService.submitClaim(request, provider);

                if (response.getSuccess()) {
                        log.info("✅ Claim submitted: claimId={}, ref={}, status={}",
                                        response.getClaimId(),
                                        response.getClaimReferenceNumber(),
                                        response.getStatusCode());
                } else {
                        log.warn("❌ Claim submission failed: member={}, reason={}",
                                        request.getMemberId(),
                                        response.getMessage());
                }

                return ResponseEntity.ok(response);
        }

        /**
         * ✅ PHASE 1: Submit Claim with File Attachments.
         * 
         * Accepts:
         * - Claim data (JSON) via @RequestPart
         * - Multiple file attachments (PDF, JPEG, PNG) via @RequestPart
         * 
         * File upload specifications:
         * - Max file size: 5 MB per file
         * - Max total size: 20 MB (4 files × 5 MB)
         * - Allowed types: PDF, JPEG, PNG
         * - Max files: 10
         * 
         * Transaction Handling:
         * - All operations are atomic (claim + files)
         * - If any file upload fails, entire claim is rolled back
         * - Ensures data consistency
         * 
         * POST /api/provider/submit-claim-with-attachments
         * Content-Type: multipart/form-data
         * 
         * Example Request:
         * --boundary
         * Content-Disposition: form-data; name="claim"
         * Content-Type: application/json
         * 
         * {
         * "memberId": 123,
         * "claimedAmount": 500.00,
         * "claimType": "OUTPATIENT",
         * ...
         * }
         * --boundary
         * Content-Disposition: form-data; name="files"; filename="invoice.pdf"
         * Content-Type: application/pdf
         * 
         * [binary data]
         * --boundary--
         * 
         * @param claimJson JSON string of ProviderClaimRequest
         * @param files     Array of multipart files (can be empty for claims without
         *                  attachments)
         * @return ProviderClaimResponse with claim ID and upload status
         */
        @PostMapping(value = "/submit-claim-with-attachments", consumes = "multipart/form-data")
        @PreAuthorize("hasRole('PROVIDER') or hasRole('SUPER_ADMIN')")
        @Operation(summary = "تقديم مطالبة مع مرفقات", description = "تقديم مطالبة طبية مع رفع الملفات المرفقة (PDF, Images)")
        public ApiResponse<ProviderClaimResponse> submitClaimWithAttachments(
                        @RequestPart("claim") String claimJson,
                        @RequestPart(value = "attachments", required = false) MultipartFile[] attachments) {

                String username = authorizationService.getCurrentUser().getUsername();
                log.info("📥 [Portal] Received claim with attachments from: {}, json length: {}",
                                username, claimJson.length());

                try {
                        ProviderClaimResponse response = providerClaimsService.submitClaimWithAttachments(
                                        claimJson, attachments, username);

                        if (response.getSuccess()) {
                                return ApiResponse.success("تم تقديم المطالبة بنجاح", response);
                        } else {
                                return ApiResponse.error(response.getMessage());
                        }
                } catch (Exception e) {
                        log.error("❌ Error submitting claim with attachments", e);
                        return ApiResponse.error("فشل تقديم المطالبة: " + e.getMessage());
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // VISIT REGISTRATION & VISIT LOG (NEW FLOW 2026-01-13)
        // ═══════════════════════════════════════════════════════════════════════════

        /**
         * Register Visit (Provider Portal).
         * 
         * NEW FLOW:
         * 1. Provider performs eligibility check
         * 2. Selects eligible member from results
         * 3. Clicks "Register Visit" → this endpoint is called
         * 4. Visit is created and linked to member
         * 5. Provider can then create Claim or Pre-Authorization from Visit Log
         * 
         * POST /api/provider/visits/register
         */
        @PostMapping("/visits/register")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "تسجيل زيارة (بوابة المزود)", description = "تسجيل زيارة جديدة لعضو بعد التحقق من الأهلية. "
                        +
                        "ينشئ زيارة مرتبطة بالعضو. استخدم معرف الزيارة لإنشاء " +
                        "مطالبة أو تفويض مسبق لاحقًا.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم تسجيل الزيارة بنجاح", content = @Content(schema = @Schema(implementation = ProviderVisitResponse.class)))
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "طلب غير صالح أو العضو غير مؤهل")
        public ResponseEntity<ProviderVisitResponse> registerVisit(
                        @Valid @RequestBody ProviderVisitRegisterRequest request) {

                String provider = authorizationService.getCurrentUser() != null
                                ? authorizationService.getCurrentUser().getUsername()
                                : "UNKNOWN";

                log.info("📋 Provider visit registration: provider={}, memberId={}",
                                provider, request.getMemberId());

                ProviderVisitResponse response = providerVisitService.registerVisit(request, provider);

                if (response.getSuccess()) {
                        log.info("✅ Visit registered: visitId={}, member={}",
                                        response.getVisitId(), response.getMemberName());
                } else {
                        log.warn("❌ Visit registration failed: member={}, reason={}",
                                        request.getMemberId(), response.getMessage());
                }

                return ResponseEntity.ok(response);
        }

        /**
         * Get Visit Log (Provider Portal).
         * 
         * Returns paginated list of visits with optional filters.
         * Each visit shows available actions (Create Claim / Create Pre-Auth).
         * 
         * GET /api/provider/visits
         */
        @GetMapping("/visits")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN', 'REVIEWER')")
        @Operation(summary = "جلب سجل الزيارات (بوابة المزود)", description = "يعرض قائمة بالزيارات مقسمة بصفحات مع فلاتر. "
                        +
                        "تظهر كل زيارة علامات canCreateClaim و canCreatePreAuth.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم استرداد سجل الزيارات بنجاح")
        public ResponseEntity<Page<ProviderVisitResponse>> getVisitLog(
                        @Parameter(description = "فلتر معرف العضو") @RequestParam(required = false) Long memberId,
                        @Parameter(description = "بحث باسم العضو/رقم البطاقة/الرقم المدني") @RequestParam(required = false) String memberName,
                        @Parameter(description = "فلتر الحالة (REGISTERED, IN_PROGRESS, CLAIM_SUBMITTED, etc.)") @RequestParam(required = false) String status,
                        @Parameter(description = "فلتر من تاريخ (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
                        @Parameter(description = "فلتر إلى تاريخ (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
                        @Parameter(description = "رقم الصفحة (يبدأ من 0)") @RequestParam(defaultValue = "0") int page,
                        @Parameter(description = "حجم الصفحة") @RequestParam(defaultValue = "10") int size,
                        @Parameter(description = "حقل الفرز") @RequestParam(defaultValue = "visitDate") String sortBy,
                        @Parameter(description = "اتجاه الفرز (asc/desc)") @RequestParam(defaultValue = "desc") String sortDir) {

                String providerUsername = authorizationService.getCurrentUser() != null
                                ? authorizationService.getCurrentUser().getUsername()
                                : "UNKNOWN";

                // ════════════════════════════════════════════════════════════════════════
                // PROVIDER ISOLATION: Use ProviderContextGuard to get provider filter
                // - PROVIDER role: Only sees their own visits
                // - ADMIN roles: See all visits (filter = null)
                // ════════════════════════════════════════════════════════════════════════
                Long providerId = providerContextGuard.getProviderFilter();

                log.debug(
                                "📋 Provider visit log request: user={}, providerId={}, member={}, memberName={}, status={}, fromDate={}, toDate={}",
                                providerUsername, providerId, memberId, memberName, status, fromDate, toDate);

                Sort sort = sortDir.equalsIgnoreCase("desc")
                                ? Sort.by(sortBy).descending()
                                : Sort.by(sortBy).ascending();

                PageRequest pageable = PageRequest.of(page, size, sort);

                Page<ProviderVisitResponse> visits = providerVisitService.getVisitLog(
                                providerId, memberId, memberName, status, fromDate, toDate, pageable);

                return ResponseEntity.ok(visits);
        }

        /**
         * Get Visit Details (Provider Portal).
         * 
         * GET /api/provider/visits/{id}
         */
        @GetMapping("/visits/{id}")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN', 'REVIEWER')")
        @Operation(summary = "جلب تفاصيل الزيارة (بوابة المزود)", description = "يعرض معلومات الزيارة التفصيلية بما في ذلك العضو، "
                        +
                        "المزود، والإجراءات المتاحة.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم استرداد تفاصيل الزيارة بنجاح")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "الزيارة غير موجودة")
        public ResponseEntity<ProviderVisitResponse> getVisitById(@PathVariable Long id) {

                log.debug("📋 Provider visit details request: visitId={}", id);

                ProviderVisitResponse visit = providerVisitService.getVisitById(id);

                if (!visit.getSuccess()) {
                        return ResponseEntity.notFound().build();
                }

                return ResponseEntity.ok(visit);
        }

        /**
         * Get Visit Context (Decision Payload).
         * 
         * GET /api/provider/visits/{id}/context
         */
        @GetMapping("/visit/{visitId}/context")
        @PreAuthorize("hasRole('PROVIDER') or hasRole('SUPER_ADMIN')")
        @Operation(summary = "جلب سياق الزيارة لإنشاء المطالبة", description = "يتحقق من صحة الزيارة ويرجع البيانات اللازمة لإنشاء مطالبة أو تفويض مسبق.")
        public ResponseEntity<ApiResponse<Map<String, Object>>> getVisitContext(
                        @PathVariable Long visitId) {

                log.info("[PROVIDER-PORTAL] GET /api/provider/visit/{}/context", visitId);

                try {
                        Visit visit = visitRepository.findById(visitId)
                                        .orElseThrow(() -> new ResourceNotFoundException("الزيارة غير موجودة",
                                                        visitId));

                        // Basic validation: Ensure the current provider is associated with this visit
                        Long currentProviderId = providerContextGuard.getProviderFilter();
                        if (currentProviderId != null && !visit.getProviderId().equals(currentProviderId)) {
                                throw new SecurityException("المزود الحالي غير مصرح له بالوصول إلى هذه الزيارة.");
                        }

                        // Build context map
                        Map<String, Object> response = new java.util.HashMap<>();
                        response.put("visitId", visit.getId());
                        response.put("providerId", visit.getProviderId());
                        response.put("providerName", "المزود رقم " + visit.getProviderId());
                        response.put("memberId", visit.getMember().getId());
                        response.put("memberName", visit.getMember().getFullName());
                        response.put("memberCard", visit.getMember().getCardNumber());
                        response.put("visitDate", visit.getVisitDate());
                        response.put("encounterType", visit.getVisitType());

                        // Add flags for UI decision making
                        response.put("canCreateClaim", true); // Placeholder, actual logic would be more complex
                        response.put("canCreatePreAuth", true); // Placeholder

                        return ResponseEntity.ok(ApiResponse.success("تم جلب سياق الزيارة", response));
                } catch (ResourceNotFoundException e) {
                        log.warn("[PROVIDER-PORTAL] Visit not found: {}", e.getMessage());
                        return ResponseEntity.status(404)
                                        .body(ApiResponse.error(e.getMessage()));
                } catch (SecurityException e) {
                        log.warn("[PROVIDER-PORTAL] Security violation for visit {}: {}", visitId, e.getMessage());
                        return ResponseEntity.status(403)
                                        .body(ApiResponse.error(e.getMessage()));
                } catch (Exception e) {
                        log.error("[PROVIDER-PORTAL] Error fetching visit context: {}", e.getMessage(), e);
                        return ResponseEntity.badRequest()
                                        .body(ApiResponse.error("تعذر جلب بيانات الزيارة: " + e.getMessage()));
                }
        }

        // ════════════════════════════════════════════════════════════════════════════
        // PROVIDER MEDICAL SERVICES (For Claims & Pre-Auth)
        // ════════════════════════════════════════════════════════════════════════════

        /**
         * Get Medical Services Available to Provider.
         * 
         * Returns the list of medical services that this provider is contracted to
         * offer.
         * Used by Claims and Pre-Authorization forms to populate service dropdowns.
         * 
         * SECURITY: Provider gets their own services, Admin can specify providerId.
         * 
         * GET /api/provider/my-services
         */
        @GetMapping("/my-services")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "جلب خدمات المزود المتعاقد عليها (بوابة المزود)", description = "يعرض الخدمات الطبية المتاحة لهذا المزود لاستخدامها في المطالبات والتفويضات المسبقة.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم استرداد الخدمات بنجاح")
        public ResponseEntity<ApiResponse<List<ProviderServiceDto>>> getMyServices() {

                // ════════════════════════════════════════════════════════════════════════
                // PROVIDER ISOLATION: Get services for the current provider only
                // ════════════════════════════════════════════════════════════════════════
                Long providerId = providerContextGuard.getProviderFilter();

                if (providerId == null) {
                        // Admin without provider binding - return empty list
                        return ResponseEntity.ok(ApiResponse.success("لا يوجد مزود مرتبط", List.of()));
                }

                log.debug("📋 Provider services request: providerId={}", providerId);

                List<com.waad.tba.modules.provider.dto.ProviderServiceResponseDto> services = providerServiceService
                                .getProviderServices(providerId);

                // Map to simplified DTO for frontend
                List<ProviderServiceDto> result = services.stream()
                                .map(s -> ProviderServiceDto.builder()
                                                .serviceId(s.getId())
                                                .serviceCode(s.getServiceCode())
                                                .serviceName(s.getServiceName())
                                                .categoryCode(s.getCategoryCode())
                                                .categoryName(s.getCategoryName())
                                                .requiresPA(false) // PA requirement comes from BenefitPolicyRule, not
                                                                   // MedicalService
                                                .build())
                                .collect(java.util.stream.Collectors.toList());

                return ResponseEntity.ok(ApiResponse.success(result));
        }

        /**
         * Get effective price for a service (Provider Portal).
         * 
         * This endpoint allows PROVIDER role users to fetch the contract price
         * for a specific service. SECURITY: Provider can only access their own prices.
         * 
         * GET /api/provider/my-services/{serviceCode}/price
         * 
         * @param serviceCode The medical service code
         * @param date        Optional effective date (defaults to today)
         * @return Contract price information
         */
        @GetMapping("/my-services/{serviceCode}/price")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "جلب سعر الخدمة للمزود (بوابة المزود)", description = "يعرض سعر العقد الفعال لخدمة معينة. "
                        +
                        "يمكن لمستخدمي المزود الوصول إلى أسعار عقودهم فقط.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم استرداد السعر بنجاح")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "الخدمة أو العقد غير موجود")
        public ResponseEntity<ApiResponse<EffectivePriceResponseDto>> getServicePrice(
                        @PathVariable String serviceCode,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

                // ════════════════════════════════════════════════════════════════════════
                // PROVIDER ISOLATION: Get provider ID from security context
                // ════════════════════════════════════════════════════════════════════════
                Long providerId = providerContextGuard.getProviderFilter();

                if (providerId == null) {
                        // Admin without provider binding - return error
                        return ResponseEntity.badRequest()
                                        .body(ApiResponse.error("لا يوجد مزود مرتبط بالمستخدم الحالي"));
                }

                log.info("[PROVIDER-PORTAL] GET /api/provider/my-services/{}/price, providerId={}, date={}",
                                serviceCode, providerId, date);

                try {
                        EffectivePriceResponseDto priceResponse = providerContractService.getEffectivePrice(
                                        providerId, serviceCode, date);

                        return ResponseEntity.ok(ApiResponse.success(priceResponse));
                } catch (Exception e) {
                        log.warn("[PROVIDER-PORTAL] Price lookup failed: {}", e.getMessage());
                        // Return graceful fallback instead of 500
                        EffectivePriceResponseDto fallback = EffectivePriceResponseDto.builder()
                                        .providerId(providerId)
                                        .serviceCode(serviceCode)
                                        .hasContract(false)
                                        .message("تعذر استرداد السعر: " + e.getMessage())
                                        .build();
                        return ResponseEntity.ok(ApiResponse.success(fallback));
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // MY CONTRACT ENDPOINTS (PROVIDER SELF-ACCESS)
        // ═══════════════════════════════════════════════════════════════════════════

        /**
         * Get the active contract for the current PROVIDER user.
         * 
         * SECURITY: Provider can only access their own contract (via
         * ProviderContextGuard).
         * 
         * GET /api/provider/my-contract
         * 
         * @return Active contract details or null if no active contract
         */
        @GetMapping("/my-contract")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "جلب عقدي النشط (بوابة المزود)", description = "يعرض العقد النشط للمزود الحالي. "
                        +
                        "يستخدمه نموذج التفويض المسبق والمطالبات لجلب الأسعار بناءً على العقد.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم استرداد العقد بنجاح (قد يكون فارغًا إذا لم يكن هناك عقد نشط)")
        public ResponseEntity<ApiResponse<MyContractResponseDto>> getMyActiveContract() {
                Long providerId = providerContextGuard.getProviderFilter();

                if (providerId == null) {
                        return ResponseEntity.badRequest()
                                        .body(ApiResponse.error("لا يوجد مزود مرتبط بالمستخدم الحالي"));
                }

                log.info("[PROVIDER-PORTAL] GET /api/provider/my-contract, providerId={}", providerId);

                try {
                        // Use the MODERN ProviderContractService (from providercontract module)
                        com.waad.tba.modules.providercontract.dto.ProviderContractResponseDto activeContract = modernContractService
                                        .findActiveByProvider(providerId);

                        if (activeContract == null) {
                                return ResponseEntity.ok(ApiResponse.success(
                                                "لم يتم العثور على عقد نشط",
                                                MyContractResponseDto.builder()
                                                                .providerId(providerId)
                                                                .hasActiveContract(false)
                                                                .build()));
                        }

                        // Get pricing items count from the DTO (already calculated)
                        long totalServices = activeContract.getPricingItemsCount() != null
                                        ? activeContract.getPricingItemsCount()
                                        : 0L;

                        // Get provider name from embedded provider summary
                        String providerName = activeContract.getProvider() != null
                                        ? activeContract.getProvider().getName()
                                        : null;

                        MyContractResponseDto response = MyContractResponseDto.builder()
                                        .id(activeContract.getId())
                                        .providerId(providerId)
                                        .providerName(providerName)
                                        .effectiveFrom(activeContract.getStartDate())
                                        .effectiveTo(activeContract.getEndDate())
                                        .hasActiveContract(true)
                                        .totalServices(totalServices)
                                        .build();

                        return ResponseEntity.ok(ApiResponse.success("تم العثور على عقد نشط", response));
                } catch (Exception e) {
                        log.error("[PROVIDER-PORTAL] Error fetching my contract: {}", e.getMessage(), e);
                        return ResponseEntity.ok(ApiResponse.success(
                                        "تعذر جلب العقد",
                                        MyContractResponseDto.builder()
                                                        .providerId(providerId)
                                                        .hasActiveContract(false)
                                                        .errorMessage(e.getMessage())
                                                        .build()));
                }
        }

        /**
         * Get allowed employers for the current provider.
         * Used by Service Portal to display supported entities.
         * 
         * GET /api/provider/allowed-employers
         */
        @GetMapping("/allowed-employers")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "جلب أصحاب العمل المسموح بهم")
        public ResponseEntity<ApiResponse<List<AllowedEmployerDto>>> getAllowedEmployers() {
                Long providerId = providerContextGuard.getProviderFilter();
                if (providerId == null) {
                        return ResponseEntity.badRequest().body(ApiResponse.error("لا يوجد مزود مرتبط"));
                }

                try {
                        // Use ProviderService (TPA Model) to get allowed employers from
                        // provider_allowed_employers table
                        List<AllowedEmployerDto> employers = providerService.getAllowedEmployers(providerId);
                        return ResponseEntity.ok(ApiResponse.success(employers));
                } catch (Exception e) {
                        log.error("Error fetching allowed employers", e);
                        return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
                }
        }

        /**
         * Get all pricing items (services with prices) for the current PROVIDER's
         * active contract.
         * 
         * SECURITY: Provider can only access their own contract pricing (via
         * ProviderContextGuard).
         * 
         * GET /api/provider/my-contract/services
         * 
         * @param page Page number (0-based)
         * @param size Page size (default 200)
         * @return Paginated list of services with contract prices
         */
        @GetMapping("/my-contract/services")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "جلب خدمات عقدي مع التسعير (بوابة المزود)", description = "يعرض جميع الخدمات المتاحة في العقد النشط للمزود مع الأسعار. "
                        +
                        "يستخدمه نموذج التفويض المسبق لملء قائمة الخدمات المنسدلة.")
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "تم استرداد الخدمات بنجاح")
        public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<MyContractServiceDto>>> getMyContractServices(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "200") int size) {

                Long providerId = providerContextGuard.getProviderFilter();

                if (providerId == null) {
                        return ResponseEntity.badRequest()
                                        .body(ApiResponse.error("لا يوجد مزود مرتبط بالمستخدم الحالي"));
                }

                log.info("[PROVIDER-PORTAL] GET /api/provider/my-contract/services, providerId={}, page={}, size={}",
                                providerId, page, size);

                try {
                        // Use MODERN ProviderContractService to get active contract
                        com.waad.tba.modules.providercontract.dto.ProviderContractResponseDto activeContract = modernContractService
                                        .findActiveByProvider(providerId);

                        if (activeContract == null) {
                                log.warn("[PROVIDER-PORTAL] No active contract found for provider {}", providerId);
                                return ResponseEntity.ok(ApiResponse.success(
                                                "لم يتم العثور على عقد نشط",
                                                org.springframework.data.domain.Page.empty()));
                        }

                        log.info("[PROVIDER-PORTAL] Found active contract {} for provider {}", activeContract.getId(),
                                        providerId);

                        // Use pricingItemService to get paginated services from MODERN tables
                        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest
                                        .of(page,
                                                        size);
                        org.springframework.data.domain.Page<com.waad.tba.modules.providercontract.dto.ProviderContractPricingItemResponseDto> pricingItems = pricingItemService
                                        .findByContract(activeContract.getId(), pageable);

                        log.info("[PROVIDER-PORTAL] Found {} pricing items for contract {}",
                                        pricingItems.getTotalElements(),
                                        activeContract.getId());

                        // Map pricing items to our simplified DTO using stream and PageImpl
                        java.util.List<MyContractServiceDto> mappedItems = pricingItems.getContent().stream()
                                        .map(item -> {
                                                // Get service info from pricing item
                                                String serviceCode = item.getServiceCode();
                                                String serviceName = item.getServiceName();
                                                String categoryName = item.getCategoryName();
                                                Long medicalServiceId = null; // Initialize to null

                                                // Try to get from medicalService if available
                                                if (item.getMedicalService() != null) {
                                                        medicalServiceId = item.getMedicalService().getId(); // CRITICAL:
                                                                                                             // Use
                                                                                                             // MedicalService
                                                                                                             // ID
                                                        serviceCode = item.getMedicalService().getCode();
                                                        serviceName = item.getMedicalService().getName();
                                                }

                                                // Get category name
                                                if (item.getEffectiveCategory() != null) {
                                                        categoryName = item.getEffectiveCategory().getName();
                                                }

                                                return MyContractServiceDto.builder()
                                                                .id(item.getId())
                                                                .medicalServiceId(medicalServiceId) // CRITICAL: Include
                                                                                                    // MedicalService ID
                                                                .serviceCode(serviceCode)
                                                                .serviceName(serviceName)
                                                                .categoryName(categoryName)
                                                                .contractPrice(item.getContractPrice())
                                                                .currency(item.getCurrency())
                                                                .effectiveFrom(item.getEffectiveFrom())
                                                                .effectiveTo(item.getEffectiveTo())
                                                                .hasContract(true)
                                                                .build();
                                        })
                                        .collect(java.util.stream.Collectors.toList());

                        org.springframework.data.domain.Page<MyContractServiceDto> resultPage = new org.springframework.data.domain.PageImpl<>(
                                        mappedItems,
                                        pageable,
                                        pricingItems.getTotalElements());

                        return ResponseEntity.ok(ApiResponse.success("تم استرداد خدمات العقد", resultPage));
                } catch (Exception e) {
                        log.error("[PROVIDER-PORTAL] Error fetching my contract services: {}", e.getMessage(), e);
                        return ResponseEntity.ok(ApiResponse.success(
                                        "تعذر جلب الخدمات",
                                        org.springframework.data.domain.Page.empty()));
                }
        }

        /**
         * Get services requiring pre-approval from the provider's active contract.
         * 
         * This endpoint returns ONLY services that:
         * 1. Are in the provider's active contract (with contract pricing)
         * 2. Require pre-approval based on the MEMBER's benefit policy rules
         * 
         * SECURITY: Provider can only access their own contract services.
         * 
         * GET /api/provider/my-contract/services/requiring-preauth
         * 
         * @param memberId The member ID to check benefit policy rules for
         * @param page     Page number (0-based)
         * @param size     Page size
         * @return Services requiring pre-approval with contract prices
         */
        @GetMapping("/my-contract/services/requiring-preauth")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN')")
        @Operation(summary = "جلب الخدمات التي تتطلب موافقة مسبقة (بوابة المزود)", description = "يعرض خدمات العقد التي تتطلب موافقة مسبقة بناءً على سياسة مزايا العضو")
        public ResponseEntity<ApiResponse<java.util.List<MyContractServiceDto>>> getServicesRequiringPreAuth(
                        @RequestParam Long memberId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "500") int size) {

                Long providerId = providerContextGuard.getProviderFilter();

                if (providerId == null) {
                        return ResponseEntity.badRequest()
                                        .body(ApiResponse.error("لا يوجد مزود مرتبط بالمستخدم الحالي"));
                }

                log.info(
                                "[PROVIDER-PORTAL] GET /api/provider/my-contract/services/requiring-preauth, providerId={}, memberId={}",
                                providerId, memberId);

                try {
                        // 1. Get active contract
                        com.waad.tba.modules.providercontract.dto.ProviderContractResponseDto activeContract = modernContractService
                                        .findActiveByProvider(providerId);

                        if (activeContract == null) {
                                log.warn("[PROVIDER-PORTAL] No active contract found for provider {}", providerId);
                                return ResponseEntity.ok(ApiResponse.success(
                                                "لم يتم العثور على عقد نشط",
                                                java.util.Collections.emptyList()));
                        }

                        // 2. Get member's benefit policy
                        com.waad.tba.modules.member.entity.Member member = memberRepository.findById(memberId)
                                        .orElse(null);

                        if (member == null || member.getBenefitPolicy() == null) {
                                log.warn("[PROVIDER-PORTAL] Member {} not found or has no benefit policy", memberId);
                                return ResponseEntity.ok(ApiResponse.success(
                                                "العضو ليس لديه سياسة مزايا",
                                                java.util.Collections.emptyList()));
                        }

                        Long policyId = member.getBenefitPolicy().getId();

                        // 3. Get all pricing items from contract
                        java.util.List<com.waad.tba.modules.providercontract.dto.ProviderContractPricingItemResponseDto> allPricingItems = pricingItemService
                                        .findByContract(activeContract.getId());

                        // 4. Filter only services that require pre-approval from benefit policy
                        java.util.List<MyContractServiceDto> servicesRequiringPA = allPricingItems.stream()
                                        .filter(item -> {
                                                Long serviceId = item.getMedicalService() != null
                                                                ? item.getMedicalService().getId()
                                                                : null;
                                                if (serviceId == null)
                                                        return false;

                                                // Check if this service requires pre-approval in the member's policy
                                                // Passing null for encounterType as this is a general lookup
                                                return benefitPolicyRuleService.requiresPreApproval(policyId, serviceId,
                                                                null);
                                        })
                                        .map(item -> {
                                                String serviceCode = item.getServiceCode();
                                                String serviceName = item.getServiceName();
                                                String categoryName = item.getCategoryName();
                                                Long medicalServiceId = null;

                                                if (item.getMedicalService() != null) {
                                                        medicalServiceId = item.getMedicalService().getId();
                                                        serviceCode = item.getMedicalService().getCode();
                                                        serviceName = item.getMedicalService().getName();
                                                }

                                                if (item.getEffectiveCategory() != null) {
                                                        categoryName = item.getEffectiveCategory().getName();
                                                }

                                                return MyContractServiceDto.builder()
                                                                .id(item.getId())
                                                                .medicalServiceId(medicalServiceId)
                                                                .serviceCode(serviceCode)
                                                                .serviceName(serviceName)
                                                                .categoryName(categoryName)
                                                                .contractPrice(item.getContractPrice())
                                                                .currency(item.getCurrency())
                                                                .effectiveFrom(item.getEffectiveFrom())
                                                                .effectiveTo(item.getEffectiveTo())
                                                                .hasContract(true)
                                                                .requiresPreAuth(true) // All items here require
                                                                                       // pre-auth
                                                                .build();
                                        })
                                        .collect(java.util.stream.Collectors.toList());

                        log.info("[PROVIDER-PORTAL] Found {} services requiring pre-approval for member {} in contract {}",
                                        servicesRequiringPA.size(), memberId, activeContract.getId());

                        return ResponseEntity.ok(ApiResponse.success(
                                        "تم استرداد الخدمات التي تتطلب موافقة مسبقة",
                                        servicesRequiringPA));
                } catch (Exception e) {
                        log.error("[PROVIDER-PORTAL] Error fetching services requiring pre-auth: {}", e.getMessage(),
                                        e);
                        return ResponseEntity.ok(ApiResponse.success(
                                        "تعذر جلب الخدمات",
                                        java.util.Collections.emptyList()));
                }
        }

        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class MyContractResponseDto {
                private Long id;
                private Long providerId;
                private String providerName;
                private LocalDate effectiveFrom;
                private LocalDate effectiveTo;
                private Boolean hasActiveContract;
                private Long totalServices;
                private String errorMessage;
        }

        /**
         * DTO for services in my contract
         */
        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class MyContractServiceDto {
                private Long id; // Pricing Item ID
                private Long medicalServiceId; // Medical Service ID - IMPORTANT for claim creation
                private String serviceCode;
                private String serviceName;
                private String categoryName;
                private java.math.BigDecimal contractPrice;
                private String currency;
                private LocalDate effectiveFrom;
                private LocalDate effectiveTo;
                private Boolean hasContract;
                private Boolean requiresPreAuth; // From BenefitPolicyRule
        }

        /**
         * Get Provider Documents (Provider Portal).
         * Unified list including core documents and operational attachments.
         * 
         * GET /api/provider/documents
         */
        @GetMapping("/documents")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN')")
        @Operation(summary = "جلب مستندات المزود (قائمة موحدة)", description = "يعرض قائمة موحدة من المستندات الأساسية والمرفقات التشغيلية (الزيارات، المطالبات، التفويضات المسبقة).")
        public ResponseEntity<ApiResponse<Page<com.waad.tba.modules.provider.dto.ProviderDocumentDto>>> getMyDocuments(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(required = false) String referenceType,
                        @RequestParam(required = false) String status) {

                try {
                        Long providerId = providerContextGuard.getProviderFilter();
                        log.info("📄 Provider documents request: providerId={}, referenceType={}, status={}",
                                        providerId, referenceType, status);

                        List<com.waad.tba.modules.provider.dto.ProviderDocumentDto> allDocs = providerDocumentService
                                        .getOperationalDocuments(providerId, referenceType);

                        // Manual pagination for now as we aggregate from multiple sources
                        int start = Math.min(page * size, allDocs.size());
                        int end = Math.min((page + 1) * size, allDocs.size());
                        List<com.waad.tba.modules.provider.dto.ProviderDocumentDto> content = allDocs.subList(start,
                                        end);

                        Page<com.waad.tba.modules.provider.dto.ProviderDocumentDto> resultPage = new org.springframework.data.domain.PageImpl<>(
                                        content, PageRequest.of(page, size), allDocs.size());

                        return ResponseEntity.ok(ApiResponse.success(resultPage));
                } catch (Exception e) {
                        log.error("❌ ERROR in getMyDocuments: {}", e.getMessage(), e);
                        return ResponseEntity.internalServerError()
                                        .body(ApiResponse.error("فشل جلب المستندات: " + e.getMessage()));
                }
        }

        @GetMapping("/documents/stats")
        @PreAuthorize("hasAnyRole('PROVIDER', 'SUPER_ADMIN')")
        @Operation(summary = "جلب إحصائيات مستندات المزود")
        public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getMyDocumentStats() {

                try {
                        Long providerId = providerContextGuard.getProviderFilter();
                        log.info("📊 Provider document stats request: providerId={}", providerId);

                        java.util.Map<String, Long> stats = providerDocumentService.getOperationalStats(providerId);

                        return ResponseEntity.ok(ApiResponse.success(stats));
                } catch (Exception e) {
                        log.error("❌ ERROR in getMyDocumentStats: {}", e.getMessage(), e);
                        java.util.Map<String, Long> emptyStats = new java.util.HashMap<>();
                        return ResponseEntity.ok(ApiResponse.success(emptyStats)); // Return empty instead of 500
                }
        }

        /**
         * Simplified DTO for frontend service dropdown
         */
        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class ProviderServiceDto {
                private Long serviceId;
                private String serviceCode;
                private String serviceName;
                private String categoryCode;
                private String categoryName;
                private java.math.BigDecimal contractPrice;
                private String currency;
                private Boolean requiresPA;
        }
}
