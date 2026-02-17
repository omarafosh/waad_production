import PropTypes from 'prop-types';
// material-ui
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

// System settings context - SINGLE SOURCE OF TRUTH
import { useSystemSettings } from 'contexts/SystemSettingsContext';

// Fallback static asset (only used if context not available)
import waadLogoFallback from 'assets/images/waad-logo.png';

// ==============================|| LOGO - SYSTEM BRANDING ||============================== //

/**
 * LogoMain - System logo from centralized settings
 * 
 * Uses SystemSettingsContext for dynamic branding.
 * Fallback: Static asset or initials avatar.
 */
export default function LogoMain({ reverse }) {
  const { logoUrl, systemName, primaryColor } = useSystemSettings();

  // Determine logo source
  const logoSrc = logoUrl || waadLogoFallback;

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {logoUrl ? (
        <Box
          component="img"
          src={logoSrc}
          alt={systemName || 'Top Doctors TPA'}
          sx={{
            height: 40,
            width: 'auto',
            objectFit: 'contain'
          }}
        />
      ) : (
        // Fallback: Initials avatar
        <Avatar
          sx={{
            bgcolor: primaryColor || '#1890ff',
            width: 40,
            height: 40,
            fontWeight: 700
          }}
        >
          {systemName ? systemName.charAt(0).toUpperCase() : 'T'}
        </Avatar>
      )}
    </Stack>
  );
}

LogoMain.propTypes = { reverse: PropTypes.bool };
