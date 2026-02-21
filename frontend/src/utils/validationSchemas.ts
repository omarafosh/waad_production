import * as Yup from 'yup';

/**
 * Validation schemas for core entities using Yup.
 * Optimized for Arabic interface.
 */

// 1. Member Validation Schema
export const memberSchema = Yup.object().shape({
    firstName: Yup.string()
        .required('الاسم الأول مطلوب')
        .min(2, 'الاسم قصير جداً'),
    lastName: Yup.string()
        .required('اسم العائلة مطلوب')
        .min(2, 'الاسم قصير جداً'),
    civilId: Yup.string()
        .required('الرقم المدني مطلوب')
        .matches(/^\d{12}$/, 'الرقم المدني يجب أن يتكون من 12 رقم'),
    gender: Yup.string()
        .required('الجنس مطلوب')
        .oneOf(['MALE', 'FEMALE'], 'اختيار غير صحيح'),
    birthDate: Yup.date()
        .required('تاريخ الميلاد مطلوب')
        .max(new Date(), 'تاريخ الميلاد لا يمكن أن يكون في المستقبل'),
    joinDate: Yup.date()
        .required('تاريخ الانضمام مطلوب'),
    employerId: Yup.number()
        .required('جهة العمل مطلوبة'),
});

// 2. Claim Validation Schema
export const claimSchema = Yup.object().shape({
    memberId: Yup.number()
        .required('العضو مطلوب'),
    providerId: Yup.number()
        .required('المزود مطلوب'),
    serviceDate: Yup.date()
        .required('تاريخ الخدمة مطلوب')
        .max(new Date(), 'تاريخ الخدمة لا يمكن أن يكون في المستقبل'),
    totalAmount: Yup.number()
        .required('المبلغ الإجمالي مطلوب')
        .positive('يجب أن يكون المبلغ أكبر من صفر'),
    diagnosis: Yup.string()
        .required('التشخيص مطلوب')
        .min(5, 'يرجى تقديم تفاصيل أكثر للتشخيص'),
});

// 3. Benefit Policy Schema
export const policySchema = Yup.object().shape({
    name: Yup.string()
        .required('اسم الوثيقة مطلوب')
        .min(3, 'الاسم قصير جداً'),
    effectiveDate: Yup.date()
        .required('تاريخ التفعيل مطلوب'),
    expiryDate: Yup.date()
        .required('تاريخ الانتهاء مطلوب')
        .min(Yup.ref('effectiveDate'), 'تاريخ الانتهاء يجب أن يكون بعد تاريخ التفعيل'),
    defaultCoveragePercent: Yup.number()
        .required('نسبة التغطية الافتراضية مطلوبة')
        .min(0, 'النسبة لا يمكن أن تكون أقل من 0')
        .max(100, 'النسبة لا يمكن أن تتجاوز 100'),
});
