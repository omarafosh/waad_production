package com.waad.tba.modules.claim.repository;

import com.waad.tba.modules.claim.entity.ClaimAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Claim Attachment Repository
 */
@Repository
public interface ClaimAttachmentRepository extends JpaRepository<ClaimAttachment, Long> {

    List<ClaimAttachment> findByClaimId(Long claimId);

    /**
     * Find all attachments for a specific provider
     */
    List<ClaimAttachment> findByClaimProviderId(Long providerId);

    /**
     * Count attachments for a specific claim
     * 
     * @param claimId Claim ID
     * @return Number of attachments
     */
    long countByClaimId(Long claimId);

    /**
     * Delete all attachments for a specific claim
     * 
     * @param claimId Claim ID
     */
    void deleteByClaimId(Long claimId);
}
