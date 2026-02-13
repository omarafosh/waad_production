package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Audit entity for Medical Service Reclassification.
 * Captures WHY and HOW a service category was changed.
 */
@Entity
@Table(name = "reclassification_audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReclassificationAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "old_category_id")
    private Long oldCategoryId;

    @Column(name = "new_category_id", nullable = false)
    private Long newCategoryId;

    /**
     * Reclassification strategy used: INHERIT, KEEP_OVERRIDE, CUSTOM
     */
    @Column(nullable = false, length = 30)
    private String strategy;

    /**
     * Business reason code for the change
     */
    @Column(name = "reason_code", length = 100)
    private String reasonCode;

    /**
     * Estimated number of rules affected (for KEEP_OVERRIDE)
     */
    @Column(name = "rules_affected")
    private Integer rulesAffected;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(name = "correlation_id", length = 36)
    private String correlationId;

    @Column(name = "before_snapshot", columnDefinition = "TEXT")
    private String beforeSnapshot;

    @Column(name = "after_snapshot", columnDefinition = "TEXT")
    private String afterSnapshot;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
