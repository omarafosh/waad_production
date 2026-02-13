package com.waad.tba.modules.employer.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.enums.OrganizationType;
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
 * Employer Service - Phase 2 Implementation
 * 
 * Features:
 * - Auto-code generation (EMP-01, EMP-02, ...)
 * - Field normalization (name ↔ nameAr)
 * - Validation and error handling
 * - Uses Organization Entity (CANONICAL)
 * 
 * This service is a facade over {@link Organization} with type=EMPLOYER.
 * All CRUD operations work with Organization table only.
 * 
 * ✅ READS: OrganizationRepository.findByType(EMPLOYER)
 * ✅ WRITES: OrganizationRepository.save() with type=EMPLOYER
 * ❌ NEVER uses legacy EmployerRepository for writes
 * 
 * @see Organization
 * @see OrganizationType#EMPLOYER
 * @see EMPLOYER_API_CONTRACT.md
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

    /**
     * Get all active, non-archived employers
     */
    /**
     * Get all active, non-archived employers (Paginated & Searchable)
     */
    /**
     * Get all active, non-archived employers (Paginated & Searchable)
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<EmployerResponseDto> getAll(
            org.springframework.data.domain.Pageable pageable, 
            String search, 
            Boolean deleted, 
            Boolean active,
            Boolean hasPolicy) {
        
        // 1. Build Specification
        org.springframework.data.jpa.domain.Specification<Organization> spec = org.springframework.data.jpa.domain.Specification.where(null);

        // Filter: Archived (Default specific logic)
        boolean isArchived = Boolean.TRUE.equals(deleted);
        spec = spec.and((root, query, cb) -> cb.equal(root.get("archived"), isArchived));

        // Filter: Active
        if (active != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("active"), active));
        }

        // Filter: Search (Name or Code)
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern),
                cb.like(cb.lower(root.get("code")), pattern)
            ));
        }

        // Filter: Has Policy
        if (hasPolicy != null) {
            List<Long> idsWithPolicy = benefitPolicyRepository.findDistinctEmployerIdsWithActivePolicies();
            
            if (hasPolicy) {
                // Must be in the list
                if (idsWithPolicy.isEmpty()) {
                    return org.springframework.data.domain.Page.empty(pageable);
                }
                spec = spec.and((root, query, cb) -> root.get("id").in(idsWithPolicy));
            } else {
                // Must NOT be in the list
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

    /**
     * Get all active, non-archived employers (Legacy List)
     */
    @Transactional(readOnly = true)
    public List<EmployerResponseDto> getAll(Boolean deleted, Boolean active) {
        return organizationRepository.findAll()
                .stream()
                .filter(org -> (deleted == null || org.isArchived() == deleted))
                .filter(org -> (active == null || org.isActive() == active))
                .map(this::mapToResponseWithPolicy)
                .toList();
    }

    /**
     * Get all employers including archived ones
     * 
     * @deprecated Use getAll(Boolean deleted) instead
     */
    @Transactional(readOnly = true)
    public List<EmployerResponseDto> getAllIncludingArchived() {
        return organizationRepository.findAll()
                .stream()
                .map(this::mapToResponseWithPolicy)
                .toList();
    }

    /**
     * Get employer selectors (for dropdowns) - excludes archived
     */
    @Transactional(readOnly = true)
    public List<EmployerSelectorDto> getSelectors() {
        return organizationRepository.findByActiveTrue()
                .stream()
                .filter(org -> !org.isArchived())
                .map(mapper::toSelector)
                .toList();
    }

    /**
     * Get employer by ID
     */
    @Transactional(readOnly = true)
    public EmployerResponseDto getById(Long id) {
        Organization org = findEmployerById(id);
        return mapToResponseWithPolicy(org);
    }

    /**
     * Create new employer with auto-code generation
     * 
     * Phase 2 Features:
     * - Auto-generates code if not provided (EMP-01, EMP-02, ...)
     * - Normalizes field names (accepts 'employerCode' or 'code', 'nameAr' or
     * 'name')
     * - Validates uniqueness of code
     * - Sets default active=true
     * 
     * @param dto EmployerCreateDto (code is optional)
     * @return Created employer response
     * @throws BusinessRuleException if code already exists
     */
    @Transactional
    public EmployerResponseDto create(EmployerCreateDto dto) {
        log.info("[EmployerService] Creating employer with name: {}", dto.getName());

        // Step 1: Normalize and generate code if needed
        String employerCode = normalizeAndGenerateCode(dto.getCode());
        log.debug("[EmployerService] Normalized/Generated code: {}", employerCode);

        // Step 2: Validate code and name uniqueness
        validateCodeUniqueness(employerCode, null);
        validateNameUniqueness(dto.getName(), null);

        // Step 3: Build Organization entity (Arabic name only)
        Organization org = Organization.builder()
                .code(employerCode)
                .name(dto.getName()) // Arabic name (primary and only)
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        // Step 4: Persist and return
        Organization saved = organizationRepository.save(org);
        log.info("[EmployerService] Created employer with ID: {} and code: {}", saved.getId(), saved.getCode());

        return mapToResponseWithPolicy(saved);
    }

    /**
     * Update existing employer
     * 
     * Phase 2 Features:
     * - Normalizes field names
     * - Validates code uniqueness (if changed)
     * - Updates mutable fields only (name, active)
     * - Preserves auto-generated codes (warning logged if code changes)
     * 
     * @param id  Employer ID
     * @param dto EmployerUpdateDto
     * @return Updated employer response
     * @throws ResourceNotFoundException if employer not found
     * @throws BusinessRuleException     if code conflict
     */
    @Transactional
    public EmployerResponseDto update(Long id, EmployerUpdateDto dto) {
        log.info("[EmployerService] Updating employer ID: {}", id);

        // Step 1: Find existing employer
        Organization org = findEmployerById(id);
        String oldCode = org.getCode();

        if (!oldCode.equals(dto.getCode())) {
            log.warn("[EmployerService] Changing employer code from {} to {} for ID: {}",
                    oldCode, dto.getCode(), id);
            validateCodeUniqueness(dto.getCode(), id);
        }

        // Validate name uniqueness if changed
        if (!org.getName().equals(dto.getName())) {
            validateNameUniqueness(dto.getName(), id);
        }

        // Step 3: Update mutable fields (Arabic name only)
        org.setCode(dto.getCode());
        org.setName(dto.getName()); // Arabic name (primary and only)

        if (dto.getActive() != null) {
            org.setActive(dto.getActive());
        }

        // Step 4: Persist and return
        Organization updated = organizationRepository.save(org);
        log.info("[EmployerService] Updated employer ID: {}", id);

        return mapper.toResponse(updated);
    }

    /**
     * Delete employer - DISABLED
     * 
     * Employers cannot be deleted because they are linked to:
     * - Members
     * - Benefit Policies
     * - Claims
     * - Providers
     * 
     * Use archive() instead to safely hide employers from lists while preserving
     * data integrity.
     * 
     * @param id Employer ID
     * @throws BusinessRuleException Always throws - delete is not allowed
     */
    @Transactional
    public void delete(Long id) {
        throw new BusinessRuleException(
                "لا يمكن حذف الشريك. استخدم الأرشفة بدلاً من ذلك. "
                        + "Employer cannot be deleted. Use archive instead to preserve system integrity.");
    }

    /**
     * Archive employer (safe alternative to delete)
     * 
     * Sets archived=true, hiding employer from default lists while keeping:
     * - All database records intact
     * - Member relationships
     * - Benefit Policy relationships
     * - Claim history
     * - Provider links
     * 
     * @param id Employer ID
     * @return Updated employer response
     * @throws ResourceNotFoundException if employer not found
     */
    @Transactional
    public EmployerResponseDto archive(Long id) {
        log.info("[EmployerService] Archiving employer ID: {}", id);

        Organization org = findEmployerById(id);

        if (org.isArchived()) {
            log.warn("[EmployerService] Employer ID: {} is already archived", id);
        }

        org.setArchived(true);
        Organization updated = organizationRepository.save(org);

        log.info("[EmployerService] Archived employer ID: {}", id);
        return mapToResponseWithPolicy(updated);
    }

    /**
     * Restore archived employer
     * 
     * Sets archived=false, making employer visible again in default lists.
     * 
     * @param id Employer ID
     * @return Updated employer response
     * @throws ResourceNotFoundException if employer not found
     */
    @Transactional
    public EmployerResponseDto restore(Long id) {
        log.info("[EmployerService] Restoring employer ID: {}", id);

        Organization org = findEmployerById(id);

        if (!org.isArchived()) {
            log.warn("[EmployerService] Employer ID: {} is not archived", id);
        }

        org.setArchived(false);
        Organization updated = organizationRepository.save(org);

        log.info("[EmployerService] Restored employer ID: {}", id);
        return mapToResponseWithPolicy(updated);
    }

    /**
     * Count active employers
     */
    public long count() {
        return organizationRepository.count();
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    /**
     * Find employer by ID, ensuring it's of type EMPLOYER
     * 
     * @param id Employer ID
     * @return Organization entity
     * @throws ResourceNotFoundException if not found or not an employer
     */
    private Organization findEmployerById(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("المؤسسة غير موجودة للمعرف: " + id));
    }

    /**
     * Normalize code and generate if null/empty
     * 
     * Auto-Code Generation Logic:
     * 1. Query max code with pattern EMP-%
     * 2. Extract numeric suffix
     * 3. Increment by 1
     * 4. Format as EMP-XX (zero-padded)
     * 
     * Examples:
     * - No existing codes → EMP-01
     * - Max code EMP-03 → EMP-04
     * - Max code EMP-99 → EMP-100 (grows as needed)
     * 
     * @param providedCode Code from DTO (may be null)
     * @return Normalized code or auto-generated code
     */
    private String normalizeAndGenerateCode(String providedCode) {
        // If code provided, use it (trim whitespace)
        if (providedCode != null && !providedCode.trim().isEmpty()) {
            return providedCode.trim();
        }

        // Auto-generate code
        log.debug("[EmployerService] Auto-generating employer code...");

        List<String> codes = organizationRepository.findMaxCodeByPrefix(
                EMPLOYER_CODE_PATTERN);

        int nextNumber = 1; // Default: EMP-01

        if (!codes.isEmpty()) {
            String maxCode = codes.get(0); // First result is max (DESC order)
            log.debug("[EmployerService] Max existing code: {}", maxCode);

            try {
                // Extract numeric suffix (e.g., "EMP-03" → "03" → 3)
                String suffix = maxCode.substring(EMPLOYER_CODE_PREFIX.length());
                int currentMax = Integer.parseInt(suffix);
                nextNumber = currentMax + 1;
            } catch (Exception e) {
                log.warn("[EmployerService] Failed to parse existing code: {}. Using default.", maxCode, e);
            }
        }

        String generatedCode = String.format("%s%0" + EMPLOYER_CODE_LENGTH + "d", EMPLOYER_CODE_PREFIX, nextNumber);
        log.info("[EmployerService] Auto-generated employer code: {}", generatedCode);

        return generatedCode;
    }

    /**
     * Validate code uniqueness
     * 
     * @param code      Code to validate
     * @param excludeId ID to exclude from check (for updates)
     * @throws BusinessRuleException if code already exists
     */
    private void validateCodeUniqueness(String code, Long excludeId) {
        Optional<Organization> existing = organizationRepository.findByCode(code);

        if (existing.isPresent()) {
            Organization existingOrg = existing.get();

            // If updating, allow same code for same ID
            if (excludeId != null && existingOrg.getId().equals(excludeId)) {
                return;
            }

            log.error("[EmployerService] Code already exists: {}", code);
            throw new BusinessRuleException("رمز جهة العمل موجود مسبقاً: " + code);
        }
    }

    /**
     * Validate name uniqueness
     * 
     * @param name      Name to validate
     * @param excludeId ID to exclude from check (for updates)
     * @throws BusinessRuleException if name already exists
     */
    private void validateNameUniqueness(String name, Long excludeId) {
        // Query as case-insensitive to prevent subtle duplicates
        Optional<Organization> existing = organizationRepository.findAll()
                .stream()
                .filter(org -> org.getName().equalsIgnoreCase(name.trim()))
                .findFirst();

        if (existing.isPresent()) {
            Organization existingOrg = existing.get();

            // If updating, allow same name for same ID
            if (excludeId != null && existingOrg.getId().equals(excludeId)) {
                return;
            }

            log.error("[EmployerService] Employer name already exists (case-insensitive): {}", name);
            throw new BusinessRuleException("اسم جهة العمل موجود مسبقاً (بنفس الأحرف): " + name);
        }
    }

    /**
     * Helper to map Organization to EmployerResponseDto with active policy info and statistics
     */
    private EmployerResponseDto mapToResponseWithPolicy(Organization org) {
        if (org == null) return null;
        EmployerResponseDto dto = mapper.toResponse(org);

        try {
            // ========================================
            // STATISTICS: Count members with ACTIVE benefit policies
            // ========================================
            long membersCount = memberRepository.countByEmployerOrganizationIdAndBenefitPolicyStatusAndBenefitPolicyActiveTrue(
                    org.getId(), 
                    com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.ACTIVE);
            dto.setTotalMembers(membersCount);

            // Strategy 1: Find by ID (Primary)
            List<com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy> policies = 
                    benefitPolicyRepository.findByEmployerOrganizationIdAndActiveTrue(org.getId());

            // Strategy 2: Fallback to Name (Secondary/Diagnostic)
            // Useful if there are multiple org records with the same name but different IDs
            if (policies.isEmpty() && org.getName() != null) {
                policies = benefitPolicyRepository.findByEmployerOrganizationNameAndActiveTrue(org.getName());
            }

            // Count active policies (ACTIVE status and within effective dates)
            int activePoliciesCount = (int) policies.stream()
                    .filter(p -> p.getStatus() == com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                    .filter(com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy::isEffective)
                    .count();
            dto.setActivePoliciesCount(activePoliciesCount);

            // Filter for ACTIVE status and Effective dates
            Optional<com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy> activePolicy = policies.stream()
                    .filter(p -> p.getStatus() == com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                    .filter(com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy::isEffective)
                    .sorted((p1, p2) -> {
                        if (p1.getCreatedAt() == null) return 1;
                        if (p2.getCreatedAt() == null) return -1;
                        return p2.getCreatedAt().compareTo(p1.getCreatedAt());
                    })
                    .findFirst();
            
            // If no ACTIVE policy found, fallback to DRAFT (most recent)
            if (activePolicy.isEmpty()) {
                activePolicy = policies.stream()
                        .filter(p -> p.getStatus() == com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy.BenefitPolicyStatus.DRAFT)
                        .sorted((p1, p2) -> {
                            if (p1.getCreatedAt() == null) return 1;
                            if (p2.getCreatedAt() == null) return -1;
                            return p2.getCreatedAt().compareTo(p1.getCreatedAt());
                        })
                        .findFirst();
            }
            
            activePolicy.ifPresent(policy -> {
                dto.setActivePolicyName(policy.getName());
                dto.setActivePolicyId(policy.getId());
            });
        } catch (Exception e) {
            log.error("[EmployerService] Failed to map policy/statistics for employer {}: {}", org.getId(), e.getMessage());
            // Set defaults on error
            dto.setTotalMembers(0L);
            dto.setActivePoliciesCount(0);
        }

        return dto;
    }

    /**
     * Export employers to Excel
     * 
     * Generates a simple Excel file with employer details.
     * Columns: Code, Name, Status, Total Members, Active Policies
     * 
     * @return byte array of Excel file
     */
    @Transactional(readOnly = true)
    public byte[] exportToExcel() throws IOException {
        log.info("[EmployerService] Exporting employers to Excel...");
        
        List<EmployerResponseDto> employers = getAll(null, null);
        
        try (Workbook workbook = new SXSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Employers");
            
            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            
            // Create Header Row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Code", "Name", "Active", "Archived", "Total Members", "Active Policies"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Fill Data Rows
            int rowNum = 1;
            for (EmployerResponseDto emp : employers) {
                Row row = sheet.createRow(rowNum++);
                
                row.createCell(0).setCellValue(emp.getCode() != null ? emp.getCode() : "");
                row.createCell(1).setCellValue(emp.getName() != null ? emp.getName() : "");
                row.createCell(2).setCellValue(Boolean.TRUE.equals(emp.isActive()) ? "Active" : "Inactive");
                row.createCell(3).setCellValue(Boolean.TRUE.equals(emp.isArchived()) ? "Yes" : "No");
                row.createCell(4).setCellValue(emp.getTotalMembers() != null ? emp.getTotalMembers() : 0);
                row.createCell(5).setCellValue(emp.getActivePoliciesCount() != null ? emp.getActivePoliciesCount() : 0);
            }
            
            // Set some default column widths
            sheet.setColumnWidth(0, 4000); // Code
            sheet.setColumnWidth(1, 8000); // Name
            sheet.setColumnWidth(2, 3000); // Active
            sheet.setColumnWidth(3, 3000); // Archived
            sheet.setColumnWidth(4, 4000); // Members
            sheet.setColumnWidth(5, 4000); // Policies
            
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            
            log.info("[EmployerService] Exported {} employers to Excel", employers.size());
            return out.toByteArray();
        }
    }

}
