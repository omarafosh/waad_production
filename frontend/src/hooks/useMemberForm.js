import { useState, useCallback } from 'react';
import { RELATIONSHIP_GENDER_MAP } from 'services/api/unified-members.service';
import { MEMBERS_AR } from 'locales/ar/members.ar';

/**
 * Custom Hook لإدارة نماذج المنتفعين
 * يوفر منطق مشترك للتعامل مع التغييرات والتحقق من الصحة
 * 
 * @param {Object} initialValues - القيم الأولية للنموذج
 * @param {Object} options - خيارات إضافية (مثل دوال النجاح أو الفشل)
 * @returns {Object} - الحالة والدوال المساعدة
 */
export const useMemberForm = (initialValues = {}, options = {}) => {
    const [form, setForm] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * معالج التغييرات في الحقول
     * يدعم الربط الذكي بين الجنس وصلة القرابة
     */
    const handleChange = useCallback((field) => (eventOrValue) => {
        // استخراج القيمة من الحدث أو استخدامها مباشرة
        let value;
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

        const updates = { [field]: value };

        // AUTO-GENDER: إذا تم تغيير صلة القرابة، حدّث الجنس تلقائياً
        if (field === 'relationship' && RELATIONSHIP_GENDER_MAP[value]) {
            updates.gender = RELATIONSHIP_GENDER_MAP[value];
        }

        // REVERSE: إذا تم تغيير الجنس وكانت الصلة غير متوافقة، امسح الصلة
        if (field === 'gender') {
            const currentRelGender = RELATIONSHIP_GENDER_MAP[form.relationship];
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
    const setFieldError = useCallback((field, message) => {
        setErrors((prev) => ({ ...prev, [field]: message }));
    }, []);

    /**
     * مسح خطأ لحقل معين
     */
    const clearFieldError = useCallback((field) => {
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
        const newErrors = {};
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
            if (form.phone && !/^09[1-6][0-9]{7}$/.test(form.phone)) {
                newErrors.phone = MEMBERS_AR.validation.format.phone;
            }
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                newErrors.email = MEMBERS_AR.validation.format.email;
            }
        } else {
            // في وضع FastTrack، رقم الهاتف مطلوب
            if (!form.phone?.trim()) {
                newErrors.phone = MEMBERS_AR.validation.required.phone;
            }
            if (!form.employerId) {
                newErrors.employerId = MEMBERS_AR.validation.required.employer;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form]);

    /**
     * تحديث قيم متعددة دفعة واحدة
     */
    const updateForm = useCallback((updates) => {
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
