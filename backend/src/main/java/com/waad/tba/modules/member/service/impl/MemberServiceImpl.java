package com.waad.tba.modules.member.service.impl;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.dto.FamilyEligibilityResponseDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberSearchCriteria;
import com.waad.tba.modules.member.dto.MemberUpdateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import com.waad.tba.modules.member.exception.MemberNotFoundException;
import com.waad.tba.modules.member.mapper.MemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository;
import com.waad.tba.modules.member.service.MemberService;
import com.waad.tba.modules.member.service.search.MemberSearchService;
import com.waad.tba.modules.member.service.util.MemberGeneratorService;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final MemberRepository memberRepository;
    private final MemberWorkflowHistoryRepository workflowHistoryRepository;
    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final MemberGeneratorService memberGenerator;
    private final MemberSearchService searchService;
    private final MemberMapper mapper;
    private final com.waad.tba.common.file.FileStorageService fileStorageService;

    // ── CREATION ──────────────────────────────────────────

    @Override
    @Transactional
    @SuppressWarnings("deprecation")
    public MemberViewDto createPrincipal(MemberCreateDto dto) {
        log.info("🆕 Creating PRINCIPAL member: {}", dto.getFullName());

        if (dto.getParentId() != null) {
            throw new BusinessRuleException("Cannot create principal member with parentId.");
        }

        Long employerId = resolveEmployerId(dto);
        Organization employerOrg = organizationRepository.findById(employerId)
                .orElseThrow(() -> new ResourceNotFoundException("Employer organization not found: " + employerId));

        BenefitPolicy benefitPolicy = resolveBenefitPolicy(dto, employerId);

        Member principal = mapper.toEntity(dto);

        // Fast-Track Logic
        if (Boolean.TRUE.equals(dto.getIsFastTrack())) {
            principal.setStatus(Member.MemberStatus.PENDING_VERIFICATION);
            principal.setIsVip(true);
            principal.setIsUrgent(true);
        }

        principal.setEmployerOrganization(employerOrg);
        principal.setBenefitPolicy(benefitPolicy);
        principal.setParent(null);
        principal.setRelationship(null);

        // Generate Identifiers
        if (dto.getCardNumber() != null && !dto.getCardNumber().isBlank()) {
            principal.setCardNumber(dto.getCardNumber());
        } else {
            principal.setCardNumber(memberGenerator.generateCardNumber(principal));
        }
        principal.setBarcode(memberGenerator.generateBarcode(principal));

        principal = memberRepository.save(principal);
        logWorkflowHistory(principal, null, principal.getStatus().name(), "Initial Creation");

        // Handle Initial Dependents
        List<Member> dependents = new ArrayList<>();
        if (dto.getDependents() != null && !dto.getDependents().isEmpty()) {
            for (DependentMemberDto depDto : dto.getDependents()) {
                dependents.add(createDependentInternal(principal, depDto));
            }
        }

        return mapper.toViewDto(principal, dependents);
    }

    @Override
    @Transactional
    public MemberViewDto createDependent(Long principalId, DependentMemberDto dto) {
        Member principal = memberRepository.findById(principalId)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(principalId)));

        if (!principal.isPrincipal()) {
            throw new BusinessRuleException("Parent member must be a principal.");
        }

        Member dependent = createDependentInternal(principal, dto);
        return mapper.toViewDto(dependent);
    }

    private Member createDependentInternal(Member principal, DependentMemberDto dto) {
        Member dependent = mapper.toEntity(dto);
        dependent.setParent(principal);
        dependent.setEmployerOrganization(principal.getEmployerOrganization());
        dependent.setBenefitPolicy(principal.getBenefitPolicy());
        dependent.setCardNumber(memberGenerator.generateCardNumber(dependent));
        dependent.setBarcode(null); // Dependents use principal's barcode

        dependent = memberRepository.save(dependent);
        logWorkflowHistory(dependent, null, dependent.getStatus().name(), "Dependency Added");
        return dependent;
    }

    // ── READ / UPDATE / DELETE ─────────────────────────────

    @Override
    public MemberViewDto getById(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        if (member.isPrincipal()) {
            List<Member> dependents = memberRepository.findByParentIdAndActiveTrue(id);
            return mapper.toViewDto(member, dependents);
        }
        return mapper.toViewDto(member);
    }

    @Override
    @Transactional
    public MemberViewDto update(Long id, MemberUpdateDto dto) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        String oldStatus = member.getStatus().name();
        mapper.updateEntityFromDto(member, dto);

        member = memberRepository.save(member);

        if (!oldStatus.equals(member.getStatus().name())) {
            logWorkflowHistory(member, oldStatus, member.getStatus().name(), "Status Updated via Update");
        }

        return getById(id);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        member.setActive(false);
        memberRepository.save(member);
        logWorkflowHistory(member, member.getStatus().name(), "DELETED", "Soft Delete performed");
    }

    @Override
    @Transactional
    public void restore(Long id) {
        // Need to bypass SQLRestriction for restore
        // This usually requires a separate repository method or native query
        memberRepository.restoreMember(id);
    }

    // ── LIFECYCLE ─────────────────────────────────────────

    @Override
    @Transactional
    public MemberViewDto activate(Long id, String reason) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        String oldStatus = member.getStatus().name();
        member.setStatus(Member.MemberStatus.ACTIVE);
        member.setCardStatus(Member.CardStatus.ACTIVE);

        member = memberRepository.save(member);
        logWorkflowHistory(member, oldStatus, "ACTIVE", reason);

        return toViewDtoWithDependents(member);
    }

    @Override
    @Transactional
    public MemberViewDto suspend(Long id, String reason) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        String oldStatus = member.getStatus().name();
        member.setStatus(Member.MemberStatus.SUSPENDED);
        member.setCardStatus(Member.CardStatus.INACTIVE);
        member.setBlockedReason(reason);

        member = memberRepository.save(member);
        logWorkflowHistory(member, oldStatus, "SUSPENDED", reason);

        return toViewDtoWithDependents(member);
    }

    @Override
    public List<MemberWorkflowHistory> getHistory(Long id) {
        return workflowHistoryRepository.findByMemberIdOrderByChangedAtDesc(id);
    }

    // ── SEARCH ────────────────────────────────────────────

    @Override
    public Page<MemberViewDto> search(MemberSearchCriteria criteria, Pageable pageable) {
        return searchService.searchMembersAdvanced(criteria, pageable);
    }

    // ── EXPORT ────────────────────────────────────────────

    @Override
    public byte[] exportToExcel(MemberSearchCriteria criteria) throws IOException {
        List<MemberViewDto> members = searchService.searchMembersAdvanced(criteria, Pageable.unpaged()).getContent();

        try (XSSFWorkbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Members");
            writeExcelHeader(sheet);

            int rowIndex = 1;
            for (MemberViewDto member : members) {
                writeExcelRow(sheet.createRow(rowIndex++), member);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    // ── ELIGIBILITY ───────────────────────────────────────

    @Override
    public FamilyEligibilityResponseDto checkEligibility(String query) {
        return searchService.checkFamilyEligibility(query);
    }

    // ── PHOTO ─────────────────────────────────────────────

    @Override
    @Transactional
    public MemberViewDto uploadPhoto(Long id, org.springframework.web.multipart.MultipartFile file) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        com.waad.tba.common.file.FileUploadResult result = fileStorageService.upload(file, "members/" + id);
        member.setPhotoUrl(result.getFileKey());
        memberRepository.save(member);

        logWorkflowHistory(member, member.getStatus().name(), member.getStatus().name(), "Photo uploaded");
        return getById(id);
    }

    @Override
    @Transactional
    public void deletePhoto(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new MemberNotFoundException(String.valueOf(id)));

        if (member.getPhotoUrl() != null && !member.getPhotoUrl().isBlank()) {
            fileStorageService.delete(member.getPhotoUrl());
            member.setPhotoUrl(null);
            memberRepository.save(member);
            logWorkflowHistory(member, member.getStatus().name(), member.getStatus().name(), "Photo deleted");
        }
    }

    // ── HELPERS ───────────────────────────────────────────

    private Long resolveEmployerId(MemberCreateDto dto) {
        Long employerId = dto.getEmployerId();
        if (employerId == null && Boolean.TRUE.equals(dto.getIsVip())) {
            return organizationRepository.findByCode("VIP")
                    .map(Organization::getId)
                    .orElseGet(() -> organizationRepository.findByActiveTrue().stream()
                            .findFirst()
                            .map(Organization::getId)
                            .orElseThrow(
                                    () -> new BusinessRuleException("No Active Organization found for VIP member.")));
        }
        if (employerId == null) {
            throw new BusinessRuleException("Employer ID is required for non-VIP members.");
        }
        return employerId;
    }

    private BenefitPolicy resolveBenefitPolicy(MemberCreateDto dto, Long employerId) {
        if (dto.getBenefitPolicyId() != null) {
            return benefitPolicyRepository.findById(dto.getBenefitPolicyId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Benefit policy not found: " + dto.getBenefitPolicyId()));
        }
        return benefitPolicyRepository.findActiveEffectivePolicyForEmployer(employerId, LocalDate.now()).orElse(null);
    }

    private void logWorkflowHistory(Member member, String fromStatus, String toStatus, String notes) {
        MemberWorkflowHistory history = MemberWorkflowHistory.builder()
                .member(member)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .reason(notes)
                .changedAt(LocalDateTime.now())
                .build();
        workflowHistoryRepository.save(history);
    }

    private MemberViewDto toViewDtoWithDependents(Member member) {
        if (member.isPrincipal()) {
            List<Member> dependents = memberRepository.findByParentIdAndActiveTrue(member.getId());
            return mapper.toViewDto(member, dependents);
        }
        return mapper.toViewDto(member);
    }

    private void writeExcelHeader(Sheet sheet) {
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Full Name");
        header.createCell(2).setCellValue("Type");
        header.createCell(3).setCellValue("Civil ID");
        header.createCell(4).setCellValue("Card Number");
        header.createCell(5).setCellValue("Barcode");
        header.createCell(6).setCellValue("Status");
        header.createCell(7).setCellValue("Employer");
        header.createCell(8).setCellValue("Benefit Policy");
        header.createCell(9).setCellValue("Active");
    }

    private void writeExcelRow(Row row, MemberViewDto member) {
        row.createCell(0).setCellValue(member.getId() != null ? member.getId() : 0L);
        row.createCell(1).setCellValue(valueOrEmpty(member.getFullName()));
        row.createCell(2).setCellValue(valueOrEmpty(member.getType()));
        row.createCell(3).setCellValue(valueOrEmpty(member.getCivilId()));
        row.createCell(4).setCellValue(valueOrEmpty(member.getCardNumber()));
        row.createCell(5).setCellValue(valueOrEmpty(member.getBarcode()));
        row.createCell(6).setCellValue(valueOrEmpty(member.getStatus()));
        row.createCell(7).setCellValue(valueOrEmpty(member.getEmployerName()));
        row.createCell(8).setCellValue(valueOrEmpty(member.getBenefitPolicyName()));
        row.createCell(9).setCellValue(Boolean.TRUE.equals(member.getActive()) ? "true" : "false");
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
