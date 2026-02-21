import { useState, useCallback } from 'react';
import { RELATIONSHIP_GENDER_MAP } from 'services/api/unified-members.service';
import { MEMBERS_AR } from 'locales/ar/members.ar';

export interface MemberFormValues {
    fullName?: string;
    nationalNumber?: string;
    phone?: string;
    employeeNumber?: string;
    relationship?: string;
    gender?: string;
    birthDate?: string | null;
    employerId?: number | string | null;
    policyNumber?: string;
    benefitPolicyId?: number | string | null;
    startDate?: string | null;
    endDate?: string | null;
    email?: string;
    isFastTrack?: boolean;
    [key: string]: any;
}

export interface MemberFormErrors {
    [key: string]: string | null | undefined;
}

export interface MemberFormHook {
    form: MemberFormValues;
    setForm: React.Dispatch<React.SetStateAction<MemberFormValues>>;
    errors: MemberFormErrors;
    setErrors: React.Dispatch<React.SetStateAction<MemberFormErrors>>;
    isSubmitting: boolean;
    setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
    handleChange: (field: string) => (eventOrValue: any) => void;
    setFieldError: (field: string, message: string) => void;
    clearFieldError: (field: string) => void;
    clearErrors: () => void;
    resetForm: () => void;
    updateForm: (updates: Partial<MemberFormValues>) => void;
    validate: () => boolean;
}

/**
 * Custom Hook لإدارة نماذج المنتفعين
 * يوفر منطق مشترك للتعامل مع التغييرات والتحقق من الصحة
 * 
 * @param {MemberFormValues} initialValues - القيم الأولية للنموذج
 * @param {Object} options - خيارات إضافية (مثل دوال النجاح أو الفشل)
 * @returns {MemberFormHook} - الحالة والدوال المساعدة
 */
export const useMemberForm = (initialValues: MemberFormValues = {}, options: any = {}): MemberFormHook => {
    const [form, setForm] = useState<MemberFormValues>(initialValues);
    const [errors, setErrors] = useState<MemberFormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    /**
     * معالج التغييرات في الحقول
     * يدعم الربط الذكي بين الجنس وصلة القرابة
     */
    const handleChange = useCallback((field: string) => (eventOrValue: any) => {
        // استخراج القيمة من الحدث أو استخدامها مباشرة
        let value: any;
        if (eventOrValue === null || eventOrValue === undefined) {
            value = null;
        } else if (eventOrValue?.target !== undefined) {
            value = eventOrValue.target.value;
        } else {
            value = eventOrValue;
        }

        // معالجة خاصة للحقول الرقمية
        if ((field === 'nationalNumber' || field === 'phone' || field === 'employeeNumber') && typeof value === 'string') {
            value = value.replace(/\D/g, ''); // إزالة غير الأرقام
            if (field === 'nationalNumber' && value.length > 12) return;
            if (field === 'phone' && value.length > 10) return;
        }

        const updates: Partial<MemberFormValues> = { [field]: value };

        // AUTO-GENDER: إذا تم تغيير صلة القرابة، حدّث الجنس تلقائياً
        if (field === 'relationship' && RELATIONSHIP_GENDER_MAP[value as keyof typeof RELATIONSHIP_GENDER_MAP]) {
            updates.gender = RELATIONSHIP_GENDER_MAP[value as keyof typeof RELATIONSHIP_GENDER_MAP];
        }

        // REVERSE: إذا تم تغيير الجنس وكانت الصلة غير متوافقة، امسح الصلة
        if (field === 'gender') {
            const currentRelGender = RELATIONSHIP_GENDER_MAP[form.relationship as keyof typeof RELATIONSHIP_GENDER_MAP];
            if (currentRelGender && currentRelGender !== value) {
                updates.relationship = ''; // مسح الصلة غير المتوافقة
            }
        }

        setForm((prev) => ({ ...prev, ...updates }));

        // مسح الأخطاء للحقول المحدثة
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
        if (updates.gender && errors.gender) {
            setErrors((prev) => ({ ...prev, gender: null }));
        }
        if (updates.relationship && errors.relationship) {
            setErrors((prev) => ({ ...prev, relationship: null }));
        }
    }, [form.relationship, errors]);

    /**
     * تعيين خطأ لحقل معين
     */
    const setFieldError = useCallback((field: string, message: string) => {
        setErrors((prev) => ({ ...prev, [field]: message }));
    }, []);

    /**
     * مسح خطأ لحقل معين
     */
    const clearFieldError = useCallback((field: string) => {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    }, []);

    /**
     * مسح جميع الأخطاء
     */
    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    /**
     * إعادة تعيين النموذج للقيم الأولية
     */
    const resetForm = useCallback(() => {
        setForm(initialValues);
        setErrors({});
    }, [initialValues]);

    /**
     * التحقق من صحة البيانات
     */
    const validate = useCallback(() => {
        const newErrors: MemberFormErrors = {};
        const { isFastTrack } = form;

        // الحقول المطلوبة للجميع
        if (!form.fullName?.trim()) {
            newErrors.fullName = MEMBERS_AR.validation.required.fullName;
        }

        // الحقول المطلوبة في الوضع العادي فقط
        if (!isFastTrack) {
            if (!form.birthDate) {
                newErrors.birthDate = MEMBERS_AR.validation.required.birthDate;
            }
            if (!form.gender) {
                newErrors.gender = MEMBERS_AR.validation.required.gender;
            }
            if (!form.employerId) {
                newErrors.employerId = MEMBERS_AR.validation.required.employer;
            }
            if (!form.policyNumber) {
                newErrors.policyNumber = MEMBERS_AR.validation.required.policyNumber || 'رقم الوثيقة مطلوب';
            }
            if (!form.benefitPolicyId) {
                newErrors.benefitPolicyId = MEMBERS_AR.validation.required.benefitPolicy || 'وثيقة المنافع مطلوبة';
            }
            if (!form.startDate) {
                newErrors.startDate = MEMBERS_AR.validation.required.startDate || 'تاريخ بدء التأمين مطلوب';
            }
            if (!form.endDate) {
                newErrors.endDate = MEMBERS_AR.validation.required.endDate || 'تاريخ انتهاء التأمين مطلوب';
            }
            if (form.phone && !/^09[1-6][0-9]{7}$/.test(form.phone)) {
                newErrors.phone = MEMBERS_AR.validation.format.phone;
            }
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                newErrors.email = MEMBERS_AR.validation.format.email;
            }
        } else {
            // في وضع FastTrack، رقم الهاتف وجهة العمل مطلوبان
            if (!form.phone?.trim()) {
                newErrors.phone = MEMBERS_AR.validation.required.phone;
            }
            if (!form.employerId) {
                newErrors.employerId = MEMBERS_AR.validation.required.employer;
            }
            // في وضع FastTrack، قد نحتاج أيضاً للوثيقة والتواريخ كقيم افتراضية إذا كان الباكيند يتطلبها
            // لكن عادة السيرفيس تتعامل معها. سنقوم بتمريرها من الكومبوننت.
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form]);

    /**
     * تحديث قيم متعددة دفعة واحدة
     */
    const updateForm = useCallback((updates: Partial<MemberFormValues>) => {
        setForm((prev) => ({ ...prev, ...updates }));
    }, []);

    return {
        form,
        setForm,
        errors,
        setErrors,
        isSubmitting,
        setIsSubmitting,
        handleChange,
        setFieldError,
        clearFieldError,
        clearErrors,
        resetForm,
        updateForm,
        validate
    };
};

export default useMemberForm;
