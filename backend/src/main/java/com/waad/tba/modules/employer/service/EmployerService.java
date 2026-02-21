package com.waad.tba.modules.employer.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.employer.dto.EmployerCreateDto;
import com.waad.tba.modules.employer.dto.EmployerResponseDto;
import com.waad.tba.modules.employer.dto.EmployerSelectorDto;
import com.waad.tba.modules.employer.dto.EmployerUpdateDto;
import com.waad.tba.modules.employer.mapper.EmployerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Employer Service - Simplified Implementation
 * 
 * Features:
 * - Auto-code generation (EMP-01, EMP-02, ...)
 * - Unified Organization management
 * - Specialized workflow for archived items
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployerService {

    private static final String EMPLOYER_CODE_PREFIX = "EMP-";
    private static final String EMPLOYER_CODE_PATTERN = "EMP-%";
    private static final int EMPLOYER_CODE_LENGTH = 2; // EMP-01, EMP-02, etc.

    private final OrganizationRepository organizationRepository;
    private final EmployerMapper mapper;
    private final com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository benefitPolicyRepository;
    private final com.waad.tba.modules.member.repository.MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<EmployerResponseDto> getAll(
            org.springframework.data.domain.Pageable pageable,
            String search,
            Boolean deleted,
            Boolean active,
            Boolean hasPolicy) {

        // 1. Build Specification
        org.springframework.data.jpa.domain.Specification<Organization> spec = org.springframework.data.jpa.domain.Specification
                .allOf();

        // Filter: Archived (Default specific logic)
        boolean shouldShowArchived = Boolean.TRUE.equals(deleted);
        log.debug("[EmployerService] Fetching organizations with archived={}", shouldShowArchived);
        spec = spec.and((root, query, cb) -> cb.equal(root.get("archived"), shouldShowArchived));

        // Filter: Active (Only apply if we are NOT looking for archived items)
        if (active != null && !shouldShowArchived) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("active"), active));
        }

        // Filter: Search (Name or Code)
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("code")), pattern)));
        }

        // Filter: Has Policy
        if (hasPolicy != null) {
            List<Long> idsWithPolicy = benefitPolicyRepository.findDistinctEmployerIdsWithActivePolicies();

            if (hasPolicy) {
                if (idsWithPolicy.isEmpty()) {
                    return org.springframework.data.domain.Page.empty(pageable);
                }
                spec = spec.and((root, query, cb) -> root.get("id").in(idsWithPolicy));
            } else {
                if (!idsWithPolicy.isEmpty()) {
                    spec = spec.and((root, query, cb) -> cb.not(root.get("id").in(idsWithPolicy)));
                }
            }
        }

        // 2. Execute Query
        org.springframework.data.domain.Page<Organization> page = organizationRepository.findAll(spec, pageable);

        // 3. Map to DTO
        return page.map(this::mapToResponseWithPolicy);
    }

    @Transactional(readOnly = true)
    public List<EmployerResponseDto> getAll(Boolean deleted, Boolean active) {
        return organizationRepository.findAll()
                .stream()
                .filter(org -> (deleted == null || org.isArchived() == deleted))
                .filter(org -> (active == null || org.isActive() == active))
                .map(this::mapToResponseWithPolicy)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EmployerSelectorDto> getSelectors() {
        return organizationRepository.findByActiveTrue()
                .stream()
                .filter(org -> !org.isArchived())
                .map(mapper::toSelector)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployerResponseDto getById(Long id) {
        Organization org = findEmployerById(id);
        return mapToResponseWithPolicy(org);
    }

    @Transactional
    public EmployerResponseDto create(EmployerCreateDto dto) {
        log.info("[EmployerService] Creating organization with name: {}", dto.getName());

        String employerCode = normalizeAndGenerateCode(dto.getCode());
        validateCodeUniqueness(employerCode, null);
        validateNameUniqueness(dto.getName(), null);

        Organization org = Organization.builder()
                .code(employerCode)
                .name(dto.getName())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        Organization saved = organizationRepository.save(org);
        log.info("[EmployerService] Created organization with ID: {} and code: {}", saved.getId(), saved.getCode());

        return mapToResponseWithPolicy(saved);
    }

    @Transactional
    public EmployerResponseDto update(Long id, EmployerUpdateDto dto) {
        log.info("[EmployerService] Updating organization ID: {}", id);

        Organization org = findEmployerById(id);
        String oldCode = org.getCode();

        if (!oldCode.equals(dto.getCode())) {
            validateCodeUniqueness(dto.getCode(), id);
        }

        if (!org.getName().equals(dto.getName())) {
            validateNameUniqueness(dto.getName(), id);
        }

        org.setCode(dto.getCode());
        org.setName(dto.getName());

        if (dto.getActive() != null) {
            org.setActive(dto.getActive());
        }

        Organization updated = organizationRepository.save(org);
        return mapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        throw new BusinessRuleException("لا يمكن حذف البيانات نهائياً. استخدم الأرشفة بدلاً من ذلك.");
    }

    @Transactional
    public EmployerResponseDto archive(Long id) {
        log.info("[EmployerService] Archiving organization ID: {}", id);
        Organization org = findEmployerById(id);
        org.setArchived(true);
        Organization updated = organizationRepository.save(org);
        return mapToResponseWithPolicy(updated);
    }

    @Transactional
    public EmployerResponseDto restore(Long id) {
        log.info("[EmployerService] Restoring organization ID: {}", id);
        Organization org = findEmployerById(id);
        org.setArchived(false);
        Organization updated = organizationRepository.save(org);
        return mapToResponseWithPolicy(updated);
    }

    private Organization findEmployerById(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("المؤسسة غير موجودة للمعرف: " + id));
    }

    private String normalizeAndGenerateCode(String providedCode) {
        if (providedCode != null && !providedCode.trim().isEmpty()) {
            return providedCode.trim();
        }

        List<String> codes = organizationRepository.findMaxCodeByPrefix(EMPLOYER_CODE_PATTERN);
        int nextNumber = 1;

        if (!codes.isEmpty()) {
            String maxCode = codes.get(0);
            try {
                String suffix = maxCode.substring(EMPLOYER_CODE_PREFIX.length());
                nextNumber = Integer.parseInt(suffix) + 1;
            } catch (Exception e) {
                log.warn("[EmployerService] Failed to parse code suffix: {}", maxCode);
            }
        }

        return String.format("%s%0" + EMPLOYER_CODE_LENGTH + "d", EMPLOYER_CODE_PREFIX, nextNumber);
    }

    private void validateCodeUniqueness(String code, Long excludeId) {
        Optional<Organization> existing = organizationRepository.findByCode(code);
        if (existing.isPresent()) {
            Organization existingOrg = existing.get();
            if (excludeId != null && existingOrg.getId().equals(excludeId)) {
                return;
            }
            String details = String.format(" (الاسم: %s، مؤرشف: %s)",
                    existingOrg.getName(), existingOrg.isArchived() ? "نعم" : "لا");
            throw new BusinessRuleException("رمز جهة العمل موجود مسبقاً: " + code + details);
        }
    }

    private void validateNameUniqueness(String name, Long excludeId) {
        Optional<Organization> existing = organizationRepository.findAll().stream()
                .filter(org -> org.getName().equalsIgnoreCase(name.trim()))
                .findFirst();

        if (existing.isPresent()) {
            Organization existingOrg = existing.get();
            if (excludeId != null && existingOrg.getId().equals(excludeId)) {
                return;
            }
            throw new BusinessRuleException("اسم جهة العمل موجود مسبقاً: " + name);
        }
    }

    private EmployerResponseDto mapToResponseWithPolicy(Organization org) {
        if (org == null)
            return null;
        EmployerResponseDto dto = mapper.toResponse(org);

        try {
            long membersCount = memberRepository
                    .countByEmployerOrganizationIdAndBenefitPolicyStatusAndBenefitPolicyActiveTrue(
                            org.getId(),
                            com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.ACTIVE);
            dto.setTotalMembers(membersCount);

            List<com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy> policies = benefitPolicyRepository
                    .findByEmployerOrganizationIdAndActiveTrue(org.getId());

            int activePoliciesCount = (int) policies.stream()
                    .filter(p -> p
                            .getStatus() == com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                    .filter(com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy::isEffective)
                    .count();
            dto.setActivePoliciesCount(activePoliciesCount);

            Optional<com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy> activePolicy = policies.stream()
                    .filter(p -> p
                            .getStatus() == com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                    .filter(com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy::isEffective)
                    .sorted((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()))
                    .findFirst();

            activePolicy.ifPresent(policy -> {
                dto.setActivePolicyName(policy.getName());
                dto.setActivePolicyId(policy.getId());
            });
        } catch (Exception e) {
            log.error("[EmployerService] Mapping failed for ID {}: {}", org.getId(), e.getMessage());
            dto.setTotalMembers(0L);
            dto.setActivePoliciesCount(0);
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public long count() {
        return organizationRepository.findAll().stream()
                .filter(org -> !org.isArchived())
                .count();
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel() throws IOException {
        List<EmployerResponseDto> employers = getAll(null, null);
        try (Workbook workbook = new SXSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Employers");
            Row headerRow = sheet.createRow(0);
            String[] headers = { "Code", "Name", "Active", "Archived", "Total Members", "Active Policies" };
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            int rowNum = 1;
            for (EmployerResponseDto emp : employers) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(emp.getCode());
                row.createCell(1).setCellValue(emp.getName());
                row.createCell(2).setCellValue(Boolean.TRUE.equals(emp.isActive()) ? "Active" : "Inactive");
                row.createCell(3).setCellValue(Boolean.TRUE.equals(emp.isArchived()) ? "Yes" : "No");
                row.createCell(4).setCellValue(emp.getTotalMembers());
                row.createCell(5).setCellValue(emp.getActivePoliciesCount());
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
