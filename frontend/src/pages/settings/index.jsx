/**
 * Settings Page - Enterprise System Configuration
 *
 * Provides navigation to system configuration pages.
 * Last Updated: 2025-01-24
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, CardActionArea, Drawer } from '@mui/material';
import { BankOutlined, TeamOutlined, BgColorsOutlined, SettingOutlined, CloseCircleOutlined } from '@ant-design/icons';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import MainCard from 'components/MainCard';
import IconButton from 'components/@extended/IconButton';
import useAuth from 'hooks/useAuth';

// Theme customization components (moved from header)
import ThemeLayout from 'layout/Dashboard/Header/HeaderContent/Customization/ThemeLayout';
import DefaultThemeMode from 'layout/Dashboard/Header/HeaderContent/Customization/ThemeMode';
import ColorScheme from 'layout/Dashboard/Header/HeaderContent/Customization/ColorScheme';
import ThemeWidth from 'layout/Dashboard/Header/HeaderContent/Customization/ThemeWidth';
import ThemeFont from 'layout/Dashboard/Header/HeaderContent/Customization/ThemeFont';

/**
 * Settings Card Component
 */
const SettingsCard = ({ icon: Icon, title, description, onClick, color = '#1890ff' }) => {
  return (
    <Card sx={{ height: '100%', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              <Icon style={{ fontSize: 28, color }} />
            </Box>
            <Typography variant="h4" fontWeight={600}>
              {title}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

/**
 * Settings Page - Main Dashboard
 */
const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  // Check user permissions
  const hasRole = (roles) => {
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    return roles.some((role) => user.roles.includes(role));
  };

  const settingsSections = [
    {
      id: 'company',
      icon: BankOutlined,
      title: 'تكوين النظام',
      description: 'إدارة الإعدادات العامة والهوية البصرية للنظام',
      color: '#1890ff',
      route: '/settings/company',
      roles: ['SUPER_ADMIN', 'ADMIN']
    },
    {
      id: 'appearance',
      icon: BgColorsOutlined,
      title: 'تخصيص المظهر',
      description: 'تخصيص ألوان الواجهة والخطوط ووضع العرض',
      color: '#722ed1',
      action: () => setThemeDrawerOpen(true),
      roles: ['SUPER_ADMIN', 'ADMIN', 'INSURANCE_ADMIN', 'REVIEWER', 'EMPLOYER_ADMIN', 'PROVIDER']
    },
    {
      id: 'rbac',
      icon: TeamOutlined,
      title: 'الأدوار والصلاحيات',
      description: 'إدارة الأدوار والصلاحيات في النظام (RBAC)',
      color: '#52c41a',
      route: '/rbac',
      roles: ['SUPER_ADMIN', 'ADMIN']
    }
  ];

  // Filter sections based on user roles
  const availableSections = settingsSections.filter((section) => hasRole(section.roles));

  return (
    <Box>
      {/* Page Header */}
      <ModernPageHeader title="إعدادات النظام" subtitle="التحكم في إعدادات النظام والصلاحيات" icon={SettingOutlined} />

      {/* Settings Grid */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {availableSections.map((section) => (
          <Grid item xs={12} sm={6} md={4} key={section.id}>
            <SettingsCard
              icon={section.icon}
              title={section.title}
              description={section.description}
              color={section.color}
              onClick={() => section.action ? section.action() : navigate(section.route)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Theme Customization Drawer */}
      <Drawer
        sx={{ zIndex: 2001 }}
        anchor="right"
        onClose={() => setThemeDrawerOpen(false)}
        open={themeDrawerOpen}
        slotProps={{ paper: { sx: { width: 340 } } }}
      >
        <MainCard
          title="تخصيص المظهر"
          sx={{
            border: 'none',
            borderRadius: 0,
            height: '100vh',
            '& .MuiCardHeader-root': {
              bgcolor: 'primary.main',
              color: 'background.paper',
              '& .MuiTypography-root': { fontSize: '1rem', color: 'background.paper' }
            }
          }}
          content={false}
          secondary={
            <IconButton
              color="secondary"
              shape="rounded"
              size="small"
              onClick={() => setThemeDrawerOpen(false)}
              sx={{ color: 'background.paper', '&:hover': { bgcolor: 'transparent', color: 'error.main' } }}
            >
              <CloseCircleOutlined />
            </IconButton>
          }
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>وضع العرض</Typography>
              <DefaultThemeMode />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>الألوان</Typography>
              <ColorScheme />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>عرض الصفحة</Typography>
              <ThemeWidth />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>الخطوط</Typography>
              <ThemeFont />
            </Box>
          </Box>
        </MainCard>
      </Drawer>

      {/* No Settings Available */}
      {availableSections.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SettingOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
          <Typography variant="h5" color="text.secondary">
            لا توجد إعدادات متاحة
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ليس لديك صلاحيات للوصول إلى إعدادات النظام
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SettingsPage;
