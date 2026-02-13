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
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.AuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Provider Portal Service.
 * 
 * Business logic for healthcare provider operations:
 * - Real-time eligibility verification
 * - Member card scanning
 * - Coverage information retrieval
 * - Annual limit calculations
 * 
 * Uses existing UnifiedMemberService for core member operations.
 * Uses BenefitPolicyCoverageService for annual limit calculations.
 * 
 * @since Phase 1 - Provider Portal
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderPortalService {
    
    private final UnifiedMemberService unifiedMemberService;
    private final MemberRepository memberRepository;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;
    
    /**
     * Check Member Eligibility for Provider.
     * 
     * الفحص يتم فقط بالباركود أو رقم البطاقة.
     * الرقم الوطني لا يُستخدم للفحص - يظهر فقط كمعلومات أساسية.
     * 
     * Flow:
     * 1. Lookup member by barcode or card number
     * 2. Retrieve family information (principal + dependents)
     * 3. Calculate annual limits for each member
     * 4. Determine eligibility status
     * 5. Format response for provider UI
     * 
     * @param request Provider eligibility request (barcode required)
     * @param providerUsername Username of provider making request
     * @return Provider-formatted eligibility response
     * @throws IllegalArgumentException if request is invalid or member not found
     */
    @Transactional(readOnly = true)
    public ProviderEligibilityResponse checkEligibility(
            ProviderEligibilityRequest request, 
            String providerUsername) {
        
        log.info("🏥 Processing provider eligibility check: barcode={}, provider={}", 
                 request.getBarcode(), providerUsername);
        
        // Validate request - barcode must be provided
        if (!request.isValid()) {
            log.warn("⚠️ Invalid eligibility request: barcode is empty");
            throw new IllegalArgumentException(
                "يجب إدخال الباركود أو رقم البطاقة / Barcode or card number is required"
            );
        }
        
        // Step 1: Lookup member using barcode or card number
        String lookupKey = request.getLookupKey();
        log.debug("🔍 Looking up member with barcode/cardNumber: {}", lookupKey);
        
        Member member = findMember(lookupKey);
        
        if (member == null) {
            log.warn("⚠️ Member not found for lookup key: {}", lookupKey);
            throw new IllegalArgumentException(
                "العضو غير موجود للباركود/رقم البطاقة: " + lookupKey + 
                " / Member not found for barcode/card number: " + lookupKey
            );
        }
        
        log.debug("✓ Found member: id={}, barcode={}", member.getId(), member.getBarcode());
        
        // Step 1.5: Security Check - Verify if provider user is authorized for this member's company
        validateProviderUserPermissions(member, providerUsername);
        
        // Step 2: Get family eligibility (reuse existing service)
        // Fix: If member is Dependent, barcode is null, so use card number
        String identifier = member.getBarcode();
        if (identifier == null) {
            identifier = member.getCardNumber();
        }
        
        FamilyEligibilityResponseDto familyEligibility = unifiedMemberService.checkEligibility(identifier);
        
        // Step 3: Build provider response
        ProviderEligibilityResponse response = buildProviderResponse(familyEligibility, identifier);
        
        log.info("✅ Provider eligibility check completed: eligible={}, familySize={}", 
                 response.getEligible(), response.getTotalFamilyMembers());
        
        return response;
    }
    
    /**
     * Validates if the provider user is authorized to see members from the member's employer.
     */
    private void validateProviderUserPermissions(Member member, String username) {
        if (username == null || member.getEmployerOrganization() == null) {
            return;
        }

        User user = userRepository.findByUsername(username)
                .orElse(null);
        
        if (user == null) {
            return; // Skip if user not found (likely system process)
        }

        // 1. If user is ADMIN (SUPER or INSURANCE), they can see everything
        if (authorizationService.isAdmin(user) || Boolean.TRUE.equals(user.getAllowAllCompanies())) {
            return;
        }

        // 2. Check if the employer is in the permitted list
        Long memberEmployerId = member.getEmployerOrganization().getId();
        boolean isPermitted = user.getPermittedOrganizations().stream()
                .anyMatch(e -> e.getId().equals(memberEmployerId));

        if (!isPermitted) {
            log.warn("🛡️ Security Restriction: User {} attempted to access member {} from unauthorized company {}", 
                     username, member.getId(), member.getEmployerOrganization().getName());
            throw new IllegalArgumentException(
                "عذراً، هذا المستفيد ليس من الجهات المسموحة (جهة العمل غير متعاقدة مع مقدم الخدمة) / " +
                "The beneficiary is not from the authorized entities (uncontracted employer)"
            );
        }
    }
    
    /**
     * Find member by barcode or card number.
     * Uses eager fetching to ensure employer organization and benefit policy are loaded.
     */
    private Member findMember(String lookupKey) {
        // Try barcode first (with eager loading)
        // Try barcode first (with eager loading)
        List<Member> barcodeMembers = memberRepository.findByBarcode(lookupKey);
        Member member = barcodeMembers.isEmpty() ? null : barcodeMembers.get(0);
        
        if (member == null) {
            // Try card number (with eager loading)
            List<Member> cardMembers = memberRepository.findByCardNumberWithDetails(lookupKey);
            member = cardMembers.isEmpty() ? null : cardMembers.get(0);
        }
        
        if (member == null) {
            // Try employee number (with eager loading)
            List<Member> employeeMembers = memberRepository.findByEmployeeNumberWithDetails(lookupKey);
            member = employeeMembers.isEmpty() ? null : employeeMembers.get(0);
        }
        
        if (member != null) {
            // Log employer info for debugging
            if (member.getEmployerOrganization() != null) {
                log.debug("✅ Found member with employer: {} ({})", 
                         member.getEmployerOrganization().getName(),
                         member.getEmployerOrganization().getId());
            } else {
                log.warn("⚠️ Found member ID={} but NO employer organization!", member.getId());
            }
        }
        
        return member;
    }
    
    /**
     * Build provider-specific response from family eligibility data.
     */
    private ProviderEligibilityResponse buildProviderResponse(
            FamilyEligibilityResponseDto familyData, 
            String barcode) {
        
        MemberViewDto principal = familyData.getPrincipal();
        List<DependentViewDto> dependents = familyData.getDependents() != null 
            ? familyData.getDependents() 
            : new ArrayList<>();
        
        // Build family members list
        List<ProviderEligibilityResponse.FamilyMemberInfo> familyMembers = new ArrayList<>();
        
        // Add principal with calculated limits
        if (principal != null) {
            Member principalMember = memberRepository.findById(principal.getId())
                .orElse(null);
            familyMembers.add(buildFamilyMemberInfo(principal, principalMember, true, barcode));
        }
        
        // Add dependents with calculated limits
        for (DependentViewDto dependent : dependents) {
            Member dependentMember = memberRepository.findById(dependent.getId())
                .orElse(null);
            familyMembers.add(buildFamilyMemberInfo(dependent, dependentMember, false, barcode));
        }
        
        // Determine overall status - also check employer organization
        boolean overallEligible = familyData.getEligible() != null && familyData.getEligible();
        boolean hasEmployer = familyData.getEmployerOrgId() != null && familyData.getEmployerOrgName() != null;
        
        String statusCode;
        String message;
        
        if (!hasEmployer) {
            // No employer - cannot be eligible
            statusCode = "ERROR";
            message = "العائلة غير مؤهلة - المؤمن عليه غير مرتبط بجهة عمل";
            overallEligible = false;
            log.warn("⚠️ Eligibility check failed: No employer organization for barcode {}", barcode);
        } else if (overallEligible) {
            statusCode = "SUCCESS";
            message = "العائلة مؤهلة - يرجى اختيار المريض من القائمة أدناه";
        } else {
            statusCode = "ERROR";
            message = "العائلة غير مؤهلة - يرجى التواصل مع شركة التأمين";
        }
        
        // Calculate principal limits
        BigDecimal principalAnnualLimit = BigDecimal.ZERO;
        BigDecimal principalUsedAmount = BigDecimal.ZERO;
        BigDecimal principalRemainingLimit = BigDecimal.ZERO;
        Double principalUsagePercentage = 0.0;
        
        if (principal != null) {
            Member principalMember = memberRepository.findById(principal.getId()).orElse(null);
            if (principalMember != null && principalMember.getBenefitPolicy() != null) {
                BenefitPolicy policy = principalMember.getBenefitPolicy();
                principalAnnualLimit = policy.getAnnualLimit() != null 
                    ? policy.getAnnualLimit() 
                    : BigDecimal.ZERO;
                    
                principalUsedAmount = calculateUsedAmount(principalMember);
                principalRemainingLimit = benefitPolicyCoverageService.getRemainingCoverage(
                    principalMember, LocalDate.now());
                if (principalRemainingLimit == null) {
                    principalRemainingLimit = BigDecimal.ZERO;
                }
                
                if (principalAnnualLimit.compareTo(BigDecimal.ZERO) > 0) {
                    principalUsagePercentage = principalUsedAmount
                        .divide(principalAnnualLimit, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
                }
            }
        }
        
        // Build warnings
        List<String> warnings = buildWarnings(familyMembers);
        
        // Build covered services (from principal's benefit policy)
        List<String> coveredServices = List.of(
            "الاستشارات الطبية",
            "الفحوصات المخبرية", 
            "الأشعة والتصوير الطبي",
            "الأدوية",
            "العلاج الطبيعي"
        );
        
        return ProviderEligibilityResponse.builder()
            // Eligibility status
            .eligible(overallEligible)
            .message(message)
            .statusCode(statusCode)
            
            // Member information
            .principalMember(principal)
            .familyMembers(familyMembers)
            .totalFamilyMembers(familyMembers.size())
            .eligibleMembersCount(familyData.getEligibleMembersCount())
            
            // Coverage information
            .benefitPolicyId(familyData.getBenefitPolicyId())
            .benefitPolicyName(familyData.getBenefitPolicyName())
            .policyStatus(familyData.getBenefitPolicyStatus())
            .employerName(familyData.getEmployerOrgName())
            .coverageType(familyData.getBenefitPolicyName())
            .effectiveDate(principal != null && principal.getStartDate() != null 
                ? principal.getStartDate().toString() 
                : null)
            .endDate(principal != null && principal.getEndDate() != null 
                ? principal.getEndDate().toString() 
                : null)
            
            // Annual limit information (principal)
            .principalAnnualLimit(principalAnnualLimit)
            .principalUsedAmount(principalUsedAmount)
            .principalRemainingLimit(principalRemainingLimit)
            .principalUsagePercentage(principalUsagePercentage)
            
            // Additional information
            .warnings(warnings)
            .coveredServices(coveredServices)
            .checkTimestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
            .barcode(barcode)
            
            .build();
    }
    
    /**
     * Build family member info from MemberViewDto (Principal).
     */
    private ProviderEligibilityResponse.FamilyMemberInfo buildFamilyMemberInfo(
            MemberViewDto memberDto, 
            Member member,
            boolean isPrincipal,
            String principalBarcode) {
        
        // Calculate annual limits using BenefitPolicyCoverageService
        BigDecimal annualLimit = BigDecimal.ZERO;
        BigDecimal usedAmount = BigDecimal.ZERO;
        BigDecimal remainingLimit = BigDecimal.ZERO;
        Double usagePercentage = 0.0;
        
        if (member != null && member.getBenefitPolicy() != null) {
            BenefitPolicy policy = member.getBenefitPolicy();
            annualLimit = policy.getAnnualLimit() != null 
                ? policy.getAnnualLimit() 
                : BigDecimal.ZERO;
                
            usedAmount = calculateUsedAmount(member);
            remainingLimit = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
            if (remainingLimit == null) {
                remainingLimit = BigDecimal.ZERO;
            }
            
            if (annualLimit.compareTo(BigDecimal.ZERO) > 0) {
                usagePercentage = usedAmount
                    .divide(annualLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
            }
        }
        
        Integer age = memberDto.getBirthDate() != null 
            ? Period.between(memberDto.getBirthDate(), LocalDate.now()).getYears() 
            : null;
        
        boolean eligible = Boolean.TRUE.equals(memberDto.getEligibilityStatus()) && 
                          Boolean.TRUE.equals(memberDto.getActive());
        
        String eligibilityMessage = eligible 
            ? "مؤهل للخدمة" 
            : (Boolean.FALSE.equals(memberDto.getActive()) 
                ? "غير نشط" 
                : "غير مؤهل");
        
        return ProviderEligibilityResponse.FamilyMemberInfo.builder()
            .memberId(memberDto.getId())
            .isPrincipal(isPrincipal)
            .fullName(memberDto.getFullName())
            .fullNameEn(memberDto.getFullName())
            .relationship(isPrincipal ? "SELF" : null)
            .birthDate(memberDto.getBirthDate() != null ? memberDto.getBirthDate().toString() : null)
            .age(age)
            .gender(memberDto.getGender() != null ? memberDto.getGender().toString() : null)
            .nationalId(memberDto.getCivilId())
            .barcode(memberDto.getBarcode())
            .eligible(eligible)
            .eligibilityMessage(eligibilityMessage)
            .annualLimit(annualLimit)
            .usedAmount(usedAmount)
            .remainingLimit(remainingLimit)
            .usagePercentage(usagePercentage)
            .active(memberDto.getActive())
            .cardNumber(maskCardNumber(memberDto.getBarcode()))
            .build();
    }
    
    /**
     * Build family member info from DependentViewDto.
     * Dependents use the principal's barcode for eligibility checks.
     */
    private ProviderEligibilityResponse.FamilyMemberInfo buildFamilyMemberInfo(
            DependentViewDto dependent,
            Member member,
            boolean isPrincipal,
            String principalBarcode) {
        
        // Calculate annual limits using BenefitPolicyCoverageService
        BigDecimal annualLimit = BigDecimal.ZERO;
        BigDecimal usedAmount = BigDecimal.ZERO;
        BigDecimal remainingLimit = BigDecimal.ZERO;
        Double usagePercentage = 0.0;
        
        if (member != null && member.getBenefitPolicy() != null) {
            BenefitPolicy policy = member.getBenefitPolicy();
            annualLimit = policy.getAnnualLimit() != null 
                ? policy.getAnnualLimit() 
                : BigDecimal.ZERO;
                
            usedAmount = calculateUsedAmount(member);
            remainingLimit = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
            if (remainingLimit == null) {
                remainingLimit = BigDecimal.ZERO;
            }
            
            if (annualLimit.compareTo(BigDecimal.ZERO) > 0) {
                usagePercentage = usedAmount
                    .divide(annualLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
            }
        }
        
        Integer age = dependent.getBirthDate() != null 
            ? Period.between(dependent.getBirthDate(), LocalDate.now()).getYears() 
            : null;
        
        boolean eligible = Boolean.TRUE.equals(dependent.getEligibilityStatus()) && 
                          Boolean.TRUE.equals(dependent.getActive());
        
        String eligibilityMessage = eligible 
            ? "مؤهل للخدمة" 
            : (Boolean.FALSE.equals(dependent.getActive()) 
                ? "غير نشط" 
                : "غير مؤهل");
        
        return ProviderEligibilityResponse.FamilyMemberInfo.builder()
            .memberId(dependent.getId())
            .isPrincipal(false)
            .fullName(dependent.getFullName())
            .fullNameEn(dependent.getFullName())
            .relationship(dependent.getRelationship() != null 
                ? dependent.getRelationship().toString() 
                : null)
            .birthDate(dependent.getBirthDate() != null ? dependent.getBirthDate().toString() : null)
            .age(age)
            .gender(dependent.getGender() != null ? dependent.getGender().toString() : null)
            .nationalId(dependent.getCivilId())
            .barcode(principalBarcode) // Dependents use principal's barcode
            .eligible(eligible)
            .eligibilityMessage(eligibilityMessage)
            .annualLimit(annualLimit)
            .usedAmount(usedAmount)
            .remainingLimit(remainingLimit)
            .usagePercentage(usagePercentage)
            .active(dependent.getActive())
            .cardNumber(maskCardNumber(dependent.getCardNumber()))
            .build();
    }
    
    /**
     * Calculate used amount for member in current year.
     */
    private BigDecimal calculateUsedAmount(Member member) {
        if (member == null || member.getBenefitPolicy() == null) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal annualLimit = member.getBenefitPolicy().getAnnualLimit();
        if (annualLimit == null || annualLimit.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal remaining = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
        if (remaining == null) {
            return BigDecimal.ZERO;
        }
        
        return annualLimit.subtract(remaining).max(BigDecimal.ZERO);
    }
    
    /**
     * Build warning messages for provider.
     */
    private List<String> buildWarnings(List<ProviderEligibilityResponse.FamilyMemberInfo> familyMembers) {
        List<String> warnings = new ArrayList<>();
        
        for (ProviderEligibilityResponse.FamilyMemberInfo member : familyMembers) {
            // Warning: High usage (>= 80%)
            if (member.getUsagePercentage() != null && member.getUsagePercentage() >= 80.0) {
                warnings.add(String.format(
                    "⚠️ الحد السنوي لـ %s وصل إلى %.0f%% (متبقي: %.2f د.ل)",
                    member.getFullName(),
                    member.getUsagePercentage(),
                    member.getRemainingLimit()
                ));
            }
            
            // Warning: Inactive member
            if (Boolean.FALSE.equals(member.getActive())) {
                warnings.add(String.format("❌ العضو %s غير نشط", member.getFullName()));
            }
        }
        
        return warnings;
    }
    
    /**
     * Mask card number for security (show last 4 digits only).
     */
    private String maskCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.length() <= 4) {
            return cardNumber;
        }
        
        String lastFour = cardNumber.substring(cardNumber.length() - 4);
        return "****" + lastFour;
    }
}