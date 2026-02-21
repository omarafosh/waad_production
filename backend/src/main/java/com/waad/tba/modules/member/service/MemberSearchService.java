package com.waad.tba.modules.member.service;

import com.waad.tba.modules.member.dto.FamilyEligibilityResponseDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.modules.rbac.entity.User;
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

/**
 * Service dedicated to member search, filtering, and eligibility checks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberSearchService {

    private final MemberRepository memberRepository;
    private final UnifiedMemberMapper mapper;
    private final AuthorizationService authorizationService;

    @Transactional(readOnly = true)
    public FamilyEligibilityResponseDto checkFamilyEligibility(String query) {
        String cleanQuery = query != null ? query.trim() : "";

        // 1. Try Barcode Match
        List<Member> members = memberRepository.findByBarcode(cleanQuery);
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
        if (targetMember == null && cleanQuery.length() > 1) {
            String potentialPrincipalCard = cleanQuery.substring(0, cleanQuery.length() - 1);
            members = memberRepository.findByCardNumber(potentialPrincipalCard);

            if (!members.isEmpty()) {
                Member found = members.get(0);
                if (found.isPrincipal()) {
                    log.info("found principal via smart suffix stripping: {} -> {}", cleanQuery, potentialPrincipalCard);
                    targetMember = found;
                }
            }
        }

        if (targetMember == null) {
            throw new com.waad.tba.common.exception.ResourceNotFoundException("Member not found with Barcode or Card Number: " + cleanQuery);
        }

        // Resolve Principal (If dependent found, get parent)
        Member principal = (targetMember.getParent() != null) ? targetMember.getParent() : targetMember;
        List<Member> dependents = memberRepository.findByParentId(principal.getId());
        
        return mapper.toFamilyEligibilityResponse(principal, dependents);
    }

    @Transactional(readOnly = true)
    public Page<MemberViewDto> searchMembers(
            String searchTermInput, String civilId, String barcode,
            String cardNumber, Long organizationId, Long benefitPolicyId,
            String status, String type, boolean deleted, Pageable pageable) {

        Specification<Member> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            String searchTerm = (searchTermInput != null && !searchTermInput.trim().isEmpty()) ? searchTermInput : null;

            boolean isGeneralSearch = searchTerm != null &&
                    ((barcode != null && searchTerm.equals(barcode)) ||
                            (cardNumber != null && searchTerm.equals(cardNumber)));

            if (isGeneralSearch) {
                String likePattern = "%" + searchTerm.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), likePattern),
                        cb.like(cb.lower(root.get("barcode")), likePattern),
                        cb.like(cb.lower(root.get("cardNumber")), likePattern)));
            } else {
                if (searchTerm != null) {
                    predicates.add(cb.like(cb.lower(root.get("fullName")), "%" + searchTerm.toLowerCase() + "%"));
                }
                if (barcode != null && !barcode.trim().isEmpty())
                    predicates.add(cb.equal(root.get("barcode"), barcode));
                if (cardNumber != null && !cardNumber.trim().isEmpty())
                    predicates.add(cb.equal(root.get("cardNumber"), cardNumber));
            }

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

            predicates.add(cb.equal(root.get("active"), !deleted));

            applySecurityFilter(root, cb, predicates);

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return memberRepository.findAll(spec, pageable).map(member -> {
            MemberViewDto dto = mapper.toViewDto(member);
            if (Boolean.FALSE.equals(member.getActive())) {
                dto.setStatus(Member.MemberStatus.TERMINATED);
            }
            return dto;
        });
    }

    public void applySecurityFilter(Root<Member> root, CriteriaBuilder cb, List<Predicate> predicates) {
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
}
