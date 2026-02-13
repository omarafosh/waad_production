package com.waad.tba.modules.provider.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.provider.dto.ProviderClaimRequest;
import com.waad.tba.modules.provider.dto.ProviderClaimResponse;
import com.waad.tba.modules.claim.service.ClaimService;
import com.waad.tba.modules.claim.dto.ClaimCreateDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
import com.waad.tba.modules.member.entity.Member;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Provider Claims Service (Facade).
 * Orchestrates claim submission by coordinating validation, creation, and attachments.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderClaimsService {
    
    private final ClaimService claimService;
    private final ProviderClaimValidationService validationService;
    private final ProviderClaimAttachmentService attachmentService;
    private final ObjectMapper objectMapper;
    
    @Transactional
    public ProviderClaimResponse submitClaim(ProviderClaimRequest request, String providerUsername) {
        log.info("🏥 Provider claim submission: provider={}, memberId={}, amount={}", 
                 providerUsername, request.getMemberId(), request.getClaimedAmount());
        
        Member member = validationService.validateMember(request.getMemberId());
        
        ProviderClaimValidationService.AnnualLimitCheck annualLimitCheck = 
            validationService.checkAnnualLimit(member, request.getClaimedAmount());
        
        String serviceCode = request.getServiceCategoryId() != null ? String.valueOf(request.getServiceCategoryId()) : null;
        ProviderClaimValidationService.ServiceLimitCheck serviceLimitCheck = validationService.checkServiceLimits(
            member, request.getServiceCategoryId(), request.getClaimedAmount(), serviceCode);
        
        if (annualLimitCheck.exceeded() || serviceLimitCheck.exceeded()) {
            return buildErrorResponse(request, member, annualLimitCheck, serviceLimitCheck);
        }
        
        ClaimViewDto createdClaim = createClaim(request, member, providerUsername);
        return buildSuccessResponse(createdClaim, member, annualLimitCheck, serviceLimitCheck, request);
    }
    
    @Transactional
    public ProviderClaimResponse submitClaimWithAttachments(String claimJson, MultipartFile[] files, String providerUsername) {
        try {
            ProviderClaimRequest request = objectMapper.readValue(claimJson, ProviderClaimRequest.class);
            attachmentService.validateFiles(files);
            
            ProviderClaimResponse response = submitClaim(request, providerUsername);
            if (response.getSuccess() && files != null && files.length > 0) {
                attachmentService.uploadClaimAttachments(response.getClaimId(), files);
                response.setMessage(response.getMessage() + String.format(" | تم رفع %d ملف بنجاح", files.length));
                response.setAttachmentsUploaded(files.length);
            }
            return response;
        } catch (Exception e) {
            log.error("❌ Error in submitClaimWithAttachments", e);
            throw new BusinessRuleException("خطأ في معالجة المطالبة: " + e.getMessage());
        }
    }

    private ClaimViewDto createClaim(ProviderClaimRequest request, Member member, String providerUsername) {
        ClaimCreateDto claimDto = ClaimCreateDto.builder()
            .visitId(request.getVisitId())
            .memberId(request.getMemberId())
            .providerId(request.getProviderId())
            .doctorName(providerUsername)
            .diagnosisCode(request.getDiagnosisCode())
            .diagnosisDescription(request.getDiagnosisDescription() != null ? request.getDiagnosisDescription() : request.getDiagnosis())
            .serviceDate(request.getServiceDate())
            .lines(request.getLines())
            .preAuthorizationId(request.getPreAuthorizationId())
            .build();

        return claimService.createClaim(claimDto);
    }

    private ProviderClaimResponse buildSuccessResponse(
            ClaimViewDto claim, Member member, 
            ProviderClaimValidationService.AnnualLimitCheck annualCheck,
            ProviderClaimValidationService.ServiceLimitCheck serviceCheck,
            ProviderClaimRequest request) {
        
        List<String> allWarnings = new ArrayList<>();
        allWarnings.addAll(annualCheck.warnings());
        allWarnings.addAll(serviceCheck.warnings());
        
        String nationalNumber = member.getCivilId() != null ? member.getCivilId() : "";
        String memberInfo = member.getFullName() + (nationalNumber.isEmpty() ? "" : " (" + nationalNumber + ")");
        
        return ProviderClaimResponse.builder()
            .success(true)
            .message(String.format("✅ المطالبة قُدمت بنجاح - المعرف: %d", claim.getId()))
            .statusCode(allWarnings.isEmpty() ? "SUCCESS" : "WARNING")
            .claimId(claim.getId())
            .claimReferenceNumber("CLM-" + claim.getId())
            .claimStatus(claim.getStatus().toString())
            .submissionTimestamp(LocalDateTime.now())
            .memberFullName(memberInfo)
            .memberBarcode(member.getBarcode())
            .claimedAmount(request.getClaimedAmount())
            .annualLimit(annualCheck.annualLimit())
            .usedAmountBefore(annualCheck.usedAmountBefore())
            .usedAmountAfter(annualCheck.usedAmountAfter())
            .remainingLimit(annualCheck.remainingAfter())
            .usagePercentage(annualCheck.usagePercentageAfter())
            .warnings(allWarnings)
            .errors(new ArrayList<>())
            .exceededLimit(false)
            .requiresPreApproval(annualCheck.usagePercentageAfter() >= 90.0)
            .serviceLimitInfo(serviceCheck.limitInfo())
            .attachmentsUploaded(0)
            .nextSteps("المطالبة قيد المراجعة - سيتم الرد خلال 10 أيام عمل")
            .build();
    }

    private ProviderClaimResponse buildErrorResponse(
            ProviderClaimRequest request, Member member,
            ProviderClaimValidationService.AnnualLimitCheck annualCheck,
            ProviderClaimValidationService.ServiceLimitCheck serviceCheck) {
        
        List<String> errors = new ArrayList<>();
        errors.addAll(annualCheck.warnings());
        errors.addAll(serviceCheck.warnings());
        
        return ProviderClaimResponse.builder()
            .success(false)
            .message("❌ لا يمكن تقديم المطالبة - تم تجاوز الحد المسموح")
            .statusCode("ERROR")
            .memberFullName(member.getFullName())
            .memberBarcode(member.getBarcode())
            .claimedAmount(request.getClaimedAmount())
            .annualLimit(annualCheck.annualLimit())
            .usedAmountBefore(annualCheck.usedAmountBefore())
            .remainingLimit(annualCheck.remainingBefore())
            .usagePercentage(annualCheck.usagePercentageBefore())
            .warnings(new ArrayList<>())
            .errors(errors)
            .exceededLimit(annualCheck.exceeded())
            .requiresPreApproval(true)
            .serviceLimitInfo(serviceCheck.limitInfo())
            .nextSteps("يرجى التواصل مع شركة التأمين للحصول على موافقة مسبقة")
            .build();
    }
}