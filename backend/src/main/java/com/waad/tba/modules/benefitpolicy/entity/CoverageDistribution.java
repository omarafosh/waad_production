package com.waad.tba.modules.benefitpolicy.entity;

import com.waad.tba.modules.benefitpolicy.enums.DistributionType;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
 * CoverageDistribution Entity - manages distributed limits for a Benefit Policy.
 * 
 * Part of the Professional Coverage Engine.
 * Defines how much money is allocated to specific categories or services.
 */
@Entity
@Table(name = "coverage_distributions", indexes = {
    @Index(name = "idx_dist_policy", columnList = "benefit_policy_id"),
    @Index(name = "idx_dist_category", columnList = "medical_category_id"),
    @Index(name = "idx_dist_service", columnList = "medical_service_id")
})
@Data
@lombok.experimental.SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(callSuper = true)
@EntityListeners(AuditingEntityListener.class)
public class CoverageDistribution extends com.waad.tba.common.entity.SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benefit_policy_id", nullable = false)
    private BenefitPolicy benefitPolicy;

    /**
     * Target Category for the limit. 
     * null if applying to a specific service or unified policy.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_category_id")
    private MedicalCategory medicalCategory;

    /**
     * Target Service for the limit. 
     * null if applying to a category or unified policy.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_service_id")
    private MedicalService medicalService;

    /**
     * The limit amount allocated for this specific target.
     */
    @NotNull
    @DecimalMin(value = "0.00")
    @Column(name = "limit_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal limitAmount;
}
