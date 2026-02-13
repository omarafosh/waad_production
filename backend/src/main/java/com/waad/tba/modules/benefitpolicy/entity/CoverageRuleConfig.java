package com.waad.tba.modules.benefitpolicy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity for configuring coverage rule priorities.
 * Allows changing the precedence of rules (e.g., Service vs Category) without code changes.
 */
@Entity
@Table(name = "coverage_rule_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoverageRuleConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_key", nullable = false, unique = true)
    private String ruleKey;

    @Column(name = "priority_weight", nullable = false)
    private Integer priorityWeight;

    @Column(name = "description")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
