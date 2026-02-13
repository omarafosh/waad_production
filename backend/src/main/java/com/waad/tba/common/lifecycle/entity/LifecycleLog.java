package com.waad.tba.common.lifecycle.entity;

import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "lifecycle_logs", indexes = {
    @Index(name = "idx_lifecycle_entity", columnList = "entity_type, entity_id"),
    @Index(name = "idx_lifecycle_action", columnList = "action")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class LifecycleLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LifecycleAction action;

    @Column(name = "previous_status")
    private String previousStatus;

    @Column(name = "new_status")
    private String newStatus;

    @Column(name = "reason_code")
    private String reasonCode;

    @Column(length = 1000)
    private String reasonDetails;

    @Column(name = "performed_by")
    private String performedBy;

    @CreatedDate
    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON snapshot
}
