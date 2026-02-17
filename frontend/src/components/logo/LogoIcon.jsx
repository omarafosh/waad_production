```javascript
// material-ui
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

// material-ui
import { useTheme } from '@mui/material/styles';
// Company settings context - SINGLE SOURCE OF TRUTH
import { useSystemSettings } from 'contexts/SystemSettingsContext';

// Fallback static asset
import waadLogoFallback from 'assets/images/waad-logo.png';

// ==============================|| LOGO ICON - COMPANY BRANDING ||============================== //

/**
 * LogoIcon - Simplified logo for collapsed sidebar or mobile
 */
const LogoIcon = () => {
  const theme = useTheme();
  // Get Company Settings (Logo)
  const { logoUrl, systemName, primaryColor } = useSystemSettings();

  // Return Logo if available
  if (logoUrl) {
    return (
      <Box 
        component="img"
        src={logoUrl}
        alt={systemName || 'System Logo'}
        sx={{ 
          width: 40,
          height: 'auto',
          maxHeight: 40,
          objectFit: 'contain'
        }}
      />
    );
  }

  // Fallback: Initials avatar
  return (
    <Avatar 
      sx={{ 
        bgcolor: primaryColor || '#1976d2',
        width: 40,
        height: 40,
        fontWeight: 700,
        fontSize: '1.2rem'
      }}
    >
      {systemName ? systemName.charAt(0).toUpperCase() : 'S'}
    </Avatar>
  );
};

export default LogoIcon;
```
