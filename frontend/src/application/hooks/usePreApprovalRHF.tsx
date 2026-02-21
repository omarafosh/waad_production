import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { PreApprovalInitialValues } from 'domain/pre-approval/models';
import { PreApprovalSchema } from 'domain/pre-approval/validation';
import { PreApprovalService } from 'infrastructure/services/PreApprovalService';

/**
 * Hook for Pre-Approval Form Logic using React Hook Form
 */
export const usePreApprovalRHF = ({ onSuccess, onError }) => {
    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm({
        defaultValues: PreApprovalInitialValues,
        resolver: yupResolver(PreApprovalSchema),
        mode: 'onBlur'
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'services'
    });

    const onSubmit = async (data) => {
        try {
            const result = await PreApprovalService.create(data);
            if (data.pendingFiles?.length > 0) {
                await PreApprovalService.uploadAttachments(result.id, data.pendingFiles);
            }
            onSuccess(result);
        } catch (err) {
            onError(err);
        }
    };

    const addService = (service) => {
        const exists = fields.some(s => s.id === service.id);
        if (!exists) {
            append({ ...service, quantity: 1 });
        }
    };

    const updateQuantity = (index, quantity) => {
        const service = fields[index];
        update(index, { ...service, quantity: Math.max(1, quantity) });
    };

    const calculateTotal = () => {
        return fields.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    };

    return {
        register,
        handleSubmit: handleSubmit(onSubmit),
        control,
        errors,
        isSubmitting,
        services: fields,
        addService,
        removeService: remove,
        updateQuantity,
        calculateTotal,
        setValue
    };
};
