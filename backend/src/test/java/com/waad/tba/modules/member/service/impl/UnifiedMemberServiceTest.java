package com.waad.tba.modules.member.service.impl;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.infrastructure.port.DocumentService;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.*;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository;
import com.waad.tba.modules.member.service.BarcodeGeneratorService;
import com.waad.tba.modules.member.service.CardNumberGeneratorService;
import com.waad.tba.security.AuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UnifiedMemberService Unit Tests")
class UnifiedMemberServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private MemberWorkflowHistoryRepository workflowHistoryRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private BenefitPolicyRepository benefitPolicyRepository;
    @Mock
    private BarcodeGeneratorService barcodeGenerator;
    @Mock
    private CardNumberGeneratorService cardNumberGenerator;
    @Mock
    private UnifiedMemberMapper mapper;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private DocumentService documentService;

    @InjectMocks
    private UnifiedMemberServiceImpl unifiedMemberService;

    @Test
    @DisplayName("createPrincipalMember should set barcode, cardNumber and save")
    void createPrincipalMember_Success() {
        MemberCreateDto dto = new MemberCreateDto();
        dto.setFullName("Principal Member");
        dto.setEmployerId(1L);
        dto.setBenefitPolicyId(2L);

        Organization org = new Organization();
        org.setId(1L);
        BenefitPolicy policy = new BenefitPolicy();
        policy.setId(2L);

        Member member = new Member();
        member.setFullName("Principal Member");

        when(organizationRepository.findById(1L)).thenReturn(Optional.of(org));
        when(benefitPolicyRepository.findById(2L)).thenReturn(Optional.of(policy));
        when(mapper.toEntity(dto)).thenReturn(member);
        when(barcodeGenerator.generateMemberBarcode()).thenReturn("WAAD-12345");
        when(cardNumberGenerator.generateCardNumber()).thenReturn("CARD-12345");
        when(memberRepository.save(any(Member.class))).thenReturn(member);
        when(mapper.toDto(any(Member.class))).thenReturn(new MemberViewDto());

        MemberViewDto result = unifiedMemberService.createPrincipalMember(dto);

        assertNotNull(result);
        verify(barcodeGenerator).generateMemberBarcode();
        verify(cardNumberGenerator).generateCardNumber();
        verify(memberRepository).save(any(Member.class));
        assertEquals("WAAD-12345", member.getBarcode());
        assertEquals("CARD-12345", member.getCardNumber());
    }

    @Test
    @DisplayName("searchMembersAdvanced should filter by criteria")
    void searchMembersAdvanced_Success() {
        MemberSearchCriteria criteria = new MemberSearchCriteria();
        criteria.setFullName("Ahmed");
        criteria.setOrganizationId(1L);

        Pageable pageable = PageRequest.of(0, 10);
        Member member = new Member();
        member.setId(1L);
        member.setFullName("Ahmed User");

        Page<Member> page = new PageImpl<>(List.of(member));

        when(memberRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(mapper.toDto(any(Member.class))).thenReturn(new MemberViewDto());

        Page<MemberViewDto> result = unifiedMemberService.searchMembersAdvanced(criteria, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(memberRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    @DisplayName("deleteMember should set active to false (soft delete)")
    void deleteMember_Success() {
        Long memberId = 1L;
        Member member = new Member();
        member.setId(memberId);
        member.setActive(true);

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        unifiedMemberService.deleteMember(memberId);

        assertFalse(member.isActive());
        verify(memberRepository).save(member);
    }

    @Test
    @DisplayName("getDependents should return list of mapped dtos")
    void getDependents_Success() {
        Long principalId = 1L;
        Member dependent = new Member();
        dependent.setFullName("Son");

        when(memberRepository.findByParentId(principalId)).thenReturn(List.of(dependent));
        when(mapper.toViewDto(any(Member.class))).thenReturn(new MemberViewDto());

        List<MemberViewDto> result = unifiedMemberService.getDependents(principalId);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(memberRepository).findByParentId(principalId);
    }

    @Test
    @DisplayName("countDependents should return number of dependents")
    void countDependents_Success() {
        Long principalId = 1L;
        when(memberRepository.countByParentId(principalId)).thenReturn(5L);

        long count = unifiedMemberService.countDependents(principalId);

        assertEquals(5, count);
        verify(memberRepository).countByParentId(principalId);
    }
}
