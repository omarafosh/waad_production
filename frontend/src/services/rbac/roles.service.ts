/**
 * ============================================================================
 * RBAC Roles Service
 * ============================================================================
 * 
 * CONTRACT: ROLE_PERMISSION_API_CONTRACT.md
 * 
 * Responsible for: Role entity CRUD operations
 * Backend: RoleController (/api/admin/roles)
 *
 * DTOs per Contract:
 * - RoleResponseDto: id, name, description, permissions[], createdAt, updatedAt
 * - RoleCreateDto: name (required), description?
 * - AssignPermissionsDto: permissionIds[] (required)
 *
 * Endpoints per Contract:
 * - GET  /api/admin/roles              - قائمة كل الأدوار
 * - GET  /api/admin/roles/paginate     - مع pagination (0-based!)
 * - GET  /api/admin/roles/{id}         - جلب دور
 * - GET  /api/admin/roles/search       - بحث
 * - POST /api/admin/roles              - إنشاء
 * - PUT  /api/admin/roles/{id}         - تحديث
 * - DELETE /api/admin/roles/{id}       - حذف
 * - POST /api/admin/roles/{id}/assign-permissions - إسناد صلاحيات
 *
 * ⚠️ CRITICAL: Backend uses 0-based pagination!
 * - Frontend sends page 1 → Backend receives page 0
 * - Backend returns Spring Page format (content, totalElements)
 *
 * @updated 2026-01-13 - Aligned with ROLE_PERMISSION_API_CONTRACT.md
 */

import axiosServices from '../../utils/axios';

const BASE_URL = '/admin/roles';

export const rolesService = {
  /**
   * Get all roles (list)
   * CONTRACT: GET /api/admin/roles
   * @returns {Promise<RoleResponseDto[]>}
   */
  getAllRoles: () => {
    return axiosServices.get(BASE_URL);
  },

  /**
   * Get role by ID
   * CONTRACT: GET /api/admin/roles/{id}
   * @param {number} id - Role ID
   * @returns {Promise<RoleResponseDto>}
   */
  getRoleById: (id) => {
    return axiosServices.get(`${BASE_URL}/${id}`);
  },

  /**
   * Create new role
   * CONTRACT: POST /api/admin/roles
   * @param {RoleCreateDto} roleData - { name, description? }
   * @returns {Promise<RoleResponseDto>}
   */
  createRole: (roleData) => {
    return axiosServices.post(BASE_URL, roleData);
  },

  /**
   * Update role
   * CONTRACT: PUT /api/admin/roles/{id}
   * @param {number} id - Role ID
   * @param {RoleCreateDto} roleData - { name, description? }
   * @returns {Promise<RoleResponseDto>}
   */
  updateRole: (id, roleData) => {
    return axiosServices.put(`${BASE_URL}/${id}`, roleData);
  },

  /**
   * Delete role
   * CONTRACT: DELETE /api/admin/roles/{id}
   * @param {number} id - Role ID
   */
  deleteRole: (id) => {
    return axiosServices.delete(`${BASE_URL}/${id}`);
  },

  /**
   * Search roles
   * CONTRACT: GET /api/admin/roles/search?query={query}
   * @param {string} query - Search term
   * @returns {Promise<RoleResponseDto[]>}
   */
  searchRoles: (query) => {
    return axiosServices.get(`${BASE_URL}/search`, {
      params: { query }
    });
  },

  /**
   * Get roles paginated (raw)
   * CONTRACT: GET /api/admin/roles/paginate
   * 
   * ⚠️ Backend uses 0-based pagination!
   * 
   * @param {number} page - Page number (0-based)
   * @param {number} size - Page size
   * @returns {Promise<SpringPage<RoleResponseDto>>}
   */
  getRolesPaginated: (page = 0, size = 10) => {
    return axiosServices.get(`${BASE_URL}/paginate`, {
      params: { page, size }
    });
  },

  /**
   * Assign permissions to role
   * CONTRACT: POST /api/admin/roles/{id}/assign-permissions
   * @param {number} id - Role ID
   * @param {number[]} permissionIds - Permission IDs to assign
   * @returns {Promise<RoleResponseDto>}
   */
  assignPermissions: (id, permissionIds) => {
    return axiosServices.post(`${BASE_URL}/${id}/assign-permissions`, {
      permissionIds
    });
  },

  /**
   * Remove permissions from role
   * POST /api/admin/roles/{id}/remove-permissions
   * @param {number} id - Role ID
   * @param {number[]} permissionIds - Permission IDs to remove
   */
  removePermissions: (id, permissionIds) => {
    return axiosServices.post(`${BASE_URL}/${id}/remove-permissions`, {
      permissionIds
    });
  },

  /**
   * Get roles paginated for TbaDataTable
   * CONTRACT: GET /api/admin/roles/paginate
   *
   * ⚠️ Pagination Conversion:
   * - Frontend uses 1-based page (UI friendly)
   * - Backend uses 0-based page (Spring standard)
   * - This method converts automatically!
   * 
   * ⚠️ Response Format Conversion:
   * - Backend returns: { content: [], totalElements: N } (Spring Page)
   * - Frontend expects: { items: [], total: N } (TbaDataTable)
   * - This method transforms automatically!
   *
   * @param {Object} params - { page, size, sortBy, sortDir, search }
   * @returns {Promise<{ items, total, page, size }>}
   */
  getRolesTable: async (params) => {
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

export default rolesService;
