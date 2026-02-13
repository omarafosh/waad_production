/**
 * 🗄️ RBAC Store - إدارة حالة الصلاحيات
 * 
 * Zustand store لإدارة صلاحيات المستخدم والتحقق منها
 * 
 * الاستخدام:
 * const { user, permissions, hasPermission } = useRBAC();
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useRBAC = create(
  persist(
    (set, get) => ({
      // ==================== State ====================
      user: null,
      permissions: [],
      role: null,
      isAuthenticated: false,

      // ==================== Actions ====================

      /**
       * تعيين بيانات المستخدم والصلاحيات
       */
      setUser: (userData) => {
        set({
          user: userData,
          permissions: userData?.permissions || [],
          role: userData?.role || null,
          isAuthenticated: true
        });
      },

      /**
       * تحديث الصلاحيات فقط
       */
      setPermissions: (permissions) => {
        set({ permissions: permissions || [] });
      },

      /**
       * تسجيل الخروج
       */
      logout: () => {
        set({
          user: null,
          permissions: [],
          role: null,
          isAuthenticated: false
        });
      },

      // ==================== Permission Checks ====================

      /**
       * التحقق من صلاحية واحدة
       * @param {string} permission - اسم الصلاحية
       * @returns {boolean}
       */
      hasPermission: (permission) => {
        const { permissions, role } = get();
        
        // مدير النظام يمتلك جميع الصلاحيات
        if (role === 'SYSTEM_ADMIN' || role === 'ADMIN') {
          return true;
        }

        if (!permission) {
          return true; // إذا لم تكن هناك صلاحية مطلوبة
        }

        return permissions.includes(permission);
      },

      /**
       * التحقق من أي صلاحية من قائمة (OR)
       * @param {string[]} permissionsList - قائمة الصلاحيات
       * @returns {boolean}
       */
      hasAnyPermission: (permissionsList) => {
        const { permissions, role } = get();
        
        // مدير النظام يمتلك جميع الصلاحيات
        if (role === 'SYSTEM_ADMIN' || role === 'ADMIN') {
          return true;
        }

        if (!permissionsList || permissionsList.length === 0) {
          return true;
        }

        return permissionsList.some(p => permissions.includes(p));
      },

      /**
       * التحقق من جميع الصلاحيات من قائمة (AND)
       * @param {string[]} permissionsList - قائمة الصلاحيات
       * @returns {boolean}
       */
      hasAllPermissions: (permissionsList) => {
        const { permissions, role } = get();
        
        // مدير النظام يمتلك جميع الصلاحيات
        if (role === 'SYSTEM_ADMIN' || role === 'ADMIN') {
          return true;
        }

        if (!permissionsList || permissionsList.length === 0) {
          return true;
        }

        return permissionsList.every(p => permissions.includes(p));
      },

      /**
       * التحقق من الدور
       * @param {string} requiredRole - الدور المطلوب
       * @returns {boolean}
       */
      hasRole: (requiredRole) => {
        const { role } = get();
        return role === requiredRole;
      },

      /**
       * التحقق من أي دور من قائمة
       * @param {string[]} roles - قائمة الأدوار
       * @returns {boolean}
       */
      hasAnyRole: (roles) => {
        const { role } = get();
        return roles.includes(role);
      },

      // ==================== Getters ====================

      /**
       * الحصول على معلومات المستخدم
       */
      getUser: () => get().user,

      /**
       * الحصول على جميع الصلاحيات
       */
      getPermissions: () => get().permissions,

      /**
       * الحصول على الدور
       */
      getRole: () => get().role,

      /**
       * التحقق من حالة المصادقة
       */
      checkAuth: () => get().isAuthenticated
    }),
    {
      name: 'rbac-storage', // اسم المفتاح في localStorage
      partialize: (state) => ({
        // حفظ فقط البيانات الضرورية
        user: state.user,
        permissions: state.permissions,
        role: state.role,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export { useRBAC };
export default useRBAC;
