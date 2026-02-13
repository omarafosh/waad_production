import { useSearchParams } from 'react-router-dom';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import useAuth from 'hooks/useAuth';
import AuthWrapper from 'sections/auth/AuthWrapper';
import AuthLogin from 'sections/auth/jwt/AuthLogin';
import Logo from 'components/logo';
import { useCompanySettings } from 'contexts/CompanySettingsContext';

// assets - security icons
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

// ================================|| JWT - LOGIN ||================================ //

export default function Login() {
  const { isLoggedIn } = useAuth();
  const theme = useTheme();
  const { companyName, getLogoSrc, hasLogo, settings } = useCompanySettings();
  const isDarkMode = theme.palette.mode === 'dark';

  const [searchParams] = useSearchParams();
  const auth = searchParams.get('auth');

  return (
    <AuthWrapper>
      <Grid container spacing={1.5}>
        {/* Internal Branding Section */}
        <Grid size={12}>
          <Stack sx={{ alignItems: 'center', mb: 1.5 }}>
            {hasLogo() ? (
              <Box
                component="img"
                src={getLogoSrc()}
                alt={companyName}
                sx={{
                  height: { xs: 45, sm: 55 },
                  width: 'auto',
                  objectFit: 'contain',
                  mb: 1,
                  filter: isDarkMode ? 'brightness(1.1)' : 'none'
                }}
              />
            ) : (
              <Logo />
            )}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: theme.palette.primary.main,
                mb: 0.25,
                fontSize: `${(settings?.fontSize || 12) * 1.5}px`
              }}
            >
              مرحباً بك
            </Typography>
            <Stack sx={{ alignItems: 'center', mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: `${settings?.fontSize || 12}px` }}>
                سجّل دخولك للوصول إلى
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'primary.main',
                  fontWeight: 800,
                  fontSize: `${(settings?.fontSize || 12) * 1.1}px`,
                  mt: 0.25,
                  px: 1,
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                {companyName || 'نظام وعد الطبي'}
              </Typography>
            </Stack>
          </Stack>
        </Grid>

        {/* Divider */}
        <Grid size={12}>
          <Divider sx={{ my: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              بيانات الدخول
            </Typography>
          </Divider>
        </Grid>

        {/* Login Form */}
        <Grid size={12}>
          <AuthLogin isDemo={isLoggedIn} />
        </Grid>

        {/* Compact Security Features Section */}
        <Grid size={12}>
          <Box
            sx={{
              mt: 1,
              p: 1,
              borderRadius: 2,
              bgcolor: isDarkMode ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`
            }}
          >
            <Stack direction="row" justifyContent="center" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
              <ShieldOutlinedIcon sx={{ fontSize: `${(settings?.fontSize || 12) * 1.2}px`, color: 'success.main' }} />
              <Typography variant="caption" color="success.main" fontWeight={700} sx={{ fontSize: `${(settings?.fontSize || 12) * 0.9}px` }}>
                نظام محمي ومؤمّن
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={0.5}
              justifyContent="center"
              flexWrap="wrap"
              sx={{ gap: 0.5 }}
            >
              <Chip
                icon={<HttpsOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                label="SSL"
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  borderColor: alpha(theme.palette.text.secondary, 0.2),
                  '& .MuiChip-icon': { color: 'text.secondary' }
                }}
              />
              <Chip
                icon={<LockOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                label="حماية"
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  borderColor: alpha(theme.palette.text.secondary, 0.2),
                  '& .MuiChip-icon': { color: 'text.secondary' }
                }}
              />
              <Chip
                icon={<VerifiedUserOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                label="آمن"
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  borderColor: alpha(theme.palette.text.secondary, 0.2),
                  '& .MuiChip-icon': { color: 'text.secondary' }
                }}
              />
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}
