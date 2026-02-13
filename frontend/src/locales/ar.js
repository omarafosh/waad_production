/**
 * Arabic Translations - نظام وعد
 * Phase D1.5 - Standardized Insurance Domain Terminology
 *
 * 🔒 These terms are LOCKED and should NOT be changed after this phase.
 */

const ar = {
  // ==================== NAVIGATION ====================
  nav: {
    dashboard: 'لوحة التحكم',
    members: 'المؤمَّن عليهم',
    employers: 'جهات التعاقد',
    providers: 'مقدمو الخدمة الصحية',
    claims: 'المطالبات',
    visits: 'الزيارات الطبية',
    preApprovals: 'الموافقات المسبقة',
    medicalCategories: 'التصنيفات الطبية',
    medicalServices: 'الخدمات الطبية',
    medicalPackages: 'الباقات الطبية',
    benefitPackages: 'باقات المنافع',
    providerContracts: 'عقود مقدمي الخدمة',
    policies: 'وثائق التأمين',
    settings: 'إعدادات النظام',
    audit: 'سجل التدقيق',
    rbac: 'الصلاحيات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج'
  },

  // ==================== MENU GROUPS ====================
  groups: {
    main: 'الرئيسية',
    dataManagement: 'إدارة البيانات',
    claimsManagement: 'إدارة المطالبات',
    medicalManagement: 'الإدارة الطبية',
    contractsDocuments: 'العقود والوثائق',
    settings: 'الإعدادات'
  },

  // ==================== COMMON ACTIONS ====================
  actions: {
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    refresh: 'تحديث',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    submit: 'إرسال',
    approve: 'موافقة',
    reject: 'رفض',
    pending: 'قيد الانتظار'
  },

  // ==================== COMMON LABELS ====================
  common: {
    name: 'الاسم',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    code: 'الرمز',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    date: 'التاريخ',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ الانتهاء',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'تاريخ التحديث',
    description: 'الوصف',
    notes: 'ملاحظات',
    amount: 'المبلغ',
    total: 'الإجمالي',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    type: 'النوع',
    category: 'التصنيف',
    details: 'التفاصيل',
    attachments: 'المرفقات',
    noData: 'لا توجد بيانات',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    success: 'تمت العملية بنجاح',
    confirm: 'تأكيد',
    warning: 'تحذير',
    required: 'مطلوب',
    optional: 'اختياري',
    all: 'الكل',
    select: 'اختر',
    none: 'لا يوجد'
  },

  // ==================== MEMBERS MODULE ====================
  members: {
    title: 'المؤمَّن عليهم',
    singular: 'مؤمَّن عليه',
    list: 'قائمة المؤمَّن عليهم',
    add: 'إضافة مؤمَّن عليه',
    edit: 'تعديل بيانات المؤمَّن عليه',
    view: 'عرض بيانات المؤمَّن عليه',
    nationalNumber: 'الرقم الوطني',
    cardNumber: 'رقم البطاقة',
    fullName: 'الاسم الكامل',
    birthDate: 'تاريخ الميلاد',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    nationality: 'الجنسية',
    maritalStatus: 'الحالة الاجتماعية',
    employer: 'جهة التعاقد',
    benefitPackage: 'باقة المنافع',
    policyNumber: 'رقم الوثيقة',
    membershipPeriod: 'فترة العضوية',
    familyMembers: 'أفراد العائلة',
    principalMember: 'العضو الرئيسي',
    dependent: 'تابع'
  },

  // ==================== EMPLOYERS MODULE ====================
  employers: {
    title: 'جهات التعاقد',
    singular: 'جهة تعاقد',
    list: 'قائمة جهات التعاقد',
    add: 'إضافة جهة تعاقد',
    edit: 'تعديل بيانات جهة التعاقد',
    view: 'عرض بيانات جهة التعاقد',
    contactPerson: 'الشخص المسؤول',
    contractNumber: 'رقم العقد',
    membersCount: 'عدد المؤمَّن عليهم'
  },

  // ==================== PROVIDERS MODULE ====================
  providers: {
    title: 'مقدمو الخدمة الصحية',
    singular: 'مقدم خدمة صحية',
    list: 'قائمة مقدمي الخدمة الصحية',
    add: 'إضافة مقدم خدمة صحية',
    edit: 'تعديل بيانات مقدم الخدمة',
    view: 'عرض بيانات مقدم الخدمة',
    providerType: 'نوع مقدم الخدمة',
    hospital: 'مستشفى',
    clinic: 'عيادة',
    pharmacy: 'صيدلية',
    laboratory: 'مختبر',
    specialty: 'التخصص',
    license: 'رقم الترخيص'
  },

  // ==================== CLAIMS MODULE ====================
  claims: {
    title: 'المطالبات',
    singular: 'مطالبة',
    list: 'قائمة المطالبات',
    add: 'إضافة مطالبة',
    edit: 'تعديل المطالبة',
    view: 'عرض المطالبة',
    claimNumber: 'رقم المطالبة',
    claimDate: 'تاريخ المطالبة',
    claimAmount: 'مبلغ المطالبة',
    approvedAmount: 'المبلغ المعتمد',
    status: {
      pending: 'قيد المراجعة',
      approved: 'معتمدة',
      rejected: 'مرفوضة',
      paid: 'مدفوعة',
      partiallyPaid: 'مدفوعة جزئياً'
    }
  },

  // ==================== VISITS MODULE ====================
  visits: {
    title: 'الزيارات الطبية',
    singular: 'زيارة طبية',
    list: 'قائمة الزيارات الطبية',
    add: 'إضافة زيارة طبية',
    edit: 'تعديل الزيارة الطبية',
    view: 'عرض الزيارة الطبية',
    visitDate: 'تاريخ الزيارة',
    visitType: 'نوع الزيارة',
    diagnosis: 'التشخيص',
    treatment: 'العلاج',
    doctor: 'الطبيب المعالج'
  },

  // ==================== PRE-APPROVALS MODULE ====================
  preApprovals: {
    title: 'الموافقات المسبقة',
    singular: 'موافقة مسبقة',
    list: 'قائمة الموافقات المسبقة',
    add: 'طلب موافقة مسبقة',
    edit: 'تعديل طلب الموافقة',
    view: 'عرض طلب الموافقة',
    requestNumber: 'رقم الطلب',
    requestDate: 'تاريخ الطلب',
    procedure: 'الإجراء المطلوب',
    estimatedCost: 'التكلفة التقديرية',
    status: {
      pending: 'قيد المراجعة',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
      expired: 'منتهي الصلاحية'
    }
  },

  // ==================== MEDICAL CATEGORIES ====================
  medicalCategories: {
    title: 'التصنيفات الطبية',
    singular: 'تصنيف طبي',
    list: 'قائمة التصنيفات الطبية',
    add: 'إضافة تصنيف طبي',
    edit: 'تعديل التصنيف الطبي',
    view: 'عرض التصنيف الطبي'
  },

  // ==================== MEDICAL SERVICES ====================
  medicalServices: {
    title: 'الخدمات الطبية',
    singular: 'خدمة طبية',
    list: 'قائمة الخدمات الطبية',
    add: 'إضافة خدمة طبية',
    edit: 'تعديل الخدمة الطبية',
    view: 'عرض الخدمة الطبية',
    serviceCode: 'رمز الخدمة',
    servicePrice: 'سعر الخدمة',
    coveragePercentage: 'نسبة التغطية'
  },

  // ==================== MEDICAL PACKAGES ====================
  medicalPackages: {
    title: 'الباقات الطبية',
    singular: 'باقة طبية',
    list: 'قائمة الباقات الطبية',
    add: 'إضافة باقة طبية',
    edit: 'تعديل الباقة الطبية',
    view: 'عرض الباقة الطبية',
    includedServices: 'الخدمات المشمولة'
  },

  // ==================== BENEFIT PACKAGES ====================
  benefitPackages: {
    title: 'باقات المنافع',
    singular: 'باقة منافع',
    list: 'قائمة باقات المنافع',
    add: 'إضافة باقة منافع',
    edit: 'تعديل باقة المنافع',
    view: 'عرض باقة المنافع',
    coverageLimit: 'حد التغطية',
    annualLimit: 'الحد السنوي',
    deductible: 'التحمل'
  },

  // ==================== POLICIES ====================
  policies: {
    title: 'وثائق التأمين',
    singular: 'وثيقة تأمين',
    list: 'قائمة وثائق التأمين',
    add: 'إضافة وثيقة تأمين',
    edit: 'تعديل وثيقة التأمين',
    view: 'عرض وثيقة التأمين',
    policyNumber: 'رقم الوثيقة',
    effectiveDate: 'تاريخ السريان',
    expiryDate: 'تاريخ الانتهاء'
  },

  // ==================== SETTINGS ====================
  settings: {
    title: 'إعدادات النظام',
    general: 'الإعدادات العامة',
    theme: 'المظهر',
    language: 'اللغة',
    notifications: 'الإشعارات',
    security: 'الأمان'
  },

  // ==================== AUDIT ====================
  audit: {
    title: 'سجل التدقيق',
    action: 'الإجراء',
    user: 'المستخدم',
    timestamp: 'التوقيت',
    details: 'التفاصيل',
    ipAddress: 'عنوان IP'
  },

  // ==================== TPA SYSTEM ====================
  // NOTE: InsuranceCompany section removed - System operates as TPA (شركة وعد)
  tpa: {
    name: 'شركة وعد',
    systemName: 'نظام إدارة التأمين الصحي'
  },

  // ==================== AUTH ====================
  auth: {
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    profile: 'الملف الشخصي',
    changePassword: 'تغيير كلمة المرور'
  },

  // ==================== SYSTEM ====================
  system: {
    name: 'نظام وعد',
    subtitle: 'إدارة مطالبات التأمين',
    copyright: '© {year} نظام وعد - جميع الحقوق محفوظة',
    version: 'الإصدار'
  }
};

export default ar;
