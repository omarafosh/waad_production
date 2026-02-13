import { useLayoutEffect, useState, useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// project imports
import NavItem from './NavItem';
import NavGroup from './NavGroup';

import useConfig from 'hooks/useConfig';
import useAuth from 'hooks/useAuth';
// import useRBACSidebar from 'hooks/useRBACSidebar';
import { useRBAC } from 'api/rbac';
import menuItem, { filterMenuByRoles } from 'menu-items/components';

import useLocale from 'hooks/useLocale';
import { HORIZONTAL_MAX_ITEM, MenuOrientation } from 'config';
import { useGetMenuMaster } from 'api/menu';

function isFound(arr, str) {
  return arr.items.some((element) => {
    if (element.id === str) {
      return true;
    }
    return false;
  });
}

// ==============================|| DRAWER CONTENT - NAVIGATION ||============================== //

export default function Navigation() {
  const { state } = useConfig();
  const { user } = useAuth();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  // Phase D1.5: Use translation hook
  const { t } = useLocale();
  const { roles, user: rbacUser, isInitialized } = useRBAC();

  const [selectedID, setSelectedID] = useState('');
  const [selectedItems, setSelectedItems] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(0);

  const menuItems = useMemo(() => {
    // If RBAC is not yet initialized, return empty menu to show loading
    if (!isInitialized) return { items: [] };

    // Use the comprehensive menu structure from menu-items/components.jsx
    // and filter it based on current user roles and permissions
    const filtered = filterMenuByRoles(menuItem, roles, rbacUser);
    return { items: filtered };
  }, [roles, rbacUser, isInitialized]);

  const isHorizontal = state.menuOrientation === MenuOrientation.HORIZONTAL && !downLG;

  // Show loading spinner while initializing RBAC
  if (!isInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Safety check: ensure menuItems has valid items array
  const items = Array.isArray(menuItems?.items) ? menuItems.items : [];

  // Handle empty menu gracefully - SILENT HIDE (2026-02-09)
  if (items.length === 0) {
    return null;
  }

  const lastItem = isHorizontal ? HORIZONTAL_MAX_ITEM : null;
  let lastItemIndex = items.length - 1;
  let remItems = [];
  let lastItemId;

  //  first it checks menu item is more than giving HORIZONTAL_MAX_ITEM after that get lastItemid by giving horizontal max
  // item and it sets horizontal menu by giving horizontal max item lastly slice menuItem from array and set into remItems

  if (lastItem && lastItem < items.length) {
    lastItemId = items[lastItem - 1].id;
    lastItemIndex = lastItem - 1;
    remItems = items.slice(lastItem - 1, items.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(item.url && {
        url: item.url
      })
    }));
  }

  const navGroups = items.slice(0, lastItemIndex + 1).map((item, index) => {
    switch (item.type) {
      case 'group':
        if (item.url && item.id !== lastItemId) {
          return (
            <List key={item.id} sx={{ zIndex: 0, ...(isHorizontal && { mt: 0.5 }) }}>
              {!isHorizontal && index !== 0 && <Divider sx={{ my: 0.5 }} />}
              <NavItem item={item} level={1} isParents setSelectedID={setSelectedID} />
            </List>
          );
        }

        return (
          <NavGroup
            key={item.id}
            setSelectedID={setSelectedID}
            setSelectedItems={setSelectedItems}
            setSelectedLevel={setSelectedLevel}
            selectedLevel={selectedLevel}
            selectedID={selectedID}
            selectedItems={selectedItems}
            lastItem={lastItem}
            remItems={remItems}
            lastItemId={lastItemId}
            item={item}
          />
        );
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Fix - Navigation Group
          </Typography>
        );
    }
  });

  return (
    <Box
      sx={{
        pt: drawerOpen ? (isHorizontal ? 0 : 2) : 0,
        ...(!isHorizontal && { '& > ul:first-of-type': { mt: 0 } }),
        display: isHorizontal ? { xs: 'block', lg: 'flex' } : 'block'
      }}
    >
      {navGroups}
    </Box>
  );
}
