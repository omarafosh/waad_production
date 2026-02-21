package com.waad.tba.modules.benefitpolicy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing a reusable group of coverage rules (a template or
 * package).
 * These templates can be applied to a BenefitPolicy to quickly set up rules.
 */
@Entity
@Table(name = "benefit_rule_templates")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenefitRuleTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "is_system")
    private boolean isSystem = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BenefitRuleTemplateItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Helper method to add an item to the template
     */
    public void addItem(BenefitRuleTemplateItem item) {
        items.add(item);
        item.setTemplate(this);
    }
}
