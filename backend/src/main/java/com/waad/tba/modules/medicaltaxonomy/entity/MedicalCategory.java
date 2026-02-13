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
@lombok.experimental.SuperBuilder
@lombok.EqualsAndHashCode(callSuper = true)
@org.hibernate.annotations.SQLDelete(sql = "UPDATE medical_categories SET deleted = true, deleted_at = NOW() WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("deleted = false")
public class MedicalCategory extends com.waad.tba.common.entity.SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique business identifier (immutable)
     * Examples: "CONSULTATION", "SURGERY", "CARDIOLOGY_CONSULT"
     */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    /**
     * Category name (unified - Arabic-only system)
     */
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /**
     * Parent category for hierarchy support
     * NULL = root category
     * NOT NULL = subcategory
     */
    @Column(name = "parent_id")
    private Long parentId;
}
