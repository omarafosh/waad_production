import axiosClient from 'utils/axios';

const BASE_URL = '/benefit-policies';

const unwrap = (response) => response.data?.data || response.data;

/**
 * Get all distributions for a policy
 */
export const getCoverageDistributions = async (policyId) => {
    const response = await axiosClient.get(`${BASE_URL}/${policyId}/distributions`);
    return unwrap(response);
};

/**
 * Add a new distribution to a policy
 */
export const addCoverageDistribution = async (policyId, payload) => {
    const response = await axiosClient.post(`${BASE_URL}/${policyId}/distributions`, payload);
    return unwrap(response);
};

/**
 * Remove a distribution
 */
export const deleteCoverageDistribution = async (policyId, id) => {
    const response = await axiosClient.delete(`${BASE_URL}/${policyId}/distributions/${id}`);
    return unwrap(response);
};

export default {
    getCoverageDistributions,
    addCoverageDistribution,
    deleteCoverageDistribution
};
