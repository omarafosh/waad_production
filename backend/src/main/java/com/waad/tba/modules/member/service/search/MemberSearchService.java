package com.waad.tba.modules.member.service.search;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.member.dto.*;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.exception.InvalidEligibilityInputException;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.service.NameSearchService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Unified Member Search & Eligibility Service.
 * Centralizes all member lookup logic:
 * 1. Advanced filtering and pagination (Admin Portal).
 * 2. Deterministic Eligibility checks (Provider Portal).
 * 3. Intelligent unified search (Barcode/Card/Name).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberSearchService {

    private final MemberRepository memberRepository;
    private final UnifiedMemberMapper mapper;
    private final AuthorizationService authorizationService;
    private final NameSearchService nameSearchService;

    // Patterns for auto-detection
    private static final Pattern BARCODE_PATTERN = Pattern.compile(
            "^WAD-\\d{4}-\\d{8}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    private static final Pattern CARD_NUMBER_PATTERN = Pattern.compile("^\\d+$");

    /**
     * Unified search with auto-detection of input type.
     */
    public List<MemberSearchDto> unifiedSearch(String query) {
        if (query == null || query.trim().isEmpty())
            return List.of();
        String trimmed = query.trim();

        if (BARCODE_PATTERN.matcher(trimmed).matches()) {
            return searchByBarcode(trimmed);
        } else if (CARD_NUMBER_PATTERN.matcher(trimmed).matches()) {
            return searchByCardNumber(trimmed);
        } else {
            return searchByNameFuzzy(trimmed);
        }
    }

    /**
     * Advanced search for Admin Portal with full criteria.
     */
    public Page<MemberViewDto> searchMembersAdvanced(MemberSearchCriteria criteria, Pageable pageable) {
        Specification<Member> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getSearchTerm() != null && !criteria.getSearchTerm().isBlank()) {
                String pattern = "%" + criteria.getSearchTerm().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("barcode")), pattern),
                        cb.like(cb.lower(root.get("cardNumber")), pattern)));
            }

            if (criteria.getCivilId() != null && !criteria.getCivilId().isEmpty())
                predicates.add(cb.equal(root.get("civilId"), criteria.getCivilId()));

            if (criteria.getOrganizationId() != null)
                predicates.add(cb.equal(root.get("employerOrganization").get("id"), criteria.getOrganizationId()));

            if (criteria.getBenefitPolicyId() != null)
                predicates.add(cb.equal(root.get("benefitPolicy").get("id"), criteria.getBenefitPolicyId()));

            if (criteria.getStatus() != null && !criteria.getStatus().isEmpty())
                predicates.add(cb.equal(root.get("status"), Member.MemberStatus.valueOf(criteria.getStatus())));

            if ("PRINCIPAL".equalsIgnoreCase(criteria.getType()))
                predicates.add(cb.isNull(root.get("parent")));
            else if ("DEPENDENT".equalsIgnoreCase(criteria.getType()))
                predicates.add(cb.isNotNull(root.get("parent")));

            predicates.add(cb.equal(root.get("active"), criteria.getDeleted() == null || !criteria.getDeleted()));

            applySecurityFilter(root, cb, predicates);
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return memberRepository.findAll(spec, pageable).map(m -> {
            MemberViewDto dto = mapper.toViewDto(m);
            if (Boolean.FALSE.equals(m.getActive()))
                dto.setStatus("TERMINATED");
            return dto;
        });
    }

    /**
     * Strict eligibility check for Provider Portal.
     */
    public EligibilityResultDto checkEligibility(String query) {
        if (query == null || query.isBlank())
            throw new InvalidEligibilityInputException("Query cannot be empty");
        String trimmed = query.trim();

        List<Member> members;
        if (BARCODE_PATTERN.matcher(trimmed).matches()) {
            members = memberRepository.findByBarcode(trimmed);
        } else if (CARD_NUMBER_PATTERN.matcher(trimmed).matches()) {
            members = memberRepository.findByCardNumber(trimmed);
            if (members.isEmpty()) {
                // Try smart fallback for dependents using principal card
                if (trimmed.length() > 1) {
                    members = memberRepository.findByCardNumber(trimmed.substring(0, trimmed.length() - 1));
                }
            }
        } else {
            throw new InvalidEligibilityInputException("Invalid format. Use Barcode or Card Number.");
        }

        if (members.isEmpty())
            throw new ResourceNotFoundException("Member not found");

        Member member = members.get(0);
        validateAccess(member);

        return buildEligibilityResult(member);
    }

    public FamilyEligibilityResponseDto checkFamilyEligibility(String query) {
        EligibilityResultDto single = checkEligibility(query);
        Member member = memberRepository.findById(single.getMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        Member principal = member.getParent() != null ? member.getParent() : member;
        List<Member> dependents = memberRepository.findByParentId(principal.getId());

        return mapper.toFamilyEligibilityResponse(principal, dependents);
    }

    // Private helper methods

    private List<MemberSearchDto> searchByBarcode(String barcode) {
        return memberRepository.findByBarcode(barcode).stream()
                .map(m -> MemberSearchDto.fromMember(m, "BARCODE", null))
                .collect(Collectors.toList());
    }

    private List<MemberSearchDto> searchByCardNumber(String cardNumber) {
        return memberRepository.findByCardNumber(cardNumber).stream()
                .map(m -> MemberSearchDto.fromMember(m, "CARD_NUMBER", null))
                .collect(Collectors.toList());
    }

    private List<MemberSearchDto> searchByNameFuzzy(String name) {
        if (name.length() < 3)
            return List.of();
        return nameSearchService.searchMembersByName(name).stream()
                .map(auto -> memberRepository.findById(auto.getMemberId())
                        .map(m -> MemberSearchDto.fromMember(m, "NAME_FUZZY", auto.getSimilarity()))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    private void validateAccess(Member member) {
        User user = authorizationService.getCurrentUser();
        Set<Long> permittedIds = authorizationService.getPermittedEmployerIdsForUser(user);
        if (permittedIds != null) {
            Long empId = member.getEmployerOrganization() != null ? member.getEmployerOrganization().getId() : null;
            if (empId == null || !permittedIds.contains(empId)) {
                throw new ResourceNotFoundException("Access Denied (Restricted)");
            }
        }
    }

    private void applySecurityFilter(Root<Member> root, CriteriaBuilder cb, List<Predicate> predicates) {
        User user = authorizationService.getCurrentUser();
        Set<Long> permittedIds = authorizationService.getPermittedEmployerIdsForUser(user);
        if (permittedIds != null) {
            if (permittedIds.isEmpty())
                predicates.add(cb.disjunction());
            else
                predicates.add(root.get("employerOrganization").get("id").in(permittedIds));
        }
    }

    private EligibilityResultDto buildEligibilityResult(Member member) {
        String status = member.getStatus() != null ? member.getStatus().name() : "UNKNOWN";
        return EligibilityResultDto.builder()
                .memberId(member.getId())
                .fullName(member.getFullName())
                .cardNumber(member.getCardNumber())
                .barcode(member.getBarcode())
                .dependent(member.getParent() != null)
                .primaryMemberId(member.getParent() != null ? member.getParent().getId() : null)
                .memberStatus(status)
                .cardStatus(member.getCardStatus() != null ? member.getCardStatus().name() : "UNKNOWN")
                .eligibilityDecision("ACTIVE".equals(status) ? EligibilityResultDto.EligibilityDecision.ELIGIBLE
                        : EligibilityResultDto.EligibilityDecision.NOT_ELIGIBLE)
                .build();
    }
}
