package com.waad.tba.modules.preauthorization.repository;

import com.waad.tba.modules.preauthorization.entity.PreAuthorizationAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for PreAuthorization Attachments
 */
@Repository
public interface PreAuthorizationAttachmentRepository extends JpaRepository<PreAuthorizationAttachment, Long> {

    List<PreAuthorizationAttachment> findByPreAuthorizationId(Long preAuthorizationId);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM PreAuthorizationAttachment a WHERE a.preAuthorizationId IN (SELECT p.id FROM PreAuthorization p WHERE p.providerId = :providerId)")
    List<PreAuthorizationAttachment> findByProviderId(Long providerId);

    /**
     * Count attachments for a pre-authorization
     */
    long countByPreAuthorizationId(Long preAuthorizationId);

    /**
     * Delete all attachments for a pre-authorization
     */
    void deleteByPreAuthorizationId(Long preAuthorizationId);
}
