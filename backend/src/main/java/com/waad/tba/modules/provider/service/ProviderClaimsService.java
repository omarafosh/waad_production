package com.waad.tba.modules.provider.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.claim.entity.ClaimAttachmentType;
import com.waad.tba.modules.provider.dto.ProviderClaimRequest;
import com.waad.tba.modules.provider.dto.ProviderClaimResponse;
import com.waad.tba.modules.claim.service.ClaimAttachmentService;
import com.waad.tba.modules.claim.service.ClaimService;
import com.waad.tba.modules.claim.dto.ClaimCreateDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
import com.waad.tba.modules.claim.entity.ClaimType;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Provider Claims Service.
 * 
 * Handles claim submission from healthcare providers through Provider Portal.
 * 
 * Key Features:
 * - Validate member eligibility
 * - Check annual limit before submission
 * - Check service-level limits
 * - Submit claim to existing ClaimService
 * - Return detailed response with warnings
 * 
 * @since Phase 1 - Provider Portal - Claims Submission
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderClaimsService {

    private final ClaimService claimService;
    private final ClaimRepository claimRepository;
    private final MemberRepository memberRepository;
    private final BenefitPolicyRuleRepository benefitPolicyRuleRepository;
    private final ClaimAttachmentService claimAttachmentService;
    private final ObjectMapper objectMapper; // ✅ PHASE 1: JSON parsing for multipart
    private final MeterRegistry meterRegistry;

    /**
     * Submit Claim from Provider Portal.
     * 
     * Flow:
     * 1. Validate member exists and is active
     * 2. Check annual limit
     * 3. Check service-level limits (if applicable)
     * 4. Create claim via ClaimService
     * 5. Return detailed response with warnings
     * 
     * @param request          Provider claim request
     * @param providerUsername Username of provider submitting claim
     * @return Provider claim response with validation details
     */
    @Transactional
    public ProviderClaimResponse submitClaim(ProviderClaimRequest request, String providerUsername) {

        log.info("🏥 Provider claim submission: provider={}, memberId={}, amount={}, type={}",
                providerUsername, request.getMemberId(), request.getClaimedAmount(), request.getClaimType());

        // Step 1: Validate member
        Member member = validateMember(request.getMemberId());

        // Step 2: Check annual limit
        AnnualLimitCheck annualLimitCheck = checkAnnualLimit(member, request.getClaimedAmount());

        // Step 3: Check service-level limits
        String serviceCode = resolveServiceCode(request);
        ServiceLimitCheck serviceLimitCheck = checkServiceLimits(
                member,
                request.getServiceCategoryId(),
                request.getClaimedAmount(),
                serviceCode);

        // Step 4: Determine if can submit
        boolean canSubmit = !annualLimitCheck.exceeded && !serviceLimitCheck.exceeded;

        if (!canSubmit) {
            return buildErrorResponse(request, member, annualLimitCheck, serviceLimitCheck);
        }

        // Step 5: Create claim via existing ClaimService
        ClaimViewDto createdClaim = createClaim(request, member, providerUsername);

        // Step 6: Build success response
        return buildSuccessResponse(createdClaim, member, annualLimitCheck, serviceLimitCheck, request);
    }

    /**
     * Validate member exists and is eligible.
     */
    private Member validateMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with ID: " + memberId));

        if (Boolean.FALSE.equals(member.getActive())) {
            throw new BusinessRuleException("Member is not active - cannot submit claim");
        }

        if (member.getBenefitPolicy() == null) {
            throw new BusinessRuleException("Member has no benefit policy assigned");
        }

        // Note: employer validation removed (deprecated field)

        log.info("✅ Member validated: id={}, name={}, policy={}",
                member.getId(), member.getFullName(), member.getBenefitPolicy().getId());

        return member;
    }

    /**
     * Check annual limit for member.
     * 
     * TICKET 1 (Phase Lite): Implements actual annual limit tracking
     * - Uses only APPROVED/SETTLED claims (no Draft/Rejected)
     * - Single aggregation query for performance
     * - Current year calculation
     */
    private AnnualLimitCheck checkAnnualLimit(Member member, BigDecimal claimedAmount) {
        // Get annual limit from member's benefit policy
        BigDecimal annualLimit = BigDecimal.ZERO;
        if (member.getBenefitPolicy() != null && member.getBenefitPolicy().getAnnualLimit() != null) {
            annualLimit = member.getBenefitPolicy().getAnnualLimit();
        }

        // If no annual limit defined, use system default
        if (annualLimit.compareTo(BigDecimal.ZERO) <= 0) {
            annualLimit = BigDecimal.valueOf(10000); // System default
            log.info("💰 No annual limit in policy, using system default: {} LYD", annualLimit);
        }

        // Calculate used amount from APPROVED claims in current benefit year
        LocalDate yearStart = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(LocalDate.now().getYear(), 12, 31);

        BigDecimal usedAmount = claimRepository.sumApprovedAmountsByMemberAndYear(
                member.getId(), yearStart, yearEnd);

        // Null-safe: default to ZERO if no approved claims found
        if (usedAmount == null) {
            usedAmount = BigDecimal.ZERO;
        }

        BigDecimal remainingBefore = annualLimit.subtract(usedAmount);
        BigDecimal usedAfter = usedAmount.add(claimedAmount);
        BigDecimal remainingAfter = annualLimit.subtract(usedAfter);

        // Check if this claim would exceed the limit
        boolean exceeded = remainingAfter.compareTo(BigDecimal.ZERO) < 0;

        double usagePercentageBefore = annualLimit.compareTo(BigDecimal.ZERO) > 0
                ? usedAmount.divide(annualLimit, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;
        double usagePercentageAfter = annualLimit.compareTo(BigDecimal.ZERO) > 0
                ? usedAfter.divide(annualLimit, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;

        List<String> warnings = new ArrayList<>();

        // Warning if approaching limit (>= 80%)
        if (usagePercentageAfter >= 80.0 && !exceeded) {
            warnings.add(String.format(
                    "⚠️ بعد هذه المطالبة، سيصل استهلاك الحد السنوي إلى %.0f%%",
                    usagePercentageAfter));
        }

        // Warning if exceeded
        if (exceeded) {
            warnings.add(String.format(
                    "❌ المبلغ المطلوب (%.2f د.ل) يتجاوز الحد المتبقي (%.2f د.ل)",
                    claimedAmount, remainingBefore.max(BigDecimal.ZERO)));
        }

        log.info("💰 Annual limit check: limit={}, used={}, claimed={}, remaining={}, exceeded={}",
                annualLimit, usedAmount, claimedAmount, remainingAfter, exceeded);

        return new AnnualLimitCheck(
                annualLimit,
                usedAmount,
                usedAfter,
                remainingBefore,
                remainingAfter,
                usagePercentageBefore,
                usagePercentageAfter,
                exceeded,
                warnings);
    }

    /**
     * Check service-level limits (amountLimit, timesLimit).
     */
    private ServiceLimitCheck checkServiceLimits(Member member, Long serviceCategoryId, BigDecimal claimedAmount,
            String serviceCode) {
        if (serviceCategoryId == null) {
            return new ServiceLimitCheck(false, null, new ArrayList<>());
        }

        BenefitPolicyRule rule = benefitPolicyRuleRepository
                .findById(serviceCategoryId)
                .orElse(null);

        if (rule == null) {
            log.warn("⚠️ Service category not found: id={}", serviceCategoryId);
            return new ServiceLimitCheck(false, null, new ArrayList<>());
        }

        List<String> warnings = new ArrayList<>();
        boolean exceeded = false;

        // Use service category ID as service name (or default)
        String serviceName = "Service #" + serviceCategoryId;

        // Check amount limit

        // ✅ PHASE 1: Check times limit (count actual usage)
        int timesUsed = 0;
        int timesRemaining = 0;

        if (rule.getTimesLimit() != null && serviceCode != null) {
            timesUsed = calculateTimesUsed(member.getId(), serviceCode);
            timesRemaining = rule.getTimesLimit() - timesUsed;

            log.info("🔢 Times limit check: service={}, limit={}, used={}, remaining={}",
                    serviceName, rule.getTimesLimit(), timesUsed, timesRemaining);

            if (timesUsed >= rule.getTimesLimit()) {
                warnings.add(String.format(
                        "❌ تم استنفاذ العدد المسموح من خدمة %s (%d مرة في السنة)",
                        serviceName, rule.getTimesLimit()));
                exceeded = true;
            } else if (timesRemaining <= 2) {
                warnings.add(String.format(
                        "⚠️ اقتربت من الحد الأقصى لخدمة %s (متبقي %d مرة من %d)",
                        serviceName, timesRemaining, rule.getTimesLimit()));
            }
        }

        // Build limit info with actual usage
        ProviderClaimResponse.ServiceLimitInfo limitInfo = ProviderClaimResponse.ServiceLimitInfo.builder()
                .serviceName(serviceName)

                .timesLimit(rule.getTimesLimit())
                .timesUsed(timesUsed)
                .timesRemaining(timesRemaining)
                .exceedsLimit(exceeded)
                .build();

        log.info("🔍 Service limit check: service={}, exceeded={}",
                serviceName, exceeded);

        return new ServiceLimitCheck(exceeded, limitInfo, warnings);
    }

    /**
     * ✅ PHASE 1: Calculate times used for a service category.
     * Counts approved claims for the current calendar year.
     * 
     * Uses pessimistic counting (includes PENDING + UNDER_REVIEW + APPROVED)
     * to prevent race conditions when multiple claims submitted simultaneously.
     * 
     * @param memberId    Member ID
     * @param serviceCode Service code (String) - matches Claim.serviceCode
     * @return Number of times service was used (approved + pending)
     */
    private int calculateTimesUsed(Long memberId, String serviceCode) {
        LocalDate yearStart = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(LocalDate.now().getYear(), 12, 31);

        long count = claimRepository.countPendingAndApprovedClaimsByMemberAndServiceInPeriod(
                memberId, serviceCode, yearStart, yearEnd);

        return (int) count;
    }

    /**
     * Resolve service code for service-limit counting.
     * Priority:
     * 1) Claim line serviceCode (master)
     * 2) Claim line providerServiceCode
     * 3) Legacy fallback to serviceCategoryId string
     */
    private String resolveServiceCode(ProviderClaimRequest request) {
        if (request.getLines() != null && !request.getLines().isEmpty()) {
            for (com.waad.tba.modules.claim.dto.ClaimLineDto line : request.getLines()) {
                if (line.getServiceCode() != null && !line.getServiceCode().isBlank()) {
                    return line.getServiceCode().trim();
                }
                if (line.getProviderServiceCode() != null && !line.getProviderServiceCode().isBlank()) {
                    return line.getProviderServiceCode().trim();
                }
            }
        }

        if (request.getServiceCategoryId() != null) {
            return String.valueOf(request.getServiceCategoryId());
        }

        return null;
    }

    /**
     * Create claim via existing ClaimService.
     * 
     * VISIT-CENTRIC ARCHITECTURE (2026-01-15):
     * visitId is REQUIRED - passed from ProviderClaimRequest to ClaimCreateDto.
     */
    private ClaimViewDto createClaim(ProviderClaimRequest request, Member member, String providerUsername) {
        // Build ClaimCreateDto with canonical fields
        // VISIT-CENTRIC: visitId is mandatory, lines with medicalServiceId required
        ClaimCreateDto claimDto = ClaimCreateDto.builder()
                .visitId(request.getVisitId()) // REQUIRED - Visit-Centric Architecture
                .memberId(request.getMemberId())
                .providerId(request.getProviderId()) // Provider auto-fill from session
                .doctorName(providerUsername) // Provider portal user
                .diagnosisCode(request.getDiagnosisCode())
                .diagnosisDescription(request.getDiagnosisDescription() != null
                        ? request.getDiagnosisDescription()
                        : request.getDiagnosis())
                .serviceDate(request.getServiceDate())
                .lines(request.getLines()) // ClaimLineDto with medicalServiceId
                .preAuthorizationId(request.getPreAuthorizationId())
                .build();

        log.info("📝 Creating claim via ClaimService: member={}, visitId={}, lines={}",
                member.getFullName(), request.getVisitId(),
                request.getLines() != null ? request.getLines().size() : 0);

        ClaimViewDto createdClaim = claimService.createClaim(claimDto);

        log.info("✅ Claim created: id={}, visitId={}, status={}",
                createdClaim.getId(), request.getVisitId(), createdClaim.getStatus());

        return createdClaim;
    }

    /**
     * Build success response.
     */
    private ProviderClaimResponse buildSuccessResponse(
            ClaimViewDto claim,
            Member member,
            AnnualLimitCheck annualCheck,
            ServiceLimitCheck serviceCheck,
            ProviderClaimRequest request) {

        boolean hasWarnings = !annualCheck.warnings.isEmpty() || !serviceCheck.warnings.isEmpty();

        List<String> allWarnings = new ArrayList<>();
        allWarnings.addAll(annualCheck.warnings);
        allWarnings.addAll(serviceCheck.warnings);

        String nationalNumber = member.getCivilId() != null ? member.getCivilId() : "";
        String memberInfo = member.getFullName() + (nationalNumber.isEmpty() ? "" : " (" + nationalNumber + ")");

        return ProviderClaimResponse.builder()
                .success(true)
                .message(String.format("✅ المطالبة قُدمت بنجاح - المعرف: %d", claim.getId()))
                .statusCode(hasWarnings ? "WARNING" : "SUCCESS")
                .claimId(claim.getId())
                .claimReferenceNumber("CLM-" + claim.getId()) // Generate reference from ID
                .claimStatus(claim.getStatus().toString())
                .submissionTimestamp(LocalDateTime.now())
                .memberFullName(memberInfo)
                .memberBarcode(member.getBarcode())
                .claimedAmount(request.getClaimedAmount())
                .annualLimit(annualCheck.annualLimit)
                .usedAmountBefore(annualCheck.usedAmountBefore)
                .usedAmountAfter(annualCheck.usedAmountAfter)
                .remainingLimit(annualCheck.remainingAfter)
                .usagePercentage(annualCheck.usagePercentageAfter)
                .warnings(allWarnings)
                .errors(new ArrayList<>())
                .exceededLimit(false)
                .requiresPreApproval(annualCheck.usagePercentageAfter >= 90.0)
                .serviceLimitInfo(serviceCheck.limitInfo)
                .attachmentsUploaded(0) // Updated when files uploaded
                .nextSteps("المطالبة قيد المراجعة - سيتم الرد خلال 10 أيام عمل")
                .build();
    }

    /**
     * Build error response (exceeded limits).
     */
    private ProviderClaimResponse buildErrorResponse(
            ProviderClaimRequest request,
            Member member,
            AnnualLimitCheck annualCheck,
            ServiceLimitCheck serviceCheck) {

        List<String> errors = new ArrayList<>();
        errors.addAll(annualCheck.warnings);
        errors.addAll(serviceCheck.warnings);

        return ProviderClaimResponse.builder()
                .success(false)
                .message("❌ لا يمكن تقديم المطالبة - تم تجاوز الحد المسموح")
                .statusCode("ERROR")
                .memberFullName(member.getFullName())
                .memberBarcode(member.getBarcode())
                .claimedAmount(request.getClaimedAmount())
                .annualLimit(annualCheck.annualLimit)
                .usedAmountBefore(annualCheck.usedAmountBefore)
                .remainingLimit(annualCheck.remainingBefore)
                .usagePercentage(annualCheck.usagePercentageBefore)
                .warnings(new ArrayList<>())
                .errors(errors)
                .exceededLimit(annualCheck.exceeded)
                .requiresPreApproval(true)
                .serviceLimitInfo(serviceCheck.limitInfo)
                .nextSteps("يرجى التواصل مع شركة التأمين للحصول على موافقة مسبقة")
                .build();
    }

    // ==================== HELPER CLASSES ====================

    private record AnnualLimitCheck(
            BigDecimal annualLimit,
            BigDecimal usedAmountBefore,
            BigDecimal usedAmountAfter,
            BigDecimal remainingBefore,
            BigDecimal remainingAfter,
            double usagePercentageBefore,
            double usagePercentageAfter,
            boolean exceeded,
            List<String> warnings) {
    }

    private record ServiceLimitCheck(
            boolean exceeded,
            ProviderClaimResponse.ServiceLimitInfo limitInfo,
            List<String> warnings) {
    }

    // ==================== ✅ PHASE 1: FILE UPLOAD INTEGRATION ====================

    /**
     * ✅ PHASE 1: Submit Claim with File Attachments.
     * 
     * Handles multipart file upload with optimized transaction boundaries:
     * 1. Parse JSON claim data from @RequestPart
     * 2. Validate files (type, size, count)
     * 3. Submit claim (same validation as submitClaim)
     * 4. Upload files to storage AFTER DB commit
     * 5. Associate files with claim
     * 
     * Performance Note:
     * - DB transaction commits first (fast)
     * - File upload runs after commit to avoid holding DB locks during I/O
     * 
     * File Specifications:
     * - Allowed types: PDF, JPEG, PNG
     * - Max file size: 5 MB per file
     * - Max total size: 20 MB
     * - Max files: 10
     * 
     * @param claimJson        JSON string of ProviderClaimRequest
     * @param files            Array of multipart files (nullable - claims can have
     *                         no attachments)
     * @param providerUsername Username of provider submitting claim
     * @return ProviderClaimResponse with claim ID and upload status
     */
    @Transactional
    public ProviderClaimResponse submitClaimWithAttachments(
            String claimJson,
            MultipartFile[] files,
            String providerUsername) {

        log.info("🏥 Claim submission with attachments: provider={}, files={}",
                providerUsername, files != null ? files.length : 0);

        try {
            // Step 1: Parse JSON claim data
            ProviderClaimRequest request = objectMapper.readValue(claimJson, ProviderClaimRequest.class);

            // Step 2: Validate files
            if (files != null && files.length > 0) {
                validateFiles(files);
            }

            // Step 3: Submit claim (same validation as submitClaim)
            ProviderClaimResponse response = submitClaim(request, providerUsername);

            if (!response.getSuccess()) {
                // Claim validation failed (annual limit, service limit, etc.)
                return response;
            }

            // Step 4: Upload files to storage AFTER COMMIT (if any)
            if (files != null && files.length > 0) {
                Long claimId = response.getClaimId();
                MultipartFile[] filesCopy = Arrays.copyOf(files, files.length);
                String[] descriptionsCopy = request.getAttachmentDescriptions() != null
                        ? Arrays.copyOf(request.getAttachmentDescriptions(), request.getAttachmentDescriptions().length)
                        : null;
                String uploadJobId = "CLAIM-UP-" + UUID.randomUUID();
                meterRegistry.counter("tba.claims.attachments.async.jobs.total", "status", "scheduled").increment();
                meterRegistry.counter("tba.claims.attachments.async.files.total", "status", "scheduled")
                        .increment(filesCopy.length);

                runAfterCommitOrNow(() -> {
                    long startedAt = System.nanoTime();
                    try {
                        log.info("🚀 [ASYNC-UPLOAD-START] jobId={}, claimId={}, files={}",
                                uploadJobId, claimId, filesCopy.length);
                        UploadBatchOutcome outcome = uploadClaimAttachments(
                                claimId, filesCopy, descriptionsCopy, uploadJobId);

                        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
                        meterRegistry.timer("tba.claims.attachments.async.job.duration")
                                .record(durationMs, TimeUnit.MILLISECONDS);
                        if (outcome.failedCount() > 0) {
                            meterRegistry.counter("tba.claims.attachments.async.jobs.total", "status", "partial")
                                    .increment();
                            meterRegistry.counter("tba.claims.attachments.async.files.total", "status", "success")
                                    .increment(outcome.successCount());
                            meterRegistry.counter("tba.claims.attachments.async.files.total", "status", "failed")
                                    .increment(outcome.failedCount());
                            log.warn(
                                    "⚠️ [ASYNC-UPLOAD-END] jobId={}, claimId={}, success={}, failed={}, durationMs={}, failedFiles={}",
                                    uploadJobId, claimId, outcome.successCount(), outcome.failedCount(), durationMs,
                                    outcome.failedFiles());
                        } else {
                            meterRegistry.counter("tba.claims.attachments.async.jobs.total", "status", "success")
                                    .increment();
                            meterRegistry.counter("tba.claims.attachments.async.files.total", "status", "success")
                                    .increment(outcome.successCount());
                            log.info("✅ [ASYNC-UPLOAD-END] jobId={}, claimId={}, success={}, failed=0, durationMs={}",
                                    uploadJobId, claimId, outcome.successCount(), durationMs);
                        }
                    } catch (Exception uploadError) {
                        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
                        meterRegistry.timer("tba.claims.attachments.async.job.duration")
                                .record(durationMs, TimeUnit.MILLISECONDS);
                        meterRegistry.counter("tba.claims.attachments.async.jobs.total", "status", "failed")
                                .increment();
                        log.error("❌ [ASYNC-UPLOAD-CRASH] jobId={}, claimId={}, durationMs={}",
                                uploadJobId, claimId, durationMs, uploadError);
                    }
                });

                response.setAttachmentsUploaded(0);
                response.setMessage(response.getMessage() +
                        String.format(" | تم استلام %d ملف وسيتم رفعها بعد حفظ المطالبة", files.length));
            }

            return response;

        } catch (Exception e) {
            log.error("❌ Error in submitClaimWithAttachments", e);
            throw new BusinessRuleException("خطأ في رفع المرفقات: " + e.getMessage());
        }
    }

    /**
     * Validate file upload constraints.
     * 
     * Rules:
     * - Max 10 files
     * - Max 5 MB per file
     * - Max 20 MB total
     * - Allowed MIME types: PDF, JPEG, PNG
     * 
     * @param files Array of multipart files
     * @throws BusinessRuleException if validation fails
     */
    private void validateFiles(MultipartFile[] files) {
        // Max 10 files
        if (files.length > 10) {
            throw new BusinessRuleException("❌ الحد الأقصى: 10 ملفات (حاليًا: " + files.length + ")");
        }

        // Allowed MIME types
        List<String> allowedMimeTypes = Arrays.asList(
                "application/pdf",
                "image/jpeg",
                "image/png");

        long totalSize = 0;

        for (MultipartFile file : files) {
            // Check MIME type
            String mimeType = file.getContentType();
            if (mimeType == null || !allowedMimeTypes.contains(mimeType.toLowerCase())) {
                throw new BusinessRuleException(
                        "❌ نوع الملف غير مسموح: " + file.getOriginalFilename() +
                                " (المسموح: PDF, JPEG, PNG فقط)");
            }

            // Check individual file size (5 MB = 5 * 1024 * 1024 bytes)
            long fileSizeMB = file.getSize();
            if (fileSizeMB > 5 * 1024 * 1024) {
                throw new BusinessRuleException(
                        "❌ حجم الملف كبير جدًا: " + file.getOriginalFilename() +
                                " (" + (fileSizeMB / 1024 / 1024) + " MB) | الحد الأقصى: 5 MB");
            }

            totalSize += fileSizeMB;
        }

        // Check total size (20 MB)
        if (totalSize > 20 * 1024 * 1024) {
            throw new BusinessRuleException(
                    "❌ الحجم الإجمالي للملفات كبير جدًا: " +
                            (totalSize / 1024 / 1024) + " MB | الحد الأقصى: 20 MB");
        }

        log.info("✅ File validation passed: {} files, total size: {} MB",
                files.length, totalSize / 1024 / 1024);
    }

    /**
     * Upload claim attachments with metadata persistence.
     *
     * Delegates to ClaimAttachmentService so each uploaded file gets a
     * corresponding ClaimAttachment record.
     * 
     * @param claimId Claim ID (for folder organization)
     * @param files   Array of multipart files
     */
    private UploadBatchOutcome uploadClaimAttachments(
            Long claimId,
            MultipartFile[] files,
            String[] attachmentDescriptions,
            String uploadJobId) {
        log.info("📤 [ASYNC-UPLOAD] jobId={}, claimId={}, files={}", uploadJobId, claimId, files.length);

        int successCount = 0;
        List<String> failedFiles = new ArrayList<>();

        for (int index = 0; index < files.length; index++) {
            MultipartFile file = files[index];
            String description = attachmentDescriptions != null && index < attachmentDescriptions.length
                    ? attachmentDescriptions[index]
                    : null;

            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : ("file-" + index);

            try {
                ClaimAttachmentType attachmentType = resolveAttachmentType(file, description);
                claimAttachmentService.uploadAttachment(claimId, file, attachmentType);
                successCount++;
                meterRegistry.counter("tba.claims.attachments.async.file.type.total",
                        "attachment_type", attachmentType.name()).increment();
                log.info("✅ [ASYNC-UPLOAD-FILE] jobId={}, claimId={}, file={}, size={}, type={}",
                        uploadJobId, claimId, fileName, file.getSize(), attachmentType);

            } catch (Exception e) {
                failedFiles.add(fileName);
                log.error("❌ [ASYNC-UPLOAD-FILE-FAIL] jobId={}, claimId={}, file={}, error={}",
                        uploadJobId, claimId, fileName, e.getMessage(), e);
            }
        }

        return new UploadBatchOutcome(successCount, failedFiles.size(), failedFiles);
    }

    private record UploadBatchOutcome(int successCount, int failedCount, List<String> failedFiles) {
    }

    private ClaimAttachmentType resolveAttachmentType(MultipartFile file, String description) {
        String normalizedDescription = description != null ? description.toLowerCase(Locale.ROOT) : "";
        String fileName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().toLowerCase(Locale.ROOT)
                : "";
        String contentType = file.getContentType() != null
                ? file.getContentType().toLowerCase(Locale.ROOT)
                : "";

        String combined = normalizedDescription + " " + fileName;

        if (containsAny(combined, "invoice", "receipt", "فاتورة", "ايصال")) {
            return ClaimAttachmentType.INVOICE;
        }
        if (containsAny(combined, "prescription", "rx", "وصفة", "روشتة")) {
            return ClaimAttachmentType.PRESCRIPTION;
        }
        if (containsAny(combined, "lab", "laboratory", "تحاليل", "مختبر", "نتيجة")) {
            return ClaimAttachmentType.LAB_RESULT;
        }
        if (containsAny(combined, "xray", "x-ray", "radiology", "ct", "mri", "ultrasound", "أشعة", "رنين", "مقطعية")) {
            return ClaimAttachmentType.XRAY;
        }
        if (containsAny(combined, "report", "medical report", "تقرير", "تقرير طبي")) {
            return ClaimAttachmentType.MEDICAL_REPORT;
        }

        if ("application/pdf".equals(contentType)) {
            return ClaimAttachmentType.MEDICAL_REPORT;
        }

        return ClaimAttachmentType.OTHER;
    }

    private boolean containsAny(String source, String... keywords) {
        for (String keyword : keywords) {
            if (source.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private void runAfterCommitOrNow(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
            return;
        }
        task.run();
    }
}