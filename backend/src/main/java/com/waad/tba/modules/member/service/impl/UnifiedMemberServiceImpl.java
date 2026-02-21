package com.waad.tba.modules.member.service.impl;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.infrastructure.port.DocumentService;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.*;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository;
import com.waad.tba.modules.member.service.UnifiedMemberService;
import com.waad.tba.modules.member.service.search.MemberSearchService;
import com.waad.tba.modules.member.service.util.MemberGeneratorService;
import com.waad.tba.security.AuthorizationService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.rbac.entity.User;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * تنفيذ خدمة إدارة الأعضاء الموحدة.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UnifiedMemberServiceImpl implements UnifiedMemberService {

    private final MemberRepository memberRepository;
    private final MemberWorkflowHistoryRepository workflowHistoryRepository;
    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final MemberGeneratorService memberGenerator;
    private final MemberSearchService memberSearchService;
    private final UnifiedMemberMapper mapper;
    private final AuthorizationService authorizationService;
    private final DocumentService documentService;

    @Override
    @Transactional
    public MemberViewDto createDraftMember(MemberCreateDto dto) {
        log.info("🆕 Creating DRAFT member: {}", dto.getFullName());
        dto.setStatus(Member.MemberStatus.DRAFT);
        return createPrincipalMember(dto);
    }

    @Override
    @Transactional
    public MemberViewDto createPrincipalMember(MemberCreateDto dto) {
        log.info("🆕 Creating PRINCIPAL member: {}, Status: {}", dto.getFullName(), dto.getStatus());

        if (dto.getParentId() != null) {
            throw new BusinessRuleException("Cannot create principal member with parentId.");
        }

        Long employerId = dto.getEmployerId();
        if (employerId == null && Boolean.TRUE.equals(dto.getIsVip())) {
            employerId = organizationRepository.findByCode("VIP")
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
            benefitPolicy = benefitPolicyRepository
                    .findActiveEffectivePolicyForEmployer(targetEmployerId, LocalDate.now()).orElse(null);
        }

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
            principal.setCardNumber(memberGenerator.generateCardNumber(principal));
        }

        principal.setBarcode(memberGenerator.generateBarcode(principal));
        principal = memberRepository.save(principal);

        logWorkflowHistory(principal, null, principal.getStatus().name(), "Initial Creation");

        List<Member> dependents = new ArrayList<>();
        // Use the new recommended method or field instead of getDependents()
        @SuppressWarnings("deprecation")
        List<DependentMemberDto> dependentsList = dto.getDependents();
        if (dependentsList != null && !dependentsList.isEmpty()) {
            for (DependentMemberDto depDto : dependentsList) {
                dependents.add(createDependentInternal(principal, depDto));
            }
        }

        return mapper.toViewDto(principal, dependents);
    }

    @Override
    @Transactional
    public MemberViewDto promoteToActive(Long id, String reason) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));
        if (member.getStatus() == Member.MemberStatus.ACTIVE)
            return mapper.toViewDto(member);
        transitionMemberStatus(member, Member.MemberStatus.ACTIVE, reason);
        if (Boolean.TRUE.equals(member.getIsSmartCard()) && member.getCardActivatedAt() == null) {
            member.setCardActivatedAt(LocalDateTime.now());
            memberRepository.save(member);
        }
        return getMember(id);
    }

    @Override
    @Transactional
    public void transitionMemberStatus(Member member, Member.MemberStatus newStatus, String reason) {
        String fromStatus = member.getStatus().name();
        member.setStatus(newStatus);
        memberRepository.save(member);
        logWorkflowHistory(member, fromStatus, newStatus.name(), reason);
    }

    protected void logWorkflowHistory(Member member, String fromStatus, String toStatus, String reason) {
        workflowHistoryRepository.save(MemberWorkflowHistory.builder()
                .member(member).fromStatus(fromStatus).toStatus(toStatus).changedAt(LocalDateTime.now())
                .changedBy(authorizationService.getCurrentUser() != null
                        ? authorizationService.getCurrentUser().getUsername()
                        : "System")
                .reason(reason).build());
    }

    protected Member createDependentInternal(Member principal, DependentMemberDto dto) {
        Member dependent = mapper.toEntity(dto);
        dependent.setParent(principal);
        dependent.setBarcode(null);
        dependent.setEmployerOrganization(principal.getEmployerOrganization());
        dependent.setBenefitPolicy(principal.getBenefitPolicy());
        dependent.setPolicyNumber(principal.getPolicyNumber());
        dependent.setCardNumber(memberGenerator.generateCardNumber(dependent));
        // REMOVED: Barcode is forbidden for dependents
        dependent = memberRepository.save(dependent);
        String statusName = (dependent.getStatus() != null) ? dependent.getStatus().name() : "ACTIVE";
        logWorkflowHistory(dependent, null, statusName, "Initial Creation (Dependent)");
        return dependent;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberWorkflowHistory> getWorkflowHistory(Long id) {
        return workflowHistoryRepository.findByMemberIdOrderByChangedAtDesc(id);
    }

    @Override
    @Transactional
    public MemberViewDto createDependentMember(Long principalId, DependentMemberDto dto) {
        Member principal = memberRepository.findById(principalId)
                .orElseThrow(() -> new ResourceNotFoundException("Principal not found: " + principalId));
        return mapper.toViewDto(createDependentInternal(principal, dto));
    }

    @Override
    @Transactional(readOnly = true)
    public MemberViewDto getMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));
        if (member.isPrincipal())
            return mapper.toViewDto(member, memberRepository.findByParentId(member.getId()));
        return mapper.toViewDto(member);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberViewDto getMemberWithDependents(Long id) {
        return getMember(id);
    }

    @Override
    @Transactional
    public MemberViewDto updateMember(Long id, MemberUpdateDto dto) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));
        Member.MemberStatus oldStatus = member.getStatus();
        mapper.updateEntityFromDto(member, dto);
        if (dto.getEmployerId() != null) {
            member.setEmployerOrganization(organizationRepository.findById(dto.getEmployerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employer not found")));
        }
        if (dto.getBenefitPolicyId() != null) {
            member.setBenefitPolicy(benefitPolicyRepository.findById(dto.getBenefitPolicyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Policy not found")));
        }
        if (dto.getStatus() != null && dto.getStatus() != oldStatus) {
            logWorkflowHistory(member, oldStatus.name(), dto.getStatus().name(), "Direct Update");
        }
        return mapper.toViewDto(memberRepository.save(member));
    }

    @Override
    @Transactional
    public void deleteMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        member.setActive(false);
        member.setStatus(Member.MemberStatus.TERMINATED);
        memberRepository.save(member);
        for (Member dep : memberRepository.findByParentId(id)) {
            dep.setActive(false);
            dep.setStatus(Member.MemberStatus.TERMINATED);
            memberRepository.save(dep);
        }
        logWorkflowHistory(member, "ACTIVE", "TERMINATED", "Soft deleted");
    }

    @Override
    @Transactional
    public void restoreMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        member.setActive(true);
        member.setStatus(Member.MemberStatus.ACTIVE);
        memberRepository.save(member);
        for (Member dep : memberRepository.findByParentId(id)) {
            dep.setActive(true);
            dep.setStatus(Member.MemberStatus.ACTIVE);
            memberRepository.save(dep);
        }
        logWorkflowHistory(member, "TERMINATED", "ACTIVE", "Restored from trash");
    }

    @Override
    @Transactional
    public void hardDeleteMember(Long id) {
        memberRepository.delete(
                memberRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Member not found")));
    }

    @Override
    @Transactional(readOnly = true)
    public FamilyEligibilityResponseDto checkFamilyEligibility(String query) {
        String cleanQuery = query != null ? query.trim() : "";
        List<Member> members = memberRepository.findByBarcode(cleanQuery);
        if (members.isEmpty())
            members = memberRepository.findByCardNumber(cleanQuery);
        if (members.isEmpty())
            members = memberRepository.findByEmployeeNumber(cleanQuery);

        Member target = members.isEmpty() ? null : members.get(0);
        if (target == null && cleanQuery.length() > 1) {
            members = memberRepository.findByCardNumber(cleanQuery.substring(0, cleanQuery.length() - 1));
            if (!members.isEmpty() && members.get(0).isPrincipal())
                target = members.get(0);
        }

        if (target == null)
            throw new ResourceNotFoundException("Member not found");
        Member principal = target.getParent() != null ? target.getParent() : target;
        return mapper.toFamilyEligibilityResponse(principal, memberRepository.findByParentId(principal.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public FamilyEligibilityResponseDto checkEligibility(String barcode) {
        return checkFamilyEligibility(barcode);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MemberViewDto> getAllMembers(Pageable pageable, Long organizationId, String status, String type,
            boolean deleted) {
        MemberSearchCriteria criteria = MemberSearchCriteria.builder()
                .organizationId(organizationId)
                .status(status)
                .type(type)
                .deleted(deleted)
                .build();
        return memberSearchService.searchMembersAdvanced(criteria, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public long countMembers(Long organizationId, String status, String type, boolean deleted) {
        // Simple delegating for consistency, or implementation in SearchService
        return getAllMembers(PageRequest.of(0, 1), organizationId, status, type, deleted).getTotalElements();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MemberViewDto> searchMembersAdvanced(MemberSearchCriteria criteria, Pageable pageable) {
        return memberSearchService.searchMembersAdvanced(criteria, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportMembersToExcel(MemberSearchCriteria criteria) throws IOException {
        log.info("📊 Generating Excel export for criteria: {}", criteria);
        Page<MemberViewDto> page = searchMembersAdvanced(criteria, PageRequest.of(0, 10000));
        List<Map<String, Object>> data = page.getContent().stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("الاسم الكامل", m.getFullName());
            map.put("رقم البطاقة", m.getCardNumber());
            map.put("الباركود", m.getBarcode());
            map.put("الرقم المدني", m.getCivilId());
            map.put("النوع", "PRINCIPAL".equalsIgnoreCase(m.getType()) ? "أصيل" : "تابع");
            map.put("الحالة", m.getStatus() != null ? m.getStatus() : "");
            map.put("جهة العمل", m.getEmployerName());
            map.put("عدد التابعين", m.getDependentsCount() != null ? m.getDependentsCount() : 0);
            return map;
        }).collect(Collectors.toList());
        return documentService.createExcel(data, "Members");
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberViewDto> getDependents(Long principalId) {
        log.info("🔍 Fetching dependents for principal ID: {}", principalId);
        List<Member> dependents = memberRepository.findByParentId(principalId);
        return dependents.stream().map(mapper::toViewDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countDependents(Long principalId) {
        return memberRepository.countByParentId(principalId);
    }

    private void applySecurityFilter(Root<Member> root, CriteriaBuilder cb, List<Predicate> predicates) {
        User user = authorizationService.getCurrentUser();
        Set<Long> ids = authorizationService.getPermittedEmployerIdsForUser(user);
        if (ids != null) {
            if (ids.isEmpty())
                predicates.add(cb.disjunction());
            else
                predicates.add(root.get("employerOrganization").get("id").in(ids));
        }
    }
}
