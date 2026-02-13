import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from 'api/rbac';
import { SystemRole, PermissionDomain, isSuperAdminOnlyDomain } from 'constants/rbac';

/**
 * RoleGuard Component - RBAC Route Protection
 * 
 * Protects routes based on role requirements and permission domains.
 * 
 * SECURITY FEATURES:
 * - Role hierarchy enforcement
 * - Domain-based access control
 * - SUPER_ADMIN bypass
 * - Redirect on access denied
 * 
 * @example
 * // Require SUPER_ADMIN
 * <RoleGuard requireSuperAdmin>
 *   <RbacManagement />
 * </RoleGuard>
 * 
 * @example
 * // Require INSURANCE_ADMIN or higher
 * <RoleGuard minRole={SystemRole.INSURANCE_ADMIN}>
 *   <UserManagement />
 * </RoleGuard>
 * 
 * @example
 * // Require specific domain access
 * <RoleGuard domain={PermissionDomain.CLAIMS}>
 *   <ClaimsPage />
 * </RoleGuard>
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
const RoleGuard = ({
  children,
  requireSuperAdmin = false,
  minRole = null,
  allowedRoles = null,
  domain = null,
  redirectPath = '/dashboard',
  showAccessDenied = true
}) => {
  const location = useLocation();
  const {
    isSuperAdmin,
    primaryRole,
    hasRole,
    hasAccessToDomain,
    getPrivilegeLevel,
    isInitialized
  } = useRBAC();

  // Wait for RBAC initialization
  if (!isInitialized) {
    return null; // or a loading spinner
  }

  // No authentication
  if (!primaryRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check 1: SUPER_ADMIN only routes
  if (requireSuperAdmin) {
    if (!isSuperAdmin) {
      console.warn('🔒 RoleGuard: SUPER_ADMIN required, access denied');
      if (showAccessDenied) {
        return (
          <AccessDeniedMessage 
            message="هذه الصفحة متاحة فقط لمالك النظام / This page is only accessible to System Owner (SUPER_ADMIN)" 
          />
        );
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check 2: Minimum role level
  if (minRole) {
    const requiredLevel = getPrivilegeLevelForRole(minRole);
    const userLevel = getPrivilegeLevel();
    
    if (userLevel < requiredLevel) {
      console.warn(`🔒 RoleGuard: Minimum role ${minRole} required, user has ${primaryRole}`);
      if (showAccessDenied) {
        return (
          <AccessDeniedMessage 
            message={`صلاحيات غير كافية / Insufficient privileges. Required: ${minRole}`} 
          />
        );
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check 3: Allowed roles list
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(allowedRoles)) {
      console.warn(`🔒 RoleGuard: Required roles [${allowedRoles.join(', ')}], user has ${primaryRole}`);
      if (showAccessDenied) {
        return (
          <AccessDeniedMessage 
            message="ليس لديك صلاحية للوصول لهذه الصفحة / You do not have permission to access this page" 
          />
        );
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check 4: Domain access
  if (domain) {
    // SUPER_ADMIN-only domains
    if (isSuperAdminOnlyDomain(domain) && !isSuperAdmin) {
      console.warn(`🔒 RoleGuard: Domain ${domain} is SUPER_ADMIN only`);
      if (showAccessDenied) {
        return (
          <AccessDeniedMessage 
            message="هذا القسم متاح فقط لمالك النظام / This section is only accessible to System Owner" 
          />
        );
      }
      return <Navigate to={redirectPath} replace />;
    }
    
    // Regular domain check
    if (!hasAccessToDomain(domain)) {
      console.warn(`🔒 RoleGuard: Access to domain ${domain} denied for role ${primaryRole}`);
      if (showAccessDenied) {
        return (
          <AccessDeniedMessage 
            message="ليس لديك صلاحية للوصول لهذا القسم / You do not have access to this section" 
          />
        );
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  // All checks passed
  return children;
};

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requireSuperAdmin: PropTypes.bool,
  minRole: PropTypes.oneOf(Object.values(SystemRole)),
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  domain: PropTypes.oneOf(Object.values(PermissionDomain)),
  redirectPath: PropTypes.string,
  showAccessDenied: PropTypes.bool
};

// ============================================
// Access Denied Message Component
// ============================================

const AccessDeniedMessage = ({ message }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    padding: '2rem',
    textAlign: 'center'
  }}>
    <div style={{
      fontSize: '4rem',
      marginBottom: '1rem'
    }}>
      🔒
    </div>
    <h2 style={{
      fontSize: '1.5rem',
      color: '#d32f2f',
      marginBottom: '0.5rem'
    }}>
      الوصول مرفوض / Access Denied
    </h2>
    <p style={{
      color: '#666',
      maxWidth: '500px'
    }}>
      {message}
    </p>
  </div>
);

AccessDeniedMessage.propTypes = {
  message: PropTypes.string.isRequired
};

// ============================================
// Helper Functions
// ============================================

const getPrivilegeLevelForRole = (roleName) => {
  const levels = {
    [SystemRole.SUPER_ADMIN]: 999,
    [SystemRole.INSURANCE_ADMIN]: 100,
    [SystemRole.EMPLOYER_ADMIN]: 50,
    [SystemRole.REVIEWER]: 40,
    [SystemRole.PROVIDER]: 30,
    [SystemRole.USER]: 10
  };
  return levels[roleName] ?? 0;
};

// ============================================
// Pre-configured Guard Variants
// ============================================

/**
 * SuperAdminGuard - Only allows SUPER_ADMIN
 */
export const SuperAdminGuard = ({ children }) => (
  <RoleGuard requireSuperAdmin>{children}</RoleGuard>
);

SuperAdminGuard.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * InsuranceAdminGuard - Allows INSURANCE_ADMIN or higher
 */
export const InsuranceAdminGuard = ({ children }) => (
  <RoleGuard minRole={SystemRole.INSURANCE_ADMIN}>{children}</RoleGuard>
);

InsuranceAdminGuard.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * RbacGuard - Protects RBAC management routes (SUPER_ADMIN only)
 */
export const RbacGuard = ({ children }) => (
  <RoleGuard requireSuperAdmin domain={PermissionDomain.RBAC}>{children}</RoleGuard>
);

RbacGuard.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * SystemGuard - Protects system settings routes (SUPER_ADMIN only)
 */
export const SystemGuard = ({ children }) => (
  <RoleGuard requireSuperAdmin domain={PermissionDomain.SYSTEM}>{children}</RoleGuard>
);

SystemGuard.propTypes = {
  children: PropTypes.node.isRequired
};

export default RoleGuard;
