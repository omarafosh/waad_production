package com.waad.tba.modules.claim.service;

import com.waad.tba.common.file.FileStorageService;
import com.waad.tba.common.file.FileUploadResult;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimAttachment;
import com.waad.tba.modules.claim.entity.ClaimAttachmentType;
import com.waad.tba.modules.claim.repository.ClaimAttachmentRepository;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.function.Supplier;

/**
 * Claim Attachment Service
 * 
 * Handles file upload, download, and management for claim attachments
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimAttachmentService {

    private final ClaimAttachmentRepository attachmentRepository;
    private final ClaimRepository claimRepository;
    private final FileStorageService fileStorageService;
    private final TransactionTemplate transactionTemplate;

    /**
     * Upload an attachment for a claim
     * 
     * @param claimId        Claim ID
     * @param file           File to upload
     * @param attachmentType Type of attachment
     * @return Created ClaimAttachment entity
     */
    public ClaimAttachment uploadAttachment(Long claimId, MultipartFile file, ClaimAttachmentType attachmentType) {
        log.info("Uploading attachment for claim ID: {}, type: {}", claimId, attachmentType);

        // Upload file to storage OUTSIDE transaction to avoid holding DB locks during
        // I/O
        String folder = "claims/" + claimId;
        FileUploadResult uploadResult = fileStorageService.upload(file, folder);

        try {
            return executeInTransaction(() -> {
                Claim claim = claimRepository.findById(claimId)
                        .orElseThrow(() -> new RuntimeException("Claim not found with ID: " + claimId));

                ClaimAttachment attachment = ClaimAttachment.builder()
                        .claim(claim)
                        .fileName(uploadResult.getFileName())
                        .fileUrl(uploadResult.getUrl())
                        .fileType(uploadResult.getContentType())
                        .fileKey(uploadResult.getFileKey())
                        .originalFileName(uploadResult.getFileName())
                        .fileSize(uploadResult.getSize())
                        .uploadedBy(getCurrentUsername())
                        .attachmentType(attachmentType)
                        .build();

                ClaimAttachment saved = attachmentRepository.save(attachment);
                log.info("Attachment uploaded successfully: ID={}, fileKey={}", saved.getId(), saved.getFileKey());
                return saved;
            });
        } catch (RuntimeException ex) {
            cleanupUploadedFile(uploadResult.getFileKey());
            throw ex;
        }
    }

    /**
     * Download an attachment
     * 
     * @param attachmentId Attachment ID
     * @return File content as byte array
     */
    public byte[] downloadAttachment(Long attachmentId) {
        log.info("Downloading attachment ID: {}", attachmentId);

        ClaimAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found with ID: " + attachmentId));

        return fileStorageService.download(attachment.getFileKey());
    }

    /**
     * Delete an attachment
     * 
     * @param attachmentId Attachment ID
     */
    @Transactional
    public void deleteAttachment(Long attachmentId) {
        log.info("Deleting attachment ID: {}", attachmentId);

        ClaimAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found with ID: " + attachmentId));

        String fileKey = attachment.getFileKey();

        // Delete from database inside transaction
        attachmentRepository.delete(attachment);

        // Delete from storage only AFTER successful commit
        runAfterCommitOrNow(() -> {
            try {
                fileStorageService.delete(fileKey);
            } catch (Exception e) {
                log.error("Failed to delete file from storage: {}", fileKey, e);
            }
        });

        log.info("Attachment deleted successfully: ID={}", attachmentId);
    }

    /**
     * Get all attachments for a claim
     * 
     * @param claimId Claim ID
     * @return List of attachments
     */
    public List<ClaimAttachment> getClaimAttachments(Long claimId) {
        log.info("Fetching attachments for claim ID: {}", claimId);
        return attachmentRepository.findByClaimId(claimId);
    }

    /**
     * Get a specific attachment by ID
     * 
     * @param attachmentId Attachment ID
     * @return ClaimAttachment entity
     */
    public ClaimAttachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found with ID: " + attachmentId));
    }

    /**
     * Count attachments for a claim
     * 
     * @param claimId Claim ID
     * @return Number of attachments
     */
    public long countAttachments(Long claimId) {
        return attachmentRepository.countByClaimId(claimId);
    }

    /**
     * Delete all attachments for a claim
     * 
     * @param claimId Claim ID
     */
    @Transactional
    public void deleteAllClaimAttachments(Long claimId) {
        log.info("Deleting all attachments for claim ID: {}", claimId);

        List<ClaimAttachment> attachments = attachmentRepository.findByClaimId(claimId);
        List<String> fileKeys = attachments.stream()
                .map(ClaimAttachment::getFileKey)
                .toList();

        // Delete from database
        attachmentRepository.deleteByClaimId(claimId);

        // Delete files from storage only AFTER successful commit
        runAfterCommitOrNow(() -> {
            for (String fileKey : fileKeys) {
                try {
                    fileStorageService.delete(fileKey);
                } catch (Exception e) {
                    log.error("Failed to delete file: {}", fileKey, e);
                }
            }
        });

        log.info("All attachments deleted for claim ID: {}", claimId);
    }

    private <T> T executeInTransaction(Supplier<T> action) {
        return transactionTemplate.execute(status -> action.get());
    }

    private void cleanupUploadedFile(String fileKey) {
        try {
            fileStorageService.delete(fileKey);
        } catch (Exception cleanupError) {
            log.error("Failed to cleanup uploaded file after DB failure: {}", fileKey, cleanupError);
        }
    }

    private void runAfterCommitOrNow(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
            return;
        }
        task.run();
    }

    /**
     * Get current authenticated username
     * 
     * @return Username or "system"
     */
    private String getCurrentUsername() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                return authentication.getName();
            }
        } catch (Exception e) {
            log.warn("Could not get current username", e);
        }
        return "system";
    }
}
