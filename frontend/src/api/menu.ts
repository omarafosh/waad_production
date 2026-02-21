import { create } from 'zustand';
import menuItem, { filterMenuByRoles } from 'menu-items/components';
import { useRBACStore } from 'store';
import { SystemRole } from 'constants/rbac';

// ==============================|| MENU API - STATE MANAGEMENT ||============================== //

interface MenuState {
  openDrawer: boolean;
  openComponentDrawer: boolean;
  menuMaster: any; // We can improve this with exact menu types later
}

interface MenuActions {
  handlerDrawerOpen: (isOpen: boolean) => void;
  handlerComponentDrawer: (isOpen: boolean) => void;
  updateMenuByRoles: (roles: string[]) => void;
}

export type MenuStore = MenuState & MenuActions;

/**
 * Zustand store for menu state management
 * Replaces old Redux implementation
 */
export const useMenuStore = create<MenuStore>((set) => ({
  openDrawer: true,
  openComponentDrawer: true,
  menuMaster: menuItem,

  handlerDrawerOpen: (isOpen: boolean) => set({ openDrawer: isOpen }),
  handlerComponentDrawer: (isOpen: boolean) => set({ openComponentDrawer: isOpen }),

  // Update menu based on user roles (RBAC filtering)
  updateMenuByRoles: (roles: string[]) => {
    // @ts-ignore - The menu item structure is complex, suppressing for now
    const filteredMenu = filterMenuByRoles(menuItem, roles);
    set({ menuMaster: { isDashboardDrawerOpened: true, ...filteredMenu } });
  }
}));

// Export hooks for backward compatibility
export const handlerDrawerOpen = (isOpen: boolean) => useMenuStore.setState({ openDrawer: isOpen });
export const handlerComponentDrawer = (isOpen: boolean) => useMenuStore.setState({ openComponentDrawer: isOpen });

/**
 * Hook to get menu master data with RBAC filtering
 * @returns {Object} menuMaster - Filtered menu configuration based on user roles
 */
export const useGetMenuMaster = () => {
  const roles = useRBACStore((state) => state.roles);

  // @ts-ignore - The menu item structure is complex, suppressing for now
  const filteredMenu = filterMenuByRoles(menuItem, roles);

  return {
    menuMaster: {
      isDashboardDrawerOpened: useMenuStore.getState().openDrawer,
      ...filteredMenu
    }
  };
};

export default useMenuStore;

