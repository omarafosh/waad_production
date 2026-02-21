import * as Yup from 'yup';

export const PreApprovalSchema = Yup.object().shape({
    memberId: Yup.number().required('المؤمَّن عليه مطلوب'),
    visitId: Yup.number().required('معرف الزيارة مطلوب'),
    providerId: Yup.number().required('مقدم الخدمة مطلوب'),
    diagnosisCode: Yup.string()
        .trim()
        .required('كود التشخيص مطلوب')
        .min(3, 'يجب أن يكون الكود 3 أحرف على الأقل'),
    diagnosisDescription: Yup.string()
        .nullable()
        .trim(),
    doctorName: Yup.string()
        .nullable()
        .trim()
        .max(100, 'اسم الطبيب طويل جداً'),
    notes: Yup.string()
        .nullable()
        .trim()
        .max(500, 'الملاحظات طويلة جداً'),
    services: Yup.array()
        .of(
            Yup.object().shape({
                id: Yup.number().required(),
                quantity: Yup.number()
                    .required()
                    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
                    .max(99, 'الكمية كبيرة جداً'),
                price: Yup.number().required(),
                hasContract: Yup.boolean().oneOf([true], 'يجب أن تتوفر هذه الخدمة في العقد')
            })
        )
        .min(1, 'يجب اختيار خدمة طبية واحدة على الأقل')
});
