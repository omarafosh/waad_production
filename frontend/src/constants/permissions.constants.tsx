/**
 * Centralized Permission Constants
 *
 * ENTERPRISE-GRADE RBAC Permission System
 *
 * These constants MUST match backend authority names exactly.
 * Backend uses: @PreAuthorize("hasAuthority('MANAGE_EMPLOYERS')")
 *
 * Permission Naming Convention:
 * - MANAGE_* = Full CRUD access (Create, Read, Update, Delete)
 * - VIEW_* = Read-only access
 *
 * Usage:
 * import { PERMISSIONS, ROLES, hasPermission, canCreate } from 'constants/permissions.constants';
 */

// ============================================================================
// ROLES - User Role Constants
// ============================================================================

import { SystemRole as ROLES } from './rbac';

export { ROLES };

// ============================================================================
// PERMISSIONS - Granular Authority Constants (Match Backend Exactly)
// ============================================================================

export const PERMISSIONS = {
  // ========== Employers ==========
  // Employers (Unified)
  EMPLOYER_VIEW: 'EMPLOYER_VIEW',
  EMPLOYER_CREATE: 'EMPLOYER_CREATE',
  EMPLOYER_EDIT: 'EMPLOYER_EDIT',
  EMPLOYER_DELETE: 'EMPLOYER_DELETE',
  EMPLOYER_EXPORT: 'EMPLOYER_EXPORT',

  // Legacy (Keep for backward compatibility during migration if UI still uses them, but update to map to new ones)
  VIEW_EMPLOYERS: 'EMPLOYER_VIEW',
  MANAGE_EMPLOYERS: 'EMPLOYER_CREATE', // Map to create for now, or just use new constants in UI

  // ========== Members ==========
  MEMBER_VIEW: 'MEMBER_VIEW',
  MEMBER_CREATE: 'MEMBER_CREATE',
  MEMBER_EDIT: 'MEMBER_EDIT',
  MEMBER_DELETE: 'MEMBER_DELETE',
  MEMBER_EXPORT: 'MEMBER_EXPORT',
  MEMBER_IMPORT: 'MEMBER_IMPORT',
  // Legacy aliases (for backwards compatibility)
  MANAGE_MEMBERS: 'MEMBER_CREATE', // Maps to CREATE for guards
  VIEW_MEMBERS: 'MEMBER_VIEW',
  IMPORT_MEMBERS: 'MEMBER_IMPORT',

  // ========== Providers ==========
  PROVIDER_VIEW: 'PROVIDER_VIEW',
  PROVIDER_CREATE: 'PROVIDER_CREATE',
  PROVIDER_EDIT: 'PROVIDER_UPDATE',
  PROVIDER_DELETE: 'PROVIDER_DELETE',
  PROVIDER_MANAGE: 'PROVIDER_MANAGE',
  // Legacy aliases
  VIEW_PROVIDERS: 'PROVIDER_VIEW',
  MANAGE_PROVIDERS: 'PROVIDER_MANAGE',

  // ========== Provider Contracts ==========
  PROVIDER_CONTRACT_VIEW: 'PROVIDER_CONTRACT_VIEW',
  PROVIDER_CONTRACT_CREATE: 'PROVIDER_CONTRACT_CREATE',
  PROVIDER_CONTRACT_MANAGE: 'PROVIDER_CONTRACT_MANAGE',
  // Legacy
  VIEW_PROVIDER_CONTRACTS: 'PROVIDER_CONTRACT_VIEW',
  MANAGE_PROVIDER_CONTRACTS: 'PROVIDER_CONTRACT_MANAGE',

  // ========== Medical Services ==========
  MEDICAL_SERVICE_VIEW: 'MEDICAL_SERVICE_VIEW',
  MEDICAL_SERVICE_CREATE: 'MEDICAL_SERVICE_CREATE',
  MEDICAL_SERVICE_UPDATE: 'MEDICAL_SERVICE_UPDATE',
  MEDICAL_SERVICE_DELETE: 'MEDICAL_SERVICE_DELETE',
  // Legacy
  VIEW_MEDICAL_SERVICES: 'MEDICAL_SERVICE_VIEW',
  MANAGE_MEDICAL_SERVICES: 'MEDICAL_SERVICE_UPDATE',

  // ========== Medical Categories ==========
  MEDICAL_CATEGORY_VIEW: 'MEDICAL_CATEGORY_VIEW',
  MEDICAL_CATEGORY_MANAGE: 'MEDICAL_CATEGORY_MANAGE',
  // Legacy
  VIEW_MEDICAL_CATEGORIES: 'MEDICAL_CATEGORY_VIEW',
  MANAGE_MEDICAL_CATEGORIES: 'MEDICAL_CATEGORY_MANAGE',

  // ========== Medical Packages ==========
  MEDICAL_PACKAGE_VIEW: 'MEDICAL_PACKAGE_VIEW',
  MEDICAL_PACKAGE_CREATE: 'MEDICAL_PACKAGE_CREATE',
  MEDICAL_PACKAGE_MANAGE: 'MEDICAL_PACKAGE_MANAGE',
  // Legacy
  VIEW_MEDICAL_PACKAGES: 'MEDICAL_PACKAGE_VIEW',
  MANAGE_MEDICAL_PACKAGES: 'MEDICAL_PACKAGE_MANAGE',

  // ========== Benefit Packages ==========
  BENEFIT_PACKAGE_VIEW: 'BENEFIT_PACKAGE_VIEW',
  BENEFIT_PACKAGE_MANAGE: 'BENEFIT_PACKAGE_MANAGE',
  // Legacy
  VIEW_BENEFIT_PACKAGES: 'BENEFIT_PACKAGE_VIEW',
  MANAGE_BENEFIT_PACKAGES: 'BENEFIT_PACKAGE_MANAGE',

  // ========== Benefit Policies ==========
  BENEFIT_POLICY_VIEW: 'BENEFIT_POLICY_VIEW',
  BENEFIT_POLICY_CREATE: 'BENEFIT_POLICY_CREATE',
  BENEFIT_POLICY_MANAGE: 'BENEFIT_POLICY_MANAGE',
  // Legacy
  VIEW_BENEFIT_POLICIES: 'BENEFIT_POLICY_VIEW',
  MANAGE_BENEFIT_POLICIES: 'BENEFIT_POLICY_MANAGE',

  // ========== Claims ==========
  CLAIM_VIEW: 'CLAIM_VIEW',
  CLAIM_CREATE: 'CLAIM_CREATE',
  CLAIM_UPDATE: 'CLAIM_UPDATE',
  CLAIM_APPROVE: 'CLAIM_APPROVE',
  CLAIM_REJECT: 'CLAIM_REJECT',
  CLAIM_STATUS_VIEW: 'CLAIM_STATUS_VIEW',
  CLAIM_MANAGE: 'CLAIM_MANAGE',
  CLAIM_PORTAL_VIEW: 'CLAIM_PORTAL_VIEW',
  // Legacy aliases
  VIEW_CLAIMS: 'CLAIM_VIEW',
  CREATE_CLAIM: 'CLAIM_CREATE',
  UPDATE_CLAIM: 'CLAIM_UPDATE',
  APPROVE_CLAIMS: 'CLAIM_APPROVE',
  REJECT_CLAIMS: 'CLAIM_REJECT',
  VIEW_CLAIM_STATUS: 'CLAIM_STATUS_VIEW',
  MANAGE_CLAIMS: 'CLAIM_MANAGE',
  SETTLE_CLAIMS: 'SETTLEMENT_BATCH_CONFIRM', // Better mapping for settle

  // ========== Pre-Approvals ==========
  PREAUTH_VIEW: 'PREAUTH_VIEW',
  PREAUTH_CREATE: 'PREAUTH_CREATE',
  PREAUTH_UPDATE: 'PREAUTH_UPDATE',
  PREAUTH_APPROVE: 'PREAUTH_APPROVE',
  PREAUTH_REJECT: 'PREAUTH_REJECT',
  PREAUTH_MANAGE: 'PREAUTH_MANAGE',
  // Legacy
  VIEW_PRE_AUTH: 'PREAUTH_VIEW',
  CREATE_PRE_AUTH: 'PREAUTH_CREATE',
  APPROVE_PRE_AUTH: 'PREAUTH_APPROVE',
  REJECT_PRE_AUTH: 'PREAUTH_REJECT',
  MANAGE_PREAUTH: 'PREAUTH_MANAGE',

  // ========== Visits ==========
  VISIT_VIEW: 'VISIT_VIEW',
  VISIT_CREATE: 'VISIT_CREATE',
  VISIT_UPDATE: 'VISIT_UPDATE',
  VISIT_DELETE: 'VISIT_DELETE',
  VISIT_PORTAL_VIEW: 'VISIT_PORTAL_VIEW',
  // Legacy aliases
  MANAGE_VISITS: 'VISIT_CREATE',
  VIEW_VISITS: 'VISIT_VIEW',

  // ========== Settlements (Standardized to singular) ==========
  SETTLEMENT_VIEW: 'SETTLEMENT_VIEW',
  SETTLEMENT_CREATE: 'SETTLEMENT_CREATE',
  SETTLEMENT_UPDATE: 'SETTLEMENT_UPDATE',
  SETTLEMENT_BATCH_CONFIRM: 'SETTLEMENT_BATCH_CONFIRM',

  // ========== Users & RBAC ==========
  USER_VIEW: 'USER_VIEW',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  ROLE_VIEW: 'ROLE_VIEW',
  ROLE_CREATE: 'ROLE_CREATE',
  ROLE_UPDATE: 'ROLE_UPDATE',
  ROLE_DELETE: 'ROLE_DELETE',
  PERMISSION_VIEW: 'PERMISSION_VIEW',
  PERMISSION_MANAGE: 'PERMISSION_MANAGE',
  PERMISSION_ASSIGN: 'PERMISSION_ASSIGN',
  ROLE_ASSIGN: 'ROLE_ASSIGN',
  // Legacy
  MANAGE_USERS: 'USER_CREATE',
  VIEW_USERS: 'USER_VIEW',
  MANAGE_ROLES: 'ROLE_CREATE',
  VIEW_ROLES: 'ROLE_VIEW',

  // ========== System ==========
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  MANAGE_SETTINGS: 'MANAGE_SYSTEM_SETTINGS',
  REPORT_VIEW: 'REPORT_VIEW',
  VIEW_REPORTS: 'REPORT_VIEW',
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  BASIC_DATA_VIEW: 'BASIC_DATA_VIEW',

  // ========== Provider Portal ==========
  VIEW_PROVIDER_PORTAL: 'PROVIDER_PORTAL_VIEW',
  PROVIDER_PORTAL_VIEW: 'PROVIDER_PORTAL_VIEW'
};

// ============================================================================
// PERMISSION GROUPS - For common access patterns
// ============================================================================

/**
 * Permission groups for common operations
 * Use these for UI guards that check multiple related permissions
 */
export const PERMISSION_GROUPS = {
  // Full TPA Operations access
  TPA_FULL_ACCESS: [
    PERMISSIONS.MANAGE_EMPLOYERS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_PROVIDERS,
    PERMISSIONS.MANAGE_CLAIMS,
    PERMISSIONS.MANAGE_PRE_APPROVALS
  ],

  // Read-only dashboard access
  DASHBOARD_VIEW: [PERMISSIONS.VIEW_EMPLOYERS, PERMISSIONS.VIEW_MEMBERS, PERMISSIONS.VIEW_CLAIMS],

  // Medical network management
  MEDICAL_NETWORK_MANAGE: [
    'PROVIDER_MANAGE',
    'MEDICAL_SERVICE_UPDATE',
    'MEDICAL_CATEGORY_MANAGE',
    'MEDICAL_PACKAGE_MANAGE'
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with roles and permissions arrays
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;

  // SUPER_ADMIN bypasses all permission checks
  if (user.roles?.includes(ROLES.SUPER_ADMIN)) return true;

  // Check if user has the specific permission
  return user.permissions?.includes(permission) || false;
};

/**
 * Check if user has ANY of the specified permissions
 * @param {Object} user - User object
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissions) => {
  if (!user) return false;
  if (user.roles?.includes(ROLES.SUPER_ADMIN)) return true;

  return permissions.some((perm) => user.permissions?.includes(perm));
};

/**
 * Check if user has ALL specified permissions
 * @param {Object} user - User object
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissions) => {
  if (!user) return false;
  if (user.roles?.includes(ROLES.SUPER_ADMIN)) return true;

  return permissions.every((perm) => user.permissions?.includes(perm));
};

/**
 * Check if user can create (needs *_CREATE or MANAGE_* permission)
 * @param {Object} user - User object
 * @param {string} resource - Resource name (e.g., 'EMPLOYER', 'MEMBER')
 * @returns {boolean}
 */
export const canCreate = (user, resource) => {
  const resourceKey = resource.toUpperCase().endsWith('S') ? resource.toUpperCase().slice(0, -1) : resource.toUpperCase();
  return hasPermission(user, `${resourceKey}_CREATE`) || hasPermission(user, `MANAGE_${resourceKey}`);
};

/**
 * Check if user can view (needs *_VIEW or MANAGE_* permission)
 * @param {Object} user - User object
 * @param {string} resource - Resource name
 * @returns {boolean}
 */
export const canView = (user, resource) => {
  const resourceKey = resource.toUpperCase().endsWith('S') ? resource.toUpperCase().slice(0, -1) : resource.toUpperCase();
  return (
    hasPermission(user, `${resourceKey}_VIEW`) ||
    hasPermission(user, `VIEW_${resourceKey}`) ||
    hasPermission(user, `MANAGE_${resourceKey}`)
  );
};

/**
 * Check if user can update (needs MANAGE_* permission)
 * Alias for canCreate - same permission controls both
 */
export const canUpdate = canCreate;

/**
 * Check if user can delete (needs MANAGE_* permission)
 * Alias for canCreate - same permission controls both
 */
export const canDelete = canCreate;

/**
 * Check if user is SUPER_ADMIN
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => {
  return user?.roles?.includes(ROLES.SUPER_ADMIN) || false;
};

/**
 * Check if user has a specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  // SUPER_ADMIN implicitly has all roles
  if (user.roles?.includes(ROLES.SUPER_ADMIN)) return true;
  return user.roles?.includes(role) || false;
};

/**
 * Check if user has ANY of the specified roles
 * @param {Object} user - User object
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (user, roles) => {
  if (!user) return false;
  if (user.roles?.includes(ROLES.SUPER_ADMIN)) return true;

  return roles.some((role) => user.roles?.includes(role));
};

// ============================================================================
// LEGACY COMPATIBILITY - Mapping old permission names to new
// ============================================================================

/**
 * Legacy permission mapping for gradual migration
 * Maps old permission formats to new SCREAMING_SNAKE_CASE
 *
 * NOTE: SUPER_ADMIN bypasses all checks, so these mappings
 * are primarily for ADMIN and other roles that have specific permissions.
 */
export const LEGACY_PERMISSION_MAP = {
  // ========== Dot-notation format ==========
  'benefit_policies.view': PERMISSIONS.VIEW_BENEFIT_POLICIES,
  'benefit_policies.create': PERMISSIONS.MANAGE_BENEFIT_POLICIES,
  'benefit_policies.update': PERMISSIONS.MANAGE_BENEFIT_POLICIES,
  'benefit_policies.delete': PERMISSIONS.MANAGE_BENEFIT_POLICIES,
  'admin.users.view': PERMISSIONS.USER_VIEW,
  'admin.users.manage': PERMISSIONS.USER_CREATE,
  'rbac.view': PERMISSIONS.ROLE_VIEW,
  'roles.view': PERMISSIONS.ROLE_VIEW,
  'roles.manage': PERMISSIONS.ROLE_CREATE,
  'roles.assign_permissions': PERMISSIONS.PERMISSION_ASSIGN,
  'permissions.view': PERMISSIONS.PERMISSION_VIEW,
  'permissions.manage': PERMISSIONS.PERMISSION_MANAGE,
  'settings.view': PERMISSIONS.MANAGE_SETTINGS,

  // ========== UPPERCASE format (found in pages) ==========
  // Policies module
  POLICY_READ: 'BENEFIT_POLICY_VIEW',
  POLICY_CREATE: 'BENEFIT_POLICY_CREATE',
  POLICY_UPDATE: 'BENEFIT_POLICY_UPDATE',
  POLICY_DELETE: 'BENEFIT_POLICY_DELETE',

  // Insurance Policies module (Mapped to Benefit Policies)
  INSURANCE_POLICY_VIEW: 'BENEFIT_POLICY_VIEW',
  INSURANCE_POLICY_CREATE: 'BENEFIT_POLICY_CREATE',
  INSURANCE_POLICY_UPDATE: 'BENEFIT_POLICY_UPDATE',
  INSURANCE_POLICY_DELETE: 'BENEFIT_POLICY_DELETE',

  // Users module
  USER_VIEW: PERMISSIONS.USER_VIEW,
  USER_CREATE: PERMISSIONS.USER_CREATE,
  USER_UPDATE: PERMISSIONS.USER_UPDATE,
  USER_DELETE: PERMISSIONS.USER_DELETE,

  // Roles module
  ROLE_VIEW: PERMISSIONS.ROLE_VIEW,
  ROLE_CREATE: PERMISSIONS.ROLE_CREATE,
  ROLE_UPDATE: PERMISSIONS.ROLE_UPDATE,
  ROLE_DELETE: PERMISSIONS.ROLE_DELETE,

  // Companies module
  COMPANY_VIEW: PERMISSIONS.VIEW_INSURANCE_COMPANIES,
  COMPANY_CREATE: PERMISSIONS.MANAGE_INSURANCE_COMPANIES,
  COMPANY_UPDATE: PERMISSIONS.MANAGE_INSURANCE_COMPANIES,
  COMPANY_DELETE: PERMISSIONS.MANAGE_INSURANCE_COMPANIES
};

/**
 * Convert legacy permission to new format
 * @param {string} legacyPermission - Old format permission
 * @returns {string} New format permission
 */
export const convertLegacyPermission = (legacyPermission) => {
  return LEGACY_PERMISSION_MAP[legacyPermission] || legacyPermission;
};

export default {
  ROLES,
  PERMISSIONS,
  PERMISSION_GROUPS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canCreate,
  canView,
  canUpdate,
  canDelete,
  isSuperAdmin,
  hasRole,
  hasAnyRole,
  LEGACY_PERMISSION_MAP,
  convertLegacyPermission
};
