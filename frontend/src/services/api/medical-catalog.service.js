import axiosClient from 'utils/axios';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

/**
 * Medical Catalog & Mapping API Service
 * Backend: MedicalCatalogController.java & ProviderMappingController.java
 */
const BASE_URL = '/catalog';

/**
 * Helper function to unwrap ApiResponse
 */
const unwrap = (response) => response.data?.data || response.data;

/**
 * Get filtered raw services (providers' services)
 * @param {Object} params - Search parameters
 */
export const getFilteredServices = async (params = {}) => {
    const response = await axiosClient.get(`${BASE_URL}/services`, { params });
    return normalizePaginatedResponse(response);
};

/**
 * Get unmapped services (prioritized)
 */
export const getUnmappedServices = async (params = {}) => {
    const response = await axiosClient.get(`${BASE_URL}/unmapped`, { params });
    return normalizePaginatedResponse(response);
};

/**
 * Manual map a service
 * @param {Object} payload - MappingRequestDto
 * @param {Array<number>} payload.rawServiceIds
 * @param {number} payload.masterServiceId
 * @param {number} payload.confidence
 * @param {string} payload.reasonCode
 */
export const mapService = async (payload) => {
    const response = await axiosClient.post(`${BASE_URL}/map`, payload);
    return unwrap(response);
};

/**
 * Unmap services
 * @param {Array<number>} rawServiceIds 
 */
export const unmapServices = async (rawServiceIds) => {
    const response = await axiosClient.post(`${BASE_URL}/unmap`, rawServiceIds);
    return unwrap(response);
};

/**
 * Upload raw services from Excel/CSV
 * @param {File} file 
 * @param {number} providerId 
 */
export const uploadRawServices = async (file, providerId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('providerId', providerId);

    const response = await axiosClient.post(`${BASE_URL}/upload-raw`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return unwrap(response);
};

/**
 * Assign category to raw service
 */
export const assignRawServiceCategory = async (id, categoryName) => {
    const response = await axiosClient.post(`${BASE_URL}/raw/${id}/category`, null, {
        params: { categoryName }
    });
    return unwrap(response);
};

/**
 * Get catalog mapping statistics
 */
export const getCatalogStats = async () => {
    const response = await axiosClient.get(`${BASE_URL}/stats`);
    return unwrap(response);
};

/**
 * Resolve provider code to master service
 */
export const resolveService = async (providerId, providerServiceCode) => {
    const response = await axiosClient.get(`/medical-catalog/resolve`, {
        params: { providerId, providerServiceCode }
    });
    return unwrap(response);
};

/**
 * Get all mappings for a provider
 */
export const getProviderMappings = async (providerId) => {
    const response = await axiosClient.get(`/medical-catalog/mappings/provider/${providerId}`);
    return unwrap(response);
};

export const medicalCatalogService = {
    getFilteredServices,
    getUnmappedServices,
    mapService,
    unmapServices,
    uploadRawServices,
    assignRawServiceCategory,
    getCatalogStats,
    resolveService,
    getProviderMappings
};
