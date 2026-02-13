/**
 * System Role Definitions - RBAC Hardening
 * 
 * AUTHORITATIVE source for role hierarchy in frontend.
 * Mirrors backend SystemRole enum.
 * 
 * CRITICAL SECURITY RULES:
 * 1. SUPER_ADMIN has maximum privilege level (999)
 * 2. Only SUPER_ADMIN can manage RBAC
 * 3. Users cannot modify users with higher privilege
 * 4. INSURANCE_ADMIN has operational authority but NO RBAC access
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */

// ============================================
// System Role Definitions
// ============================================

export const SystemRole = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  INSURANCE_ADMIN: 'INSURANCE_ADMIN',
  EMPLOYER_ADMIN: 'EMPLOYER_ADMIN',
  PARTNER_MANAGER: 'PARTNER_MANAGER',
  MEDICAL_REVIEWER: 'MEDICAL_REVIEWER',
  ACCOUNTANT: 'ACCOUNTANT',
  PROVIDER: 'PROVIDER',
  EMPLOYER: 'EMPLOYER',
  USER: 'USER'
});

export const ROLES = SystemRole;

// ============================================
// Role Privilege Levels
// ============================================

export const RolePrivilegeLevel = Object.freeze({
  [SystemRole.SUPER_ADMIN]: 999,
  [SystemRole.INSURANCE_ADMIN]: 100,
  [SystemRole.EMPLOYER_ADMIN]: 50,
  [SystemRole.PARTNER_MANAGER]: 45,
  [SystemRole.MEDICAL_REVIEWER]: 40,
  [SystemRole.ACCOUNTANT]: 35,
  [SystemRole.PROVIDER]: 30,
  [SystemRole.EMPLOYER]: 20,
  [SystemRole.USER]: 10
});

// ============================================
// Permission Domains
// ============================================

export const PermissionDomain = Object.freeze({
  SYSTEM: 'SYSTEM',
  RBAC: 'RBAC',
  USERS: 'USERS',
  MEMBERS: 'MEMBERS',
  CLAIMS: 'CLAIMS',
  PROVIDERS: 'PROVIDERS',
  EMPLOYERS: 'EMPLOYERS',
  POLICIES: 'POLICIES',
  DASHBOARD: 'DASHBOARD',
  REPORTS: 'REPORTS',
  PREAUTH: 'PREAUTH',
  VISITS: 'VISITS'
});

// ============================================
// SUPER_ADMIN Only Domains
// ============================================

export const SUPER_ADMIN_ONLY_DOMAINS = Object.freeze([
  PermissionDomain.SYSTEM,
  PermissionDomain.RBAC
]);

// ============================================
// Role Domain Mappings
// ============================================

export const RoleDomainAccess = Object.freeze({
  [SystemRole.SUPER_ADMIN]: Object.values(PermissionDomain), // All domains
  [SystemRole.INSURANCE_ADMIN]: [
    PermissionDomain.USERS,
    PermissionDomain.MEMBERS,
    PermissionDomain.CLAIMS,
    PermissionDomain.PROVIDERS,
    PermissionDomain.EMPLOYERS,
    PermissionDomain.POLICIES,
    PermissionDomain.DASHBOARD,
    PermissionDomain.REPORTS,
    PermissionDomain.PREAUTH,
    PermissionDomain.VISITS
  ],
  [SystemRole.EMPLOYER_ADMIN]: [
    PermissionDomain.MEMBERS,
    PermissionDomain.CLAIMS,
    PermissionDomain.REPORTS
  ],
  [SystemRole.MEDICAL_REVIEWER]: [
    PermissionDomain.CLAIMS,
    PermissionDomain.PREAUTH
  ],
  [SystemRole.PROVIDER]: [
    PermissionDomain.CLAIMS,
    PermissionDomain.VISITS,
    PermissionDomain.MEMBERS,
    PermissionDomain.PREAUTH
  ],
  [SystemRole.USER]: [
    PermissionDomain.DASHBOARD
  ]
});

// ============================================
// Role Display Names
// ============================================

export const RoleDisplayNames = Object.freeze({
  [SystemRole.SUPER_ADMIN]: {
    ar: 'مالك النظام',
    en: 'System Owner'
  },
  [SystemRole.INSURANCE_ADMIN]: {
    ar: 'مدير التأمين',
    en: 'Insurance Administrator'
  },
  [SystemRole.EMPLOYER_ADMIN]: {
    ar: 'مدير صاحب العمل',
    en: 'Employer Administrator'
  },
  [SystemRole.MEDICAL_REVIEWER]: {
    ar: 'مراجع طبي',
    en: 'Medical Reviewer'
  },
  [SystemRole.PROVIDER]: {
    ar: 'مقدم خدمة',
    en: 'Healthcare Provider'
  },
  [SystemRole.USER]: {
    ar: 'مستخدم',
    en: 'Basic User'
  }
});

// ============================================
// Authoritative Permission Constants (Literal Strings)
// ============================================
export const PERMISSIONS = Object.freeze({
  CLAIM_VIEW: 'CLAIM_VIEW',
  CLAIM_CREATE: 'CLAIM_CREATE',
  CLAIM_UPDATE: 'CLAIM_UPDATE',
  CLAIM_APPROVE: 'CLAIM_APPROVE',
  CLAIM_REJECT: 'CLAIM_REJECT',
  CLAIM_MANAGE: 'CLAIM_MANAGE',
  CLAIM_STATUS_VIEW: 'CLAIM_STATUS_VIEW',
  PREAUTH_VIEW: 'PREAUTH_VIEW',
  PREAUTH_CREATE: 'PREAUTH_CREATE',
  PREAUTH_APPROVE: 'PREAUTH_APPROVE',
  PREAUTH_REJECT: 'PREAUTH_REJECT',
  VISIT_VIEW: 'VISIT_VIEW',
  VISIT_CREATE: 'VISIT_CREATE',
  MEMBER_VIEW: 'MEMBER_VIEW',
  VISIT_PORTAL_VIEW: 'VISIT_PORTAL_VIEW',
  REPORT_VIEW: 'REPORT_VIEW',
  SETTLE_CLAIMS: 'SETTLEMENT_BATCH_CONFIRM',
  PROVIDER_VIEW: 'PROVIDER_VIEW',
  EMPLOYER_VIEW: 'EMPLOYER_VIEW',
  BENEFIT_POLICY_VIEW: 'BENEFIT_POLICY_VIEW'
});

// ============================================
// authoritative Role-to-Permission Mapping
// ============================================
export const ROLE_PERMISSIONS = Object.freeze({
  [SystemRole.PROVIDER]: [
    'VISIT_VIEW', 'VISIT_CREATE',
    'CLAIM_VIEW', 'CLAIM_CREATE', 'CLAIM_UPDATE',
    'PREAUTH_VIEW', 'PREAUTH_CREATE',
    'CLAIM_STATUS_VIEW',
    'MEMBER_VIEW',
    'VISIT_PORTAL_VIEW',
    'REPORT_VIEW'
  ],
  [SystemRole.PARTNER_MANAGER]: [
    'VISIT_VIEW',
    'CLAIM_VIEW',
    'PREAUTH_VIEW',
    'REPORT_VIEW'
  ],
  [SystemRole.MEDICAL_REVIEWER]: [
    'CLAIM_VIEW', 'CLAIM_APPROVE', 'CLAIM_REJECT',
    'PREAUTH_VIEW', 'PREAUTH_APPROVE', 'PREAUTH_REJECT',
    'REPORT_VIEW'
  ],
  [SystemRole.ACCOUNTANT]: [
    'REPORT_VIEW',
    'SETTLEMENT_BATCH_CONFIRM',
    'CLAIM_VIEW',
    'PROVIDER_VIEW'
  ]
});

// ============================================
// Protected System Routes
// ============================================

export const SUPER_ADMIN_ONLY_ROUTES = Object.freeze([
  '/admin/rbac',
  '/admin/roles',
  '/admin/permissions',
  '/admin/system-settings',
  '/admin/audit-logs'
]);

export const INSURANCE_ADMIN_ROUTES = Object.freeze([
  '/admin/users',
  '/admin/employers',
  '/admin/providers',
  '/admin/reports'
]);

// ============================================
// Utility Functions
// ============================================

/**
 * Get privilege level for a role
 * @param {string} roleName - Role name
 * @returns {number} Privilege level
 */
export const getPrivilegeLevel = (roleName) => {
  return RolePrivilegeLevel[roleName] ?? 0;
};

/**
 * Check if role A outranks role B
 * @param {string} roleA - First role
 * @param {string} roleB - Second role
 * @returns {boolean}
 */
export const roleOutranks = (roleA, roleB) => {
  return getPrivilegeLevel(roleA) > getPrivilegeLevel(roleB);
};

/**
 * Check if a role is SUPER_ADMIN
 * @param {string} roleName - Role name
 * @returns {boolean}
 */
export const isSuperAdminRole = (roleName) => {
  return roleName === SystemRole.SUPER_ADMIN;
};

/**
 * Check if a role is INSURANCE_ADMIN or higher
 * @param {string} roleName - Role name
 * @returns {boolean}
 */
export const isInsuranceAdminOrHigher = (roleName) => {
  return getPrivilegeLevel(roleName) >= RolePrivilegeLevel[SystemRole.INSURANCE_ADMIN];
};

/**
 * Check if a role has access to a domain
 * @param {string} roleName - Role name
 * @param {string} domain - Permission domain
 * @returns {boolean}
 */
export const hasAccessToDomain = (roleName, domain) => {
  const domains = RoleDomainAccess[roleName];
  return domains ? domains.includes(domain) : false;
};

/**
 * Check if a domain is SUPER_ADMIN only
 * @param {string} domain - Permission domain
 * @returns {boolean}
 */
export const isSuperAdminOnlyDomain = (domain) => {
  return SUPER_ADMIN_ONLY_DOMAINS.includes(domain);
};

/**
 * Get roles that a user with given role can assign
 * @param {string} userRole - User's current role
 * @returns {string[]} Assignable roles
 */
export const getAssignableRoles = (userRole) => {
  if (userRole === SystemRole.SUPER_ADMIN) {
    return Object.values(SystemRole);
  }
  if (userRole === SystemRole.INSURANCE_ADMIN) {
    // Can assign all except SUPER_ADMIN
    return Object.values(SystemRole).filter(r => r !== SystemRole.SUPER_ADMIN);
  }
  // Other roles cannot assign roles
  return [];
};

/**
 * Check if current user can modify a target role
 * @param {string} currentRole - Current user's role
 * @param {string} targetRole - Target user's role
 * @returns {boolean}
 */
export const canModifyRole = (currentRole, targetRole) => {
  // SUPER_ADMIN can modify anyone
  if (currentRole === SystemRole.SUPER_ADMIN) {
    return true;
  }
  // Others can only modify roles with strictly lower privilege
  return getPrivilegeLevel(currentRole) > getPrivilegeLevel(targetRole);
};

export default {
  SystemRole,
  RolePrivilegeLevel,
  PermissionDomain,
  SUPER_ADMIN_ONLY_DOMAINS,
  RoleDomainAccess,
  RoleDisplayNames,
  SUPER_ADMIN_ONLY_ROUTES,
  INSURANCE_ADMIN_ROUTES,
  getPrivilegeLevel,
  roleOutranks,
  isSuperAdminRole,
  isInsuranceAdminOrHigher,
  hasAccessToDomain,
  isSuperAdminOnlyDomain,
  getAssignableRoles,
  canModifyRole
};
