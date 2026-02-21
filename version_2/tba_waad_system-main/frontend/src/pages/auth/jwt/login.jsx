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

// assets - security icons
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

// ================================|| JWT - LOGIN ||================================ //

export default function Login() {
  const { isLoggedIn } = useAuth();
  const theme = useTheme();

  const [searchParams] = useSearchParams();
  const auth = searchParams.get('auth');
  console.log(auth);

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        {/* Header Section */}
        <Grid size={12}>
          <Stack sx={{ alignItems: 'center', mb: 1 }}>
            {/* Welcome Text - Clean without icon */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              مرحباً بك
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              سجّل دخولك للوصول إلى نظام وعد لإدارة التأمين الصحي
            </Typography>
          </Stack>
        </Grid>

        {/* Divider */}
        <Grid size={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="caption" color="text.secondary">
              بيانات الدخول
            </Typography>
          </Divider>
        </Grid>

        {/* Login Form */}
        <Grid size={12}>
          <AuthLogin isDemo={isLoggedIn} />
        </Grid>

        {/* Security Features Section */}
        <Grid size={12}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
            }}
          >
            {/* Security Badge */}
            <Stack direction="row" justifyContent="center" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="subtitle2" color="success.main" fontWeight={600}>
                نظام محمي ومؤمّن
              </Typography>
            </Stack>

            {/* Security Features */}
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ gap: 1 }}>
              <Chip
                icon={<HttpsOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                label="تشفير SSL"
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  borderColor: alpha(theme.palette.text.secondary, 0.3),
                  '& .MuiChip-icon': { color: 'text.secondary' }
                }}
              />
              <Chip
                icon={<LockOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                label="حماية البيانات"
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  borderColor: alpha(theme.palette.text.secondary, 0.3),
                  '& .MuiChip-icon': { color: 'text.secondary' }
                }}
              />
              <Chip
                icon={<VerifiedUserOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                label="مصادقة آمنة"
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  borderColor: alpha(theme.palette.text.secondary, 0.3),
                  '& .MuiChip-icon': { color: 'text.secondary' }
                }}
              />
            </Stack>

            {/* Registration Notice */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', mt: 1.5, fontSize: '0.7rem' }}
            >
              🔐 التسجيل متاح فقط من داخل النظام عبر مسؤول الحسابات
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}
