package com.waad.tba.modules.medicaltaxonomy.entity;

import com.waad.tba.modules.provider.entity.Provider;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Provider Service Mapping Entity
 * 
 * Purpose: Bridges provider-specific service codes to the Master Medical Catalog.
 * Each provider has its own catalog, which must be mapped to the standard master catalog
 * for coverage resolution and claim processing.
 */
@Entity
@Table(name = "provider_service_mappings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider_id", "provider_service_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderServiceMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Reference to the Provider (Who owns this code?)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    /**
     * The service code as defined by the provider.
     * Examples: "HOSP-LAB-01", "DR-CONSULT-SPEC"
     */
    @Column(name = "provider_service_code", nullable = false, length = 100)
    private String providerServiceCode;

    /**
     * Reference to the Master Medical Service (Our standard code)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_service_id", nullable = false)
    private MedicalService masterService;

    /**
     * Optional: mapping confidence level (0.0 to 1.0)
     * Useful for AI-assisted mapping or bulk imports.
     */
    @Column(name = "mapping_confidence")
    private Double confidence;

    /**
     * Audit: creation timestamp
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Audit: last update timestamp
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    /**
     * Reason code for the mapping (e.g., "MANUAL_CORRECTION", "TAXONOMY_UPDATE")
     */
    @Column(name = "reason_code", length = 50)
    private String reasonCode;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

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
