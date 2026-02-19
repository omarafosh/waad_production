package com.waad.tba.modules.member.service;

import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository;
import com.waad.tba.modules.member.service.impl.UnifiedMemberServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UnifiedMemberServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private MemberWorkflowHistoryRepository workflowRepository;

    @InjectMocks
    private UnifiedMemberServiceImpl memberService;

    private MemberCreateDto createDto;

    @BeforeEach
    void setUp() {
        createDto = new MemberCreateDto();
        createDto.setCivilId("1234567890");
        createDto.setFullName("Omar Afosh");
    }

    @Test
    void createDraftMember_ShouldSaveAsDraft() {
        Member savedMember = new Member();
        savedMember.setId(1L);
        savedMember.setStatus(Member.MemberStatus.DRAFT);

        when(memberRepository.save(any(Member.class))).thenReturn(savedMember);

        MemberViewDto result = memberService.createDraftMember(createDto);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(memberRepository).save(any(Member.class));
    }

    @Test
    void promoteToActive_ShouldUpdateStatusAndLog() {
        Member member = new Member();
        member.setId(1L);
        member.setStatus(Member.MemberStatus.DRAFT);

        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberRepository.save(any(Member.class))).thenReturn(member);

        MemberViewDto result = memberService.promoteToActive(1L, "Promoting for test");

        assertNotNull(result);
        assertEquals(Member.MemberStatus.ACTIVE.name(), result.getStatus());
        verify(workflowRepository).save(any());
        verify(memberRepository).save(member);
    }
}
