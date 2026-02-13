package com.waad.tba.modules.member.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Enumeration of common chronic conditions/diseases.
 * Used for standardized tracking of member pre-existing conditions.
 * 
 * This enum provides:
 * - Standardized codes for chronic conditions
 * - Arabic and English names
 * - ICD-10 code mapping for international standards
 * - Default waiting period recommendations
 */
@Getter
@RequiredArgsConstructor
public enum ChronicConditionType {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // METABOLIC DISORDERS - أمراض الأيض
    // ═══════════════════════════════════════════════════════════════════════════
    
    DIABETES_TYPE1("DM1", "السكري النوع الأول", "Diabetes Type 1", "E10", 90),
    DIABETES_TYPE2("DM2", "السكري النوع الثاني", "Diabetes Type 2", "E11", 90),
    DIABETES_GESTATIONAL("DMG", "سكري الحمل", "Gestational Diabetes", "O24", 0),
    OBESITY("OBS", "السمنة المفرطة", "Obesity", "E66", 180),
    HYPERTHYROIDISM("HTH", "فرط نشاط الغدة الدرقية", "Hyperthyroidism", "E05", 90),
    HYPOTHYROIDISM("LTH", "قصور الغدة الدرقية", "Hypothyroidism", "E03", 90),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CARDIOVASCULAR DISEASES - أمراض القلب والأوعية الدموية
    // ═══════════════════════════════════════════════════════════════════════════
    
    HYPERTENSION("HTN", "ارتفاع ضغط الدم", "Hypertension", "I10", 90),
    CORONARY_ARTERY_DISEASE("CAD", "مرض الشرايين التاجية", "Coronary Artery Disease", "I25", 365),
    HEART_FAILURE("CHF", "قصور القلب", "Congestive Heart Failure", "I50", 365),
    ARRHYTHMIA("ARR", "اضطراب نظم القلب", "Cardiac Arrhythmia", "I49", 180),
    CARDIOMYOPATHY("CMP", "اعتلال عضلة القلب", "Cardiomyopathy", "I42", 365),
    PERIPHERAL_VASCULAR("PVD", "أمراض الأوعية الدموية الطرفية", "Peripheral Vascular Disease", "I73", 180),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RESPIRATORY DISEASES - أمراض الجهاز التنفسي
    // ═══════════════════════════════════════════════════════════════════════════
    
    ASTHMA("AST", "الربو", "Asthma", "J45", 90),
    COPD("CPD", "الانسداد الرئوي المزمن", "Chronic Obstructive Pulmonary Disease", "J44", 180),
    PULMONARY_FIBROSIS("PFB", "التليف الرئوي", "Pulmonary Fibrosis", "J84", 365),
    SLEEP_APNEA("SLP", "انقطاع النفس أثناء النوم", "Sleep Apnea", "G47.3", 90),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // KIDNEY DISEASES - أمراض الكلى
    // ═══════════════════════════════════════════════════════════════════════════
    
    CHRONIC_KIDNEY_DISEASE("CKD", "مرض الكلى المزمن", "Chronic Kidney Disease", "N18", 365),
    END_STAGE_RENAL("ESR", "الفشل الكلوي النهائي", "End-Stage Renal Disease", "N18.6", 365),
    KIDNEY_STONES("KST", "حصوات الكلى المتكررة", "Recurrent Kidney Stones", "N20", 90),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LIVER DISEASES - أمراض الكبد
    // ═══════════════════════════════════════════════════════════════════════════
    
    HEPATITIS_B("HBV", "التهاب الكبد ب", "Hepatitis B", "B18.1", 180),
    HEPATITIS_C("HCV", "التهاب الكبد ج", "Hepatitis C", "B18.2", 180),
    LIVER_CIRRHOSIS("CIR", "تليف الكبد", "Liver Cirrhosis", "K74", 365),
    FATTY_LIVER("FLD", "الكبد الدهني", "Fatty Liver Disease", "K76.0", 90),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // NEUROLOGICAL DISORDERS - الأمراض العصبية
    // ═══════════════════════════════════════════════════════════════════════════
    
    EPILEPSY("EPL", "الصرع", "Epilepsy", "G40", 180),
    MULTIPLE_SCLEROSIS("MS", "التصلب المتعدد", "Multiple Sclerosis", "G35", 365),
    PARKINSONS("PKD", "مرض باركنسون", "Parkinson's Disease", "G20", 365),
    ALZHEIMERS("ALZ", "مرض الزهايمر", "Alzheimer's Disease", "G30", 365),
    MIGRAINE_CHRONIC("MIG", "الصداع النصفي المزمن", "Chronic Migraine", "G43", 90),
    NEUROPATHY("NRP", "اعتلال الأعصاب", "Neuropathy", "G62", 180),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AUTOIMMUNE DISEASES - أمراض المناعة الذاتية
    // ═══════════════════════════════════════════════════════════════════════════
    
    RHEUMATOID_ARTHRITIS("RA", "الروماتويد", "Rheumatoid Arthritis", "M05", 180),
    LUPUS("SLE", "الذئبة الحمراء", "Systemic Lupus Erythematosus", "M32", 365),
    PSORIASIS("PSR", "الصدفية", "Psoriasis", "L40", 90),
    CROHNS_DISEASE("CRN", "مرض كرون", "Crohn's Disease", "K50", 180),
    ULCERATIVE_COLITIS("UC", "التهاب القولون التقرحي", "Ulcerative Colitis", "K51", 180),
    SJOGRENS("SJG", "متلازمة شوغرن", "Sjögren's Syndrome", "M35.0", 180),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MENTAL HEALTH - الصحة النفسية
    // ═══════════════════════════════════════════════════════════════════════════
    
    DEPRESSION_CHRONIC("DEP", "الاكتئاب المزمن", "Chronic Depression", "F33", 90),
    ANXIETY_DISORDER("ANX", "اضطراب القلق", "Anxiety Disorder", "F41", 90),
    BIPOLAR_DISORDER("BPD", "اضطراب ثنائي القطب", "Bipolar Disorder", "F31", 180),
    SCHIZOPHRENIA("SCH", "الفصام", "Schizophrenia", "F20", 365),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ONCOLOGY - الأورام
    // ═══════════════════════════════════════════════════════════════════════════
    
    CANCER_BREAST("CBR", "سرطان الثدي", "Breast Cancer", "C50", 365),
    CANCER_LUNG("CLN", "سرطان الرئة", "Lung Cancer", "C34", 365),
    CANCER_COLON("CCL", "سرطان القولون", "Colon Cancer", "C18", 365),
    CANCER_PROSTATE("CPR", "سرطان البروستاتا", "Prostate Cancer", "C61", 365),
    CANCER_BLOOD("CBL", "سرطان الدم", "Blood Cancer/Leukemia", "C95", 365),
    CANCER_OTHER("COT", "أنواع أخرى من السرطان", "Other Cancer Types", "C80", 365),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MUSCULOSKELETAL - أمراض العظام والمفاصل
    // ═══════════════════════════════════════════════════════════════════════════
    
    OSTEOARTHRITIS("OA", "خشونة المفاصل", "Osteoarthritis", "M15", 90),
    OSTEOPOROSIS("OSP", "هشاشة العظام", "Osteoporosis", "M81", 90),
    BACK_PAIN_CHRONIC("CBP", "آلام الظهر المزمنة", "Chronic Back Pain", "M54", 90),
    GOUT("GUT", "النقرس", "Gout", "M10", 90),
    FIBROMYALGIA("FBM", "الألم العضلي الليفي", "Fibromyalgia", "M79.7", 90),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BLOOD DISORDERS - أمراض الدم
    // ═══════════════════════════════════════════════════════════════════════════
    
    ANEMIA_CHRONIC("ANM", "فقر الدم المزمن", "Chronic Anemia", "D64", 90),
    SICKLE_CELL("SCD", "فقر الدم المنجلي", "Sickle Cell Disease", "D57", 365),
    THALASSEMIA("THL", "الثلاسيميا", "Thalassemia", "D56", 365),
    HEMOPHILIA("HMP", "الهيموفيليا", "Hemophilia", "D66", 365),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INFECTIOUS DISEASES - الأمراض المعدية المزمنة
    // ═══════════════════════════════════════════════════════════════════════════
    
    HIV_AIDS("HIV", "فيروس نقص المناعة", "HIV/AIDS", "B20", 365),
    TUBERCULOSIS("TB", "السل", "Tuberculosis", "A15", 180),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // OTHER CONDITIONS - حالات أخرى
    // ═══════════════════════════════════════════════════════════════════════════
    
    OTHER("OTH", "حالة مزمنة أخرى", "Other Chronic Condition", "R69", 90);
    
    /**
     * Unique code for the condition (used in database and APIs)
     */
    private final String code;
    
    /**
     * Arabic name for display in UI
     */
    private final String nameAr;
    
    /**
     * English name for display in UI
     */
    private final String nameEn;
    
    /**
     * ICD-10 code for international medical coding standards
     */
    private final String icd10Code;
    
    /**
     * Default waiting period in days before coverage begins.
     * Can be overridden by policy rules.
     */
    private final int defaultWaitingPeriodDays;
    
    /**
     * Find condition by code
     */
    public static ChronicConditionType fromCode(String code) {
        if (code == null) return null;
        for (ChronicConditionType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        return null;
    }
    
    /**
     * Find condition by ICD-10 code
     */
    public static ChronicConditionType fromIcd10(String icd10) {
        if (icd10 == null) return null;
        for (ChronicConditionType type : values()) {
            if (type.icd10Code.equalsIgnoreCase(icd10)) {
                return type;
            }
        }
        return null;
    }
}
