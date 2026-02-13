import { useState } from 'react';
import PropTypes from 'prop-types';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme, useColorScheme } from '@mui/material/styles';

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
  const { mode, systemMode } = useColorScheme();
  const theme = useTheme();

  // Handle 'system' mode correctly
  const currentMode = mode === 'system' ? systemMode : mode;
  const isDarkMode = currentMode === 'dark';

  const { companyName, getLogoSrc, hasLogo, settings } = useCompanySettings();

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

      {!isDarkMode && <AuthBackground />}

      <Stack sx={{ minHeight: '100vh' }}>
        {/* Main Content Area (Login Card) */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 2
          }}
        >
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

        {/* Footer - Pushed to Bottom */}
        <Box sx={{ p: 2, mt: 'auto' }}>
          <AuthFooter />
        </Box>
      </Stack>
    </Box>
  );
}

AuthWrapper.propTypes = { children: PropTypes.node };
