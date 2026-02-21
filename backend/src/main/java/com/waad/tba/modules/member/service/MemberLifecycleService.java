package com.waad.tba.modules.member.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository;
import com.waad.tba.security.AuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberLifecycleService {

    private final MemberRepository memberRepository;
    private final MemberWorkflowHistoryRepository workflowHistoryRepository;
    private final AuthorizationService authorizationService;

    @Transactional
    public void transitionMemberStatus(Member member, Member.MemberStatus newStatus, String reason) {
        String fromStatus = member.getStatus() != null ? member.getStatus().name() : "NULL";
        member.setStatus(newStatus);
        memberRepository.save(member);

        logWorkflowHistory(member, fromStatus, newStatus.name(), reason);
        log.info("✅ Member ID={} status transitioned from {} to {} Reason: {}",
                member.getId(), fromStatus, newStatus, reason);
    }

    public void logWorkflowHistory(Member member, String fromStatus, String toStatus, String reason) {
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
    public void deleteMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));

        member.setActive(false);
        member.setStatus(Member.MemberStatus.TERMINATED);
        memberRepository.save(member);

        List<Member> dependents = memberRepository.findByParentId(id);
        for (Member dep : dependents) {
            dep.setActive(false);
            dep.setStatus(Member.MemberStatus.TERMINATED);
            memberRepository.save(dep);
        }

        logWorkflowHistory(member, member.getStatus() != null ? member.getStatus().name() : "UNKNOWN",
                Member.MemberStatus.TERMINATED.name(), "Soft deleted");

        log.info("🗑️ Member soft-deleted: id={}, dependents={}", id, dependents.size());
    }

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

        List<Member> dependents = memberRepository.findByParentId(id);
        for (Member dep : dependents) {
            dep.setActive(true);
            dep.setStatus(Member.MemberStatus.ACTIVE);
            memberRepository.save(dep);
        }

        logWorkflowHistory(member, "TERMINATED", "ACTIVE", "Restored from trash");
        log.info("♻️ Member restored: id={}, dependents={}", member.getId(), dependents.size());
    }

    @Transactional
    public void hardDeleteMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + id));
        memberRepository.delete(member);
        log.info("💀 Member physically deleted: id={}", id);
    }

    @Transactional(readOnly = true)
    public List<MemberWorkflowHistory> getWorkflowHistory(Long id) {
        return workflowHistoryRepository.findByMemberIdOrderByChangedAtDesc(id);
    }
}
