package com.waad.tba.modules.member.service;

import com.waad.tba.common.file.FileStorageService;
import com.waad.tba.common.file.FileUploadResult;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberDocument;
import com.waad.tba.modules.member.repository.MemberDocumentRepository;
import com.waad.tba.modules.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberDocumentService {

    private final MemberDocumentRepository memberDocumentRepository;
    private final MemberRepository memberRepository;
    private final FileStorageService fileStorageService;

    /**
     * Requirement 5: Upload and link document to member
     */
    @Transactional
    public MemberDocument uploadDocument(Long memberId, MultipartFile file, MemberDocument.DocumentType type, String uploader) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        // 1. Upload to storage
        FileUploadResult storageResult = fileStorageService.upload(file, "members/" + memberId);

        // 2. Create database record
        MemberDocument document = MemberDocument.builder()
                .member(member)
                .documentType(type)
                .filePath(storageResult.getFileKey())
                .fileName(storageResult.getFileName())
                .mimeType(storageResult.getContentType())
                .fileSize(storageResult.getSize())
                .uploadedAt(LocalDateTime.now())
                .uploadedBy(uploader)
                .build();

        MemberDocument savedDoc = memberDocumentRepository.save(document);

        // 3. If it's a PHOTO, update the member's primary photo reference
        if (type == MemberDocument.DocumentType.PHOTO) {
            member.setPhotoUrl(savedDoc.getFilePath());
            memberRepository.save(member);
        }

        return savedDoc;
    }

    public List<MemberDocument> getMemberDocuments(Long memberId) {
        return memberDocumentRepository.findByMemberId(memberId);
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        MemberDocument document = memberDocumentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        // Delete from storage
        fileStorageService.delete(document.getFilePath());

        // Update member if it was the profile photo
        if (document.getDocumentType() == MemberDocument.DocumentType.PHOTO) {
            Member member = document.getMember();
            if (document.getFilePath().equals(member.getPhotoUrl())) {
                member.setPhotoUrl(null);
                memberRepository.save(member);
            }
        }

        // Delete from DB
        memberDocumentRepository.delete(document);
    }

    /**
     * Delete only the PHOTO document for a member
     */
    @Transactional
    public void deleteMemberPhoto(Long memberId) {
        List<MemberDocument> docs = memberDocumentRepository.findByMemberId(memberId);
        docs.stream()
            .filter(d -> d.getDocumentType() == MemberDocument.DocumentType.PHOTO)
            .forEach(d -> deleteDocument(d.getId()));
    }

    @Transactional
    public void verifyDocument(Long documentId, String verifier) {
        MemberDocument document = memberDocumentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        document.setIsVerified(true);
        document.setVerifiedAt(LocalDateTime.now());
        document.setVerifiedBy(verifier);
        memberDocumentRepository.save(document);
    }
}
