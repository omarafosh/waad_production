/**
 * 🛡️ Protected Route Component - مكون حماية المسارات
 * 
 * يستخدم للتحكم في الوصول للصفحات بناءً على الصلاحيات
 * 
 * الاستخدام:
 * <ProtectedRoute requiredPermission="VISITS_VIEW">
 *   <VisitsPage />
 * </ProtectedRoute>
 * 
 * أو لصلاحيات متعددة:
 * <ProtectedRoute requiredPermissions={['CLAIMS_VIEW', 'CLAIMS_REVIEW']}>
 *   <ClaimsPage />
 * </ProtectedRoute>
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../store/rbacSlice';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  requiredPermissions = [],
  requireAll = false,
  fallbackPath = '/unauthorized'
}) => {
  const location = useLocation();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAuthenticated } = useRBAC();

  // التحقق من تسجيل الدخول
  if (!isAuthenticated) {
    // إعادة التوجيه لصفحة تسجيل الدخول مع حفظ المسار المطلوب
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // التحقق من الصلاحيات
  let hasAccess = false;

  if (requiredPermission) {
    // صلاحية واحدة مطلوبة
    hasAccess = hasPermission(requiredPermission);
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    // صلاحيات متعددة
    if (requireAll) {
      // يجب أن يمتلك جميع الصلاحيات
      hasAccess = hasAllPermissions(requiredPermissions);
    } else {
      // يكفي أن يمتلك أي صلاحية
      hasAccess = hasAnyPermission(requiredPermissions);
    }
  } else {
    // لا توجد صلاحيات مطلوبة - السماح بالوصول
    hasAccess = true;
  }

  // إذا لم يمتلك الصلاحية
  if (!hasAccess) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // السماح بالوصول
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredPermission: PropTypes.string,
  requiredPermissions: PropTypes.arrayOf(PropTypes.string),
  requireAll: PropTypes.bool,
  fallbackPath: PropTypes.string
};

export default ProtectedRoute;
