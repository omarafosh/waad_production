import { create } from 'zustand';
import menuItem, { filterMenuByRoles } from 'menu-items/components';
import { useRBACStore } from 'api/rbac';

// ==============================|| MENU API - STATE MANAGEMENT ||============================== //

/**
 * Zustand store for menu state management
 * Replaces old Redux implementation
 */
export const useMenuStore = create((set) => ({
  openDrawer: true,
  openComponentDrawer: true,
  menuMaster: menuItem,

  handlerDrawerOpen: (isOpen) => set({ openDrawer: isOpen }),
  handlerComponentDrawer: (isOpen) => set({ openComponentDrawer: isOpen }),

  // Update menu based on user roles (RBAC filtering)
  updateMenuByRoles: (roles) => {
    const filteredMenu = filterMenuByRoles(menuItem, roles);
    set({ menuMaster: { isDashboardDrawerOpened: true, ...filteredMenu } });
  }
}));

// Export hooks for backward compatibility
export const handlerDrawerOpen = (isOpen) => useMenuStore.setState({ openDrawer: isOpen });
export const handlerComponentDrawer = (isOpen) => useMenuStore.setState({ openComponentDrawer: isOpen });

/**
 * Hook to get menu master data with RBAC filtering
 * @returns {Object} menuMaster - Filtered menu configuration based on user roles
 */
export const useGetMenuMaster = () => {
  const roles = useRBACStore((state) => state.roles);
  const filteredMenu = filterMenuByRoles(menuItem, roles);

  return {
    menuMaster: {
      isDashboardDrawerOpened: useMenuStore.getState().openDrawer,
      ...filteredMenu
    }
  };
};

export default useMenuStore;
