package com.waad.tba.modules.provider.service;

import com.waad.tba.modules.provider.dto.ProviderEligibilityRequest;
import com.waad.tba.modules.provider.dto.ProviderEligibilityResponse;
import com.waad.tba.modules.member.dto.FamilyEligibilityResponseDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.dto.DependentViewDto;
import com.waad.tba.modules.member.service.UnifiedMemberService;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Provider Portal Service (Facade).
 * Prepare data for the provider portal UI, coordinating eligibility checks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderPortalService {
    
    private final UnifiedMemberService unifiedMemberService;
    private final MemberRepository memberRepository;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;
    private final ProviderEligibilityService eligibilityService;
    
    @Transactional(readOnly = true)
    public ProviderEligibilityResponse checkEligibility(ProviderEligibilityRequest request, String providerUsername) {
        log.info("🏥 Provider eligibility check: barcode={}, provider={}", request.getBarcode(), providerUsername);
        
        if (!request.isValid()) {
            throw new IllegalArgumentException("يجب إدخال الباركود أو رقم البطاقة / Barcode required");
        }
        
        String lookupKey = request.getLookupKey();
        Member member = eligibilityService.findMember(lookupKey);
        
        if (member == null) {
            throw new IllegalArgumentException("المستفيد غير موجود / Member not found: " + lookupKey);
        }
        
        eligibilityService.validateProviderUserPermissions(member, providerUsername);
        
        String identifier = member.getBarcode() != null ? member.getBarcode() : member.getCardNumber();
        FamilyEligibilityResponseDto familyData = unifiedMemberService.checkEligibility(identifier);
        
        return buildProviderResponse(familyData, identifier);
    }
    
    private ProviderEligibilityResponse buildProviderResponse(FamilyEligibilityResponseDto familyData, String barcode) {
        MemberViewDto principal = familyData.getPrincipal();
        List<DependentViewDto> dependents = familyData.getDependents() != null ? familyData.getDependents() : new ArrayList<>();
        List<ProviderEligibilityResponse.FamilyMemberInfo> familyMembers = new ArrayList<>();
        
        if (principal != null) {
            Member principalMember = memberRepository.findById(principal.getId()).orElse(null);
            familyMembers.add(eligibilityService.buildFamilyMemberInfo(principal, principalMember, true, barcode));
        }
        
        for (DependentViewDto dep : dependents) {
            Member depMember = memberRepository.findById(dep.getId()).orElse(null);
            familyMembers.add(eligibilityService.buildFamilyMemberInfo(dep, depMember, barcode));
        }
        
        boolean overallEligible = Boolean.TRUE.equals(familyData.getEligible());
        boolean hasEmployer = familyData.getEmployerOrgId() != null;
        
        if (!hasEmployer) {
            overallEligible = false;
        }

        BigDecimal pLimit = BigDecimal.ZERO;
        BigDecimal pUsed = BigDecimal.ZERO;
        BigDecimal pRem = BigDecimal.ZERO;
        Double pUsage = 0.0;

        if (principal != null) {
            Member pMember = memberRepository.findById(principal.getId()).orElse(null);
            if (pMember != null && pMember.getBenefitPolicy() != null) {
                pLimit = pMember.getBenefitPolicy().getAnnualLimit() != null ? pMember.getBenefitPolicy().getAnnualLimit() : BigDecimal.ZERO;
                pUsed = eligibilityService.calculateUsedAmount(pMember);
                pRem = benefitPolicyCoverageService.getRemainingCoverage(pMember, LocalDate.now());
                if (pRem == null) pRem = BigDecimal.ZERO;
                if (pLimit.compareTo(BigDecimal.ZERO) > 0) {
                    pUsage = pUsed.divide(pLimit, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
                }
            }
        }
        
        return ProviderEligibilityResponse.builder()
            .eligible(overallEligible)
            .message(overallEligible ? "العائلة مؤهلة" : "العائلة غير مؤهلة")
            .statusCode(overallEligible ? "SUCCESS" : "ERROR")
            .principalMember(principal)
            .familyMembers(familyMembers)
            .totalFamilyMembers(familyMembers.size())
            .eligibleMembersCount(familyData.getEligibleMembersCount())
            .benefitPolicyId(familyData.getBenefitPolicyId())
            .benefitPolicyName(familyData.getBenefitPolicyName())
            .employerName(familyData.getEmployerOrgName())
            .principalAnnualLimit(pLimit)
            .principalUsedAmount(pUsed)
            .principalRemainingLimit(pRem)
            .principalUsagePercentage(pUsage)
            .warnings(buildWarnings(familyMembers))
            .checkTimestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
            .barcode(barcode)
            .build();
    }
    
    private List<String> buildWarnings(List<ProviderEligibilityResponse.FamilyMemberInfo> familyMembers) {
        List<String> warnings = new ArrayList<>();
        for (ProviderEligibilityResponse.FamilyMemberInfo member : familyMembers) {
            if (member.getUsagePercentage() != null && member.getUsagePercentage() >= 80.0) {
                warnings.add(String.format("⚠️ الحد السنوي لـ %s وصل إلى %.0f%% (متبقي: %.2f)", 
                    member.getFullName(), member.getUsagePercentage(), member.getRemainingLimit()));
            }
            if (Boolean.FALSE.equals(member.getActive())) {
                warnings.add(String.format("❌ العضو %s غير نشط", member.getFullName()));
            }
        }
        return warnings;
    }
}