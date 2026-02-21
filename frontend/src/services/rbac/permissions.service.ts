/**
 * ============================================================================
 * RBAC Permissions Service
 * ============================================================================
 * 
 * CONTRACT: ROLE_PERMISSION_API_CONTRACT.md
 * 
 * Responsible for: Permission entity CRUD operations
 * Backend: PermissionController (/api/admin/permissions)
 *
 * DTOs per Contract:
 * - PermissionResponseDto: id, name, description, createdAt, updatedAt
 * - PermissionCreateDto: name (required), description?
 *
 * Endpoints per Contract:
 * - GET  /api/admin/permissions              - قائمة كل الصلاحيات
 * - GET  /api/admin/permissions/paginate     - مع pagination (0-based!)
 * - GET  /api/admin/permissions/{id}         - جلب صلاحية
 * - GET  /api/admin/permissions/search       - بحث
 * - POST /api/admin/permissions              - إنشاء
 * - PUT  /api/admin/permissions/{id}         - تحديث
 * - DELETE /api/admin/permissions/{id}       - حذف
 *
 * ⚠️ CRITICAL: Backend uses 0-based pagination!
 *
 * @updated 2026-01-13 - Aligned with ROLE_PERMISSION_API_CONTRACT.md
 */

import axiosServices from '../../utils/axios';

const BASE_URL = '/admin/permissions';

export const permissionsService = {
  /**
   * Get all permissions (list)
   * CONTRACT: GET /api/admin/permissions
   * @returns {Promise<PermissionResponseDto[]>}
   */
  getAllPermissions: () => {
    return axiosServices.get(BASE_URL);
  },

  /**
   * Get permission by ID
   * CONTRACT: GET /api/admin/permissions/{id}
   * @param {number} id - Permission ID
   * @returns {Promise<PermissionResponseDto>}
   */
  getPermissionById: (id) => {
    return axiosServices.get(`${BASE_URL}/${id}`);
  },

  /**
   * Create new permission
   * CONTRACT: POST /api/admin/permissions
   * @param {PermissionCreateDto} permissionData - { name, description? }
   * @returns {Promise<PermissionResponseDto>}
   */
  createPermission: (permissionData) => {
    return axiosServices.post(BASE_URL, permissionData);
  },

  /**
   * Update permission
   * CONTRACT: PUT /api/admin/permissions/{id}
   * @param {number} id - Permission ID
   * @param {PermissionCreateDto} permissionData - { name, description? }
   * @returns {Promise<PermissionResponseDto>}
   */
  updatePermission: (id, permissionData) => {
    return axiosServices.put(`${BASE_URL}/${id}`, permissionData);
  },

  /**
   * Delete permission
   * CONTRACT: DELETE /api/admin/permissions/{id}
   * @param {number} id - Permission ID
   */
  deletePermission: (id) => {
    return axiosServices.delete(`${BASE_URL}/${id}`);
  },

  /**
   * Search permissions
   * CONTRACT: GET /api/admin/permissions/search?query={query}
   * @param {string} query - Search term
   * @returns {Promise<PermissionResponseDto[]>}
   */
  searchPermissions: (query) => {
    return axiosServices.get(`${BASE_URL}/search`, {
      params: { query }
    });
  },

  /**
   * Get permissions paginated (raw)
   * CONTRACT: GET /api/admin/permissions/paginate
   * 
   * ⚠️ Backend uses 0-based pagination!
   * 
   * @param {number} page - Page number (0-based)
   * @param {number} size - Page size
   * @returns {Promise<SpringPage<PermissionResponseDto>>}
   */
  getPermissionsPaginated: (page = 0, size = 10) => {
    return axiosServices.get(`${BASE_URL}/paginate`, {
      params: { page, size }
    });
  },

  /**
   * Get permissions paginated for TbaDataTable
   * CONTRACT: GET /api/admin/permissions/paginate
   *
   * ⚠️ Pagination Conversion:
   * - Frontend uses 1-based page (UI friendly)
   * - Backend uses 0-based page (Spring standard)
   * 
   * @param {Object} params - { page, size, sortBy, sortDir, search }
   * @returns {Promise<{ items, total, page, size }>}
   */
  getPermissionsTable: async (params) => {
    const { page = 1, size = 20, sortBy = 'id', sortDir = 'asc', search = '' } = params || {};
    
    // Convert 1-based (frontend) to 0-based (backend)
    const backendPage = Math.max(0, page - 1);
    
    const response = await axiosServices.get(`${BASE_URL}/paginate`, {
      params: { page: backendPage, size, sortBy, sortDir, search }
    });
    
    // Unwrap ApiResponse and transform Spring Page to TbaDataTable format
    const pageData = response?.data?.data || response?.data || {};
    return {
      items: pageData?.content || [],
      total: pageData?.totalElements || 0,
      page: (pageData?.number || 0) + 1, // Convert back to 1-based
      size: pageData?.size || size
    };
  }
};

export default permissionsService;
