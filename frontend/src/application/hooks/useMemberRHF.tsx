import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { MemberSchema } from 'domain/members/validation';
import { MemberInitialValues } from 'domain/members/models';
import { createPrincipalMember, updateMember, uploadPhoto } from 'services/api/unified-members.service';
import dayjs from 'dayjs';
import { openSnackbar } from 'api/snackbar';

export const useMemberRHF = ({ id = null, onSuccess, onError }) => {
    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting, isValid, isDirty }
    } = useForm({
        defaultValues: MemberInitialValues,
        resolver: yupResolver(MemberSchema),
        mode: 'onChange' // Use onChange for real-time feedback as requested
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "dependents"
    });

    const isFastTrack = watch('isFastTrack');

    const onSubmit = async (data) => {
        try {
            // Prepare payload
            const payload = {
                ...data,
                fullName: data.fullName.trim(),
                birthDate: data.birthDate ? dayjs(data.birthDate).format('YYYY-MM-DD') : (data.isFastTrack ? '1900-01-01' : null),
                gender: data.gender || (data.isFastTrack ? 'UNDEFINED' : null),
                maritalStatus: data.maritalStatus || (data.isFastTrack ? 'SINGLE' : null),
                // Format dependents
                dependents: (data.dependents || []).map(dep => ({
                    ...dep,
                    fullName: dep.fullName.trim(),
                    birthDate: dep.birthDate ? dayjs(dep.birthDate).format('YYYY-MM-DD') : null
                }))
            };

            const response = id
                ? await updateMember(id, payload)
                : await createPrincipalMember(payload);

            const result = response?.data || response;

            if (data.photoFile) {
                await uploadPhoto(id || result.id, data.photoFile);
            }

            if (onSuccess) onSuccess(result);
        } catch (error) {
            console.error('Member Operation Error:', error);
            if (onError) onError(error);
        }
    };

    // Callback when validation fails
    const onInvalid = (errors) => {
        console.warn('Validation Failed:', errors);
        openSnackbar({
            message: 'يرجى تصحيح الأخطاء في الحقول المطلوبة قبل الحفظ',
            variant: 'alert',
            alert: { color: 'error' }
        });
    };

    return {
        register,
        handleSubmit: handleSubmit(onSubmit, onInvalid), // Now includes onInvalid handler
        control,
        errors,
        isSubmitting,
        isValid,
        isDirty,
        setValue,
        watch,
        reset,
        isFastTrack,
        dependentFields: fields,
        addDependent: () => append({ fullName: '', birthDate: null, gender: '', relationship: '' }),
        removeDependent: (index) => remove(index)
    };
};
