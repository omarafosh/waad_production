/**
 * ملف النصوص العربية لوحدة المنتفعين
 * يحتوي على جميع النصوص والرسائل المستخدمة في الواجهة
 */

export const MEMBERS_AR = {
    // عناوين الصفحات
    titles: {
        create: 'إضافة منتفع رئيسي',
        createPrincipal: 'إضافة منتفع رئيسي',
        edit: 'تعديل بيانات المنتفع',
        editPrincipal: 'تعديل بيانات المنتفع الرئيسي',
        editDependent: 'تعديل بيانات المنتفع التابع',
        view: 'عرض بيانات المنتفع',
        list: 'قائمة المنتفعين',
        addDependent: 'إضافة تابع جديد',
        manageDependents: 'إدارة التابعين'
    },

    // تسميات الحقول
    labels: {
        fullName: 'الاسم الكامل',
        nationalNumber: 'الرقم الوطني',
        birthDate: 'تاريخ الميلاد',
        gender: 'الجنس',
        nationality: 'الجنسية',
        maritalStatus: 'الحالة الاجتماعية',
        relationship: 'صلة القرابة',
        phone: 'رقم الهاتف',
        email: 'البريد الإلكتروني',
        address: 'العنوان',
        employer: 'جهة العمل',
        employeeNumber: 'الرقم الوظيفي',
        joinDate: 'تاريخ الالتحاق',
        occupation: 'المهنة',
        policyNumber: 'رقم الوثيقة',
        cardNumber: 'رقم البطاقة',
        barcode: 'الباركود',
        status: 'الحالة',
        startDate: 'تاريخ البدء',
        endDate: 'تاريخ الانتهاء',
        notes: 'ملاحظات',
        photo: 'الصورة الشخصية',
        benefitPolicy: 'وثيقة المنافع'
    },

    // تسميات التبويبات
    tabs: {
        personalInfo: 'البيانات الشخصية',
        employment: 'بيانات العمل',
        contact: 'معلومات الاتصال',
        dependents: 'التابعون'
    },

    // الأزرار
    buttons: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        view: 'عرض',
        back: 'رجوع',
        add: 'إضافة',
        addDependent: 'إضافة تابع جديد',
        uploadPhoto: 'رفع صورة',
        changePhoto: 'تغيير الصورة',
        removePhoto: 'إزالة الصورة',
        search: 'بحث',
        filter: 'تصفية',
        export: 'تصدير',
        import: 'استيراد',
        restore: 'استعادة',
        hardDelete: 'حذف نهائي'
    },

    // رسائل النجاح
    success: {
        created: 'تم إنشاء المنتفع بنجاح',
        updated: 'تم تحديث البيانات بنجاح',
        deleted: 'تم حذف المنتفع بنجاح',
        restored: 'تم استعادة المنتفع بنجاح',
        photoUploaded: 'تم رفع الصورة بنجاح',
        photoDeleted: 'تم حذف الصورة بنجاح',
        dependentAdded: 'تم إضافة التابع بنجاح',
        dependentUpdated: 'تم تحديث بيانات التابع بنجاح',
        dependentDeleted: 'تم حذف التابع بنجاح'
    },

    // رسائل الأخطاء
    errors: {
        createFailed: 'فشل في إنشاء المنتفع',
        updateFailed: 'فشل في تحديث البيانات',
        deleteFailed: 'فشل في حذف المنتفع',
        loadFailed: 'فشل في تحميل البيانات',
        photoUploadFailed: 'فشل في رفع الصورة',
        photoDeleteFailed: 'فشل في حذف الصورة',
        invalidData: 'البيانات المدخلة غير صحيحة',
        networkError: 'خطأ في الاتصال بالخادم',
        unauthorized: 'ليس لديك صلاحية للقيام بهذا الإجراء',
        notFound: 'المنتفع غير موجود',
        cannotEditDeleted: 'لا يمكن تعديل منتفع محذوف. يرجى استعادته أولاً.'
    },

    // رسائل التحقق من الصحة
    validation: {
        required: {
            fullName: 'الاسم الكامل مطلوب',
            birthDate: 'تاريخ الميلاد مطلوب',
            gender: 'الجنس مطلوب',
            employer: 'جهة العمل مطلوبة',
            relationship: 'صلة القرابة مطلوبة'
        },
        format: {
            nationalNumber: 'الرقم الوطني يجب أن يكون 12 خانة',
            phone: 'رقم الهاتف غير صحيح. يجب أن يكون ليبي (09x) و10 أرقام',
            email: 'البريد الإلكتروني غير صحيح',
            invalidImageType: 'نوع الملف غير مدعوم. الأنواع المسموحة: PNG, JPG, WEBP',
            imageTooLarge: 'حجم الصورة يجب أن يكون أقل من 10 ميجابايت'
        },
        hints: {
            nationalNumber: 'اختياري (12 خانة)',
            phone: 'يجب أن يكون ليبي (09x) و10 أرقام',
            email: 'اختياري'
        }
    },

    // النصوص الإعلامية
    info: {
        noData: 'لا توجد بيانات',
        noDependents: 'لا يوجد تابعون لهذا المنتفع حالياً.',
        noEmploymentData: 'لا توجد بيانات عمل للمنتفع التابع. صلة القرابة موجودة في "البيانات الشخصية".',
        selectEmployer: 'اختر جهة العمل...',
        selectGender: 'اختر...',
        selectRelationship: 'اختر صلة القرابة...',
        selectMaritalStatus: 'اختر الحالة الاجتماعية...',
        dragDropPhoto: 'اسحب وأفلت الصورة هنا أو انقر للاختيار',
        supportedFormats: 'PNG, JPG, WEBP (حتى 10MB)',
        loading: 'جاري التحميل...',
        saving: 'جاري الحفظ...',
        cascadeDeleteNotice: 'سيتم حذف {count} تابعين مرتبطين بهذا المنتفع أيضاً.'
    },

    // الحالات
    statuses: {
        active: 'نشط',
        inactive: 'غير نشط',
        pending: 'قيد المراجعة',
        draft: 'مسودة',
        terminated: 'منتهي'
    },

    // الجنس
    genders: {
        male: 'ذكر',
        female: 'أنثى',
        undefined: 'غير محدد'
    },

    // الحالة الاجتماعية
    maritalStatuses: {
        single: 'أعزب',
        married: 'متزوج',
        divorced: 'مطلق',
        widowed: 'أرمل'
    },

    // صلة القرابة
    relationships: {
        wife: 'زوجة',
        husband: 'زوج',
        son: 'ابن',
        daughter: 'ابنة',
        father: 'أب',
        mother: 'أم',
        brother: 'أخ',
        sister: 'أخت'
    },

    // رسائل التأكيد
    confirmations: {
        delete: 'هل أنت متأكد من حذف هذا المنتفع؟',
        hardDelete: 'هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.',
        restore: 'هل تريد استعادة هذا المنتفع؟',
        deletePhoto: 'هل تريد حذف الصورة الشخصية؟',
        unsavedChanges: 'لديك تغييرات غير محفوظة. هل تريد المتابعة؟',
        deletePrincipal: 'هل أنت متأكد من حذف المنتفع الرئيسي "{name}"؟',
        deleteDependent: 'هل أنت متأكد من حذف التابع "{name}"؟'
    },

    // عناوين الأعمدة في الجداول
    tableHeaders: {
        name: 'الاسم',
        relationship: 'القرابة',
        gender: 'الجنس',
        birthDate: 'تاريخ الميلاد',
        actions: 'إجراءات',
        cardNumber: 'رقم البطاقة',
        barcode: 'الباركود',
        employer: 'جهة العمل',
        status: 'الحالة',
        dependentsCount: 'عدد التابعين'
    }
};

export default MEMBERS_AR;
