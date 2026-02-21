package com.waad.tba.modules.medicaltaxonomy.entity;

import com.waad.tba.modules.medicaltaxonomy.enums.MedicalServiceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Medical Service Entity (Reference Data)
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL RULES (NON-NEGOTIABLE)
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. CATEGORY IS MANDATORY FOR ACTIVE SERVICES
 *    - Draft services can exist without category (Name-Only Import Safe Mode)
 *    - Active services MUST have a category
 * 
 * 2. BASE PRICE IS REFERENCE ONLY
 *    - basePrice is for estimation and reporting
 *    - Actual price comes from ProviderContract.contractPrice
 *    - NEVER use basePrice for claim calculation
 * 
 * 3. PA REQUIREMENT COMES FROM POLICY
 *    - requiresPA field is DEPRECATED
 *    - Actual PA requirement is determined by BenefitPolicyRule
 *    - This field remains for backward compatibility only
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Scope: Pure reference data (NO coverage, claim, provider, or network logic)
 * 
 * Examples:
 * - SRV-CARDIO-001: "Comprehensive Cardiac Exam"
 * - SRV-LAB-CBC: "Complete Blood Count"
 * - SRV-IMAGING-XRAY: "Chest X-Ray"
 */
@Entity
@Table(name = "medical_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@lombok.experimental.SuperBuilder
@org.hibernate.annotations.SQLDelete(sql = "UPDATE medical_services SET active = false WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("active = true")
public class MedicalService extends com.waad.tba.common.entity.SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * كود الخدمة الموحد (Unique business identifier)
     * Examples: "SRV-LAB-CBC", "SRV-CONS-001"
     */
    @Column(nullable = false, unique = true, length = 255)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MedicalServiceStatus status = MedicalServiceStatus.ACTIVE;

    /**
     * اسم الخدمة بالعربي
     */
    @Column(name = "name_ar", nullable = false, length = 200)
    private String name;

    /**
     * اسم الخدمة بالإنجليزي
     */
    @Column(name = "name_en", length = 200)
    private String nameEn;

    /**
     * رابط التصنيف الطبي
     * ARCHITECTURAL RULE: إلزامي للخدمات لتحديد قواعد التغطية
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    private MedicalCategory category;

    @Column(name = "category_id")
    private Long categoryId;

    /**
     * قائمة التصنيفات المرتبطة بالخدمة (دعم تعدد التصنيفات والربط المتعدد)
     * REFACTORED 2026-02-18
     */
    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ServiceCategoryMapping> categoryMappings = new ArrayList<>();

    /**
     * التصنيف (نصي - للتوافق مع الأنظمة القديمة)
     */
    @Column(name = "category", length = 255)
    private String categoryName;

    /**
     * التصنيف الفرعي (نصي)
     */
    @Column(name = "sub_category", length = 255)
    private String subCategory;

    /**
     * التخصص (نصي)
     */
    @Column(name = "specialty", length = 255)
    private String specialty;

    /**
     * هل هذه الخدمة هي الخدمة الرئيسية (Master)
     */
    @Column(name = "is_master", nullable = false)
    @Builder.Default
    private Boolean isMaster = true;

    /**
     * وصف الخدمة (اختياري)
     */
    @Column(name = "description", length = 500)
    private String description;

    /**
     * السعر الأساسي الاسترشادي (Reference only)
     * ARCHITECTURAL RULE: This is for estimation and reporting only.
     * Actual price MUST come from ProviderContract.
     */
    @Column(name = "base_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal basePrice = BigDecimal.ZERO;

    @Override
    protected void onCreate() {
        validateArchitecturalRules();
        super.onCreate();
    }

    @Override
    protected void onUpdate() {
        validateArchitecturalRules();
        super.onUpdate();
    }

    /**
     * التحقق من القواعد المعمارية (Non-negotiable)
     */
    private void validateArchitecturalRules() {
        // القاعدة: التصنيف إلزامي للخدمات النشطة لضمان عمل محرك التغطية
        // تم التحديث لدعم التحقق من القائمة الجديدة أيضاً
        boolean hasCategory = categoryId != null || categoryName != null || 
                             (categoryMappings != null && !categoryMappings.isEmpty());
                             
        if ((status == MedicalServiceStatus.ACTIVE || active) && !hasCategory) {
            throw com.waad.tba.common.exception.ArchitecturalViolationException.serviceWithoutCategory(code);
        }
        
        // إذا كانت الخدمة مسودة (DRAFT)، يتم تعطيل نشاطها تلقائياً
        if (status == MedicalServiceStatus.DRAFT) {
            this.active = false;
        }
    }

    /**
     * Compatibility helper to support isActive() name from old code
     */
    public boolean isActive() {
        return active;
    }
}

