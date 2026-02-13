import { useMemo } from 'react';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';

// project imports
import AppBarStyled from './AppBarStyled';
import HeaderContent from './HeaderContent';
import IconButton from 'components/@extended/IconButton';

import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { MenuOrientation, DRAWER_WIDTH, MINI_DRAWER_WIDTH } from 'config';

// assets
import MenuFoldOutlined from '@ant-design/icons/MenuFoldOutlined';
import MenuUnfoldOutlined from '@ant-design/icons/MenuUnfoldOutlined';

// ==============================|| MAIN LAYOUT - HEADER ||============================== //

export default function Header() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const { state } = useConfig();

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const isHorizontal = state.menuOrientation === MenuOrientation.HORIZONTAL && !downLG;

  // header content
  const headerContent = useMemo(() => <HeaderContent />, []);

  // common header - ✅ Adjusted height for better spacing
  const mainHeader = (
    <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: { xs: 60, sm: 68 }, height: { xs: 60, sm: 68 } }}>
      {/* ✅ Sidebar toggle button for mobile/responsive view */}
      {downLG && (
        <IconButton
          aria-label="open drawer"
          onClick={() => handlerDrawerOpen(!drawerOpen)}
          edge="start"
          color="secondary"
          variant="light"
          sx={{ color: 'text.primary', bgcolor: 'grey.100', ml: { xs: 0, lg: -2 }, mr: 2 }}
        >
          {drawerOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        </IconButton>
      )}
      {headerContent}
    </Toolbar>
  );

  // app-bar params
  const appBar = {
    position: 'fixed',
    color: 'inherit',
    elevation: 0,
    sx: {
      borderBottom: '1px solid',
      borderBottomColor: 'divider',
      zIndex: 1200,
      width: '100%' // ✅ Full width - no sidebar offset
    }
  };

  return (
    <>
      {!downLG ? (
        <AppBarStyled open={drawerOpen} {...appBar}>
          {mainHeader}
        </AppBarStyled>
      ) : (
        <AppBar {...appBar}>{mainHeader}</AppBar>
      )}
    </>
  );
}
