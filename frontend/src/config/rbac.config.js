/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 RBAC CONFIGURATION - PROFESSIONAL SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE PRINCIPLES:
 * ✅ Permission-Based Access Control (NOT role-based)
 * ✅ Backend permissions === Frontend menu visibility
 * ✅ NO hardcoded role checks (except SUPER_ADMIN bypass)
 * ✅ Single source of truth for menu → permission mapping
 * 
 * VERSION: 3.0 - Professional RBAC (2026-01-29)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ROLES, ROLE_PERMISSIONS } from 'constants/rbac';
import { PERMISSIONS, hasPermission } from 'constants/permissions.constants';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Filter menu items based on user permissions
 * 
 * ROBUSTNESS REFACTOR (2026-02-06):
 * - Simplified recursive logic
 * - Normalized role checks (removes ROLE_ prefix)
 * - Prioritizes restrictedTo (Role exclusion) over permission inclusion
 * 
 * @param {Array} menuItems - Full menu structure
 * @param {Object} user - User object { roles, permissions }
 * @returns {Array} Filtered menu items
 */
export const filterMenuByPermissions = (menuItems, user) => {
  if (!user) return [];

  // Normalize roles for local check
  const userRoles = (user.roles || []).map(r => (typeof r === 'string' ? r : r.name).replace(/^ROLE_/, ''));
  const isSuperAdmin = userRoles.includes('SUPER_ADMIN');

  const filterRecursive = (items) => {
    return items
      .map(item => {
        // 1. ROLE RESTRICTION (Exclusion logic)
        // If restrictedTo exists, ONLY those roles can see the item (even SuperAdmin)
        const restrictedTo = (item.restrictedTo || []).map(r => r.replace(/^ROLE_/, ''));
        if (restrictedTo.length > 0) {
          const hasRequiredRole = userRoles.some(role => restrictedTo.includes(role));
          if (!hasRequiredRole) return null;
        }

        // 2. RECURSIVE FILTERING for children
        let filteredChildren = null;
        if (item.children) {
          filteredChildren = filterRecursive(item.children);
          // If a group/collapse has no visible children, hide the parent
          if (filteredChildren.length === 0) return null;
        }

        // 3. PERMISSION CHECK (Inclusion logic)
        // SuperAdmin bypasses permission checks (but not restrictedTo above)
        const itemPermissions = item.permission || [];
        const hasDirectPermission = Array.isArray(itemPermissions)
          ? (itemPermissions.length === 0 || itemPermissions.some(p => hasPermission(user, p)))
          : hasPermission(user, itemPermissions);

        const canView = isSuperAdmin ||
          hasMenuPermission(user, item.id) ||
          hasDirectPermission;

        if (!canView) return null;

        return filteredChildren ? { ...item, children: filteredChildren } : item;
      })
      .filter(Boolean);
  };

  return filterRecursive(menuItems);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MENU PERMISSION MAP (CANONICAL)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Maps each menu item to required permission(s).
 * If user has ANY of the permissions → menu item appears
 * If user has NONE → menu item hidden
 * 
 * Format:
 * 'menu-id': ['PERMISSION_1', 'PERMISSION_2'] // OR logic
 * 'menu-id': 'PERMISSION_1' // Single permission
 */
export const MENU_PERMISSIONS = {
  // 📊 DASHBOARD
  'dashboard': null,
  'employer-dashboard': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.EMPLOYER_VIEW],

  // 👥 MEMBERS
  'group-members': [PERMISSIONS.MEMBER_VIEW],
  'members': [PERMISSIONS.MEMBER_VIEW, PERMISSIONS.MEMBER_CREATE],
  'eligibility-check': [PERMISSIONS.MEMBER_VIEW],

  // 🏢 EMPLOYERS
  'group-employers': [PERMISSIONS.EMPLOYER_VIEW],
  'employers': [PERMISSIONS.EMPLOYER_VIEW, PERMISSIONS.EMPLOYER_CREATE],
  'employers-list': [PERMISSIONS.EMPLOYER_VIEW, PERMISSIONS.EMPLOYER_CREATE],
  'benefit-policies': [PERMISSIONS.BENEFIT_POLICY_VIEW, PERMISSIONS.BENEFIT_POLICY_MANAGE],

  // 🏥 PROVIDERS
  'group-providers': [PERMISSIONS.PROVIDER_VIEW],
  'providers': [PERMISSIONS.PROVIDER_VIEW, PERMISSIONS.PROVIDER_MANAGE],
  'providers-list': [PERMISSIONS.PROVIDER_VIEW, PERMISSIONS.PROVIDER_MANAGE],
  'provider-contracts': [PERMISSIONS.PROVIDER_CONTRACT_VIEW, PERMISSIONS.PROVIDER_CONTRACT_MANAGE],

  // 💰 CLAIMS & APPROVALS
  'group-claims-approvals': [PERMISSIONS.CLAIM_VIEW, PERMISSIONS.CLAIM_APPROVE, PERMISSIONS.PREAUTH_VIEW],
  'claims-approvals': [PERMISSIONS.CLAIM_VIEW, PERMISSIONS.CLAIM_APPROVE, PERMISSIONS.CLAIM_REJECT, PERMISSIONS.PREAUTH_VIEW, PERMISSIONS.PREAUTH_APPROVE],
  'claims-inbox': [PERMISSIONS.CLAIM_APPROVE, PERMISSIONS.CLAIM_REJECT],
  'pre-approvals-inbox': [PERMISSIONS.PREAUTH_APPROVE, PERMISSIONS.PREAUTH_REJECT],
  'unified-approvals-dashboard': [PERMISSIONS.CLAIM_APPROVE, PERMISSIONS.PREAUTH_APPROVE],
  'settlement-inbox': [PERMISSIONS.SETTLE_CLAIMS],

  // 💰 SETTLEMENT Management
  'group-settlement': [PERMISSIONS.SETTLE_CLAIMS],
  'settlement': [PERMISSIONS.SETTLE_CLAIMS],
  'settlement-batches': [PERMISSIONS.SETTLE_CLAIMS],
  'provider-accounts': [PERMISSIONS.SETTLE_CLAIMS, PERMISSIONS.PROVIDER_VIEW],

  // 🏥 VISITS
  'visits': [PERMISSIONS.VISIT_VIEW, PERMISSIONS.VISIT_CREATE],

  // 📋 POLICIES & PACKAGES
  'benefit-packages': [PERMISSIONS.BENEFIT_PACKAGE_VIEW, PERMISSIONS.BENEFIT_PACKAGE_MANAGE],
  'medical-categories': [PERMISSIONS.MEDICAL_CATEGORY_VIEW, PERMISSIONS.MEDICAL_CATEGORY_MANAGE],
  'medical-services': [PERMISSIONS.MEDICAL_SERVICE_VIEW, PERMISSIONS.MEDICAL_SERVICE_UPDATE],
  'medical-packages': [PERMISSIONS.MEDICAL_PACKAGE_VIEW, PERMISSIONS.MEDICAL_PACKAGE_MANAGE],

  // 📈 REPORTS
  'group-reports': [PERMISSIONS.REPORT_VIEW],
  'reports': [PERMISSIONS.REPORT_VIEW],
  'claims-report': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.CLAIM_VIEW],
  'pre-approvals-report': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.PREAUTH_VIEW],
  'financial-reports': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.SETTLE_CLAIMS],
  'provider-pdf-reports': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.PROVIDER_VIEW],
  'provider-settlement-reports': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.SETTLE_CLAIMS],
  'employer-reports': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.EMPLOYER_VIEW],
  'visits-report': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.VISIT_VIEW],
  'benefit-policy-report': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.BENEFIT_POLICY_VIEW],
  'beneficiaries-report': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.MEMBER_VIEW],

  // 📂 DOCUMENTS
  'group-documents': [PERMISSIONS.CLAIM_VIEW, PERMISSIONS.MEMBER_VIEW],
  'documents-library': [PERMISSIONS.CLAIM_VIEW, PERMISSIONS.PREAUTH_VIEW, PERMISSIONS.MEMBER_VIEW],

  // 🏥 PROVIDER PORTAL
  'group-provider-portal': [PERMISSIONS.VISIT_PORTAL_VIEW, PERMISSIONS.VISIT_CREATE, PERMISSIONS.MEMBER_VIEW],
  'provider-portal': [PERMISSIONS.VISIT_PORTAL_VIEW, PERMISSIONS.VISIT_CREATE, PERMISSIONS.MEMBER_VIEW],
  'provider-eligibility-check': [PERMISSIONS.VISIT_PORTAL_VIEW, PERMISSIONS.MEMBER_VIEW],
  'provider-visit-log': [PERMISSIONS.VISIT_PORTAL_VIEW, PERMISSIONS.VISIT_CREATE],
  'provider-documents': [PERMISSIONS.VISIT_PORTAL_VIEW, PERMISSIONS.CLAIM_VIEW, PERMISSIONS.PREAUTH_VIEW],

  // 📂 MY SERVICES (Provider History)
  'group-my-services': [PERMISSIONS.CLAIM_STATUS_VIEW, PERMISSIONS.PREAUTH_VIEW],
  'my-services': [PERMISSIONS.CLAIM_STATUS_VIEW, PERMISSIONS.PREAUTH_VIEW],
  'provider-claims': [PERMISSIONS.CLAIM_STATUS_VIEW],
  'provider-pre-approvals': [PERMISSIONS.PREAUTH_VIEW],

  // ⚙️ SYSTEM SETTINGS
  'group-system-settings': [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_AUDIT_LOGS],
  'audit': [PERMISSIONS.VIEW_AUDIT_LOGS],
  'medical-taxonomy': [PERMISSIONS.MEDICAL_CATEGORY_VIEW, PERMISSIONS.MEDICAL_SERVICE_VIEW, PERMISSIONS.MEDICAL_PACKAGE_VIEW],
  'medical-categories': [PERMISSIONS.MEDICAL_CATEGORY_VIEW, PERMISSIONS.MEDICAL_CATEGORY_MANAGE],
  'medical-services': [PERMISSIONS.MEDICAL_SERVICE_VIEW, PERMISSIONS.MEDICAL_SERVICE_UPDATE],
  'medical-packages': [PERMISSIONS.MEDICAL_PACKAGE_VIEW, PERMISSIONS.MEDICAL_PACKAGE_MANAGE],
  'medical-catalog': [PERMISSIONS.MEDICAL_SERVICE_VIEW],
  'medical-catalog-list': [PERMISSIONS.MEDICAL_SERVICE_VIEW],
  'mapping-wizard': [PERMISSIONS.MEDICAL_SERVICE_UPDATE],
  'medical-service-sandbox': [PERMISSIONS.MANAGE_SETTINGS],
  'organization-settings': [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.USER_CREATE, PERMISSIONS.ROLE_CREATE],
  'company-settings': [PERMISSIONS.MANAGE_SETTINGS],
  'users-management': [PERMISSIONS.USER_CREATE],
  'roles-management': [PERMISSIONS.ROLE_CREATE],
  'permissions-list': [PERMISSIONS.ROLE_CREATE],
  'permission-matrix': [PERMISSIONS.ROLE_CREATE]
};

// Note: ROLE_PERMISSION_REFERENCE removed - consolidated into constants/rbac.js

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHECK IF USER HAS PERMISSION FOR MENU ITEM
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const hasMenuPermission = (user, menuId) => {
  // SUPER_ADMIN bypass (Robust prefix handling)
  const roles = (user?.roles || []).map(r => (typeof r === 'string' ? r : r.name).replace(/^ROLE_/, ''));
  if (roles.includes('SUPER_ADMIN')) {
    return true;
  }

  // Get required permissions for this menu item
  const requiredPermissions = MENU_PERMISSIONS[menuId];

  // If ID is completely missing from mapping, deny access (Safe Default)
  if (requiredPermissions === undefined) {
    // Check if ID starts with 'group-' - if so, we might want to check children or allow if no restrictions
    // But for a professional TPA system, we want EXPLICIT mapping.
    return false;
  }

  // If permissions required is explicitly null, everyone can access
  if (requiredPermissions === null) {
    return true;
  }

  // If menu has no permission config, deny access (safe default)
  const userPermissions = user?.permissions || [];

  // Single permission (string)
  if (typeof requiredPermissions === 'string') {
    return userPermissions.includes(requiredPermissions);
  }

  // Multiple permissions (array) - OR logic (user needs ANY of them)
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some((perm) => userPermissions.includes(perm));
  }

  // Unknown format - deny access
  return false;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHECK IF USER CAN ACCESS ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const canAccessRoute = (user, path) => {
  // SUPER_ADMIN bypass
  if (user?.roles?.includes('SUPER_ADMIN')) {
    return true;
  }

  // Map common routes to menu IDs
  const routeToMenuMap = {
    '/dashboard': 'dashboard',
    '/members': 'members',
    '/employers': 'employers',
    '/providers': 'providers',
    '/claims': 'claims',
    '/claims/inbox': 'claims-inbox',
    '/pre-approvals': 'pre-approvals',
    '/pre-approvals/inbox': 'pre-approvals-inbox',
    '/visits': 'visits',
    '/reports': 'reports',
    '/rbac': 'rbac',
    '/settings': 'settings'
  };

  // Find matching menu ID
  const menuId = routeToMenuMap[path];
  if (!menuId) {
    // Route not mapped - deny access by default
    return false;
  }

  return hasMenuPermission(user, menuId);
};

export default {
  MENU_PERMISSIONS,
  hasMenuPermission,
  filterMenuByPermissions,
  canAccessRoute
};
