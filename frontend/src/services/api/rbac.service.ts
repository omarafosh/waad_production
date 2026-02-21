import axiosClient from 'utils/axios';
import { createErrorHandler } from 'utils/api-error-handler';

// ==============================|| RBAC API SERVICE ||============================== //

const BASE_URL = '/api/admin';

const handleRbacErrors = createErrorHandler('الصلاحيات', {
    403: 'عفواً، لا تملك الصلاحية الكافية لهذه العملية',
    404: 'السجل غير موجود'
});

const unwrap = (response) => response.data?.data || response.data;

export const rbacService = {
    // ----------------------------------------------------------------------
    // PERMISSION MATRIX
    // ----------------------------------------------------------------------
    getPermissionMatrix: async () => {
        try {
            const response = await axiosClient.get(`${BASE_URL}/permission-matrix`);
            return unwrap(response);
        } catch (error) {
            throw handleRbacErrors(error);
        }
    },

    assignPermissionToRole: async (roleId, permissionId) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/permission-matrix/assign`, { roleId, permissionId });
            return unwrap(response);
        } catch (error) {
            throw handleRbacErrors(error);
        }
    },

    removePermissionFromRole: async (roleId, permissionId) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/permission-matrix/remove`, { roleId, permissionId });
            return unwrap(response);
        } catch (error) {
            throw handleRbacErrors(error);
        }
    },

    getRoles: async () => {
        try {
            const response = await axiosClient.get(`${BASE_URL}/roles`);
            return unwrap(response);
        } catch (error) {
            throw handleRbacErrors(error);
        }
    },

    getPermissions: async () => {
        try {
            const response = await axiosClient.get(`${BASE_URL}/permissions`);
            return unwrap(response);
        } catch (error) {
            throw handleRbacErrors(error);
        }
    }
};

export default rbacService;
