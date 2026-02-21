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

export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INSURANCE_ADMIN = 'INSURANCE_ADMIN',
  EMPLOYER_ADMIN = 'EMPLOYER_ADMIN',
  PARTNER_MANAGER = 'PARTNER_MANAGER',
  MEDICAL_REVIEWER = 'MEDICAL_REVIEWER',
  ACCOUNTANT = 'ACCOUNTANT',
  PROVIDER = 'PROVIDER',
  EMPLOYER = 'EMPLOYER',
  USER = 'USER'
}

export const ROLES = SystemRole;

// ============================================
// Role Privilege Levels
// ============================================

export const RolePrivilegeLevel: Record<SystemRole, number> = Object.freeze({
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

export enum PermissionDomain {
  SYSTEM = 'SYSTEM',
  RBAC = 'RBAC',
  USERS = 'USERS',
  MEMBERS = 'MEMBERS',
  CLAIMS = 'CLAIMS',
  PROVIDERS = 'PROVIDERS',
  EMPLOYERS = 'EMPLOYERS',
  POLICIES = 'POLICIES',
  DASHBOARD = 'DASHBOARD',
  REPORTS = 'REPORTS',
  PREAUTH = 'PREAUTH',
  VISITS = 'VISITS'
}

// ============================================
// SUPER_ADMIN Only Domains
// ============================================

export const SUPER_ADMIN_ONLY_DOMAINS: PermissionDomain[] = Object.freeze([
  PermissionDomain.SYSTEM,
  PermissionDomain.RBAC
] as PermissionDomain[]);

// ============================================
// Role Domain Mappings
// ============================================

export const RoleDomainAccess: Record<SystemRole, PermissionDomain[]> = Object.freeze({
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
  [SystemRole.PARTNER_MANAGER]: [],
  [SystemRole.ACCOUNTANT]: [],
  [SystemRole.PROVIDER]: [
    PermissionDomain.CLAIMS,
    PermissionDomain.VISITS,
    PermissionDomain.MEMBERS,
    PermissionDomain.PREAUTH
  ],
  [SystemRole.EMPLOYER]: [],
  [SystemRole.USER]: [
    PermissionDomain.DASHBOARD
  ]
});

// ============================================
// Role Display Names
// ============================================

export const RoleDisplayNames: Record<SystemRole, { ar: string; en: string }> = Object.freeze({
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
  [SystemRole.PARTNER_MANAGER]: {
    ar: 'مدير شريك',
    en: 'Partner Manager'
  },
  [SystemRole.MEDICAL_REVIEWER]: {
    ar: 'مراجع طبي',
    en: 'Medical Reviewer'
  },
  [SystemRole.ACCOUNTANT]: {
    ar: 'محاسب',
    en: 'Accountant'
  },
  [SystemRole.PROVIDER]: {
    ar: 'مقدم خدمة',
    en: 'Healthcare Provider'
  },
  [SystemRole.EMPLOYER]: {
    ar: 'صاحب عمل',
    en: 'Employer'
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
export const ROLE_PERMISSIONS: Record<SystemRole, string[]> = Object.freeze({
    // Default empty arrays for roles not explicitly defined below to satisfy Record<SystemRole, string[]>
    [SystemRole.SUPER_ADMIN]: [], 
    [SystemRole.INSURANCE_ADMIN]: [],
    [SystemRole.EMPLOYER_ADMIN]: [],
    [SystemRole.EMPLOYER]: [],
    [SystemRole.USER]: [],

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

export const SUPER_ADMIN_ONLY_ROUTES: string[] = Object.freeze([
  '/admin/rbac',
  '/admin/roles',
  '/admin/permissions',
  '/admin/system-settings',
  '/admin/audit-logs'
] as string[]);

export const INSURANCE_ADMIN_ROUTES: string[] = Object.freeze([
  '/admin/users',
  '/admin/employers',
  '/admin/providers',
  '/admin/reports'
] as string[]);

// ============================================
// Utility Functions
// ============================================

/**
 * Get privilege level for a role
 */
export const getPrivilegeLevel = (roleName: SystemRole | string): number => {
  return RolePrivilegeLevel[roleName as SystemRole] ?? 0;
};

/**
 * Check if role A outranks role B
 */
export const roleOutranks = (roleA: SystemRole | string, roleB: SystemRole | string): boolean => {
  return getPrivilegeLevel(roleA) > getPrivilegeLevel(roleB);
};

/**
 * Check if a role is SUPER_ADMIN
 */
export const isSuperAdminRole = (roleName: SystemRole | string): boolean => {
  return roleName === SystemRole.SUPER_ADMIN;
};

/**
 * Check if a role is INSURANCE_ADMIN or higher
 */
export const isInsuranceAdminOrHigher = (roleName: SystemRole | string): boolean => {
  return getPrivilegeLevel(roleName) >= RolePrivilegeLevel[SystemRole.INSURANCE_ADMIN];
};

/**
 * Check if a role has access to a domain
 */
export const hasAccessToDomain = (roleName: SystemRole | string, domain: PermissionDomain | string): boolean => {
  const domains = RoleDomainAccess[roleName as SystemRole];
  return domains ? domains.includes(domain as PermissionDomain) : false;
};

/**
 * Check if a domain is SUPER_ADMIN only
 */
export const isSuperAdminOnlyDomain = (domain: PermissionDomain | string): boolean => {
  return SUPER_ADMIN_ONLY_DOMAINS.includes(domain as PermissionDomain);
};

/**
 * Get roles that a user with given role can assign
 */
export const getAssignableRoles = (userRole: SystemRole | string): SystemRole[] => {
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
 */
export const canModifyRole = (currentRole: SystemRole | string, targetRole: SystemRole | string): boolean => {
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
