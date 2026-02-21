import { useState } from 'react';
import PropTypes from 'prop-types';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

// icons
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Moon
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Sun

// project imports
import AuthFooter from 'components/cards/AuthFooter';
import Logo from 'components/logo';
import AuthCard from './AuthCard';
import { useCompanySettings } from 'contexts/CompanySettingsContext';

// assets
import AuthBackground from './AuthBackground';

// ==============================|| AUTHENTICATION - WRAPPER ||============================== //

export default function AuthWrapper({ children }) {
  const theme = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { companyName, getLogoSrc, hasLogo, settings } = useCompanySettings();

  const handleThemeChange = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDarkMode
          ? 'linear-gradient(180deg, #0A1628 0%, #0F1D32 50%, #152238 100%)'
          : 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
        color: isDarkMode ? '#fff' : 'inherit',
        transition: 'background 0.3s ease',
        position: 'relative'
      }}
    >
      {/* Theme Toggle Button */}
      <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1200 }}>
        <Tooltip title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}>
          <IconButton
            onClick={handleThemeChange}
            sx={{
              color: isDarkMode ? 'white' : 'primary.main',
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '&:hover': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }
            }}
          >
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Box>

      {!isDarkMode && <AuthBackground />}

      <Stack sx={{ minHeight: '100vh', justifyContent: 'center' }}>
        {/* Logo & Company Name - Above Login Box */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {hasLogo() ? (
            <Box
              component="img"
              src={getLogoSrc()}
              alt={companyName}
              sx={{
                height: { xs: 60, sm: 70 },
                width: 'auto',
                objectFit: 'contain',
                mb: 1.5,
                filter: isDarkMode ? 'brightness(1.1)' : 'none'
              }}
            />
          ) : (
            <Logo />
          )}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: isDarkMode ? 'white' : 'primary.main',
              mb: 0.5
            }}
          >
            {companyName || 'شركة وعد'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
              fontSize: '0.85rem'
            }}
          >
            {settings?.businessType || 'لإدارة النفقات الطبية'}
          </Typography>
        </Box>

        {/* Login Card */}
        <Box>
          <Grid
            container
            sx={{
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Grid>
              <AuthCard isDarkMode={isDarkMode}>{children}</AuthCard>
            </Grid>
          </Grid>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 3 }}>
          <AuthFooter />
        </Box>
      </Stack>
    </Box>
  );
}

AuthWrapper.propTypes = { children: PropTypes.node };
