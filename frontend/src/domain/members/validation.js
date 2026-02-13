import * as yup from 'yup';

export const MemberSchema = yup.object().shape({
    fullName: yup.string().required('الاسم الكامل مطلوب'),
    nationalNumber: yup.string()
        .transform((value) => value === '' ? null : value)
        .nullable()
        .test('len', 'الرقم الوطني يجب أن يكون 12 خانة', val => !val || val.length === 12),
    birthDate: yup.date()
        .nullable()
        .when('isFastTrack', {
            is: false,
            then: (schema) => schema.required('تاريخ الميلاد مطلوب'),
            otherwise: (schema) => schema.nullable()
        }),
    gender: yup.string()
        .when('isFastTrack', {
            is: false,
            then: (schema) => schema.required('الجنس مطلوب'),
            otherwise: (schema) => schema.nullable()
        }),
    employerId: yup.string()
        .required('جهة العمل مطلوبة'),
    phone: yup.string()
        .transform((value) => value === '' ? null : value)
        .nullable()
        .matches(/^(091|092|094|093|095|096)\d{7}$/, 'رقم الهاتف غير صحيح'),
    email: yup.string().email('بريد إلكتروني غير صحيح').nullable(),
    isFastTrack: yup.boolean(),
    dependents: yup.array().of(
        yup.object().shape({
            fullName: yup.string().required('اسم التابع مطلوب'),
            birthDate: yup.date().required('تاريخ الميلاد مطلوب').nullable(),
            gender: yup.string().required('الجنس مطلوب'),
            relationship: yup.string().required('صلة القرابة مطلوبة')
        })
    )
});
