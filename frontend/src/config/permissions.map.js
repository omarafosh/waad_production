/**
 * 🔑 Permission Mapping - خريطة الصلاحيات التفصيلية
 * 
 * يحتوي هذا الملف على تعريف شامل لجميع الصلاحيات في النظام
 * كل صلاحية لها:
 * - key: المعرف الفريد
 * - label: الاسم العربي
 * - category: التصنيف
 * - description: الوصف التفصيلي
 */

// ==================== Categories ====================

export const PERMISSION_CATEGORIES = {
  VISITS: 'VISITS',
  CLAIMS: 'CLAIMS',
  PREAUTH: 'PREAUTH',
  MEMBERS: 'MEMBERS',
  DOCUMENTS: 'DOCUMENTS',
  REPORTS: 'REPORTS',
  FINANCIAL: 'FINANCIAL',
  ADMIN: 'ADMIN'
};

// ==================== Permissions ====================

export const PERMISSIONS = {
  // ========== Visits Permissions ==========
  VISIT_VIEW: {
    key: 'VISIT_VIEW',
    label: 'عرض الزيارات',
    category: PERMISSION_CATEGORIES.VISITS,
    description: 'السماح بعرض قائمة الزيارات وتفاصيلها'
  },
  VISIT_CREATE: {
    key: 'VISIT_CREATE',
    label: 'إنشاء زيارة',
    category: PERMISSION_CATEGORIES.VISITS,
    description: 'السماح بإنشاء زيارة جديدة'
  },
  VISIT_UPDATE: {
    key: 'VISIT_UPDATE',
    label: 'تحديث الزيارة',
    category: PERMISSION_CATEGORIES.VISITS,
    description: 'السماح بتعديل بيانات الزيارة'
  },
  VISIT_DELETE: {
    key: 'VISIT_DELETE',
    label: 'حذف الزيارة',
    category: PERMISSION_CATEGORIES.VISITS,
    description: 'السماح بحذف الزيارة'
  },

  // ========== Claims Permissions ==========
  CLAIM_VIEW: {
    key: 'CLAIM_VIEW',
    label: 'عرض المطالبات',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح بعرض قائمة المطالبات وتفاصيلها'
  },
  CLAIM_CREATE: {
    key: 'CLAIM_CREATE',
    label: 'إنشاء مطالبة',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح بإنشاء مطالبة جديدة'
  },
  CLAIM_UPDATE: {
    key: 'CLAIM_UPDATE',
    label: 'تحديث المطالبة',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح بتعديل بيانات المطالبة'
  },
  CLAIM_DELETE: {
    key: 'CLAIM_DELETE',
    label: 'حذف المطالبة',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح بحذف المطالبة'
  },
  CLAIM_REVIEW: {
    key: 'CLAIM_REVIEW',
    label: 'مراجعة المطالبة',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح بمراجعة المطالبات طبياً'
  },
  CLAIM_APPROVE: {
    key: 'CLAIM_APPROVE',
    label: 'الموافقة على المطالبة',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح بالموافقة على المطالبة'
  },
  CLAIM_REJECT: {
    key: 'CLAIM_REJECT',
    label: 'رفض المطالبة',
    category: PERMISSION_CATEGORIES.CLAIMS,
    description: 'السماح برفض المطالبة'
  },

  // ========== Pre-Authorization Permissions ==========
  PREAUTH_VIEW: {
    key: 'PREAUTH_VIEW',
    label: 'عرض الموافقات المسبقة',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح بعرض قائمة الموافقات المسبقة'
  },
  PREAUTH_CREATE: {
    key: 'PREAUTH_CREATE',
    label: 'إنشاء موافقة مسبقة',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح بإنشاء طلب موافقة مسبقة'
  },
  PREAUTH_UPDATE: {
    key: 'PREAUTH_UPDATE',
    label: 'تحديث الموافقة المسبقة',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح بتعديل طلب الموافقة المسبقة'
  },
  PREAUTH_DELETE: {
    key: 'PREAUTH_DELETE',
    label: 'حذف الموافقة المسبقة',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح بحذف طلب الموافقة المسبقة'
  },
  PREAUTH_REVIEW: {
    key: 'PREAUTH_REVIEW',
    label: 'مراجعة الموافقة المسبقة',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح بمراجعة طلبات الموافقة المسبقة'
  },
  PREAUTH_APPROVE: {
    key: 'PREAUTH_APPROVE',
    label: 'الموافقة على الطلب',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح بالموافقة على طلب الموافقة المسبقة'
  },
  PREAUTH_REJECT: {
    key: 'PREAUTH_REJECT',
    label: 'رفض الطلب',
    category: PERMISSION_CATEGORIES.PREAUTH,
    description: 'السماح برفض طلب الموافقة المسبقة'
  },

  // ========== Members Permissions ==========
  MEMBER_VIEW: {
    key: 'MEMBER_VIEW',
    label: 'عرض المستفيدين',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'السماح بعرض قائمة المستفيدين وبياناتهم'
  },
  MEMBER_CREATE: {
    key: 'MEMBER_CREATE',
    label: 'إضافة مؤمن عليه',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'السماح بإضافة مؤمن عليه جديد'
  },
  MEMBER_UPDATE: {
    key: 'MEMBER_UPDATE',
    label: 'تحديث بيانات المستفيد',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'السماح بتعديل بيانات المستفيد'
  },
  MEMBER_DELETE: {
    key: 'MEMBER_DELETE',
    label: 'حذف المستفيد',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'السماح بحذف المستفيد'
  },

  // ========== Documents Permissions ==========
  DOCUMENT_VIEW: {
    key: 'DOCUMENT_VIEW',
    label: 'عرض المستندات',
    category: PERMISSION_CATEGORIES.DOCUMENTS,
    description: 'السماح بعرض المستندات المرفقة'
  },
  DOCUMENT_UPLOAD: {
    key: 'DOCUMENT_UPLOAD',
    label: 'رفع مستندات',
    category: PERMISSION_CATEGORIES.DOCUMENTS,
    description: 'السماح برفع مستندات جديدة'
  },
  DOCUMENT_DELETE: {
    key: 'DOCUMENT_DELETE',
    label: 'حذف المستندات',
    category: PERMISSION_CATEGORIES.DOCUMENTS,
    description: 'السماح بحذف المستندات'
  },

  // ========== Reports Permissions ==========
  PROVIDER_REPORTS: {
    key: 'PROVIDER_REPORTS',
    label: 'تقارير مقدم الخدمة',
    category: PERMISSION_CATEGORIES.REPORTS,
    description: 'السماح بعرض تقارير مقدم الخدمة'
  },
  PARTNER_REPORTS: {
    key: 'PARTNER_REPORTS',
    label: 'تقارير الشريك',
    category: PERMISSION_CATEGORIES.REPORTS,
    description: 'السماح بعرض تقارير الشريك'
  },
  MEDICAL_REPORTS: {
    key: 'MEDICAL_REPORTS',
    label: 'التقارير الطبية',
    category: PERMISSION_CATEGORIES.REPORTS,
    description: 'السماح بعرض التقارير الطبية'
  },
  FINANCIAL_REPORTS: {
    key: 'FINANCIAL_REPORTS',
    label: 'التقارير المالية',
    category: PERMISSION_CATEGORIES.FINANCIAL,
    description: 'السماح بعرض التقارير المالية'
  },

  // ========== Financial Permissions ==========
  PROVIDER_SETTLEMENT: {
    key: 'PROVIDER_SETTLEMENT',
    label: 'تسويات مقدم الخدمة',
    category: PERMISSION_CATEGORIES.FINANCIAL,
    description: 'السماح بعرض وإدارة تسويات مقدم الخدمة'
  },
  PARTNER_FINANCIAL_REPORTS: {
    key: 'PARTNER_FINANCIAL_REPORTS',
    label: 'التقارير المالية للشريك',
    category: PERMISSION_CATEGORIES.FINANCIAL,
    description: 'السماح بعرض التقارير المالية للشريك'
  },

  // ========== Admin Permissions ==========
  SYSTEM_SETTINGS: {
    key: 'SYSTEM_SETTINGS',
    label: 'إعدادات النظام',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بالوصول إلى إعدادات النظام'
  },
  USER_VIEW: {
    key: 'USER_VIEW',
    label: 'عرض المستخدمين',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بعرض قائمة المستخدمين'
  },
  USER_CREATE: {
    key: 'USER_CREATE',
    label: 'إنشاء مستخدم',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بإنشاء مستخدمين جدد'
  },
  USER_UPDATE: {
    key: 'USER_UPDATE',
    label: 'تعديل مستخدم',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بتعديل بيانات المستخدمين'
  },
  USER_DELETE: {
    key: 'USER_DELETE',
    label: 'حذف مستخدم',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بحذف المستخدمين'
  },
  ROLE_VIEW: {
    key: 'ROLE_VIEW',
    label: 'عرض الأدوار',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بعرض قائمة الأدوار'
  },
  ROLE_CREATE: {
    key: 'ROLE_CREATE',
    label: 'إنشاء دور',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بإنشاء أدوار جديدة'
  },
  ROLE_UPDATE: {
    key: 'ROLE_UPDATE',
    label: 'تعديل دور',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بتعديل بيانات الأدوار'
  },
  ROLE_DELETE: {
    key: 'ROLE_DELETE',
    label: 'حذف دور',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بحذف الأدوار'
  },
  PERMISSION_VIEW: {
    key: 'PERMISSION_VIEW',
    label: 'عرض الصلاحيات',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بعرض قائمة الصلاحيات'
  },
  PERMISSION_MANAGE: {
    key: 'PERMISSION_MANAGE',
    label: 'إدارة الصلاحيات',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بإنشاء وتعديل وحذف الصلاحيات'
  },
  PERMISSION_ASSIGN: {
    key: 'PERMISSION_ASSIGN',
    label: 'تعيين الصلاحيات للأدوار',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بتعيين الصلاحيات للأدوار'
  },
  ROLE_ASSIGN: {
    key: 'ROLE_ASSIGN',
    label: 'تعيين الأدوار للمستخدمين',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بتعيين الأدوار للمستخدمين'
  },
  COMPANY_MANAGEMENT: {
    key: 'COMPANY_MANAGEMENT',
    label: 'إدارة الشركات',
    category: PERMISSION_CATEGORIES.ADMIN,
    description: 'السماح بإدارة الشركات والشركاء'
  }
};

// ==================== Helper Functions ====================

/**
 * الحصول على جميع الصلاحيات كمصفوفة
 */
export const getAllPermissions = () => {
  return Object.values(PERMISSIONS);
};

/**
 * الحصول على الصلاحيات حسب التصنيف
 */
export const getPermissionsByCategory = (category) => {
  return Object.values(PERMISSIONS).filter(p => p.category === category);
};

/**
 * الحصول على صلاحية بالمفتاح
 */
export const getPermissionByKey = (key) => {
  return PERMISSIONS[key] || null;
};

/**
 * التحقق من وجود صلاحية
 */
export const hasPermissionKey = (key) => {
  return key in PERMISSIONS;
};

/**
 * الحصول على جميع مفاتيح الصلاحيات
 */
export const getAllPermissionKeys = () => {
  return Object.keys(PERMISSIONS);
};

/**
 * تجميع الصلاحيات حسب التصنيف
 */
export const groupPermissionsByCategory = () => {
  const grouped = {};

  Object.values(PERMISSION_CATEGORIES).forEach(category => {
    grouped[category] = getPermissionsByCategory(category);
  });

  return grouped;
};

// ==================== Export Default ====================

export default {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  getAllPermissions,
  getPermissionsByCategory,
  getPermissionByKey,
  hasPermissionKey,
  getAllPermissionKeys,
  groupPermissionsByCategory
};
