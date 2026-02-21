package com.waad.tba.security;

/**
 * Complete enumeration of all system permissions.
 * These are used to control access at the granular level.
 * Roles are assigned a set of these permissions.
 * 
 * Permission Naming Convention: {VERB}_{RESOURCE}
 * Verb: VIEW, CREATE, UPDATE, DELETE, PRINT, EXPORT, APPROVE, REJECT
 * Resource: MEMBERS, CLAIMS, etc.
 * 
 * @author TBA WAAD System
 * @version 3.0 (Granular Permissions)
 */
public enum AppPermission {
    
    // ============================================
    // RBAC Management
    // ============================================
    RBAC_MANAGE("إدارة الأدوار والصلاحيات", "Full system control"), // Keep for Super Admin protection
    
    // Users
    USER_VIEW("عرض المستخدمين", "View system users list"),
    USER_CREATE("إضافة مستخدم", "Create new system user"),
    USER_UPDATE("تعديل مستخدم", "Update existing user"),
    USER_DELETE("حذف مستخدم", "Delete system user"),
    USER_PRINT("طباعة المستخدمين", "Print users list"),
    USER_EXPORT("تصدير المستخدمين", "Export users data"),
    USER_MANAGE("إدارة المستخدمين", "Legacy: Full user management"),

    // Roles
    ROLE_VIEW("عرض الأدوار", "View system roles"),
    ROLE_CREATE("إضافة دور", "Create new role"),
    ROLE_UPDATE("تعديل دور", "Update existing role"),
    ROLE_DELETE("حذف دور", "Delete role"),
    ROLE_PRINT("طباعة الأدوار", "Print roles list"),
    ROLE_EXPORT("تصدير الأدوار", "Export roles data"),
    ROLE_ASSIGN("تعيين الأدوار", "Assign roles to users"),
    PERMISSION_ASSIGN("تعيين الصلاحيات", "Assign permissions to roles"),
    ROLE_MANAGE("إدارة الأدوار", "Legacy: Full role management"),

    // Permissions
    PERMISSION_VIEW("عرض الصلاحيات", "View available permissions"),
    PERMISSION_PRINT("طباعة الصلاحيات", "Print permissions list"),
    PERMISSION_EXPORT("تصدير الصلاحيات", "Export permissions data"),
    PERMISSION_MANAGE("إدارة الصلاحيات", "Legacy: Manage permissions"),

    // ============================================
    // System Administration
    // ============================================
    SYSTEM_SETTINGS_MANAGE("إدارة إعدادات النظام", "Configure system-wide settings"),
    ELIGIBILITY_CHECK("التحقق من الأهلية", "Verify member insurance coverage"),
    
    // ============================================
    // Company Management (TBA Owner)
    // ============================================
    COMPANY_VIEW("عرض الشركات", "View company information"),
    COMPANY_CREATE("إضافة شركة", "Create new company"),
    COMPANY_UPDATE("تعديل شركة", "Update existing company"),
    COMPANY_DELETE("حذف شركة", "Delete company"),
    COMPANY_PRINT("طباعة الشركات", "Print companies list"),
    COMPANY_EXPORT("تصدير الشركات", "Export companies data"),
    COMPANY_MANAGE("إدارة الشركات", "Legacy: Full company management"),
    
    // ============================================
    // Insurance Company Management
    // ============================================
    INSURANCE_VIEW("عرض شركات التأمين", "View insurance company information"),
    INSURANCE_CREATE("إضافة شركة تأمين", "Create new insurance company"),
    INSURANCE_UPDATE("تعديل شركة تأمين", "Update existing insurance company"),
    INSURANCE_DELETE("حذف شركة تأمين", "Delete insurance company"),
    INSURANCE_PRINT("طباعة شركات التأمين", "Print insurance companies list"),
    INSURANCE_EXPORT("تصدير شركات التأمين", "Export insurance companies data"),
    INSURANCE_MANAGE("إدارة شركات التأمين", "Legacy: Full insurance management"),
    
    // ============================================
    // Reviewer Company Management
    // ============================================
    REVIEWER_VIEW("عرض شركات المراجعة", "View reviewer company information"),
    REVIEWER_CREATE("إضافة شركة مراجعة", "Create new reviewer company"),
    REVIEWER_UPDATE("تعديل شركة مراجعة", "Update existing reviewer company"),
    REVIEWER_DELETE("حذف شركة مراجعة", "Delete reviewer company"),
    REVIEWER_PRINT("طباعة شركات المراجعة", "Print reviewer companies list"),
    REVIEWER_EXPORT("تصدير شركات المراجعة", "Export reviewer companies data"),
    REVIEWER_MANAGE("إدارة شركات المراجعة الطبية", "Legacy: Full reviewer management"),
    
    // ============================================
    // Provider Management
    // ============================================
    PROVIDER_VIEW("عرض مقدمي الخدمة", "View provider information"),
    PROVIDER_CREATE("إضافة مقدم خدمة", "Create new provider"),
    PROVIDER_UPDATE("تعديل مقدم خدمة", "Update existing provider"),
    PROVIDER_DELETE("حذف مقدم خدمة", "Delete provider"),
    PROVIDER_PRINT("طباعة مقدمي الخدمة", "Print providers list"),
    PROVIDER_EXPORT("تصدير مقدمي الخدمة", "Export providers data"),
    PROVIDER_MANAGE("إدارة مقدمي الخدمة", "Legacy: Full provider management"),
    PROVIDER_PORTAL_VIEW("عرض بوابة الخدمة", "View provider portal features"),
        
    // ============================================
    // Provider Contracts Management
    // ============================================
    PROVIDER_CONTRACT_VIEW("عرض عقود مقدمي الخدمة", "View provider contracts"),
    PROVIDER_CONTRACT_CREATE("إضافة عقد", "Create new contract"),
    PROVIDER_CONTRACT_UPDATE("تعديل عقد", "Update existing contract"),
    PROVIDER_CONTRACT_DELETE("حذف عقد", "Delete contract"),
    PROVIDER_CONTRACT_PRINT("طباعة العقود", "Print contracts list"),
    PROVIDER_CONTRACT_EXPORT("تصدير العقود", "Export contracts data"),
    PROVIDER_CONTRACT_MANAGE("إدارة عقود مقدمي الخدمة", "Legacy: Full contract management"),
    
    // ============================================
    // Employer Management
    // ============================================
    EMPLOYER_VIEW("عرض أصحاب العمل", "View employer information"),
    EMPLOYER_CREATE("إضافة صاحب عمل", "Create new employer"),
    EMPLOYER_EDIT("تعديل صاحب عمل", "Update existing employer"),
    EMPLOYER_DELETE("حذف صاحب عمل", "Delete employer"),
    EMPLOYER_EXPORT("تصدير أصحاب العمل", "Export employers data"),
    // MANAGE_EMPLOYERS("إدارة أصحاب العمل", "Legacy: Full employer management"), // DEPRECATED
    
    // ============================================
    // Member Management
    // ============================================
    MEMBER_VIEW("عرض الأعضاء", "View member information"),
    MEMBER_CREATE("إضافة عضو", "Create new member"),
    MEMBER_EDIT("تعديل عضو", "Update existing member"),
    MEMBER_PORTAL_EDIT("تعديل الأعضاء (البوابة)", "Allow employer to edit members via portal"),
    MEMBER_DELETE("حذف عضو", "Delete member"),
    MEMBER_PRINT("طباعة الأعضاء", "Print member information"),
    MEMBER_EXPORT("تصدير الأعضاء", "Export members data"),
    MEMBER_IMPORT("استيراد الأعضاء", "Import members from Excel"),
    MEMBER_PORTAL_VIEW("عرض الأعضاء (البوابة)", "Allow employer to view members via portal"),
    MEMBER_PORTAL_DOWNLOAD_ATTACHMENTS("تحميل المرفقات (البوابة)", "Allow employer to download attachments via portal"),
    // MANAGE_MEMBERS("إدارة الأعضاء", "Legacy: Full member management"), // DEPRECATED
    
    // ============================================
    // Settlement Management
    // ============================================
    SETTLEMENT_VIEW("عرض التسويات", "View settlement batches"),
    SETTLEMENT_CREATE("إنشاء دفعة تسوية", "Create new settlement batch"),
    SETTLEMENT_UPDATE("تعديل دفعة تسوية", "Update settlement batch"),
    SETTLEMENT_DELETE("حذف/إلغاء دفعة تسوية", "Cancel/Delete settlement batch"),
    SETTLEMENT_PRINT("طباعة التسويات", "Print settlements list"),
    SETTLEMENT_EXPORT("تصدير التسويات", "Export settlements data"),
    
    SETTLEMENT_BATCH_CONFIRM("تأكيد دفعة تسوية", "Confirm settlement batches"),
    SETTLEMENT_BATCH_PAY("دفع دفعة تسوية", "Mark settlement as paid"),
    SETTLEMENT_BATCH_CANCEL("إلغاء دفعة تسوية", "Cancel settlement"),
    SETTLEMENT_BATCH_CREATE("إنشاء دفعة (قديم)", "Legacy create"),
    SETTLEMENT_MANAGE("إدارة التسويات", "Legacy: Full settlement management"),

    // ============================================
    // Claims Management
    // ============================================
    CLAIM_VIEW("عرض المطالبات", "View claim information"),
    CLAIM_CREATE("إنشاء مطالبة", "Submit new claim"),
    CLAIM_UPDATE("تعديل مطالبة", "Update existing claim"),
    CLAIM_DELETE("حذف مطالبة", "Delete claim"),
    CLAIM_PRINT("طباعة المطالبات", "Print claims list"),
    CLAIM_EXPORT("تصدير المطالبات", "Export claims data"),
    
    CLAIM_APPROVE("الموافقة على المطالبات", "Approve claims"),
    CLAIM_REJECT("رفض المطالبات", "Reject claims"),
    CLAIM_STATUS_VIEW("عرض حالة المطالبة", "View claim status"),
    CLAIM_PORTAL_VIEW("عرض المطالبات (البوابة)", "Allow employer to view claims via portal"),
    CLAIM_MANAGE("إدارة المطالبات", "Legacy: Full claim management"),
    
    // ============================================
    // Visit Management
    // ============================================
    VISIT_VIEW("عرض الزيارات", "View visit information"),
    VISIT_CREATE("إضافة زيارة", "Register new visit"),
    VISIT_UPDATE("تعديل زيارة", "Update existing visit"),
    VISIT_DELETE("حذف زيارة", "Delete visit"),
    VISIT_PRINT("طباعة الزيارات", "Print visits list"),
    VISIT_EXPORT("تصدير الزيارات", "Export visits data"),
    VISIT_PORTAL_VIEW("عرض الزيارات (البوابة)", "Allow employer to view visits via portal"),
    VISIT_MANAGE("إدارة الزيارات", "Legacy: Full visit management"),
    
    // ============================================
    // Pre-Authorization Management
    // ============================================
    PREAUTH_VIEW("عرض الموافقات المسبقة", "View pre-authorizations"),
    PREAUTH_CREATE("إنشاء موافقة مسبقة", "Create pre-authorization"),
    PREAUTH_UPDATE("تعديل موافقة مسبقة", "Update pre-authorization"),
    PREAUTH_DELETE("حذف موافقة مسبقة", "Delete pre-authorization"),
    PREAUTH_PRINT("طباعة الموافقات", "Print pre-authorizations list"),
    PREAUTH_EXPORT("تصدير الموافقات", "Export pre-authorizations data"),
    
    // Specific actions
    PREAUTH_APPROVE("الموافقة على طلب مسبق", "Approve pre-auth"),
    PREAUTH_REJECT("رفض طلب مسبق", "Reject pre-auth"),
    PREAUTH_CANCEL("إلغاء طلب مسبق", "Cancel pre-auth"),
    
    // Compatible aliases
    PRE_AUTH_VIEW("عرض طلبات (قديم)", "Legacy view"),
    PRE_AUTH_CREATE("إنشاء طلب (قديم)", "Legacy create"),
    PRE_AUTH_UPDATE("تحديث طلب (قديم)", "Legacy update"),
    PRE_AUTH_DELETE("حذف طلب (قديم)", "Legacy delete"),
    PREAUTH_MANAGE("إدارة الموافقات المسبقة", "Legacy: Full management"),
    
    // ============================================
    // Medical Packages Management
    // ============================================
    MEDICAL_PACKAGE_VIEW("عرض الحزم الطبية", "View medical packages"),
    MEDICAL_PACKAGE_CREATE("إضافة حزمة طبية", "Create new package"),
    MEDICAL_PACKAGE_UPDATE("تعديل حزمة طبية", "Update existing package"),
    MEDICAL_PACKAGE_DELETE("حذف حزمة طبية", "Delete package"),
    MEDICAL_PACKAGE_PRINT("طباعة الحزم", "Print packages list"),
    MEDICAL_PACKAGE_EXPORT("تصدير الحزم", "Export packages data"),
    MEDICAL_PACKAGE_MANAGE("إدارة الحزم الطبية", "Legacy: Full management"),

    // ============================================
    // Benefit Policies Management
    // ============================================
    BENEFIT_POLICY_VIEW("عرض وثائق التأمين", "View benefit policies"),
    BENEFIT_POLICY_CREATE("إضافة وثيقة", "Create new policy"),
    BENEFIT_POLICY_UPDATE("تعديل وثيقة", "Update existing policy"),
    BENEFIT_POLICY_DELETE("حذف وثيقة", "Delete policy"),
    BENEFIT_POLICY_PRINT("طباعة الوثائق", "Print policies list"),
    BENEFIT_POLICY_EXPORT("تصدير الوثائق", "Export policies data"),
    BENEFIT_POLICY_PORTAL_VIEW("عرض الوثائق (البوابة)", "Allow employer to view benefit policies via portal"),
    BENEFIT_POLICY_MANAGE("إدارة وثائق التأمين", "Legacy: Full management"),

    // ============================================
    // Medical Services
    // ============================================
    MEDICAL_SERVICE_VIEW("عرض الخدمات الطبية", "View medical services"),
    MEDICAL_SERVICE_CREATE("إضافة خدمة طبية", "Create new service"),
    MEDICAL_SERVICE_UPDATE("تعديل خدمة طبية", "Update existing service"),
    MEDICAL_SERVICE_DELETE("حذف خدمة طبية", "Delete service"),
    MEDICAL_SERVICE_PRINT("طباعة الخدمات", "Print services list"),
    MEDICAL_SERVICE_EXPORT("تصدير الخدمات", "Export services data"),
    MANAGE_TAXONOMY("إدارة التصنيف الطبي", "Manage medical taxonomy and catalog mapping"),

    // ============================================
    // Reports and Analytics
    // ============================================
    REPORT_VIEW("عرض التقارير", "View system reports"),
    REPORT_CREATE("إنشاء تقرير", "Create custom report"),
    REPORT_PRINT("طباعة التقارير", "Print reports"),
    REPORT_EXPORT("تصدير التقارير", "Export reports"),
    REPORT_MANAGE("إدارة التقارير", "Legacy: Full report management"),
    DASHBOARD_VIEW("عرض لوحة التحكم", "View dashboard statistics"),
    
    // ============================================
    // Basic Data
    // ============================================
    BASIC_DATA_VIEW("عرض البيانات الأساسية", "View basic system information (read-only access)");

    // ============================================
    // Enum Properties
    // ============================================
    
    private final String displayNameAr;
    private final String description;

    AppPermission(String displayNameAr, String description) {
        this.displayNameAr = displayNameAr;
        this.description = description;
    }

    /**
     * Get the permission name (enum name itself).
     * This is used in @PreAuthorize annotations.
     */
    public String getPermissionName() {
        return this.name();
    }

    /**
     * Get the Arabic display name for UI.
     */
    public String getDisplayNameAr() {
        return displayNameAr;
    }

    /**
     * Get the English description.
     */
    public String getDescription() {
        return description;
    }

    /**
     * Get the module name based on permission pattern.
     * Matches keys in frontend MODULE_NAMES_AR.
     */
    public String getModule() {
        String n = this.name();
        
        if (n.contains("USER")) return "USER";
        if (n.contains("ROLE") || n.contains("RBAC") || n.contains("PERMISSION")) return "SYSTEM"; // Roles are part of System/RBAC
        if (n.contains("SYSTEM") || n.contains("BASIC_DATA")) return "SYSTEM";
        
        if (n.contains("CLAIM")) return "CLAIM";
        if (n.contains("SETTLEMENT")) return "SETTLEMENT";
        
        if (n.contains("PROVIDER") || n.contains("CONTRACT")) return "PROVIDER";
        
        if (n.contains("MEMBER") || n.contains("VISIT") || n.contains("PREAUTH") || n.contains("PRE_AUTH") || n.contains("ELIGIBILITY")) return "MEMBER";
        
        if (n.contains("REPORT") || n.contains("DASHBOARD")) return "REPORT";
        
        if (n.contains("BENEFIT") || n.contains("INSURANCE")) return "INSURANCE";
        if (n.contains("REVIEWER")) return "REVIEWER";
        if (n.contains("EMPLOYER")) return "EMPLOYER";
        if (n.contains("COMPANY")) return "COMPANY";
        
        return "OTHER";
    }

    @Override
    public String toString() {
        return getPermissionName();
    }

    /**
     * Get all permission names as a String array
     */
    public static String[] getAllPermissionNames() {
        AppPermission[] values = values();
        String[] names = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            names[i] = values[i].name();
        }
        return names;
    }
}
