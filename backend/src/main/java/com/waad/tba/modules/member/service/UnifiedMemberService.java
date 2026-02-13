package com.waad.tba.modules.member.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.LocalDate;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.IOException;
import java.io.ByteArrayOutputStream;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.dto.FamilyEligibilityResponseDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberUpdateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.modules.rbac.entity.User;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * ==================== UNIFIED MEMBER ARCHITECTURE ====================
 * Service for managing members in the unified architecture.
 * 
 * Handles:
 * - Creating PRINCIPAL members (with optional dependents inline)
 * - Creating DEPENDENT members (standalone)
 * - Updating both principal and dependent members
 * - Family eligibility checks (barcode scan → family view)
 * - Card number generation (unified with suffix)
 * - Barcode generation (principal only)
 * 
 * Business Rules:
 * - Principal: parent_id = NULL, barcode = REQUIRED
 * - Dependent: parent_id != NULL, barcode = NULL
 * - Card Number: Principal = base, Dependent = base + suffix
 * - Relationship: NULL for principal, REQUIRED for dependent
 * 
 * SECURITY (2026-01-16):
 * - EMPLOYER_ADMIN: Sees ONLY members from their own employer
 * - Feature toggle: canViewMembers controls access
 * =====================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UnifiedMemberService {

    private final MemberRepository memberRepository;
    private final MemberWorkflowHistoryRepository workflowHistoryRepository;
    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final BarcodeGeneratorService barcodeGenerator;
    private final CardNumberGeneratorService cardNumberGenerator;
    private final UnifiedMemberMapper mapper;
    private final AuthorizationService authorizationService;

    /**
     * Requirement 6: Create a DRAFT member with minimum info
     */
    @Transactional
    public MemberViewDto createDraftMember(MemberCreateDto dto) {
        log.info("🆕 Creating DRAFT member: {}", dto.getFullName());
        dto.setStatus(Member.MemberStatus.DRAFT);
        return createPrincipalMember(dto);
    }

    /**
     * Create a PRINCIPAL member (optionally with dependents inline).
     * Updated for Enterprise Smart Card Numbering.
     */
    @Transactional
    public MemberViewDto createPrincipalMember(MemberCreateDto dto) {
        log.info("🆕 Creating PRINCIPAL member: {}, Status: {}", dto.getFullName(), dto.getStatus());

        if (dto.getParentId() != null) {
            throw new BusinessRuleException("Cannot create principal member with parentId.");
        }

        // Barcode will be generated AFTER card number
        // String barcode = barcodeGenerator.generateUniqueBarcodeForPrincipal();

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
                .orElseThrow(
                        () -> new ResourceNotFoundException("Employer organization not found: " + targetEmployerId));

        BenefitPolicy benefitPolicy = null;
        if (dto.getBenefitPolicyId() != null) {
            benefitPolicy = benefitPolicyRepository.findById(dto.getBenefitPolicyId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Benefit policy not found: " + dto.getBenefitPolicyId()));
        } else {
            // Auto-detect active policy for this employer
            benefitPolicy = benefitPolicyRepository.findActiveEffectivePolicyForEmployer(targetEmployerId, LocalDate.now())
                    .orElse(null);
            
            // Note: We don't throw error if missing, some members might exist without policy for a while 
            // but for Fast-Track it's better to have one.
        }

        Member principal = mapper.toEntity(dto);
        
        // Fast-Track Logic: Force status and flags
        if (Boolean.TRUE.equals(dto.getIsFastTrack())) {
            principal.setStatus(Member.MemberStatus.PENDING_VERIFICATION);
            principal.setIsVip(true);
            principal.setIsUrgent(true);
        }

        // Barcode set later derived from card number
        principal.setEmployerOrganization(employerOrg);
        principal.setBenefitPolicy(benefitPolicy);
        principal.setParent(null);
        principal.setRelationship(null);

        // Requirement 1: Generate Smart Card Number [R]-[PRO]-[COMP]-[ID]
        // NEW: Support manual card number if provided in DTO
        if (dto.getCardNumber() != null && !dto.getCardNumber().isBlank()) {
            principal.setCardNumber(dto.getCardNumber());
        } else {
            String smartCardNumber = cardNumberGenerator.generateSmartCardNumber(principal);
            principal.setCardNumber(smartCardNumber);
        }

        // Requirement: Barcode = [PREFIX]-[CARD_NUMBER]
        String barcode = barcodeGenerator.generateFromCardNumber(principal);
        principal.setBarcode(barcode);

        principal = memberRepository.save(principal);

        // Log Initial Status
        logWorkflowHistory(principal, null, principal.getStatus().name(), "Initial Creation");

        List<Member> dependents = new ArrayList<>();
        if (dto.getDependents() != null && !dto.getDependents().isEmpty()) {
            for (DependentMemberDto depDto : dto.getDependents()) {
                Member dependent = createDependentInternal(principal, depDto);
                dependents.add(dependent);
            }
        }

        return mapper.toViewDto(principal, dependents);
    }

    /**
     * Requirement 6: Promote Draft/Pending member to ACTIVE
     */
    @Transactional
    public MemberViewDto promoteToActive(Long id, String reason) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        if (member.getStatus() == Member.MemberStatus.ACTIVE) {
            return mapper.toViewDto(member);
        }

        transitionMemberStatus(member, Member.MemberStatus.ACTIVE, reason);

        if (Boolean.TRUE.equals(member.getIsSmartCard()) && member.getCardActivatedAt() == null) {
            member.setCardActivatedAt(LocalDateTime.now());
            memberRepository.save(member);
        }

        return getMember(id);
    }

    @Transactional
    public void transitionMemberStatus(Member member, Member.MemberStatus newStatus, String reason) {
        String fromStatus = member.getStatus().name();
        member.setStatus(newStatus);
        memberRepository.save(member);

        logWorkflowHistory(member, fromStatus, newStatus.name(), reason);
        log.info("✅ Member ID={} status transitioned from {} to {} Reason: {}",
                member.getId(), fromStatus, newStatus, reason);
    }

    private void logWorkflowHistory(Member member, String fromStatus, String toStatus, String reason) {
        MemberWorkflowHistory history = MemberWorkflowHistory.builder()
                .member(member)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedAt(LocalDateTime.now())
                .changedBy(authorizationService.getCurrentUser() != null
                        ? authorizationService.getCurrentUser().getUsername()
                        : "System")
                .reason(reason)
                .build();
        workflowHistoryRepository.save(history);
    }

    @Transactional
    protected Member createDependentInternal(Member principal, DependentMemberDto dto) {
        Member dependent = mapper.toEntity(dto);
        dependent.setParent(principal);
        dependent.setBarcode(null);
        dependent.setEmployerOrganization(principal.getEmployerOrganization());
        dependent.setBenefitPolicy(principal.getBenefitPolicy());
        dependent.setPolicyNumber(principal.getPolicyNumber());

        // Requirement 1: Enterprise Numbering for dependent
        String smartCardNumber = cardNumberGenerator.generateSmartCardNumber(dependent);
        dependent.setCardNumber(smartCardNumber);

        // NEW: Generate barcode for dependent (Prefix-CardNumber)
        String barcode = barcodeGenerator.generateFromCardNumber(dependent);
        dependent.setBarcode(barcode);

        dependent = memberRepository.save(dependent);
        logWorkflowHistory(dependent, null, dependent.getStatus().name(), "Initial Creation (Dependent)");

        return dependent;
    }

    // ... (Keep existing methods for search/getAll/delete, but maybe update them
    // for numbering if needed)

    @Transactional(readOnly = true)
    public List<MemberWorkflowHistory> getWorkflowHistory(Long id) {
        return workflowHistoryRepository.findByMemberIdOrderByChangedAtDesc(id);
    }

    /**
     * Standalone creation of dependent member
     */
    @Transactional
    public MemberViewDto createDependentMember(Long principalId, DependentMemberDto dto) {
        Member principal = memberRepository.findById(principalId)
                .orElseThrow(() -> new ResourceNotFoundException("Principal not found: " + principalId));

        Member dependent = createDependentInternal(principal, dto);
        return mapper.toViewDto(dependent);
    }

    /**
     * Existing search and list methods (simplified for brevity, assume they remain)
     */
    @Transactional(readOnly = true)
    public MemberViewDto getMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        if (member.isPrincipal()) {
            List<Member> dependents = memberRepository.findByParentId(member.getId());
            return mapper.toViewDto(member, dependents);
        } else {
            return mapper.toViewDto(member);
        }
    }

    /**
     * Alias for controller compatibility
     */
    @Transactional(readOnly = true)
    public MemberViewDto getMemberWithDependents(Long id) {
        return getMember(id);
    }

    @Transactional
    public MemberViewDto updateMember(Long id, MemberUpdateDto dto) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        Member.MemberStatus oldStatus = member.getStatus();
        mapper.updateEntityFromDto(member, dto);

        // Update organization if employerId provided
        if (dto.getEmployerId() != null) {
            Organization org = organizationRepository.findById(dto.getEmployerId())
                .orElseThrow(() -> new ResourceNotFoundException("Employer organization not found: " + dto.getEmployerId()));
            member.setEmployerOrganization(org);
        }

        // Update benefit policy if benefitPolicyId provided
        if (dto.getBenefitPolicyId() != null) {
            BenefitPolicy policy = benefitPolicyRepository.findById(dto.getBenefitPolicyId())
                .orElseThrow(() -> new ResourceNotFoundException("Benefit policy not found: " + dto.getBenefitPolicyId()));
            member.setBenefitPolicy(policy);
        }

        if (dto.getStatus() != null && dto.getStatus() != oldStatus) {
            logWorkflowHistory(member, oldStatus.name(), dto.getStatus().name(), "Direct Update");
        }

        member = memberRepository.save(member);
        return getMember(id);
    }

    @Transactional
    public void deleteMember(Long id) {
        // Soft Delete Implementation
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        member.setActive(false);
        // FORCE status change to TERMINATED to reflect deletion in UI
        member.setStatus(Member.MemberStatus.TERMINATED);

        memberRepository.save(member);

        // Cascade soft delete to dependents
        List<Member> dependents = memberRepository.findByParentId(id);
        for (Member dep : dependents) {
            dep.setActive(false);
            dep.setStatus(Member.MemberStatus.TERMINATED);
            memberRepository.save(dep);
        }

        logWorkflowHistory(member, member.getStatus() != null ? member.getStatus().name() : "UNKNOWN",
                member.getStatus() != null ? member.getStatus().name() : "UNKNOWN",
                "Soft deleted (moved to trash)");

        log.info("🗑️ Member soft-deleted: id={}, dependents={}", id, dependents.size());
    }

    /**
     * Restore a soft-deleted member
     */
    @Transactional
    public void restoreMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        if (Boolean.TRUE.equals(member.getActive())) {
            throw new BusinessRuleException("Member is already active");
        }

        member.setActive(true);
        member.setStatus(Member.MemberStatus.ACTIVE);
        memberRepository.save(member);

        // Cascade restore to dependents
        List<Member> dependents = memberRepository.findByParentId(id);
        for (Member dep : dependents) {
            dep.setActive(true);
            dep.setStatus(Member.MemberStatus.ACTIVE);
            memberRepository.save(dep);
        }

        logWorkflowHistory(member, member.getStatus() != null ? member.getStatus().name() : "UNKNOWN",
                member.getStatus() != null ? member.getStatus().name() : "UNKNOWN",
                "Restored from trash");

        log.info("♻️ Member restored: id={}, dependents={}", member.getId(), dependents.size());
    }

    /**
     * Physically delete a member from the database
     */
    @Transactional
    public void hardDeleteMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        // Note: CascadeType.ALL and orphanRemoval=true in Member entity 
        // will handle dependent deletion automatically if we delete the parent.
        memberRepository.delete(member);
        
        log.info("💀 Member physically deleted from database: id={}", id);
    }

    @Transactional(readOnly = true)
    public FamilyEligibilityResponseDto checkFamilyEligibility(String query) {
        String cleanQuery = query != null ? query.trim() : "";

        // 1. Try Barcode Match
        java.util.List<Member> members = memberRepository.findByBarcode(cleanQuery);
        Member targetMember = null;

        if (!members.isEmpty()) {
            targetMember = members.get(0);
        } else {
            // 2. Try Card Number Match (Direct)
            members = memberRepository.findByCardNumber(cleanQuery);
            if (!members.isEmpty()) {
                targetMember = members.get(0);
            } else {
                // 3. Try Employee Number Match
                members = memberRepository.findByEmployeeNumber(cleanQuery);
                if (!members.isEmpty()) {
                    targetMember = members.get(0);
                }
            }
        }

        // 3. Smart Fallback: If not found, try to find Principal by stripping suffix
        // Dependent Card: EMP-2026-100037S -> Principal: EMP-2026-100037
        if (targetMember == null && cleanQuery.length() > 1) {
            // Common suffixes: W, S, D, F, M, H, etc.
            // Try stripping the last character to see if it matches a Principal's card
            // number
            String potentialPrincipalCard = cleanQuery.substring(0, cleanQuery.length() - 1);
            members = memberRepository.findByCardNumber(potentialPrincipalCard);

            if (!members.isEmpty()) {
                Member found = members.get(0);
                if (found.isPrincipal()) {
                    log.info("found principal via smart suffix stripping: {} -> {}", cleanQuery,
                            potentialPrincipalCard);
                    targetMember = found;
                }
            }
        }

        if (targetMember == null) {
            throw new ResourceNotFoundException("Member not found with Barcode or Card Number: " + cleanQuery);
        }

        // Resolve Principal (If dependent found, get parent)
        Member principal;
        if (targetMember.getParent() != null) {
            principal = targetMember.getParent();
        } else {
            principal = targetMember;
        }

        List<Member> dependents = memberRepository.findByParentId(principal.getId());
        return mapper.toFamilyEligibilityResponse(principal, dependents);
    }

    /**
     * Alias for controller compatibility
     */
    @Transactional(readOnly = true)
    public FamilyEligibilityResponseDto checkEligibility(String barcode) {
        return checkFamilyEligibility(barcode);
    }

    @Transactional(readOnly = true)
    public Page<MemberViewDto> getAllMembers(Pageable pageable, Long organizationId, String status, String type,
            boolean deleted) {
        // Implementation remains same as before but uses updated mapper
        Specification<Member> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (organizationId != null)
                predicates.add(cb.equal(root.get("employerOrganization").get("id"), organizationId));
            if (status != null && !status.isEmpty())
                predicates.add(cb.equal(root.get("status"), Member.MemberStatus.valueOf(status)));
            if ("PRINCIPAL".equalsIgnoreCase(type))
                predicates.add(cb.isNull(root.get("parent")));
            else if ("DEPENDENT".equalsIgnoreCase(type))
                predicates.add(cb.isNotNull(root.get("parent")));

            // Filter based on deleted flag
            predicates.add(cb.equal(root.get("active"), !deleted));

            // Apply Data-Level Security Filtering
            applySecurityFilter(root, cb, predicates);

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Member> page = memberRepository.findAll(spec, pageable);
        return page.map(member -> {
            MemberViewDto dto = mapper.toViewDto(member);

            // Override status for view if soft-deleted (Visual Fix for old records)
            if (Boolean.FALSE.equals(member.getActive())) {
                dto.setStatus(Member.MemberStatus.TERMINATED);
            }
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public long countMembers(Long organizationId, String status, String type, boolean deleted) {
        Specification<Member> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (organizationId != null)
                predicates.add(cb.equal(root.get("employerOrganization").get("id"), organizationId));
            if (status != null && !status.isEmpty())
                predicates.add(cb.equal(root.get("status"), Member.MemberStatus.valueOf(status)));
            if ("PRINCIPAL".equalsIgnoreCase(type))
                predicates.add(cb.isNull(root.get("parent")));
            else if ("DEPENDENT".equalsIgnoreCase(type))
                predicates.add(cb.isNotNull(root.get("parent")));

            // Fix: Filter only active members (Soft Delete)
            predicates.add(cb.equal(root.get("active"), true));

            // Apply Data-Level Security Filtering
            applySecurityFilter(root, cb, predicates);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return memberRepository.count(spec);
    }

    @Transactional(readOnly = true)
    public Page<MemberViewDto> searchMembers(
            String searchTermInput, String civilId, String barcode,
            String cardNumber, Long organizationId, Long benefitPolicyId,
            String status, String type, boolean deleted, Pageable pageable) {

        Specification<Member> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // unified search strategy
            String searchTerm = (searchTermInput != null && !searchTermInput.trim().isEmpty()) ? searchTermInput : null;

            // Detect if this is a "General Search" where frontend sends same value to
            // multiple fields
            // Ensure we handle empty strings correctly
            boolean isGeneralSearch = searchTerm != null &&
                    ((barcode != null && searchTerm.equals(barcode)) ||
                            (cardNumber != null && searchTerm.equals(cardNumber)));

            if (isGeneralSearch) {
                // OR Logic for General Search
                String likePattern = "%" + searchTerm.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), likePattern),
                        cb.like(cb.lower(root.get("barcode")), likePattern),
                        cb.like(cb.lower(root.get("cardNumber")), likePattern)));
            } else {
                // Standard Specific Filter Logic (AND)
                if (searchTerm != null) {
                    predicates.add(cb.like(cb.lower(root.get("fullName")), "%" + searchTerm.toLowerCase() + "%"));
                }
                if (barcode != null && !barcode.trim().isEmpty())
                    predicates.add(cb.equal(root.get("barcode"), barcode));
                if (cardNumber != null && !cardNumber.trim().isEmpty())
                    predicates.add(cb.equal(root.get("cardNumber"), cardNumber));
            }

            // Other exact filters always apply (AND)
            if (civilId != null && !civilId.trim().isEmpty())
                predicates.add(cb.equal(root.get("civilId"), civilId));
            if (organizationId != null)
                predicates.add(cb.equal(root.get("employerOrganization").get("id"), organizationId));
            if (benefitPolicyId != null)
                predicates.add(cb.equal(root.get("benefitPolicy").get("id"), benefitPolicyId));

            if (status != null && !status.trim().isEmpty()) {
                try {
                    predicates.add(cb.equal(root.get("status"), Member.MemberStatus.valueOf(status)));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid status provided for search: {}", status);
                }
            }

            if ("PRINCIPAL".equalsIgnoreCase(type))
                predicates.add(cb.isNull(root.get("parent")));
            else if ("DEPENDENT".equalsIgnoreCase(type))
                predicates.add(cb.isNotNull(root.get("parent")));

            // Filter based on deleted flag
            predicates.add(cb.equal(root.get("active"), !deleted));

            // Apply Data-Level Security Filtering
            applySecurityFilter(root, cb, predicates);

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return memberRepository.findAll(spec, pageable).map(member -> {
            MemberViewDto dto = mapper.toViewDto(member);

            // Override status for view if soft-deleted (Visual Fix for old records)
            if (Boolean.FALSE.equals(member.getActive())) {
                dto.setStatus(Member.MemberStatus.TERMINATED);
            }
            return dto;
        });
    }

    /**
     * Alias for controller compatibility
     */
    @Transactional
    public MemberViewDto createMember(MemberCreateDto dto) {
        return createPrincipalMember(dto);
    }

    /**
     * Alias for controller compatibility
     */
    @Transactional
    public MemberViewDto addDependent(Long principalId, DependentMemberDto dto) {
        return createDependentMember(principalId, dto);
    }

    /**
     * Get all dependents of a principal.
     * 
     * @param principalId Principal member ID
     * @return List of dependents
     */
    @Transactional(readOnly = true)
    public List<MemberViewDto> getDependents(Long principalId) {
        Member principal = memberRepository.findById(principalId)
                .orElseThrow(() -> new ResourceNotFoundException("Principal member not found: " + principalId));

        if (principal.isDependent()) {
            throw new BusinessRuleException("Member ID " + principalId + " is a Dependent, not a Principal");
        }

        return memberRepository.findByParentId(principalId).stream()
                .map(mapper::toViewDto)
                .collect(Collectors.toList());
    }

    /**
     * Apply strict data-level security filtering based on current user context.
     * Logic is centralized in AuthorizationService.
     */
    private void applySecurityFilter(Root<Member> root, CriteriaBuilder cb, List<Predicate> predicates) {
        User currentUser = authorizationService.getCurrentUser();
        Set<Long> permittedIds = authorizationService.getPermittedEmployerIdsForUser(currentUser);
        
        if (permittedIds != null) {
            if (permittedIds.isEmpty()) {
                log.warn("🚨 Security Enforcement: User {} has no permitted organizations. Access blocked.", 
                    currentUser != null ? currentUser.getUsername() : "UNKNOWN");
                predicates.add(cb.disjunction()); 
            } else {
                predicates.add(root.get("employerOrganization").get("id").in(permittedIds));
            }
        }
    }

    /**
     * Count dependents of a principal.
     * 
     * @param principalId Principal member ID
     * @return Count of dependents
     */
    @Transactional(readOnly = true)
    public long countDependents(Long principalId) {
        Member principal = memberRepository.findById(principalId)
                .orElseThrow(() -> new ResourceNotFoundException("Principal member not found: " + principalId));

        if (principal.isDependent()) {
            throw new BusinessRuleException("Member ID " + principalId + " is a Dependent, not a Principal");
        }

        return memberRepository.countByParentId(principalId);
    }

    /**
     * Export members to Excel based on generic search filters.
     * 
     * @return byte array of the Excel file
     */
    @Transactional(readOnly = true)
    public byte[] exportMembersToExcel(String searchTerm, String civilId, String barcode, String cardNumber,
            Long organizationId, Long benefitPolicyId, String status, String type, boolean deleted) throws IOException {
        
        log.info("📊 Generating Excel export for members: searchTerm={}, orgId={}, status={}, type={}", 
                 searchTerm, organizationId, status, type);
        
        // Fetch matching members (Limit to 10k for safety)
        Pageable pageable = PageRequest.of(0, 10000);
        Page<MemberViewDto> membersPage = searchMembers(searchTerm, civilId, barcode, cardNumber, 
                organizationId, benefitPolicyId, status, type, deleted, pageable);
        List<MemberViewDto> members = membersPage.getContent();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Members");
            
            // 1. Create Header Row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"الاسم الكامل", "رقم البطاقة", "الباركود", "الرقم المدني", "النوع", "الحالة", "جهة العمل", "عدد التابعين"};
            
            // Style for header
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // 2. Fill Data Rows
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

            // 3. Post-Process
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        }
    }
}
