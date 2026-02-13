package com.waad.tba.modules.member.repository;

import com.waad.tba.modules.member.entity.MemberDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MemberDocumentRepository extends JpaRepository<MemberDocument, Long> {
    List<MemberDocument> findByMemberId(Long memberId);
    List<MemberDocument> findByMemberIdAndDocumentType(Long memberId, MemberDocument.DocumentType documentType);
    Optional<MemberDocument> findFirstByMemberIdAndDocumentTypeOrderByUploadedAtDesc(Long memberId, MemberDocument.DocumentType documentType);
}
