import axiosClient from 'utils/axios';

// ==============================|| REVIEWER COMPANIES SERVICE ||============================== //

const BASE_URL = '/reviewer-companies';

/**
 * Helper function to unwrap ApiResponse
 * Backend returns: { status: "success", data: {...}, message: "...", timestamp: "..." }
 */
const unwrap = (response) => response.data?.data || response.data;

export const reviewersService = {
  /**
   * Get paginated reviewer companies
   * @param {Object} params - Query parameters {page, size, search, sortBy, sortDir}
   * @returns {Promise<Object>} Pagination response {items, total, page, size}
   */
  getAll: async (params = {}) => {
    const response = await axiosClient.get(BASE_URL, { params });
    return unwrap(response);
  },

  /**
   * Get reviewer company by ID
   * @param {number} id - Reviewer company ID
   * @returns {Promise<Object>} Reviewer company details
   */
  getById: async (id) => {
    const response = await axiosClient.get(`${BASE_URL}/${id}`);
    return unwrap(response);
  },

  /**
   * Create new reviewer company
   * @param {Object} data - Reviewer company data
   * @returns {Promise<Object>} Created reviewer company
   */
  create: async (data) => {
    const response = await axiosClient.post(BASE_URL, data);
    return unwrap(response);
  },

  /**
   * Update reviewer company
   * @param {number} id - Reviewer company ID
   * @param {Object} data - Updated reviewer company data
   * @returns {Promise<Object>} Updated reviewer company
   */
  update: async (id, data) => {
    const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
    return unwrap(response);
  },

  /**
   * Delete reviewer company
   * @param {number} id - Reviewer company ID
   * @returns {Promise<void>}
   */
  remove: async (id) => {
    const response = await axiosClient.delete(`${BASE_URL}/${id}`);
    return unwrap(response);
  },

  /**
   * Search reviewer companies
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Filtered reviewer companies
   */
  search: async (searchTerm) => {
    const response = await axiosClient.get(`${BASE_URL}/search?q=${encodeURIComponent(searchTerm)}`);
    return unwrap(response);
  }
};

export default reviewersService;
