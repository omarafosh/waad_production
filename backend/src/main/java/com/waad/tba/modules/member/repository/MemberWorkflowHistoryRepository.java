package com.waad.tba.modules.member.repository;

import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemberWorkflowHistoryRepository extends JpaRepository<MemberWorkflowHistory, Long> {
    List<MemberWorkflowHistory> findByMemberIdOrderByChangedAtDesc(Long memberId);
}
