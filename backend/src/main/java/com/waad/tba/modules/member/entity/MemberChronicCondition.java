package com.waad.tba.modules.member.entity;

import com.waad.tba.modules.member.enums.ChronicConditionType;
import com.waad.tba.modules.member.enums.ChronicCoverageStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing a chronic condition (pre-existing disease) for a member.
 * 
 * Business Rules:
 * 1. Each member can have multiple chronic conditions
 * 2. Each condition has a coverage status that affects claim processing
 * 3. Waiting periods are calculated from diagnosis date or enrollment date
 * 4. Documentation is required for verification
 * 5. Coverage status can be changed by authorized personnel only
 * 6. History of status changes is tracked via audit fields
 * 
 * Integration Points:
 * - Claims: Check coverage status before approving chronic-related claims
 * - Pre-Approvals: Validate against chronic conditions
 * - Reports: Generate chronic disease statistics and costs
 */
@Entity
@Table(name = "member_chronic_conditions", 
    indexes = {
        @Index(name = "idx_mcc_member_id", columnList = "member_id"),
        @Index(name = "idx_mcc_condition_type", columnList = "condition_type"),
        @Index(name = "idx_mcc_coverage_status", columnList = "coverage_status"),
        @Index(name = "idx_mcc_waiting_period_end", columnList = "waiting_period_end_date"),
        @Index(name = "idx_mcc_active", columnList = "active")
    },
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_member_condition", 
            columnNames = {"member_id", "condition_type"}
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class MemberChronicCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ═══════════════════════════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Member who has this chronic condition.
     * Required - cannot be null.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONDITION DETAILS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Type of chronic condition from predefined enum.
     * Required - cannot be null.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 50)
    private ChronicConditionType conditionType;

    /**
     * Custom condition name if type is OTHER.
     * Only used when conditionType = OTHER.
     */
    @Column(name = "custom_condition_name", length = 200)
    private String customConditionName;

    /**
     * ICD-10 code for the specific diagnosis.
     * Can be more specific than the enum's default ICD-10.
     */
    @Column(name = "icd10_code", length = 20)
    private String icd10Code;

    /**
     * Date when the condition was first diagnosed.
     * Used for calculating waiting periods and history.
     */
    @Column(name = "diagnosis_date")
    private LocalDate diagnosisDate;

    /**
     * Date when the condition was reported/disclosed to insurance.
     * May differ from diagnosis date.
     */
    @Column(name = "disclosure_date")
    private LocalDate disclosureDate;

    /**
     * Severity level (1-5, where 5 is most severe).
     * Used for risk assessment and premium calculations.
     */
    @Column(name = "severity_level")
    @Builder.Default
    private Integer severityLevel = 3;

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE INFORMATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Current coverage status for this condition.
     * Determines how claims are processed.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "coverage_status", nullable = false, length = 30)
    @Builder.Default
    private ChronicCoverageStatus coverageStatus = ChronicCoverageStatus.PENDING_REVIEW;

    /**
     * Waiting period in days before coverage begins.
     * 0 = No waiting period (immediate coverage)
     */
    @Column(name = "waiting_period_days")
    @Builder.Default
    private Integer waitingPeriodDays = 0;

    /**
     * Date when waiting period ends and coverage begins.
     * Calculated from enrollment date + waiting period days.
     */
    @Column(name = "waiting_period_end_date")
    private LocalDate waitingPeriodEndDate;

    /**
     * Coverage percentage for this specific condition.
     * Can override policy default (e.g., 50% instead of 80%).
     * NULL = use policy default.
     */
    @Column(name = "coverage_percentage", precision = 5, scale = 2)
    private BigDecimal coveragePercentage;

    /**
     * Annual limit specific to this condition.
     * NULL = use policy annual limit.
     */
    @Column(name = "annual_limit", precision = 15, scale = 2)
    private BigDecimal annualLimit;

    /**
     * Amount used from the annual limit this year.
     * Reset annually.
     */
    @Column(name = "used_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal usedAmount = BigDecimal.ZERO;

    /**
     * Reason for current coverage status.
     * Required when status is EXCLUDED or PARTIAL.
     */
    @Column(name = "coverage_reason", length = 500)
    private String coverageReason;

    // ═══════════════════════════════════════════════════════════════════════════
    // DOCUMENTATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Path to medical report/documentation file.
     * Required for verification.
     */
    @Column(name = "documentation_path", length = 500)
    private String documentationPath;

    /**
     * Name of the treating physician who diagnosed the condition.
     */
    @Column(name = "diagnosing_physician", length = 200)
    private String diagnosingPhysician;

    /**
     * Hospital/clinic where diagnosis was made.
     */
    @Column(name = "diagnosing_facility", length = 200)
    private String diagnosingFacility;

    /**
     * Is documentation verified by medical team?
     */
    @Column(name = "documentation_verified")
    @Builder.Default
    private Boolean documentationVerified = false;

    /**
     * Date when documentation was verified.
     */
    @Column(name = "verification_date")
    private LocalDate verificationDate;

    /**
     * Name of person who verified the documentation.
     */
    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    // ═══════════════════════════════════════════════════════════════════════════
    // TREATMENT TRACKING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Current medications for this condition.
     * Comma-separated list or JSON.
     */
    @Column(name = "current_medications", length = 1000)
    private String currentMedications;

    /**
     * Treatment plan summary.
     */
    @Column(name = "treatment_plan", length = 2000)
    private String treatmentPlan;

    /**
     * Date of last medical review for this condition.
     */
    @Column(name = "last_review_date")
    private LocalDate lastReviewDate;

    /**
     * Date when next medical review is due.
     */
    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS & NOTES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Is this condition record active?
     * FALSE = condition resolved or member no longer has it.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Date when condition was marked as resolved (if applicable).
     */
    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    /**
     * Additional notes about the condition.
     */
    @Column(length = 2000)
    private String notes;

    /**
     * Internal notes (not visible to member).
     */
    @Column(name = "internal_notes", length = 2000)
    private String internalNotes;

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════════════════

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    // ═══════════════════════════════════════════════════════════════════════════
    // BUSINESS METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if the waiting period has ended.
     */
    public boolean isWaitingPeriodOver() {
        if (waitingPeriodEndDate == null) {
            return true; // No waiting period
        }
        return LocalDate.now().isAfter(waitingPeriodEndDate) 
            || LocalDate.now().isEqual(waitingPeriodEndDate);
    }

    /**
     * Check if claims can be submitted for this condition.
     */
    public boolean canSubmitClaims() {
        if (!active) return false;
        if (!coverageStatus.allowsClaims()) return false;
        if (coverageStatus == ChronicCoverageStatus.WAITING_PERIOD) {
            return isWaitingPeriodOver();
        }
        return true;
    }

    /**
     * Check if pre-approval is required for this condition.
     */
    public boolean requiresPreApproval() {
        return coverageStatus.requiresPreApproval();
    }

    /**
     * Get remaining annual limit for this condition.
     */
    public BigDecimal getRemainingLimit() {
        if (annualLimit == null) return null;
        return annualLimit.subtract(usedAmount != null ? usedAmount : BigDecimal.ZERO);
    }

    /**
     * Get the display name for the condition.
     */
    public String getDisplayName() {
        if (conditionType == ChronicConditionType.OTHER && customConditionName != null) {
            return customConditionName;
        }
        return conditionType.getNameAr();
    }


    /**
     * Calculate waiting period end date from enrollment date.
     */
    public void calculateWaitingPeriodEndDate(LocalDate enrollmentDate) {
        if (waitingPeriodDays == null || waitingPeriodDays == 0) {
            this.waitingPeriodEndDate = null;
            return;
        }
        LocalDate baseDate = enrollmentDate != null ? enrollmentDate : LocalDate.now();
        this.waitingPeriodEndDate = baseDate.plusDays(waitingPeriodDays);
    }

    /**
     * Update coverage status and handle transitions.
     */
    public void updateCoverageStatus(ChronicCoverageStatus newStatus, String reason) {
        this.coverageStatus = newStatus;
        this.coverageReason = reason;
        
        // Auto-transition from WAITING_PERIOD to COVERED_AFTER_WAITING when period ends
        if (newStatus == ChronicCoverageStatus.WAITING_PERIOD && isWaitingPeriodOver()) {
            this.coverageStatus = ChronicCoverageStatus.COVERED_AFTER_WAITING;
        }
    }

    /**
     * Add amount to used limit.
     */
    public void addToUsedAmount(BigDecimal amount) {
        if (amount == null) return;
        this.usedAmount = (this.usedAmount != null ? this.usedAmount : BigDecimal.ZERO).add(amount);
    }

    /**
     * Reset used amount (called at start of new policy year).
     */
    public void resetUsedAmount() {
        this.usedAmount = BigDecimal.ZERO;
    }
}
