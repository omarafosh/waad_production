package com.waad.tba.common.audit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "entity_history", indexes = {
    @Index(name = "idx_entity_history_lookup", columnList = "entity_type, entity_id"),
    @Index(name = "idx_entity_history_correlation", columnList = "correlation_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class EntityHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 20)
    private String action; // CREATE, UPDATE, DELETE

    @Column(name = "correlation_id", length = 36)
    private String correlationId;

    @Column(name = "changes_json", columnDefinition = "TEXT")
    private String changesJson;

    private Long version;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @CreatedDate
    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;
}
