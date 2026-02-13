package com.waad.tba.modules.member.dto;

import com.waad.tba.modules.member.enums.ChronicCoverageStatus;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for updating an existing chronic condition record.
 * Only updatable fields are included.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChronicConditionUpdateDto {

    /**
     * Custom condition name (for OTHER type)
     */
    @Size(max = 200, message = "اسم المرض يجب ألا يتجاوز 200 حرف")
    private String customConditionName;

    /**
     * ICD-10 code
     */
    @Size(max = 20, message = "كود ICD-10 يجب ألا يتجاوز 20 حرف")
    private String icd10Code;

    /**
     * Diagnosis date
     */
    @PastOrPresent(message = "تاريخ التشخيص يجب أن يكون في الماضي أو اليوم")
    private LocalDate diagnosisDate;

    /**
     * Disclosure date
     */
    @PastOrPresent(message = "تاريخ الإفصاح يجب أن يكون في الماضي أو اليوم")
    private LocalDate disclosureDate;

    /**
     * Severity level (1-5)
     */
    @Min(value = 1, message = "مستوى الشدة يجب أن يكون بين 1 و 5")
    @Max(value = 5, message = "مستوى الشدة يجب أن يكون بين 1 و 5")
    private Integer severityLevel;

    /**
     * Coverage status
     */
    private ChronicCoverageStatus coverageStatus;

    /**
     * Waiting period days
     */
    @Min(value = 0, message = "فترة الانتظار لا يمكن أن تكون سالبة")
    private Integer waitingPeriodDays;

    /**
     * Waiting period end date (can be manually set)
     */
    private LocalDate waitingPeriodEndDate;

    /**
     * Coverage percentage
     */
    @DecimalMin(value = "0", message = "نسبة التغطية يجب أن تكون 0 أو أكثر")
    @DecimalMax(value = "100", message = "نسبة التغطية لا يمكن أن تتجاوز 100%")
    private BigDecimal coveragePercentage;

    /**
     * Annual limit
     */
    @DecimalMin(value = "0", message = "الحد السنوي لا يمكن أن يكون سالب")
    private BigDecimal annualLimit;

    /**
     * Coverage reason
     */
    @Size(max = 500, message = "سبب حالة التغطية يجب ألا يتجاوز 500 حرف")
    private String coverageReason;

    /**
     * Documentation path
     */
    @Size(max = 500, message = "مسار الملف يجب ألا يتجاوز 500 حرف")
    private String documentationPath;

    /**
     * Diagnosing physician
     */
    @Size(max = 200, message = "اسم الطبيب يجب ألا يتجاوز 200 حرف")
    private String diagnosingPhysician;

    /**
     * Diagnosing facility
     */
    @Size(max = 200, message = "اسم المنشأة يجب ألا يتجاوز 200 حرف")
    private String diagnosingFacility;

    /**
     * Current medications
     */
    @Size(max = 1000, message = "الأدوية الحالية يجب ألا تتجاوز 1000 حرف")
    private String currentMedications;

    /**
     * Treatment plan
     */
    @Size(max = 2000, message = "خطة العلاج يجب ألا تتجاوز 2000 حرف")
    private String treatmentPlan;

    /**
     * Last review date
     */
    private LocalDate lastReviewDate;

    /**
     * Next review date
     */
    private LocalDate nextReviewDate;

    /**
     * Is condition still active
     */
    private Boolean active;

    /**
     * Date condition resolved
     */
    private LocalDate resolvedDate;

    /**
     * Notes
     */
    @Size(max = 2000, message = "الملاحظات يجب ألا تتجاوز 2000 حرف")
    private String notes;

    /**
     * Internal notes
     */
    @Size(max = 2000, message = "الملاحظات الداخلية يجب ألا تتجاوز 2000 حرف")
    private String internalNotes;
}
