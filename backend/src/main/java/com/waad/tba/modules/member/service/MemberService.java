package com.waad.tba.modules.member.service;

import java.io.IOException;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.waad.tba.modules.member.dto.FamilyEligibilityResponseDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberSearchCriteria;
import com.waad.tba.modules.member.dto.MemberUpdateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.entity.MemberWorkflowHistory;

/**
 * Core interface for Member management following interface-based design.
 * Handles the 5 main operations: Creation, Lifecycle, Search, Excel Export, and Eligibility.
 */
public interface MemberService {

    // ── CREATION ──────────────────────────────────────────
    MemberViewDto createPrincipal(MemberCreateDto dto);
    MemberViewDto createDependent(Long principalId, DependentMemberDto dto);

    // ── READ / UPDATE / DELETE ─────────────────────────────
    MemberViewDto getById(Long id);
    MemberViewDto update(Long id, MemberUpdateDto dto);
    void delete(Long id); // Soft delete
    void restore(Long id);

    // ── LIFECYCLE ─────────────────────────────────────────
    MemberViewDto activate(Long id, String reason);
    MemberViewDto suspend(Long id, String reason);
    List<MemberWorkflowHistory> getHistory(Long id);

    // ── SEARCH ────────────────────────────────────────────
    Page<MemberViewDto> search(MemberSearchCriteria criteria, Pageable pageable);

    // ── EXPORT ────────────────────────────────────────────
    byte[] exportToExcel(MemberSearchCriteria criteria) throws IOException;

    // ── ELIGIBILITY ───────────────────────────────────────
    FamilyEligibilityResponseDto checkEligibility(String query);

    // ── PHOTO ─────────────────────────────────────────────
    MemberViewDto uploadPhoto(Long id, org.springframework.web.multipart.MultipartFile file);
    void deletePhoto(Long id);
}
