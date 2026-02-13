package com.waad.tba.modules.benefitpolicy.entity;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.modules.benefitpolicy.enums.DistributionType;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Benefit Policy Entity - represents a medical benefits document.
 * 
 * Similar to Odoo Benefit Policy concept.
 * Each employer can have multiple benefit policies, but only ONE active per period.
 * 
 * Business Rules:
 * - startDate must be before endDate
 * - annualLimit must be >= 0
 * - Only one ACTIVE policy per employer at any given date
 */
@Entity
@Table(name = "benefit_policies", indexes = {
    @Index(name = "idx_benefit_policy_employer", columnList = "employer_org_id"),
    @Index(name = "idx_benefit_policy_status", columnList = "status"),
    @Index(name = "idx_benefit_policy_dates", columnList = "start_date, end_date")
})
@Data
@lombok.experimental.SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(callSuper = true)
@org.hibernate.annotations.SQLDelete(sql = "UPDATE benefit_policies SET deleted = true, deleted_at = NOW() WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("deleted = false")
public class BenefitPolicy extends com.waad.tba.common.entity.SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Policy name/title (e.g., "Gold Plan 2025", "Standard Medical Coverage")
     */
    @NotBlank(message = "Policy name is required")
    @Size(max = 255, message = "Policy name must not exceed 255 characters")
    @Column(nullable = false)
    private String name;

    /**
     * Optional policy code/number for reference
     */
    @Size(max = 50, message = "Policy code must not exceed 50 characters")
    @Column(length = 50)
    private String policyCode;

    /**
     * Description of the benefit policy
     */
    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    @Column(length = 2000)
    private String description;

    /**
     * The employer organization this policy belongs to
     */
    @NotNull(message = "Employer organization is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_org_id", nullable = false)
    private Organization employerOrganization;

    /**
     * Optional: Insurance organization providing this policy
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insurance_org_id")
    private Organization insuranceOrganization;

    /**
     * Policy effective start date
     */
    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /**
     * Policy effective end date
     */
    @NotNull(message = "End date is required")
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /**
     * Annual limit for the policy (total benefits allowed per year)
     */
    @NotNull(message = "Annual limit is required")
    @DecimalMin(value = "0.00", message = "Annual limit must be >= 0")
    @Column(name = "annual_limit", nullable = false, precision = 15, scale = 2)
    private BigDecimal annualLimit;

    @Transient
    private java.math.BigDecimal usedAmount;

    @Transient
    private Double usagePercentage;

    public java.math.BigDecimal getUsedAmount() {
        return usedAmount;
    }

    public void setUsedAmount(java.math.BigDecimal usedAmount) {
        this.usedAmount = usedAmount;
    }

    public Double getUsagePercentage() {
        return usagePercentage;
    }

    public void setUsagePercentage(Double usagePercentage) {
        this.usagePercentage = usagePercentage;
    }

    /**
     * Coverage Percentage (default for all services unless overridden by a rule)
     * e.g. 80 means 80% covered by insurance
     */
    @NotNull(message = "Default coverage percent is required")
    @Min(value = 0, message = "Coverage percent must be >= 0")
    @Max(value = 100, message = "Coverage percent must be <= 100")
    @Column(name = "default_coverage_percent", nullable = false)
    @Builder.Default
    private Integer defaultCoveragePercent = 80;

    /**
     * Per-member annual limit (optional, if different from policy limit)
     */
    @DecimalMin(value = "0.00", message = "Per-member limit must be >= 0")
    @Column(name = "per_member_limit", precision = 15, scale = 2)
    private BigDecimal perMemberLimit;

    /**
     * Per-family annual limit (optional)
     */
    @DecimalMin(value = "0.00", message = "Per-family limit must be >= 0")
    @Column(name = "per_family_limit", precision = 15, scale = 2)
    private BigDecimal perFamilyLimit;

    /**
     * Default waiting period in days (policy-level default).
     * Individual BenefitPolicyRule can override this per service/category.
     * If null or 0, no waiting period applies.
     */
    @Min(value = 0, message = "Default waiting period must be >= 0")
    @Column(name = "default_waiting_period_days")
    @Builder.Default
    private Integer defaultWaitingPeriodDays = 0;

    /**
     * Policy status
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BenefitPolicyStatus status = BenefitPolicyStatus.DRAFT;

    /**
     * Number of covered members (calculated or manual)
     */
    @Column(name = "covered_members_count")
    @Builder.Default
    private Integer coveredMembersCount = 0;

    /**
     * Notes/remarks about the policy
     */
    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    @Column(length = 1000)
    private String notes;

    /**
     * Distribution logic (UNIFIED / DISTRIBUTED)
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "distribution_type", nullable = false, length = 20)
    @Builder.Default
    private DistributionType distributionType = DistributionType.UNIFIED;


    // ═══════════════════════════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Coverage rules defined under this policy.
     * Each rule specifies coverage for a category or specific service.
     */
    @OneToMany(mappedBy = "benefitPolicy", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<BenefitPolicyRule> rules = new ArrayList<>();

    /**
     * Explicit distributions for this policy
     */
    @OneToMany(mappedBy = "benefitPolicy", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<CoverageDistribution> distributions = new ArrayList<>();

    // ═══════════════════════════════════════════════════════════════════════════
    // BUSINESS METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if the policy is currently effective (active and within date range)
     */
    public boolean isEffective() {
        if (status != BenefitPolicyStatus.ACTIVE) {
            return false;
        }
        LocalDate today = LocalDate.now();
        return !today.isBefore(startDate) && !today.isAfter(endDate);
    }

    /**
     * Check if the policy is effective on a specific date
     */
    public boolean isEffectiveOn(LocalDate date) {
        if (status != BenefitPolicyStatus.ACTIVE) {
            return false;
        }
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    /**
     * Check if the policy period overlaps with another date range
     */
    public boolean overlaps(LocalDate otherStart, LocalDate otherEnd) {
        return !endDate.isBefore(otherStart) && !startDate.isAfter(otherEnd);
    }

    /**
     * Activate the policy
     */
    public void activate() {
        this.status = BenefitPolicyStatus.ACTIVE;
    }

    /**
     * Deactivate the policy (set to EXPIRED or SUSPENDED)
     */
    public void deactivate() {
        this.status = BenefitPolicyStatus.EXPIRED;
    }

    /**
     * Suspend the policy temporarily
     */
    public void suspend() {
        this.status = BenefitPolicyStatus.SUSPENDED;
    }

    /**
     * Add a rule to this policy
     */
    public void addRule(BenefitPolicyRule rule) {
        rules.add(rule);
        rule.setBenefitPolicy(this);
    }

    /**
     * Remove a rule from this policy
     */
    public void removeRule(BenefitPolicyRule rule) {
        rules.remove(rule);
        rule.setBenefitPolicy(null);
    }

    public void addDistribution(CoverageDistribution distribution) {
        distributions.add(distribution);
        distribution.setBenefitPolicy(this);
    }

    public void removeDistribution(CoverageDistribution distribution) {
        distributions.remove(distribution);
        distribution.setBenefitPolicy(null);
    }

    /**
     * Get active rules only
     */
    public List<BenefitPolicyRule> getActiveRules() {
        return rules.stream()
                .filter(BenefitPolicyRule::isActive)
                .toList();
    }

    /**
     * Get count of active rules
     */
    public int getActiveRulesCount() {
        return (int) rules.stream()
                .filter(BenefitPolicyRule::isActive)
                .count();
    }

    /**
     * Get count of all rules
     */
    public int getRulesCount() {
        return rules.size();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════

    public enum BenefitPolicyStatus {
        /** Policy is being drafted, not yet active */
        DRAFT,
        /** Policy is currently active and effective */
        ACTIVE,
        /** Policy has expired (past end date) */
        EXPIRED,
        /** Policy is temporarily suspended */
        SUSPENDED,
        /** Policy has been terminated early */
        TERMINATED,
        /** Policy has been cancelled */
        CANCELLED,
        /** Policy is inactive (auto-deactivated or manually set) */
        INACTIVE,
        /** Policy is archived (Read-Only) */
        ARCHIVED
    }
}
