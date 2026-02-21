package com.waad.tba.modules.workflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity for Maker/Checker approval requests.
 * Stores pending changes as a JSON payload until approved.
 */
@Entity
@Table(name = "approval_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "action", nullable = false)
    private String action;

    @Lob
    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ApprovalStatus status;

    @Column(name = "maker_user", nullable = false)
    private String makerUser;

    @Column(name = "checker_user")
    private String checkerUser;

    @Column(name = "maker_notes")
    private String makerNotes;

    @Column(name = "checker_notes")
    private String checkerNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED
    }
}
