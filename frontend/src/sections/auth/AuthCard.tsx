import PropTypes from 'prop-types';
// material-ui
import { alpha, useTheme, useColorScheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';

// ==============================|| AUTHENTICATION - CARD WRAPPER ||============================== //

export default function AuthCard({ children, isDarkMode: isDarkModeProp, ...other }) {
  const theme = useTheme();
  const { mode, systemMode } = useColorScheme();

  const currentMode = mode === 'system' ? systemMode : mode;
  const isDarkMode = isDarkModeProp !== undefined ? isDarkModeProp : currentMode === 'dark';

  return (
    <MainCard
      sx={{
        maxWidth: { xs: 380, sm: 420 },
        margin: { xs: 2.5, md: 3 },
        '& > *': { flexGrow: 1, flexBasis: '50%' },
        backdropFilter: 'blur(20px)',

        // Conditional Styles
        background: isDarkMode
          ? alpha(theme.palette.grey[900], 0.7)
          : alpha(theme.palette.background.paper, 0.9),

        border: isDarkMode
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : `1px solid ${theme.palette.divider}`,

        borderRadius: 4,
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out, background 0.3s ease',

        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: isDarkMode ? 'rgba(0, 201, 167, 0.3)' : theme.palette.primary.main,
          boxShadow: isDarkMode
            ? `0 20px 40px rgba(0, 0, 0, 0.4)`
            : `0 20px 40px ${alpha(theme.palette.primary.main, 0.15)}`
        },

        // Dark Mode Text Overrides
        ...(isDarkMode && {
          '& .MuiTypography-root': { color: '#fff' },
          '& .MuiTypography-colorTextSecondary': { color: 'rgba(255, 255, 255, 0.7) !important' },
          '& .MuiInputBase-root': {
            color: '#fff',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          },
          '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' }
        })
      }}
      content={false}
      {...other}
      border={false}
      boxShadow
      shadow={isDarkMode ? `0 8px 32px rgba(0,0,0,0.5)` : `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>{children}</Box>
    </MainCard>
  );
}

AuthCard.propTypes = { children: PropTypes.any, other: PropTypes.any };
