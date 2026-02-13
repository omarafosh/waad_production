import { useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip'; // Added Tooltip
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BusinessIcon from '@mui/icons-material/Business'; // Added BusinessIcon
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'; // Added Icon

import { useQuery } from '@tanstack/react-query'; // Added useQuery
import { providersService } from 'services/api/providers.service'; // Added service

// project imports
import Profile from './Profile';
import Localization from './Localization';
import Notification from './Notification';
import FullScreen from './FullScreen';
// import Customization from './Customization'; // ✅ Moved to إعدادات النظام page
import MobileSection from './MobileSection';
import HorizontalNavigation from './HorizontalNavigation';
import ThemeModeToggle from './ThemeModeToggle';

import useConfig from 'hooks/useConfig';
import useAuth from 'hooks/useAuth';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import { MenuOrientation } from 'config';
import DrawerHeader from 'layout/Dashboard/Drawer/DrawerHeader';
import { useLocation } from 'react-router-dom';

// Fallback static asset
import waadLogoFallback from 'assets/images/waad-logo.png';

// ==============================|| HEADER - CONTENT ||============================== //

export default function HeaderContent() {
  const { state } = useConfig();
  const { user } = useAuth();
  const { companyName, companyNameEn, primaryColor, getLogoSrc, hasLogo, getInitials, settings } = useCompanySettings();
  const { pathname } = useLocation();// Force HMR Update

  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  // Check if user is a Provider
  // FIX: Remove URL-based check so Admins retain their Admin UI even when visiting portal pages
  const isProvider = user?.roles?.includes('PROVIDER');
  const providerName = user?.providerName || (user?.roles?.includes('SUPER_ADMIN') ? 'مستشفى الرازي - بنغازي' : null);

  // Phase 15: Fetch Provider Details for Header Badges
  const { data: providerDetails } = useQuery({
    queryKey: ['header-provider-details', user?.id],
    queryFn: async () => {
      // Phase 15 FIX: Robust ID resolution
      // 1. Try direct providerId from user object (most reliable)
      if (user?.providerId) return providersService.getById(user.providerId);

      // 2. Fallback: If user is PROVIDER but has no ID, log warning and return null
      // We rely on the backend to populate providerId in the user object during auth
      if (isProvider) {
        console.warn('[HeaderContent] Provider user missing providerId:', user);
      }
      return null;
    },
    enabled: isProvider && (!!user?.providerId),
    staleTime: 1000 * 60 * 5 // Cache for 5 minutes since provider details change rarely
  });

  const employerBadges = useMemo(() => {
    if (!providerDetails) return null;

    // Check for Global Network
    if (providerDetails.allowAllEmployers) {
      return (
        <Chip
          icon={<VerifiedUserIcon />}
          label="الشبكة العامة"
          color="success"
          size="small"
          variant="filled"
          sx={{ height: 24, fontWeight: 'bold' }}
        />
      );
    }

    // Check for specific contracts
    const names = providerDetails.contractedEmployerNames || [];
    // Check string-based Global Network indicator from mapper just in case
    if (names.some(n => n.includes('الشبكة العامة'))) {
      return (
        <Chip
          icon={<VerifiedUserIcon />}
          label="الشبكة العامة"
          color="success"
          size="small"
          variant="filled"
          sx={{ height: 24, fontWeight: 'bold' }}
        />
      );
    }

    if (names.length === 0) {
      return (
        <Chip
          label="غير متعاقد"
          color="default"
          size="small"
          variant="outlined"
          sx={{ height: 24 }}
        />
      );
    }

    // Display up to 2 badges
    return (
      <Stack direction="row" spacing={0.5}>
        {names.slice(0, 2).map((name, idx) => (
          <Tooltip key={idx} title={name}>
            <Chip
              icon={<BusinessIcon sx={{ fontSize: '0.9rem !important' }} />}
              label={name}
              color="info"
              size="small"
              variant="outlined"
              sx={{ height: 24, maxWidth: 120 }}
            />
          </Tooltip>
        ))}
        {names.length > 2 && (
          <Tooltip title={names.slice(2).join('، ')}>
            <Chip
              label={`+${names.length - 2}`}
              size="small"
              color="info"
              variant="filled"
              sx={{ height: 24, minWidth: 24, px: 0.5 }}
            />
          </Tooltip>
        )}
      </Stack>
    );
  }, [providerDetails]);

  const localization = useMemo(() => <Localization />, []);

  // Display name: Arabic for RTL, English for LTR
  const displayName = companyName || companyNameEn || 'TBA';

  return (
    <>
      {state.menuOrientation === MenuOrientation.HORIZONTAL && !downLG && <DrawerHeader open={true} />}

      {/* ✅ System Logo/Title - Different for Provider */}
      {!downLG && (
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Always show logo - uses fallback if no custom logo */}
            {hasLogo() || waadLogoFallback ? (
              <Box
                component="img"
                src={getLogoSrc()}
                alt={displayName}
                sx={{
                  height: 32,
                  width: 'auto',
                  maxWidth: 100,
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}

            {/* Fallback initials avatar */}
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 32,
                height: 32,
                fontSize: '1rem',
                display: hasLogo() || waadLogoFallback ? 'none' : 'flex'
              }}
            >
              {getInitials()}
            </Avatar>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: 'primary.main',
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {displayName}
              </Typography>


            </Box>


          </Stack>
        </Box>
      )}

      {/* ✅ Navigation Horizontal - القائمة الأفقية */}
      {!downLG && <HorizontalNavigation />}

      <Box sx={{ width: 1, ml: 1 }} />

      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
        {/* ✅ Welcome Message with Username */}
        {user && (
          <Chip
            icon={isProvider ? <LocalHospitalIcon /> : <PersonIcon />}
            label={`مرحباً، ${user.fullName || user.username}`}
            variant="outlined"
            color={isProvider ? 'success' : 'primary'}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              '& .MuiChip-icon': { color: isProvider ? 'success.main' : 'primary.main' }
            }}
          />
        )}
        {localization}
        <ThemeModeToggle />
        <Notification />
        {!downLG && <FullScreen />}
        {/* ✅ Customization moved to إعدادات النظام page */}
        {!downLG && <Profile />}
        {downLG && <MobileSection />}
      </Stack>
    </>
  );
}
