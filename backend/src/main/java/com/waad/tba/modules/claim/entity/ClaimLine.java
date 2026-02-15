package com.waad.tba.modules.claim.entity;

import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * ClaimLine Entity (CANONICAL REBUILD 2026-02-15 - UNIFIED DICTIONARY)
 */
@Entity
@Table(name = "claim_lines", indexes = {
    @Index(name = "idx_claim_line_service", columnList = "medical_service_id"),
    @Index(name = "idx_claim_line_claim", columnList = "claim_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClaimLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    // ==================== MEDICAL SERVICE (ENTERPRISE DICTIONARY) ====================
    
    /**
     * Enterprise Medical Service (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_service_id", nullable = false)
    private EnterpriseMedicalService medicalService;

    /**
     * Service code (denormalized snapshot)
     */
    @Column(name = "service_code", length = 50, nullable = false)
    private String serviceCode;
    
    /**
     * Service name (denormalized snapshot)
     */
    @Column(name = "service_name", length = 255)
    private String serviceName;
    
    /**
     * Medical Category (MANDATORY - UNIFIED DICTIONARY)
     */
    @Column(name = "service_category", nullable = false, length = 100)
    private String serviceCategory;

    // ==================== QUANTITY & PRICING ====================

    /**
     * Quantity of service
     */
    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    /**
     * Unit price from Provider Contract (READ-ONLY, auto-resolved)
     * ARCHITECTURAL LAW: This is NOT user-editable
     */
    @Column(name = "unit_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    /**
     * Total price (SERVER-CALCULATED: quantity × unitPrice)
     * ARCHITECTURAL LAW: This is auto-calculated, not user-entered
     */
    @Column(name = "total_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalPrice;
    
    @Column(name = "requires_pa")
    @Builder.Default
    private Boolean requiresPA = false;

    /**
     * Original service code provided by the provider (if different from Master)
     */
    @Column(name = "provider_service_code", length = 100)
    private String providerServiceCode;

    /**
     * Reason code for reclassification (Mandatory if mapped/reassigned)
     */
    @Column(name = "reclassification_reason_code", length = 50)
    private String reclassificationReasonCode;
    
    // ==================== COVERAGE SNAPSHOT (FINANCIAL AUDIT TRAIL) ====================
    
    /**
     * Coverage percentage at time of claim creation (snapshot from BenefitPolicyRule)
     * IMPORTANT: This is stored as snapshot and should NOT be recalculated after creation
     */
    @Column(name = "coverage_percent_snapshot")
    private Integer coveragePercentSnapshot;
    
    /**
     * Patient copay percentage at time of claim creation (snapshot from BenefitPolicyRule)
     * IMPORTANT: This is stored as snapshot and should NOT be recalculated after creation
     */
    @Column(name = "patient_copay_percent_snapshot")
    private Integer patientCopayPercentSnapshot;

    // ==================== LIFECYCLE HOOKS ====================

    @PrePersist
    private void prePersist() {
        populateDenormalizedFields();
        calculateTotalPrice();
        validateArchitecturalRules();
    }
    
    @PreUpdate
    private void preUpdate() {
        calculateTotalPrice();
    }
    
    /**
     * Populate denormalized fields from EnterpriseMedicalService
     */
    private void populateDenormalizedFields() {
        if (medicalService != null) {
            this.serviceCode = medicalService.getCode();
            this.serviceName = medicalService.getNameAr(); // Default to Arabic name for snapshot
            this.serviceCategory = medicalService.getCategory();
        }
    }

    /**
     * Calculate total price from quantity and unit price
     */
    private void calculateTotalPrice() {
        if (quantity != null && unitPrice != null) {
            totalPrice = unitPrice.multiply(new BigDecimal(quantity));
        }
    }
    
    /**
     * Validate architectural rules
     */
    private void validateArchitecturalRules() {
        // RULE: EnterpriseMedicalService is MANDATORY
        if (medicalService == null) {
            throw new IllegalStateException("ARCHITECTURAL VIOLATION: ClaimLine MUST reference an EnterpriseMedicalService");
        }
        
        // RULE: Category is MANDATORY
        if (serviceCategory == null || serviceCategory.isBlank()) {
            throw new IllegalStateException(
                "ARCHITECTURAL VIOLATION: ClaimLine MUST have a medical category.");
        }
        
        // RULE: Unit price must be set
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("ARCHITECTURAL VIOLATION: Unit price must be resolved from Provider Contract");
        }
        
        // RULE: Quantity must be positive
        if (quantity == null || quantity <= 0) {
            throw new IllegalStateException("Quantity must be a positive number");
        }
    }
}
