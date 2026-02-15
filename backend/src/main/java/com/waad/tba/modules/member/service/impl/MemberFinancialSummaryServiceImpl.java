package com.waad.tba.modules.member.service.impl;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.dto.MemberFinancialSummaryDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.service.MemberFinancialSummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * تنفيذ خدمة ملخص الحسابات المالية للأعضاء.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberFinancialSummaryServiceImpl implements MemberFinancialSummaryService {

    private final MemberRepository memberRepository;
    private final ClaimRepository claimRepository;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;

    @Override
    public MemberFinancialSummaryDto getFinancialSummary(Long memberId) {
        log.info("📊 Generating financial summary for member ID: {}", memberId);

        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member", "id", memberId));

        BenefitPolicy policy = member.getBenefitPolicy();
        List<Claim> allClaims = claimRepository.findByMemberId(memberId);
        MemberFinancialSummaryDto.MemberFinancialSummaryDtoBuilder builder = MemberFinancialSummaryDto.builder();

        builder.memberId(member.getId())
               .fullName(member.getFullName())
               .cardNumber(member.getCardNumber())
               .barcode(member.getBarcode())
               .isDependent(member.getParent() != null);

        if (policy != null) {
            builder.policyId(policy.getId())
                   .policyName(policy.getName())
                   .annualLimit(policy.getAnnualLimit())
                   .policyStartDate(policy.getStartDate())
                   .policyEndDate(policy.getEndDate())
                   .policyActive(policy.isActive() && policy.isEffectiveOn(LocalDate.now()));
        } else {
            builder.policyActive(false);
        }

        BigDecimal totalClaimed = calculateTotalClaimed(allClaims);
        BigDecimal totalApproved = calculateTotalApproved(allClaims);
        BigDecimal totalPaid = calculateTotalPaid(allClaims);
        BigDecimal totalPatientCoPay = calculateTotalPatientCoPay(allClaims);
        BigDecimal totalDeductible = calculateTotalDeductible(allClaims);

        builder.totalClaimed(totalClaimed)
               .totalApproved(totalApproved)
               .totalPaid(totalPaid)
               .totalPatientCoPay(totalPatientCoPay)
               .totalDeductibleApplied(totalDeductible);

        BigDecimal remainingCoverage = null;
        BigDecimal utilizationPercent = BigDecimal.ZERO;
        
        if (policy != null) {
            remainingCoverage = benefitPolicyCoverageService.getRemainingCoverage(member, LocalDate.now());
            builder.remainingCoverage(remainingCoverage);

            if (policy.getAnnualLimit() != null && policy.getAnnualLimit().compareTo(BigDecimal.ZERO) > 0) {
                utilizationPercent = totalApproved
                    .multiply(BigDecimal.valueOf(100))
                    .divide(policy.getAnnualLimit(), 2, RoundingMode.HALF_UP);
                builder.utilizationPercent(utilizationPercent);
            }
        }

        int totalCount = allClaims.size();
        builder.claimsCount(totalCount)
               .pendingClaimsCount((int) allClaims.stream().filter(c -> c.getStatus() == ClaimStatus.SUBMITTED || c.getStatus() == ClaimStatus.UNDER_REVIEW).count())
               .approvedClaimsCount((int) allClaims.stream().filter(c -> c.getStatus() == ClaimStatus.APPROVED || c.getStatus() == ClaimStatus.SETTLED).count())
               .rejectedClaimsCount((int) allClaims.stream().filter(c -> c.getStatus() == ClaimStatus.REJECTED).count())
               .lastClaimDate(allClaims.stream().map(Claim::getCreatedAt).filter(Objects::nonNull).max(java.time.LocalDateTime::compareTo).map(dateTime -> dateTime.toLocalDate()).orElse(null));

        String warning = null;
        boolean nearingLimit = false;
        boolean expiringSoon = false;

        if (policy != null) {
            if (utilizationPercent.compareTo(BigDecimal.valueOf(80)) >= 0) {
                nearingLimit = true;
                warning = "⚠️ تنبيه: اقتربت من حد التغطية السنوي (" + utilizationPercent.intValue() + "% مستهلك)";
            }
            if (policy.getEndDate() != null) {
                long days = ChronoUnit.DAYS.between(LocalDate.now(), policy.getEndDate());
                if (days > 0 && days <= 30) {
                    expiringSoon = true;
                    if (warning == null) warning = "⚠️ تنبيه: الوثيقة ستنتهي خلال " + days + " يوم";
                } else if (days <= 0) warning = "❌ الوثيقة منتهية";
            }
        } else {
            warning = "❌ لا توجد وثيقة تغطية مربوطة بالعضو";
        }

        builder.warningMessage(warning).nearingLimit(nearingLimit).policyExpiringSoon(expiringSoon);
        return builder.build();
    }

    private BigDecimal calculateTotalClaimed(List<Claim> claims) {
        return claims.stream().filter(c -> c.getRequestedAmount() != null).map(Claim::getRequestedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotalApproved(List<Claim> claims) {
        List<ClaimStatus> approvedStatuses = Arrays.asList(ClaimStatus.APPROVED, ClaimStatus.SETTLED);
        return claims.stream().filter(c -> approvedStatuses.contains(c.getStatus())).filter(c -> c.getApprovedAmount() != null).map(Claim::getApprovedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotalPaid(List<Claim> claims) {
        return claims.stream().filter(c -> c.getStatus() == ClaimStatus.SETTLED).filter(c -> c.getApprovedAmount() != null).map(Claim::getApprovedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotalPatientCoPay(List<Claim> claims) {
        List<ClaimStatus> approvedStatuses = Arrays.asList(ClaimStatus.APPROVED, ClaimStatus.SETTLED);
        return claims.stream().filter(c -> approvedStatuses.contains(c.getStatus())).filter(c -> c.getPatientCoPay() != null).map(Claim::getPatientCoPay).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotalDeductible(List<Claim> claims) {
        List<ClaimStatus> approvedStatuses = Arrays.asList(ClaimStatus.APPROVED, ClaimStatus.SETTLED);
        return claims.stream().filter(c -> approvedStatuses.contains(c.getStatus())).filter(c -> c.getDeductibleApplied() != null).map(Claim::getDeductibleApplied).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
