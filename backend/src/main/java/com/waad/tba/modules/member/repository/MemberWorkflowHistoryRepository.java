package com.waad.tba.modules.member.repository;

import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface MemberWorkflowHistoryRepository extends JpaRepository<MemberWorkflowHistory, Long> {
    List<MemberWorkflowHistory> findByMemberIdOrderByChangedAtDesc(Long memberId);

    @Modifying
    @Query("DELETE FROM MemberWorkflowHistory h WHERE h.member.id = :memberId")
    void deleteByMemberId(@Param("memberId") Long memberId);
}
