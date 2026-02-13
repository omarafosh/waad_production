package com.waad.tba.modules.provider.service;

import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;
import com.waad.tba.modules.provider.dto.ProviderVisitRegisterRequest;
import com.waad.tba.modules.provider.dto.ProviderVisitResponse;
import com.waad.tba.modules.provider.dto.VisitContextDto;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;
import com.waad.tba.modules.visit.entity.VisitType;
import com.waad.tba.modules.visit.repository.VisitRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderVisitManagementService {

    private final VisitRepository visitRepository;
    private final MemberRepository memberRepository;
    private final ProviderRepository providerRepository;
    private final PreAuthorizationRepository preAuthorizationRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProviderVisitResponse registerVisit(ProviderVisitRegisterRequest request, String providerUsername) {
        Member member = memberRepository.findById(request.getMemberId()).orElse(null);
        if (member == null) {
            return ProviderVisitResponse.builder().success(false).message("العضو غير موجود").build();
        }
        if (member.getStatus() != Member.MemberStatus.ACTIVE) {
            return ProviderVisitResponse.builder().success(false).message("العضو غير نشط").build();
        }

        Provider provider = resolveProvider(providerUsername, request.getProviderId());
        if (provider == null) {
            return ProviderVisitResponse.builder().success(false).message("لا يوجد مقدم خدمة مرتبط").build();
        }

        VisitType visitType = VisitType.OUTPATIENT;
        if (request.getVisitType() != null) {
            try {
                visitType = VisitType.valueOf(request.getVisitType().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid visit type: {}", request.getVisitType());
            }
        }

        Visit visit = Visit.builder()
                .member(member)
                .employerOrganization(member.getEmployerOrganization())
                .providerId(provider.getId())
                .visitDate(request.getVisitDate() != null ? request.getVisitDate() : LocalDate.now())
                .visitType(visitType)
                .status(VisitStatus.REGISTERED)
                .eligibilityCheckId(request.getEligibilityCheckId())
                .doctorName(request.getDoctorName())
                .specialty(request.getSpecialty())
                .diagnosis(request.getDiagnosis())
                .notes(request.getNotes())
                .active(true)
                .build();

        visit = visitRepository.save(visit);
        return mapToResponse(visit, member, provider, true);
    }

    public Provider resolveProvider(String username, Long requestProviderId) {
        User currentUser = userRepository.findByUsername(username).orElse(null);
        Long providerId = (currentUser != null && currentUser.getProviderId() != null) 
            ? currentUser.getProviderId() : requestProviderId;
        
        return providerId != null ? providerRepository.findById(providerId).orElse(null) : null;
    }

    public VisitContextDto getVisitContext(Long visitId) {
        Visit visit = visitRepository.findById(visitId).orElse(null);
        if (visit == null) return null;

        boolean hasClaim = false;
        Long claimId = null;
        String claimStatus = null;
        String claimStatusLabel = null;

        if (visit.getClaims() != null && !visit.getClaims().isEmpty()) {
            var latestClaim = visit.getClaims().stream()
                .max((c1, c2) -> compareDates(c1.getCreatedAt(), c2.getCreatedAt())).orElse(null);
            if (latestClaim != null) {
                hasClaim = true;
                claimId = latestClaim.getId();
                claimStatus = latestClaim.getStatus() != null ? latestClaim.getStatus().name() : null;
                claimStatusLabel = latestClaim.getStatus() != null ? latestClaim.getStatus().getArabicLabel() : null;
            }
        }

        boolean hasPreAuth = false;
        Long preAuthId = null;
        String preAuthStatus = null;
        String preAuthStatusLabel = null;

        List<PreAuthorization> preAuths = preAuthorizationRepository.findByVisitIdAndActiveTrue(visit.getId());
        if (preAuths != null && !preAuths.isEmpty()) {
            var latestPreAuth = preAuths.stream()
                .max((p1, p2) -> compareDates(p1.getCreatedAt(), p2.getCreatedAt())).orElse(null);
            if (latestPreAuth != null) {
                hasPreAuth = true;
                preAuthId = latestPreAuth.getId();
                preAuthStatus = latestPreAuth.getStatus() != null ? latestPreAuth.getStatus().name() : null;
                preAuthStatusLabel = latestPreAuth.getStatus() != null ? latestPreAuth.getStatus().getArabicLabel() : null;
            }
        }

        return VisitContextDto.builder()
                .visitId(visit.getId())
                .hasClaim(hasClaim)
                .claimId(claimId)
                .claimStatus(claimStatus)
                .claimStatusLabel(claimStatusLabel)
                .hasPreAuthorization(hasPreAuth)
                .preAuthorizationId(preAuthId)
                .preAuthorizationStatus(preAuthStatus)
                .preAuthorizationStatusLabel(preAuthStatusLabel)
                .canCreateClaim(visit.allowsClaimCreation())
                .canCreatePreAuth(visit.allowsPreAuthCreation())
                .build();
    }

    public ProviderVisitResponse mapToResponse(Visit visit, Member member, Provider provider, boolean success) {
        int claimCount = visit.getClaims() != null ? visit.getClaims().size() : 0;
        
        ProviderVisitResponse.ProviderVisitResponseBuilder builder = ProviderVisitResponse.builder()
                .success(success)
                .message(success ? "تم بنجاح" : null)
                .visitId(visit.getId())
                .visitDate(visit.getVisitDate())
                .visitType(visit.getVisitType() != null ? visit.getVisitType().name() : null)
                .visitTypeLabel(visit.getVisitType() != null ? visit.getVisitType().getArabicLabel() : null)
                .status(visit.getStatus() != null ? visit.getStatus().name() : null)
                .statusLabel(visit.getStatus() != null ? visit.getStatus().getLabelAr() : null)
                .doctorName(visit.getDoctorName())
                .specialty(visit.getSpecialty())
                .diagnosis(visit.getDiagnosis())
                .notes(visit.getNotes())
                .canCreateClaim(visit.allowsClaimCreation())
                .canCreatePreAuth(visit.allowsPreAuthCreation())
                .claimCount(claimCount)
                .createdAt(visit.getCreatedAt())
                .updatedAt(visit.getUpdatedAt());

        if (member != null) {
            builder.memberId(member.getId())
                    .memberName(member.getFullName())
                    .memberBarcode(member.getBarcode())
                    .memberCardNumber(member.getCardNumber());
            if (member.getEmployerOrganization() != null) {
                builder.employerName(member.getEmployerOrganization().getName());
            }
        }

        if (provider != null) {
            builder.providerId(provider.getId()).providerName(provider.getName());
        }

        return builder.build();
    }

    private int compareDates(java.time.LocalDateTime d1, java.time.LocalDateTime d2) {
        if (d1 == null && d2 == null) return 0;
        if (d1 == null) return -1;
        if (d2 == null) return 1;
        return d1.compareTo(d2);
    }
}
