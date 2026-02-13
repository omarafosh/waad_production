package com.waad.tba.modules.provider.service;

import com.waad.tba.modules.provider.dto.ProviderEligibilityResponse;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.dto.DependentViewDto;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderEligibilityService {

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;

    public Member findMember(String lookupKey) {
        List<Member> barcodeMembers = memberRepository.findByBarcode(lookupKey);
        Member member = barcodeMembers.isEmpty() ? null : barcodeMembers.get(0);
        
        if (member == null) {
            List<Member> cardMembers = memberRepository.findByCardNumberWithDetails(lookupKey);
            member = cardMembers.isEmpty() ? null : cardMembers.get(0);
        }
        
        if (member == null) {
            List<Member> employeeMembers = memberRepository.findByEmployeeNumberWithDetails(lookupKey);
            member = employeeMembers.isEmpty() ? null : employeeMembers.get(0);
        }
        
        return member;
    }

    public void validateProviderUserPermissions(Member member, String username) {
        if (username == null || member.getEmployerOrganization() == null) {
            return;
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return;

        if (authorizationService.isAdmin(user) || Boolean.TRUE.equals(user.getAllowAllCompanies())) {
            return;
        }

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

    public ProviderEligibilityResponse.FamilyMemberInfo buildFamilyMemberInfo(
            MemberViewDto memberDto, 
            Member member,
            boolean isPrincipal,
            String principalBarcode) {
        
        BigDecimal annualLimit = BigDecimal.ZERO;
        BigDecimal usedAmount = BigDecimal.ZERO;
        BigDecimal remainingLimit = BigDecimal.ZERO;
        Double usagePercentage = 0.0;
        
        if (member != null && member.getBenefitPolicy() != null) {
            BenefitPolicy policy = member.getBenefitPolicy();
            annualLimit = policy.getAnnualLimit() != null ? policy.getAnnualLimit() : BigDecimal.ZERO;
            usedAmount = calculateUsedAmount(member);
            remainingLimit = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
            if (remainingLimit == null) remainingLimit = BigDecimal.ZERO;
            
            if (annualLimit.compareTo(BigDecimal.ZERO) > 0) {
                usagePercentage = usedAmount.divide(annualLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
            }
        }
        
        Integer age = memberDto.getBirthDate() != null 
            ? Period.between(memberDto.getBirthDate(), LocalDate.now()).getYears() : null;
        
        boolean eligible = Boolean.TRUE.equals(memberDto.getEligibilityStatus()) && Boolean.TRUE.equals(memberDto.getActive());
        
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
            .eligibilityMessage(eligible ? "مؤهل للخدمة" : (Boolean.FALSE.equals(memberDto.getActive()) ? "غير نشط" : "غير مؤهل"))
            .annualLimit(annualLimit)
            .usedAmount(usedAmount)
            .remainingLimit(remainingLimit)
            .usagePercentage(usagePercentage)
            .active(memberDto.getActive())
            .cardNumber(maskCardNumber(memberDto.getBarcode()))
            .build();
    }

    public ProviderEligibilityResponse.FamilyMemberInfo buildFamilyMemberInfo(
            DependentViewDto dependent,
            Member member,
            String principalBarcode) {
        
        BigDecimal annualLimit = BigDecimal.ZERO;
        BigDecimal usedAmount = BigDecimal.ZERO;
        BigDecimal remainingLimit = BigDecimal.ZERO;
        Double usagePercentage = 0.0;
        
        if (member != null && member.getBenefitPolicy() != null) {
            BenefitPolicy policy = member.getBenefitPolicy();
            annualLimit = policy.getAnnualLimit() != null ? policy.getAnnualLimit() : BigDecimal.ZERO;
            usedAmount = calculateUsedAmount(member);
            remainingLimit = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
            if (remainingLimit == null) remainingLimit = BigDecimal.ZERO;
            
            if (annualLimit.compareTo(BigDecimal.ZERO) > 0) {
                usagePercentage = usedAmount.divide(annualLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
            }
        }
        
        Integer age = dependent.getBirthDate() != null 
            ? Period.between(dependent.getBirthDate(), LocalDate.now()).getYears() : null;
        
        boolean eligible = Boolean.TRUE.equals(dependent.getEligibilityStatus()) && Boolean.TRUE.equals(dependent.getActive());
        
        return ProviderEligibilityResponse.FamilyMemberInfo.builder()
            .memberId(dependent.getId())
            .isPrincipal(false)
            .fullName(dependent.getFullName())
            .fullNameEn(dependent.getFullName())
            .relationship(dependent.getRelationship() != null ? dependent.getRelationship().toString() : null)
            .birthDate(dependent.getBirthDate() != null ? dependent.getBirthDate().toString() : null)
            .age(age)
            .gender(dependent.getGender() != null ? dependent.getGender().toString() : null)
            .nationalId(dependent.getCivilId())
            .barcode(principalBarcode)
            .eligible(eligible)
            .eligibilityMessage(eligible ? "مؤهل للخدمة" : (Boolean.FALSE.equals(dependent.getActive()) ? "غير نشط" : "غير مؤهل"))
            .annualLimit(annualLimit)
            .usedAmount(usedAmount)
            .remainingLimit(remainingLimit)
            .usagePercentage(usagePercentage)
            .active(dependent.getActive())
            .cardNumber(maskCardNumber(dependent.getCardNumber()))
            .build();
    }

    public BigDecimal calculateUsedAmount(Member member) {
        if (member == null || member.getBenefitPolicy() == null) return BigDecimal.ZERO;
        
        BigDecimal annualLimit = member.getBenefitPolicy().getAnnualLimit();
        if (annualLimit == null || annualLimit.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;
        
        BigDecimal remaining = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
        if (remaining == null) return BigDecimal.ZERO;
        
        return annualLimit.subtract(remaining).max(BigDecimal.ZERO);
    }

    private String maskCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.length() <= 4) return cardNumber;
        return "****" + cardNumber.substring(cardNumber.length() - 4);
    }
}
