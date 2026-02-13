package com.waad.tba.modules.provider.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRuleRepository;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.provider.dto.ProviderClaimResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderClaimValidationService {

    private final MemberRepository memberRepository;
    private final ClaimRepository claimRepository;
    private final BenefitPolicyRuleRepository benefitPolicyRuleRepository;

    public Member validateMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with ID: " + memberId));
        
        if (Boolean.FALSE.equals(member.getActive())) {
            throw new BusinessRuleException("Member is not active - cannot submit claim");
        }
        
        if (member.getBenefitPolicy() == null) {
            throw new BusinessRuleException("Member has no benefit policy assigned");
        }
        
        log.info("✅ Member validated: id={}, name={}, policy={}", 
                 member.getId(), member.getFullName(), member.getBenefitPolicy().getId());
        
        return member;
    }

    public AnnualLimitCheck checkAnnualLimit(Member member, BigDecimal claimedAmount) {
        BigDecimal annualLimit = BigDecimal.ZERO;
        if (member.getBenefitPolicy() != null && member.getBenefitPolicy().getAnnualLimit() != null) {
            annualLimit = member.getBenefitPolicy().getAnnualLimit();
        }
        
        if (annualLimit.compareTo(BigDecimal.ZERO) <= 0) {
            annualLimit = BigDecimal.valueOf(10000);  // System default
            log.info("💰 No annual limit in policy, using system default: {} LYD", annualLimit);
        }
        
        LocalDate yearStart = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        
        BigDecimal usedAmount = claimRepository.sumApprovedAmountsByMemberAndYear(
                member.getId(), yearStart, yearEnd);
        
        if (usedAmount == null) {
            usedAmount = BigDecimal.ZERO;
        }
        
        BigDecimal remainingBefore = annualLimit.subtract(usedAmount);
        BigDecimal usedAfter = usedAmount.add(claimedAmount);
        BigDecimal remainingAfter = annualLimit.subtract(usedAfter);
        
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
        
        if (usagePercentageAfter >= 80.0 && !exceeded) {
            warnings.add(String.format(
                "⚠️ بعد هذه المطالبة، سيصل استهلاك الحد السنوي إلى %.0f%%",
                usagePercentageAfter
            ));
        }
        
        if (exceeded) {
            warnings.add(String.format(
                "❌ المبلغ المطلوب (%.2f د.ل) يتجاوز الحد المتبقي (%.2f د.ل)",
                claimedAmount, remainingBefore.max(BigDecimal.ZERO)
            ));
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
            warnings
        );
    }

    public ServiceLimitCheck checkServiceLimits(Member member, Long serviceCategoryId, BigDecimal claimedAmount, String serviceCode) {
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
        String serviceName = "Service #" + serviceCategoryId;
        
        if (rule.getAmountLimit() != null && claimedAmount.compareTo(rule.getAmountLimit()) > 0) {
            warnings.add(String.format(
                "⚠️ المبلغ المطلوب (%.2f د.ل) يتجاوز حد الخدمة (%.2f د.ل) لـ %s",
                claimedAmount, rule.getAmountLimit(), serviceName
            ));
            exceeded = true;
        }
        
        int timesUsed = 0;
        int timesRemaining = 0;
        
        if (rule.getTimesLimit() != null && serviceCode != null) {
            timesUsed = calculateTimesUsed(member.getId(), serviceCode);
            timesRemaining = rule.getTimesLimit() - timesUsed;
            
            if (timesUsed >= rule.getTimesLimit()) {
                warnings.add(String.format(
                    "❌ تم استنفاذ العدد المسموح من خدمة %s (%d مرة في السنة)",
                    serviceName, rule.getTimesLimit()
                ));
                exceeded = true;
            } else if (timesRemaining <= 2) {
                warnings.add(String.format(
                    "⚠️ اقتربت من الحد الأقصى لخدمة %s (متبقي %d مرة من %d)",
                    serviceName, timesRemaining, rule.getTimesLimit()
                ));
            }
        }
        
        ProviderClaimResponse.ServiceLimitInfo limitInfo = ProviderClaimResponse.ServiceLimitInfo.builder()
            .serviceName(serviceName)
            .amountLimit(rule.getAmountLimit())
            .timesLimit(rule.getTimesLimit())
            .timesUsed(timesUsed)
            .timesRemaining(timesRemaining)
            .exceedsLimit(exceeded)
            .build();
        
        return new ServiceLimitCheck(exceeded, limitInfo, warnings);
    }

    private int calculateTimesUsed(Long memberId, String serviceCode) {
        LocalDate yearStart = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        
        long count = claimRepository.countPendingAndApprovedClaimsByMemberAndServiceInPeriod(
            memberId, serviceCode, yearStart, yearEnd);
        
        return (int) count;
    }

    public record AnnualLimitCheck(
        BigDecimal annualLimit,
        BigDecimal usedAmountBefore,
        BigDecimal usedAmountAfter,
        BigDecimal remainingBefore,
        BigDecimal remainingAfter,
        double usagePercentageBefore,
        double usagePercentageAfter,
        boolean exceeded,
        List<String> warnings
    ) {}
    
    public record ServiceLimitCheck(
        boolean exceeded,
        ProviderClaimResponse.ServiceLimitInfo limitInfo,
        List<String> warnings
    ) {}
}
