package com.waad.tba.modules.benefitpolicy.entity;

import com.waad.tba.modules.benefitpolicy.enums.DistributionType;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
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
 * CoverageDistribution Entity (REFACTORED 2026-02-15 - UNIFIED DICTIONARY)
 */
@Entity
@Table(name = "coverage_distributions", indexes = {
    @Index(name = "idx_dist_policy", columnList = "benefit_policy_id"),
    @Index(name = "idx_dist_category", columnList = "medical_category"),
    @Index(name = "idx_dist_service", columnList = "medical_service_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CoverageDistribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benefit_policy_id", nullable = false)
    private BenefitPolicy benefitPolicy;

    /**
     * Target Category for the limit. 
     */
    @Column(name = "medical_category", length = 100)
    private String medicalCategory;

    /**
     * Target Enterprise Medical Service (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_service_id")
    private EnterpriseMedicalService medicalService;

    /**
     * The limit amount allocated for this specific target.
     */
    @NotNull
    @DecimalMin(value = "0.00")
    @Column(name = "limit_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal limitAmount;

    @Builder.Default
    private boolean active = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
