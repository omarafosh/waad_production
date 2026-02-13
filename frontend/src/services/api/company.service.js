import axiosClient from 'utils/axios';

/**
 * ============================================================================
 * Company API Service - Single Company Context
 * ============================================================================
 *
 * CONTRACT: COMPANY_API_CONTRACT.md
 * 
 * Service for managing TBA company information and settings.
 *
 * Architecture Philosophy:
 * - System operates in single-company mode
 * - Company context is implicit (no selection needed)
 * - Uses /api/companies/default endpoint for default company
 * - Eliminates 404 errors and user confusion
 *
 * DTOs per Contract:
 * - CompanyDto: id, name, code, active, isDefault, logoUrl, phone, email, 
 *               address, website, businessType, taxNumber, createdAt, updatedAt
 *
 * Endpoints per Contract:
 * - GET  /api/companies/default      - جلب الشركة الافتراضية
 * - PUT  /api/companies/default      - تحديث الشركة الافتراضية
 * - GET  /api/companies              - جلب كل الشركات
 * - POST /api/companies              - إنشاء شركة
 * - GET  /api/companies/{id}         - جلب شركة بالمعرف
 * - GET  /api/companies/code/{code}  - جلب شركة بالكود
 * - PUT  /api/companies/{id}         - تحديث شركة
 * - DELETE /api/companies/{id}       - حذف شركة
 * - PATCH /api/companies/{id}/activate    - تفعيل شركة
 * - PATCH /api/companies/{id}/deactivate  - إلغاء تفعيل شركة
 *
 * @created 2026-01-02
 * @updated 2026-01-13 - Aligned with COMPANY_API_CONTRACT.md
 */

const BASE_URL = '/companies';

// ============================================================================
// DEFAULT COMPANY (SINGLE-COMPANY CONTEXT)
// ============================================================================

/**
 * Get the system's default company.
 * CONTRACT: GET /api/companies/default
 * 
 * This is the PREFERRED method for single-company mode.
 * Always returns 200 OK (never 404).
 * Call once at app startup and cache the result.
 * 
 * @returns {Promise<Object>} Default company (CompanyDto)
 */
const getDefaultCompany = async () => {
  try {
    const response = await axiosClient.get(`${BASE_URL}/default`);
    return response.data;
  } catch (error) {
    console.error('Error fetching default company:', error);
    throw error;
  }
};

/**
 * Update the default company.
 * CONTRACT: PUT /api/companies/default
 * 
 * @param {Object} data - Updated company data (CompanyDto fields)
 * @returns {Promise<Object>} Updated company (CompanyDto)
 */
const updateDefaultCompany = async (data) => {
  try {
    const response = await axiosClient.put(`${BASE_URL}/default`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating default company:', error);
    throw error;
  }
};

// ============================================================================
// COMPANY CRUD OPERATIONS
// ============================================================================

/**
 * Get all companies
 * CONTRACT: GET /api/companies
 * @returns {Promise<Array>} List of companies (CompanyDto[])
 */
const getAll = async () => {
  try {
    const response = await axiosClient.get(BASE_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

/**
 * Get company by ID
 * CONTRACT: GET /api/companies/{id}
 * @param {number} id - Company ID
 * @returns {Promise<Object>} Company details (CompanyDto)
 */
const getById = async (id) => {
  try {
    const response = await axiosClient.get(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching company ${id}:`, error);
    throw error;
  }
};

/**
 * Get company by code
 * CONTRACT: GET /api/companies/code/{code}
 * @param {string} code - Company code (e.g., "WAAD")
 * @returns {Promise<Object>} Company details (CompanyDto)
 */
const getByCode = async (code) => {
  try {
    const response = await axiosClient.get(`${BASE_URL}/code/${code}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching company with code ${code}:`, error);
    throw error;
  }
};

/**
 * Create new company
 * CONTRACT: POST /api/companies
 * @param {Object} data - Company data (CompanyDto without id, createdAt, updatedAt)
 * @returns {Promise<Object>} Created company (CompanyDto)
 */
const create = async (data) => {
  try {
    const response = await axiosClient.post(BASE_URL, data);
    return response.data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};

/**
 * Update existing company
 * CONTRACT: PUT /api/companies/{id}
 * @param {number} id - Company ID
 * @param {Object} data - Updated company data
 * @returns {Promise<Object>} Updated company (CompanyDto)
 */
const update = async (id, data) => {
  try {
    const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating company ${id}:`, error);
    throw error;
  }
};

/**
 * Delete company
 * CONTRACT: DELETE /api/companies/{id}
 * @param {number} id - Company ID
 * @returns {Promise<void>}
 */
const remove = async (id) => {
  try {
    await axiosClient.delete(`${BASE_URL}/${id}`);
  } catch (error) {
    console.error(`Error deleting company ${id}:`, error);
    throw error;
  }
};

/**
 * Activate company
 * CONTRACT: PATCH /api/companies/{id}/activate
 * @param {number} id - Company ID
 * @returns {Promise<Object>} Updated company
 */
const activate = async (id) => {
  try {
    const response = await axiosClient.patch(`${BASE_URL}/${id}/activate`);
    return response.data;
  } catch (error) {
    console.error(`Error activating company ${id}:`, error);
    throw error;
  }
};

/**
 * Deactivate company
 * CONTRACT: PATCH /api/companies/{id}/deactivate
 * @param {number} id - Company ID
 * @returns {Promise<Object>} Updated company
 */
const deactivate = async (id) => {
  try {
    const response = await axiosClient.patch(`${BASE_URL}/${id}/deactivate`);
    return response.data;
  } catch (error) {
    console.error(`Error deactivating company ${id}:`, error);
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const companyService = {
  // Default company (preferred for single-company mode)
  getDefaultCompany,
  updateDefaultCompany,
  
  // Legacy alias for backward compatibility
  getSystemCompany: getDefaultCompany,
  
  // CRUD operations
  getAll,
  getById,
  getByCode,
  create,
  update,
  delete: remove,
  
  // Activation
  activate,
  deactivate
};

export default companyService;
