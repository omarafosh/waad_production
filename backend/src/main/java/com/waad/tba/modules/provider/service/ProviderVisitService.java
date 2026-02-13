package com.waad.tba.modules.provider.service;

import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.provider.dto.ProviderVisitRegisterRequest;
import com.waad.tba.modules.provider.dto.ProviderVisitResponse;
import com.waad.tba.modules.provider.dto.VisitContextDto;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;
import com.waad.tba.modules.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Provider Visit Service (Facade).
 * Orchestrates visit operations for the Provider Portal.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderVisitService {

    private final VisitRepository visitRepository;
    private final MemberRepository memberRepository;
    private final ProviderVisitManagementService managementService;

    @Transactional
    public ProviderVisitResponse registerVisit(ProviderVisitRegisterRequest request, String providerUsername) {
        log.info("📋 Registering visit for member ID: {}", request.getMemberId());
        return managementService.registerVisit(request, providerUsername);
    }

    @Transactional(readOnly = true)
    public Page<ProviderVisitResponse> getVisitLog(
            Long providerId, Long memberId, String memberName, String status,
            LocalDate fromDate, LocalDate toDate, Pageable pageable) {

        String normalizedMemberName = (memberName != null && !memberName.trim().isEmpty()) ? memberName.trim() : null;
        String normalizedStatus = (status != null && !status.trim().isEmpty()) ? status.trim() : null;

        if (normalizedStatus != null) {
            try {
                VisitStatus.valueOf(normalizedStatus);
            } catch (IllegalArgumentException e) {
                normalizedStatus = null;
            }
        }

        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Visit> visits = visitRepository.findByFilters(
                providerId, memberId, normalizedMemberName, normalizedStatus, fromDate, toDate, unsorted);

        return visits.map(v -> managementService.mapToResponse(v, v.getMember(), null, false));
    }

    @Transactional(readOnly = true)
    public ProviderVisitResponse getVisitById(Long visitId) {
        Visit visit = visitRepository.findById(visitId).orElse(null);
        if (visit == null) {
            return ProviderVisitResponse.builder().success(false).message("الزيارة غير موجودة").build();
        }

        var provider = managementService.resolveProvider(null, visit.getProviderId());
        return managementService.mapToResponse(visit, visit.getMember(), provider, true);
    }

    @Transactional(readOnly = true)
    public VisitContextDto getVisitContext(Long visitId) {
        return managementService.getVisitContext(visitId);
    }
}
