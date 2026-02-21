package com.waad.tba.modules.benefitpolicy.entity;

import com.waad.tba.modules.visit.entity.VisitType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Entity representing an individual rule within a BenefitRuleTemplate.
 */
@Entity
@Table(name = "benefit_rule_template_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitRuleTemplateItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private BenefitRuleTemplate template;

    @Enumerated(EnumType.STRING)
    @Column(name = "encounter_type", nullable = false, length = 30)
    private VisitType encounterType;

    @Column(name = "medical_category_code", length = 50)
    private String medicalCategoryCode;

    @Column(name = "coverage_percent", precision = 5, scale = 2)
    private BigDecimal coveragePercent;

    @Column(name = "times_limit")
    private Integer timesLimit;

    @Column(name = "waiting_period_days")
    private Integer waitingPeriodDays;

    @Column(name = "requires_pre_approval")
    private boolean requiresPreApproval;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
