/**
 * ملف النصوص العربية المشتركة
 * يحتوي على النصوص المستخدمة عبر التطبيق
 */

export const COMMON_AR = {
    // الإجراءات العامة
    actions: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        view: 'عرض',
        add: 'إضافة',
        search: 'بحث',
        filter: 'تصفية',
        export: 'تصدير',
        import: 'استيراد',
        print: 'طباعة',
        download: 'تحميل',
        upload: 'رفع',
        refresh: 'تحديث',
        reset: 'إعادة تعيين',
        submit: 'إرسال',
        confirm: 'تأكيد',
        back: 'رجوع',
        next: 'التالي',
        previous: 'السابق',
        close: 'إغلاق',
        select: 'اختيار',
        clear: 'مسح'
    },

    // الحالات العامة
    status: {
        active: 'نشط',
        inactive: 'غير نشط',
        pending: 'قيد المراجعة',
        approved: 'معتمد',
        rejected: 'مرفوض',
        draft: 'مسودة',
        completed: 'مكتمل',
        cancelled: 'ملغى',
        expired: 'منتهي'
    },

    // الرسائل العامة
    messages: {
        success: 'تمت العملية بنجاح',
        error: 'حدث خطأ أثناء تنفيذ العملية',
        warning: 'تحذير',
        info: 'معلومة',
        loading: 'جاري التحميل...',
        saving: 'جاري الحفظ...',
        processing: 'جاري المعالجة...',
        noData: 'لا توجد بيانات',
        noResults: 'لا توجد نتائج',
        confirmAction: 'هل أنت متأكد من هذا الإجراء؟',
        unsavedChanges: 'لديك تغييرات غير محفوظة',
        requiredField: 'هذا الحقل مطلوب',
        invalidInput: 'المدخل غير صحيح',
        networkError: 'خطأ في الاتصال بالخادم',
        unauthorized: 'غير مصرح لك بهذا الإجراء',
        sessionExpired: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى'
    },

    // التواريخ والأوقات
    datetime: {
        today: 'اليوم',
        yesterday: 'أمس',
        tomorrow: 'غداً',
        date: 'التاريخ',
        time: 'الوقت',
        from: 'من',
        to: 'إلى',
        startDate: 'تاريخ البدء',
        endDate: 'تاريخ الانتهاء'
    },

    // الترقيم والصفحات
    pagination: {
        page: 'صفحة',
        of: 'من',
        rowsPerPage: 'عدد الصفوف في الصفحة',
        showing: 'عرض',
        to: 'إلى',
        from: 'من',
        total: 'إجمالي',
        first: 'الأولى',
        last: 'الأخيرة',
        next: 'التالي',
        previous: 'السابق'
    },

    // النماذج
    forms: {
        required: 'مطلوب',
        optional: 'اختياري',
        placeholder: 'أدخل...',
        select: 'اختر...',
        search: 'بحث...',
        noOptions: 'لا توجد خيارات',
        loading: 'جاري التحميل...'
    },

    // الأخطاء العامة
    errors: {
        required: 'هذا الحقل مطلوب',
        invalid: 'القيمة المدخلة غير صحيحة',
        tooShort: 'القيمة قصيرة جداً',
        tooLong: 'القيمة طويلة جداً',
        min: 'القيمة يجب أن تكون أكبر من أو تساوي',
        max: 'القيمة يجب أن تكون أصغر من أو تساوي',
        email: 'البريد الإلكتروني غير صحيح',
        url: 'الرابط غير صحيح',
        number: 'يجب إدخال رقم',
        integer: 'يجب إدخال رقم صحيح',
        positive: 'يجب إدخال رقم موجب',
        negative: 'يجب إدخال رقم سالب'
    }
};

export default COMMON_AR;
