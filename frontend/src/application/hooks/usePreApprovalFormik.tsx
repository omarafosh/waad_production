import { useFormik } from 'formik';
import { PreApprovalInitialValues } from 'domain/pre-approval/models';
import { PreApprovalSchema } from 'domain/pre-approval/validation';
import { PreApprovalService } from 'infrastructure/services/PreApprovalService';

/**
 * Hook for Pre-Approval Form Logic using Formik
 */
export const usePreApprovalFormik = ({ onSuccess, onError }) => {
    const formik = useFormik({
        initialValues: PreApprovalInitialValues,
        validationSchema: PreApprovalSchema,
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const result = await PreApprovalService.create(values);
                if (values.pendingFiles?.length > 0) {
                    await PreApprovalService.uploadAttachments(result.id, values.pendingFiles);
                }
                onSuccess(result);
            } catch (error) {
                onError(error);
            } finally {
                setSubmitting(false);
            }
        }
    });

    const addService = (service) => {
        const exists = formik.values.services.some(s => s.id === service.id);
        if (!exists) {
            formik.setFieldValue('services', [...formik.values.services, { ...service, quantity: 1 }]);
        }
    };

    const removeService = (index) => {
        const updated = formik.values.services.filter((_, i) => i !== index);
        formik.setFieldValue('services', updated);
    };

    const updateQuantity = (index, quantity) => {
        const updated = formik.values.services.map((s, i) =>
            i === index ? { ...s, quantity: Math.max(1, quantity) } : s
        );
        formik.setFieldValue('services', updated);
    };

    const calculateTotal = () => {
        return formik.values.services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    };

    return {
        formik,
        addService,
        removeService,
        updateQuantity,
        calculateTotal,
        isSubmitting: formik.isSubmitting
    };
};
