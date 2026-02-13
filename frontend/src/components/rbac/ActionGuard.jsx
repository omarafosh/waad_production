/**
 * 🛡️ ActionGuard Component - مكون حماية العمليات
 * 
 * يستخدم لإظهار أو تعطيل عناصر واجهة المستخدم (أزرار، روابط، إلخ) بناءً على صلاحيات دقيقة.
 * 
 * الاستخدام:
 * <ActionGuard permission="MEMBER_PDF_EXPORT">
 *   <Button>تصدير PDF</Button>
 * </ActionGuard>
 * 
 * أو لتعطيل الزر بدلاً من إخفائه:
 * <ActionGuard permission="MEMBER_EDIT" mode="disable">
 *   <Button>تعديل</Button>
 * </ActionGuard>
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useRBAC } from 'api/rbac';

const ActionGuard = ({
    children,
    permission,
    permissions = [],
    requireAll = false,
    mode = 'hide', // 'hide' | 'disable'
    onDenied = null
}) => {
    const { hasPermission, hasAllPermissions, hasAnyPermission, isSuperAdmin } = useRBAC();

    // Super Admin bypassing
    if (isSuperAdmin) {
        return children;
    }

    let hasAccess = false;

    if (permission) {
        hasAccess = hasPermission(permission);
    } else if (permissions.length > 0) {
        hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    } else {
        // No permission specified = allow
        hasAccess = true;
    }

    if (hasAccess) {
        return children;
    }

    // Denial Logic
    if (mode === 'disable') {
        // If we're disabling, we need to inject 'disabled' prop into children
        // This only works if children is a single React element (e.g., a Button)
        return React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                    disabled: true,
                    title: 'لا تمتلك الصلاحية الكافية لهذه العملية',
                    onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onDenied) onDenied();
                    }
                });
            }
            return null;
        });
    }

    // Default mode: 'hide'
    return null;
};

ActionGuard.propTypes = {
    children: PropTypes.node.isRequired,
    permission: PropTypes.string,
    permissions: PropTypes.arrayOf(PropTypes.string),
    requireAll: PropTypes.bool,
    mode: PropTypes.oneOf(['hide', 'disable']),
    onDenied: PropTypes.func
};

export default ActionGuard;
