package com.waad.tba.modules.benefitpolicy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Audit entity for Benefit Policy Lifecycle events.
 * Tracks status changes, rule modifications, and lifecycle actions.
 */
@Entity
@Table(name = "benefit_policy_audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BenefitPolicyAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "benefit_policy_id", nullable = false)
    private Long benefitPolicyId;

    /**
     * Event type: STATUS_CHANGE, RULE_CHANGE, LIMIT_CHANGE, CLONED
     */
    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(length = 500)
    private String notes;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
