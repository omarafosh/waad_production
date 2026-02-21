package com.waad.tba.modules.member.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for core member operations like creation and export data preparation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberOperationService {

    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final BarcodeGeneratorService barcodeGenerator;
    private final CardNumberGeneratorService cardNumberGenerator;
    private final UnifiedMemberMapper mapper;
    private final MemberLifecycleService lifecycleService;

    @Transactional
    public MemberViewDto createPrincipalMember(MemberCreateDto dto) {
        if (dto.getParentId() != null) {
            throw new BusinessRuleException("Cannot create principal member with parentId.");
        }

        Long employerId = dto.getEmployerId();
        // Special Handling: VIPs without Employer
        if (employerId == null && Boolean.TRUE.equals(dto.getIsVip())) {
            employerId = organizationRepository.findByCode("VIP")
                    .map(Organization::getId)
                    .orElseGet(() -> organizationRepository.findByActiveTrue().stream()
                            .findFirst()
                            .map(Organization::getId)
                            .orElseThrow(() -> new BusinessRuleException("No Active Organization found to assign VIP member.")));
        }

        if (employerId == null) {
            throw new BusinessRuleException("Employer ID is required for non-VIP members.");
        }

        final Long targetEmployerId = employerId;
        Organization employerOrg = organizationRepository.findById(targetEmployerId)
                .orElseThrow(() -> new ResourceNotFoundException("Employer organization not found: " + targetEmployerId));

        BenefitPolicy benefitPolicy = resolveBenefitPolicy(dto, targetEmployerId);

        Member principal = mapper.toEntity(dto);
        
        if (Boolean.TRUE.equals(dto.getIsFastTrack())) {
            principal.setStatus(Member.MemberStatus.PENDING_VERIFICATION);
            principal.setIsVip(true);
            principal.setIsUrgent(true);
        }

        principal.setEmployerOrganization(employerOrg);
        principal.setBenefitPolicy(benefitPolicy);
        principal.setParent(null);
        principal.setRelationship(null);

        if (dto.getCardNumber() != null && !dto.getCardNumber().isBlank()) {
            principal.setCardNumber(dto.getCardNumber());
        } else {
            principal.setCardNumber(cardNumberGenerator.generateSmartCardNumber(principal));
        }

        principal.setBarcode(barcodeGenerator.generateFromCardNumber(principal));
        principal = memberRepository.save(principal);

        lifecycleService.logWorkflowHistory(principal, null, principal.getStatus().name(), "Initial Creation");

        List<Member> dependents = new ArrayList<>();
        if (dto.getDependents() != null && !dto.getDependents().isEmpty()) {
            for (DependentMemberDto depDto : dto.getDependents()) {
                dependents.add(createDependentInternal(principal, depDto));
            }
        }

        return mapper.toViewDto(principal, dependents);
    }

    @Transactional
    public Member createDependentInternal(Member principal, DependentMemberDto dto) {
        Member dependent = mapper.toEntity(dto);
        dependent.setParent(principal);
        dependent.setBarcode(null);
        dependent.setEmployerOrganization(principal.getEmployerOrganization());
        dependent.setBenefitPolicy(principal.getBenefitPolicy());
        dependent.setPolicyNumber(principal.getPolicyNumber());

        dependent.setCardNumber(cardNumberGenerator.generateSmartCardNumber(dependent));
        dependent.setBarcode(barcodeGenerator.generateFromCardNumber(dependent));

        dependent = memberRepository.save(dependent);
        lifecycleService.logWorkflowHistory(dependent, null, dependent.getStatus().name(), "Initial Creation (Dependent)");

        return dependent;
    }

    private BenefitPolicy resolveBenefitPolicy(MemberCreateDto dto, Long targetEmployerId) {
        if (dto.getBenefitPolicyId() != null) {
            return benefitPolicyRepository.findById(dto.getBenefitPolicyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Benefit policy not found: " + dto.getBenefitPolicyId()));
        } else {
            return benefitPolicyRepository.findActiveEffectivePolicyForEmployer(targetEmployerId, LocalDate.now())
                    .orElse(null);
        }
    }

    public byte[] exportMembersToExcel(List<MemberViewDto> members) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Members");
            
            Row headerRow = sheet.createRow(0);
            String[] headers = {"الاسم الكامل", "رقم البطاقة", "الباركود", "الرقم المدني", "النوع", "الحالة", "جهة العمل", "عدد التابعين"};
            
            CellStyle headerStyle = createHeaderStyle(workbook);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (MemberViewDto member : members) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(member.getFullName() != null ? member.getFullName() : "");
                row.createCell(1).setCellValue(member.getCardNumber() != null ? member.getCardNumber() : "");
                row.createCell(2).setCellValue(member.getBarcode() != null ? member.getBarcode() : "");
                row.createCell(3).setCellValue(member.getCivilId() != null ? member.getCivilId() : "");
                row.createCell(4).setCellValue("PRINCIPAL".equalsIgnoreCase(member.getType()) ? "أصيل" : "تابع");
                row.createCell(5).setCellValue(member.getStatus() != null ? member.getStatus().name() : "");
                row.createCell(6).setCellValue(member.getEmployerName() != null ? member.getEmployerName() : "");
                row.createCell(7).setCellValue(member.getDependentsCount() != null ? member.getDependentsCount() : 0);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return headerStyle;
    }
}
