package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Service Category Mapping Entity (Junction Table)
 * 
 * Purpose: Allows a single Medical Service to belong to multiple Categories
 * with context-specific coverage (e.g., different category for Inpatient vs Outpatient).
 */
@Entity
@Table(name = "medical_service_categories", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"service_id", "category_id", "context"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceCategoryMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private MedicalService service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private MedicalCategory category;

    /**
     * Whether this is the primary category for the service.
     * Used for backward compatibility and default display.
     */
    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private boolean isPrimary = false;

    /**
     * The encounter context where this category applies.
     * Values: ANY, OUTPATIENT, INPATIENT, EMERGENCY
     */
    @Column(name = "context", nullable = false, length = 20)
    @Builder.Default
    private String context = "ANY";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
