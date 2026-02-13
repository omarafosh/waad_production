import { useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

// project imports
import Drawer from './Drawer';
import Header from './Header';
import Footer from './Footer';
import Loader from 'components/Loader';
// import Breadcrumbs from 'components/@extended/Breadcrumbs'; // ✅ Disabled
import ProviderContextBar from './Header/ProviderContextBar'; // Added import

import useAuth from 'hooks/useAuth';
import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { ROLES } from 'constants/permissions.constants';
import { MenuOrientation } from 'config';

// ==============================|| MAIN LAYOUT - HORIZONTAL NAVIGATION ||============================== //

export default function DashboardLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { menuMasterLoading } = useGetMenuMaster();
  const downXL = useMediaQuery((theme) => theme.breakpoints.down('xl'));
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const { state } = useConfig();
  const isContainer = state.container;

  // set media wise responsive drawer
  // useEffect(() => {
  //   if (state.menuOrientation !== MenuOrientation.MINI_VERTICAL) {
  //     handlerDrawerOpen(!downXL);
  //   }
  // }, [downXL]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if provider (Robust check for standardized PROVIDER role)
  const isProvider = user?.roles?.some(role => role === ROLES.PROVIDER);

  if (menuMasterLoading) return <Loader />;

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', flexDirection: 'column' }}>
      <Header />

      {/* ✅ Provider Context Bar (Below Navbar) - Drawer hidden as requested */}
      {isProvider && <ProviderContextBar />}

      <Box component="main" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ✅ Spacer matching adjusted header height */}
        <Toolbar sx={{ minHeight: { xs: 60, sm: 68 }, height: { xs: 60, sm: 68 }, flexShrink: 0 }} />

        <Container
          maxWidth={isContainer ? 'xl' : false}
          sx={{
            pt: { xs: 0.5, sm: 1 },
            pb: { xs: 0.5, sm: 1 },
            px: { xs: 1.5, sm: 2 },
            ...(isContainer && { px: { xs: 0, sm: 2 } }),
            position: 'relative',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* {pathname !== '/apps/profiles/account/my-account' && <Breadcrumbs />} */}
          <Outlet />
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}
