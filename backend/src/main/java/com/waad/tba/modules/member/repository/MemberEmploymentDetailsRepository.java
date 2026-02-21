package com.waad.tba.modules.member.repository;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.waad.tba.modules.member.entity.MemberEmploymentDetails;

@Repository
public interface MemberEmploymentDetailsRepository extends JpaRepository<MemberEmploymentDetails, Long> {

    Optional<MemberEmploymentDetails> findByMemberIdAndActiveTrue(Long memberId);

    List<MemberEmploymentDetails> findByMemberId(Long memberId);

    Optional<MemberEmploymentDetails> findByEmployeeNumberAndActiveTrue(String employeeNumber);

    @Query("SELECT med FROM MemberEmploymentDetails med JOIN FETCH med.employer WHERE med.member.id = :memberId")
    List<MemberEmploymentDetails> findAllByMemberIdWithEmployer(Long memberId);
}
