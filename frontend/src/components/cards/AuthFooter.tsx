// material-ui
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// icons
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

// ==============================|| FOOTER - AUTHENTICATION ||============================== //

// Landing page URL
const LANDING_PAGE_URL = import.meta.env.VITE_LANDING_PAGE_URL || '/';

export default function AuthFooter() {
  return (
    <Container maxWidth="xl">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, justifyContent: { xs: 'center', sm: 'space-between' }, textAlign: { xs: 'center', sm: 'inherit' } }}
      >
        <Typography variant="subtitle2" color="secondary">
          © {new Date().getFullYear()} نظام وعد - إدارة مطالبات التأمين. جميع الحقوق محفوظة.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, textAlign: { xs: 'center', sm: 'inherit' }, alignItems: 'center' }}>
          <Link 
            href={LANDING_PAGE_URL}
            underline="hover"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              color: 'primary.main',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            <HomeOutlinedIcon sx={{ fontSize: 18 }} />
            الصفحة الرئيسية
          </Link>
          <Typography variant="subtitle2" color="secondary">
            الشروط والأحكام
          </Typography>
          <Typography variant="subtitle2" color="secondary">
            سياسة الخصوصية
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
}
