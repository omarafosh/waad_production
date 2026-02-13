import { useMemo } from 'react';
import { useRBAC } from 'api/rbac';
import menuItem, { filterMenuByRoles } from 'menu-items/components';

/**
 * useRBACSidebar Hook
 * Phase B2 (Refactored): Delegates source of truth to menu-items/components.jsx
 * 
 * This hook now acts as a bridge between the centralized menu definition
 * and components that expect the sidebar structure (Navigation, Breadcrumbs).
 */
const useRBACSidebar = () => {
  const { roles, user, isInitialized } = useRBAC();

  const sidebarGroups = useMemo(() => {
    // If RBAC is not yet initialized, return empty
    if (!isInitialized) return [];

    // Use shared filtering logic from components.jsx
    // This returns an array of groups (filtered)
    // FIX (2026-02-06): Pass user object to ensure permissions (like VIEW_PROVIDER_PORTAL) are checked
    return filterMenuByRoles(menuItem, roles, user);
  }, [roles, user, isInitialized]);

  // Legacy flat items generation for Breadcrumbs or other consumers
  // that might iterate a flat list.
  const sidebarItems = useMemo(() => {
    const items = [];

    // Helper to flatten the structure
    const flatten = (nodes) => {
      nodes.forEach(node => {
        if (node.type === 'item') {
          items.push({
            id: node.id,
            title: node.title,
            url: node.url,
            icon: node.icon,
            breadcrumbs: node.breadcrumbs
          });
        }
        if (node.children) {
          flatten(node.children);
        }
      });
    };

    if (sidebarGroups) {
      flatten(sidebarGroups);
    }

    return items;
  }, [sidebarGroups]);

  return {
    sidebarGroups,
    sidebarItems,
    roles,
    loading: !isInitialized
  };
};

export default useRBACSidebar;
