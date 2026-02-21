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
 * - Uses /api/v1/pdf/settings/active endpoint for active company settings
 * - Eliminates 404 errors and user confusion
 *
 * DTOs per Contract:
 * - CompanyDto: id, name, code, active, isDefault, logoUrl, phone, email,
 *               address, website, businessType, taxNumber, createdAt, updatedAt
 *
 * Endpoints per Contract:
 * - GET  /api/v1/pdf/settings/active - جلب إعدادات الشركة النشطة
 * - POST /api/v1/pdf/settings        - إنشاء إعدادات شركة
 * - GET  /api/v1/pdf/settings/{id}   - جلب إعدادات بالمعرف
 * - PUT  /api/v1/pdf/settings/{id}   - تحديث إعدادات شركة
 * - DELETE /api/v1/pdf/settings/{id} - حذف إعدادات شركة
 *
 * @created 2026-01-02
 * @updated 2026-02-16 - Aligned with backend PdfCompanySettings endpoints
 */

const BASE_URL = '/pdf/settings';

const mapPdfSettingsToCompanyDto = (settings = {}) => ({
  id: settings.id ?? null,
  name: settings.companyName || '',
  code: settings.code || 'WAAD',
  active: settings.isActive ?? true,
  isDefault: settings.isActive ?? true,
  logoUrl: settings.logoUrl || null,
  phone: settings.phone || '',
  email: settings.email || '',
  address: settings.address || '',
  website: settings.website || '',
  businessType: settings.businessType || '',
  taxNumber: settings.taxNumber || '',
  createdAt: settings.createdAt || null,
  updatedAt: settings.updatedAt || null
});

const mapCompanyUpdateToPdfSettings = (data = {}) => ({
  companyName: data.name,
  logoUrl: data.logoUrl,
  address: data.address,
  phone: data.phone,
  email: data.email,
  website: data.website,
  isActive: data.active
});

// ============================================================================
// PUBLIC SETTINGS (NO AUTHENTICATION REQUIRED)
// ============================================================================

/**
 * Get public company settings for login page and unauthenticated UI.
 * CONTRACT: GET /api/v1/pdf/settings/active
 *
 * This endpoint does NOT require authentication.
 * Returns only branding info (name, logo, colors).
 * Use this for login page, public pages, etc.
 *
 * @returns {Promise<Object>} PublicCompanySettingsDto
 */
const getPublicSettings = async () => {
  try {
    const response = await axiosClient.get('/pdf/settings/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching public company settings:', error);
    throw error;
  }
};

// ============================================================================
// DEFAULT COMPANY (AUTHENTICATED - SINGLE-COMPANY CONTEXT)
// ============================================================================

/**
 * Get the system's active company settings.
 * CONTRACT: GET /api/v1/pdf/settings/active
 *
 * This is the PREFERRED method for single-company mode.
 * Always returns 200 OK (never 404).
 * Call once at app startup and cache the result.
 *
 * @returns {Promise<Object>} Default company (CompanyDto)
 */
const getDefaultCompany = async () => {
  try {
    const response = await axiosClient.get(`${BASE_URL}/active`);
    const payload = response?.data;
    const settings = payload?.data || payload;

    return {
      success: true,
      message: payload?.message || 'Company loaded successfully',
      data: mapPdfSettingsToCompanyDto(settings)
    };
  } catch (error) {
    console.error('Error fetching default company:', error);
    throw error;
  }
};

/**
 * Update active company settings.
 * CONTRACT: PUT /api/v1/pdf/settings/{id}
 *
 * @param {Object} data - Updated company data (CompanyDto fields)
 * @returns {Promise<Object>} Updated company (CompanyDto)
 */
const updateDefaultCompany = async (data) => {
  try {
    const id = data?.id;
    const payload = mapCompanyUpdateToPdfSettings(data);

    let response;
    if (id) {
      response = await axiosClient.put(`${BASE_URL}/${id}`, payload);
    } else {
      response = await axiosClient.post(BASE_URL, {
        ...payload,
        isActive: payload.isActive ?? true
      });
    }

    const body = response?.data;
    const settings = body?.data || body;

    return {
      success: true,
      message: body?.message || 'Company updated successfully',
      data: mapPdfSettingsToCompanyDto(settings)
    };
  } catch (error) {
    console.error('Error updating default company:', error);
    throw error;
  }
};

// ============================================================================
// COMPANY CRUD OPERATIONS
// ============================================================================

/**
 * Get all settings records
 * CONTRACT: GET /api/v1/pdf/settings
 * @returns {Promise<Array>} List of companies (CompanyDto[])
 */
const getAll = async () => {
  try {
    const response = await axiosClient.get(BASE_URL);
    const body = response?.data;
    const list = body?.data || body || [];
    return {
      success: true,
      data: Array.isArray(list) ? list.map(mapPdfSettingsToCompanyDto) : []
    };
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
    const body = response?.data;
    const settings = body?.data || body;
    return {
      success: true,
      data: mapPdfSettingsToCompanyDto(settings)
    };
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
  return getDefaultCompany();
};

/**
 * Create new company
 * CONTRACT: POST /api/companies
 * @param {Object} data - Company data (CompanyDto without id, createdAt, updatedAt)
 * @returns {Promise<Object>} Created company (CompanyDto)
 */
const create = async (data) => {
  try {
    const payload = mapCompanyUpdateToPdfSettings(data);
    const response = await axiosClient.post(BASE_URL, {
      ...payload,
      isActive: payload.isActive ?? true
    });
    const body = response?.data;
    const settings = body?.data || body;
    return {
      success: true,
      data: mapPdfSettingsToCompanyDto(settings)
    };
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
  return updateDefaultCompany({ id, ...data });
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
    const body = response?.data;
    const settings = body?.data || body;
    return {
      success: true,
      data: mapPdfSettingsToCompanyDto(settings)
    };
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
    const response = await axiosClient.put(`${BASE_URL}/${id}`, { isActive: false });
    const body = response?.data;
    const settings = body?.data || body;
    return {
      success: true,
      data: mapPdfSettingsToCompanyDto(settings)
    };
  } catch (error) {
    console.error(`Error deactivating company ${id}:`, error);
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const companyService = {
  // Public settings (no auth required - for login page)
  getPublicSettings,

  // Default company (authenticated - preferred for single-company mode)
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
