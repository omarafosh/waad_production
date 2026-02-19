import { useEffect, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { useSystemSettings } from 'contexts/SystemSettingsContext';

import { SaveOutlined, ReloadOutlined, BankOutlined } from '@ant-design/icons';

const buildFormState = (settings) => ({
  systemName: settings?.systemName || '',
  systemCode: settings?.systemCode || '',
  businessType: settings?.businessType || '',
  taxNumber: settings?.taxNumber || '',
  phone: settings?.phone || '',
  email: settings?.email || '',
  website: settings?.website || '',
  address: settings?.address || '',
  logoUrl: settings?.logoUrl || '',
  primaryColor: settings?.primaryColor || '#1890ff',
  fontFamily: settings?.fontFamily || 'Cairo',
  fontSize: settings?.fontSize || 14
});

export default function TabCompanyInfo() {
  const { settings, updateSettings, isUpdating } = useSystemSettings();

  const [formData, setFormData] = useState(buildFormState(settings));
  const [errors, setErrors] = useState({});

  const initialSnapshot = useMemo(() => buildFormState(settings), [settings]);

  useEffect(() => {
    setFormData(initialSnapshot);
    setErrors({});
  }, [initialSnapshot]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.systemName || !formData.systemName.trim()) {
      newErrors.systemName = 'اسم النظام مطلوب';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }

    const urlRegex = /^https?:\/\/.+/;
    if (formData.website && !urlRegex.test(formData.website)) {
      newErrors.website = 'صيغة الرابط غير صحيحة (يجب أن يبدأ بـ http:// أو https://)';
    }

    if (formData.logoUrl && !urlRegex.test(formData.logoUrl)) {
      newErrors.logoUrl = 'صيغة رابط الشعار غير صحيحة';
    }

    const parsedFontSize = Number(formData.fontSize);
    if (Number.isNaN(parsedFontSize) || parsedFontSize < 8 || parsedFontSize > 30) {
      newErrors.fontSize = 'حجم الخط يجب أن يكون بين 8 و 30';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    setFormData(initialSnapshot);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateForm()) {
      openSnackbar({
        open: true,
        message: 'يرجى تصحيح أخطاء الإدخال قبل الحفظ',
        variant: 'warning'
      });
      return;
    }

    try {
      await updateSettings({
        ...settings,
        ...formData,
        fontSize: Number(formData.fontSize)
      });

      openSnackbar({
        open: true,
        message: 'تم حفظ إعدادات النظام بنجاح',
        variant: 'success'
      });
    } catch (error) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'فشل حفظ إعدادات النظام',
        variant: 'error'
      });
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard title="إعدادات الشركة والنظام">
          <Grid container spacing={3}>
            <Grid size={12}>
              <Divider textAlign="left">الهوية البصرية</Divider>
            </Grid>

            <Grid size={12}>
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar variant="rounded" sx={{ width: 120, height: 120, bgcolor: 'primary.lighter' }} src={formData.logoUrl || undefined}>
                  <BankOutlined style={{ fontSize: '3rem' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="رابط الشعار (Logo URL)"
                    value={formData.logoUrl}
                    onChange={handleChange('logoUrl')}
                    placeholder="https://example.com/logo.png"
                    error={!!errors.logoUrl}
                    helperText={errors.logoUrl || 'أدخل رابطًا مباشرًا لصورة الشعار'}
                  />
                </Box>
              </Stack>
            </Grid>

            <Grid size={12}>
              <Divider textAlign="left" sx={{ mt: 2 }}>المعلومات الأساسية</Divider>
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="اسم النظام"
                value={formData.systemName}
                onChange={handleChange('systemName')}
                error={!!errors.systemName}
                helperText={errors.systemName}
                dir="rtl"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="رمز النظام"
                value={formData.systemCode}
                onChange={handleChange('systemCode')}
                placeholder="TBA_WAAD"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="نوع النشاط"
                value={formData.businessType}
                onChange={handleChange('businessType')}
                placeholder="Healthcare TPA"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="الرقم الضريبي"
                value={formData.taxNumber}
                onChange={handleChange('taxNumber')}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="اللون الأساسي"
                value={formData.primaryColor}
                onChange={handleChange('primaryColor')}
                placeholder="#1890ff"
              />
            </Grid>

            <Grid size={12}>
              <Divider textAlign="left" sx={{ mt: 2 }}>معلومات التواصل</Divider>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="الهاتف"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder="+218 XX XXX XXXX"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="الموقع الإلكتروني"
                value={formData.website}
                onChange={handleChange('website')}
                placeholder="https://www.example.com"
                error={!!errors.website}
                helperText={errors.website}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="العنوان"
                value={formData.address}
                onChange={handleChange('address')}
                multiline
                rows={3}
              />
            </Grid>

            <Grid size={12}>
              <Divider textAlign="left" sx={{ mt: 2 }}>الخطوط</Divider>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="نوع الخط"
                value={formData.fontFamily}
                onChange={handleChange('fontFamily')}
                placeholder="Cairo"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="حجم الخط"
                value={formData.fontSize}
                onChange={handleChange('fontSize')}
                error={!!errors.fontSize}
                helperText={errors.fontSize || 'المدى المسموح: 8 - 30'}
              />
            </Grid>

            <Grid size={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={handleReset} disabled={isUpdating}>
                  إعادة تعيين
                </Button>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSave} disabled={isUpdating}>
                  {isUpdating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
    </Grid>
  );
}
