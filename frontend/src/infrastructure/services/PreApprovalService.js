import axiosClient from 'utils/axios';

/**
 * Pre-Approval Infrastructure Service
 */
export const PreApprovalService = {
    /**
     * Create a new Pre-Approval
     */
    create: async (payload) => {
        const response = await axiosClient.post('/pre-authorizations', payload);
        return response.data?.data || response.data;
    },

    /**
     * Upload attachments for a Pre-Approval
     */
    uploadAttachments: async (id, files) => {
        for (const { file, type } of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('attachmentType', type);
            await axiosClient.post(`/pre-authorizations/${id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
    },

    /**
     * Fetch services requiring pre-approval
     */
    getServicesRequiringPreAuth: async (memberId, providerId, isProviderPortal = false) => {
        const endpoint = isProviderPortal
            ? '/provider/my-contract/services/requiring-preauth'
            : `/providers/${providerId}/contract/services/requiring-preauth`;

        const response = await axiosClient.get(endpoint, { params: { memberId } });
        const data = response.data?.data || response.data;
        const items = Array.isArray(data) ? data : (data?.content || data?.items || []);

        return items.map(item => ({
            id: item.medicalServiceId || item.id,
            pricingItemId: item.id,
            code: item.serviceCode || item.medicalService?.code,
            name: item.serviceName || item.medicalService?.name,
            category: item.categoryName || item.medicalService?.category?.name,
            price: item.contractPrice,
            hasContract: true,
            displayLabel: `${item.serviceCode || item.medicalService?.code} - ${item.serviceName || item.medicalService?.name}`
        }));
    },

    /**
     * Fetch price for a specific service
     */
    getServicePrice: async (providerId, serviceCode, visitDate, isProviderPortal = false) => {
        const endpoint = isProviderPortal
            ? `/provider/my-services/${serviceCode}/price`
            : `/providers/${providerId}/services/${serviceCode}/price`;

        const response = await axiosClient.get(endpoint, { params: { date: visitDate } });
        const priceData = response.data?.data || response.data;
        return {
            price: priceData?.contractPrice || 0,
            hasContract: priceData?.hasContract || false
        };
    }
};
