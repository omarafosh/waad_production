package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Medical Category Entity (Reference Data)
 * 
 * Purpose: Classification of medical services into hierarchical categories
 * Scope: Pure reference data (NO coverage, claim, provider, or network logic)
 * 
 * Examples:
 * - Root: MEDICAL, DENTAL, VISION, PHARMACY
 * - Level 2: CONSULTATION, SURGERY, LAB, IMAGING
 * - Level 3: CARDIOLOGY_CONSULT, ORTHOPEDIC_SURGERY, etc.
 */
@Entity
@Table(name = "medical_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * كود التصنيف الموحد (Unique business identifier)
     * Examples: "CONSULTATION", "LAB", "PHARMACY"
     */
    @Column(nullable = false, unique = true, length = 255)
    private String code;

    /**
     * اسم التصنيف بالعربي
     */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /**
     * التصنيف الأب (لدعم الهيكلية الشجرية)
     * NULL = تصنيف رئيسي (Root)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private MedicalCategory parent;

    @Column(name = "parent_id", insertable = false, updatable = false)
    private Long parentId;

    /**
     * حالة النشاط
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

