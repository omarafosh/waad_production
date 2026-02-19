package com.waad.tba.modules.benefitpolicy.entity;

import com.waad.tba.modules.benefitpolicy.enums.ApplyOnType;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.visit.entity.VisitType;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BenefitPolicyRule Entity (REFACTORED 2026-02-17 - UNIFIED DICTIONARY)
 */
@Entity
@Table(name = "benefit_policy_rules", indexes = {
        @Index(name = "idx_bpr_policy", columnList = "benefit_policy_id"),
        @Index(name = "idx_bpr_category", columnList = "medical_category_id"),
        @Index(name = "idx_bpr_service", columnList = "medical_service_id"),
        @Index(name = "idx_bpr_active", columnList = "active"),
        @Index(name = "idx_bpr_encounter_type", columnList = "encounter_type")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_bpr_policy_category_context", columnNames = { "benefit_policy_id",
                "medical_category_id", "encounter_type" }),
        @UniqueConstraint(name = "uk_bpr_policy_service_context", columnNames = { "benefit_policy_id",
                "medical_service_id", "encounter_type" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@lombok.ToString(exclude = { "benefitPolicy", "medicalCategoryRef" })
@lombok.EqualsAndHashCode(exclude = { "benefitPolicy", "medicalCategoryRef" })
public class BenefitPolicyRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Benefit Policy is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benefit_policy_id", nullable = false)
    private BenefitPolicy benefitPolicy;

    /**
     * Category Code (String) - Transient helper, not a DB column
     * REFACTORED 2026-02-18: This column does NOT exist in DB V04.
     * We use it as a transient property that delegates to medicalCategoryRef.
     */
    @Transient
    private String medicalCategory;

    public String getMedicalCategory() {
        if (medicalCategoryRef != null) {
            return medicalCategoryRef.getCode();
        }
        return medicalCategory;
    }

    public void setMedicalCategory(String medicalCategory) {
        this.medicalCategory = medicalCategory;
    }

    /**
     * Target Medical Category (FK-based - REFACTORED 2026-02-18)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_category_id")
    private com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory medicalCategoryRef;

    /**
     * Target Unified Medical Service (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_service_id")
    private MedicalService medicalService;

    /**
     * Type of target (CATEGORY / SERVICE / PACKAGE)
     * Calculated or stored for quick resolution
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "apply_on", length = 20)
    private ApplyOnType applyOn;

    /**
     * Coverage percentage (0-100).
     * If null, inherits from parent BenefitPolicy.defaultCoveragePercent
     * 
     * Example: 80 means 80% of the cost is covered by insurance
     */
    @Min(value = 0, message = "Coverage percent must be >= 0")
    @Max(value = 100, message = "Coverage percent must be <= 100")
    @Column(name = "coverage_percent")
    private Integer coveragePercent;

    /**
     * Maximum number of times this benefit can be used per period
     * If null, unlimited times (within policy limits)
     * 
     * Example: 12 means max 12 times per year
     */
    @Min(value = 0, message = "Times limit must be >= 0")
    @Column(name = "times_limit")
    private Integer timesLimit;

    /**
     * Waiting period in days before benefit becomes effective
     * If null or 0, no waiting period
     */
    @Min(value = 0, message = "Waiting period must be >= 0")
    @Column(name = "waiting_period_days")
    @Builder.Default
    private Integer waitingPeriodDays = 0;

    /**
     * Fixed deductible amount for this specific rule.
     * If null, inherits from BenefitPolicy.defaultDeductibleAmount.
     */
    @DecimalMin(value = "0.00", message = "Deductible must be >= 0")
    @Column(name = "deductible_amount", precision = 15, scale = 2)
    private BigDecimal deductibleAmount;

    /**
     * Whether this benefit requires pre-approval before use
     */
    @Column(name = "requires_pre_approval", nullable = false)
    @Builder.Default
    private boolean requiresPreApproval = false;

    /**
     * Optional notes about this rule
     */
    @Size(max = 500, message = "Notes must not exceed 500 characters")
    @Column(length = 500)
    private String notes;

    /**
     * MANDATORY: The coverage type this rule applies to.
     * Values: OUTPATIENT, INPATIENT, EMERGENCY, LABORATORY,
     * RADIOLOGY, PHARMACY, DENTAL, PHYSIOTHERAPY
     */
    @NotNull(message = "نوع التغطية إلزامي")
    @Enumerated(EnumType.STRING)
    @Column(name = "encounter_type", length = 30, nullable = false)
    private VisitType encounterType;

    /**
     * Whether this rule is active (Business status)
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Whether this rule is soft-deleted (System status)
     */
    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════════════════

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ═══════════════════════════════════════════════════════════════════════════
    // BUSINESS METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Optional: Target Medical Package (e.g., "Diabetes Management Package")
     * If set, this rule applies to ALL services in this package
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_package_id")
    private com.waad.tba.modules.medicalpackage.MedicalPackage medicalPackage;

    // ... existing fields ...

    /**
     * Check if this rule targets a category
     */
    public boolean isCategoryRule() {
        boolean hasCategoryStr = medicalCategory != null && !medicalCategory.isBlank();
        boolean hasCategoryRef = medicalCategoryRef != null;
        return (hasCategoryStr || hasCategoryRef) && medicalService == null && medicalPackage == null;
    }

    /**
     * Check if this rule targets a specific service
     */
    public boolean isServiceRule() {
        return medicalService != null;
    }

    /**
     * Check if this rule targets a medical package
     */
    public boolean isPackageRule() {
        return medicalPackage != null && (medicalCategory == null || medicalCategory.isBlank())
                && medicalService == null;
    }

    /**
     * Check if this rule is a general/global rule (targets only encounter type)
     */
    public boolean isGeneralRule() {
        return !isCategoryRule() && !isServiceRule() && !isPackageRule();
    }

    public boolean appliesToPackage(com.waad.tba.modules.medicalpackage.MedicalPackage pkg) {
        if (!active)
            return false;
        return medicalPackage != null && medicalPackage.getId().equals(pkg.getId());
    }

    /**
     * Get a descriptive label for this rule
     */
    public String getLabel() {
        if (medicalService != null) {
            return medicalService.getName();
        }
        if (medicalPackage != null) {
            return medicalPackage.getName();
        }
        if (medicalCategoryRef != null) {
            return medicalCategoryRef.getName();
        }
        if (medicalCategory != null && !medicalCategory.isBlank()) {
            return medicalCategory;
        }

        // Final fallback for Global Rules (Encounter type only)
        if (encounterType != null) {
            String suffix = " (عام)";
            // Special case for outpatient/inpatient to make them sound more generic
            return "تغطية " + encounterType.getArabicLabel() + suffix;
        }

        return "Rule #" + (id != null ? id : "NEW");
    }

    /**
     * Validate that the rule targets exactly one of: category, service, or package
     */
    @PrePersist
    @PreUpdate
    public void validateTarget() {
        // Skip validation if we are soft-deleting the rule
        if (deleted)
            return;

        // Validate encounterType is mandatory
        if (encounterType == null) {
            throw new IllegalStateException("نوع التغطية إلزامي — يجب تحديد نوع التغطية لكل قاعدة");
        }

        boolean hasCategory = (medicalCategory != null && !medicalCategory.isBlank()) || medicalCategoryRef != null;
        boolean hasService = medicalService != null;
        boolean hasPackage = medicalPackage != null;

        int count = (hasCategory ? 1 : 0) + (hasService ? 1 : 0) + (hasPackage ? 1 : 0);

        if (count > 1) {
            throw new IllegalStateException(
                    "Rule must target exactly ONE of: category or service (or be a global encounter rule)");
        }

        // Set the applyOn type automatically
        if (hasService)
            this.applyOn = ApplyOnType.SERVICE;
        else if (hasPackage)
            this.applyOn = ApplyOnType.PACKAGE;
        else if (hasCategory)
            this.applyOn = ApplyOnType.CATEGORY;
        else
            this.applyOn = ApplyOnType.GENERAL; // New: Global encounter rule
    }

    /**
     * Get the effective coverage percentage.
     * Logic: If specific rule percentage is set, use it. Otherwise, fallback to
     * policy default.
     */
    public Integer getEffectiveCoveragePercent() {
        if (coveragePercent != null) {
            return coveragePercent;
        }
        if (benefitPolicy != null && benefitPolicy.getDefaultCoveragePercent() != null) {
            return benefitPolicy.getDefaultCoveragePercent();
        }
        return 0; // Default fallback if nothing is set
    }

    /**
     * Get the effective deductible amount.
     * Logic: If specific rule deductible is set (and not negative), use it.
     * Otherwise, fallback to policy default.
     */
    public java.math.BigDecimal getEffectiveDeductible() {
        if (deductibleAmount != null && deductibleAmount.compareTo(java.math.BigDecimal.ZERO) >= 0) {
            return deductibleAmount;
        }
        if (benefitPolicy != null && benefitPolicy.getDefaultDeductibleAmount() != null) {
            return benefitPolicy.getDefaultDeductibleAmount();
        }
        return java.math.BigDecimal.ZERO;
    }
}
