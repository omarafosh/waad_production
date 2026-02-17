/**
 * ============================================================================
 * Professional Settings Page - Enterprise System Configuration
 * ============================================================================
 *
 * Optimized no-scroll layout with visual harmony
 * 
 * @created 2026-02-01
 * @updated 2026-02-01 - Layout refinement
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  TextField,
  Button,
  Grid,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  Tabs,
  Tab,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Chip,
  Paper,
  MenuItem,
  alpha
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  Business as BusinessIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { useSystemCompany, useUpdateSystemCompany } from 'hooks/useCompany';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import useConfig from 'hooks/useConfig';
import waadLogoFallback from 'assets/images/waad-logo.png';
import UsersList from 'pages/rbac/users/UsersList';
import RolesList from 'pages/rbac/roles/RolesList';
// import PermissionMatrix from 'pages/rbac/PermissionMatrix'; // DELETE
import {
  ManageAccounts as ManageAccountsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';

const TabPanel = ({ children, value, index }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{ height: '100%', display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
  >
    {children}
  </Box>
);

const FieldGroup = ({ title, children, icon: Icon, color = 'primary.main' }) => (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {Icon && <Icon sx={{ fontSize: 20, color }} />}
      <Typography variant="subtitle2" fontWeight={600} color={color}>
        {title}
      </Typography>
    </Box>
    {children}
  </Box>
);

const ProfessionalSettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const { refreshSettings } = useCompanySettings();
  const { setField } = useConfig();

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    code: '',
    businessType: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    taxNumber: '',
    currency: 'SAR',
    cardNumberFormat: '[PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]',
    claimSlaDays: 10,
    preApprovalSlaDays: 3,
    fontSize: 12,
    fontFamily: 'Tajawal',
    barcodePrefix: 'WAAD',
    dateCalendar: 'gregory',
    monthFormat: 'numeric',
    numberSystem: 'latn',
    logoUrl: '',
    cardTitleColor: '#1890ff'
  });

  const [errors, setErrors] = useState({});
  const { data: company, isLoading, error } = useSystemCompany();
  const updateCompanyMutation = useUpdateSystemCompany();

  useEffect(() => {
    if (company?.data) {
      const companyData = company.data;
      setFormData({
        id: companyData.id,
        name: companyData.name || '',
        code: companyData.code || '',
        businessType: companyData.businessType || '',
        phone: companyData.phone || '',
        email: companyData.email || '',
        address: companyData.address || '',
        website: companyData.website || '',
        taxNumber: companyData.taxNumber || '',
        currency: companyData.currency || 'SAR',
        cardNumberFormat: companyData.cardNumberFormat || '[PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]',
        claimSlaDays: companyData.claimSlaDays || 10,
        preApprovalSlaDays: companyData.preApprovalSlaDays || 3,
        logoUrl: companyData.logoUrl || '',
        fontFamily: companyData.fontFamily || 'Tajawal',
        fontSize: companyData.fontSize || 12,
        barcodePrefix: companyData.barcodePrefix || 'WAAD',
        dateCalendar: companyData.dateCalendar || 'gregory',
        monthFormat: companyData.monthFormat || 'numeric',
        numberSystem: companyData.numberSystem || 'latn',
        cardTitleColor: companyData.cardTitleColor || '#1890ff'
      });
    }
  }, [company]);

  const handleChange = (field) => (event) => {
    let value = event.target.value;

    // Sanitize barcode prefix: Uppercase and alphanumeric (including -)
    // This strips Arabic Tashkeel and other non-standard characters
    if (field === 'barcodePrefix') {
      value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'اسم الشركة مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const { id, ...updateData } = formData;
    updateCompanyMutation.mutate(updateData, {
      onSuccess: () => {
        refreshSettings();
        if (formData.fontFamily) setField('fontFamily', formData.fontFamily);
        if (formData.fontSize) setField('fontSize', formData.fontSize);
      }
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 3 }}>حدث خطأ أثناء تحميل البيانات.</Alert>;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', px: 0 }}>
      <ModernPageHeader
        title="إعدادات النظام"
        subtitle="التحكم الشامل في هوية وسلوك المنظومة"
        icon={<img src={formData.logoUrl || waadLogoFallback} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} onError={(e) => e.target.src = waadLogoFallback} />}
      />

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 0 }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 52,
            '& .MuiTab-root': {
              minHeight: 52,
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none'
            }
          }}
        >
          <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="معلومات المؤسسة" />
          <Tab icon={<ManageAccountsIcon fontSize="small" />} iconPosition="start" label="المستخدمين" />
          <Tab icon={<AdminPanelSettingsIcon fontSize="small" />} iconPosition="start" label="الأدوار" />
          <Tab icon={<SpeedIcon fontSize="small" />} iconPosition="start" label="المحرك التشغيلي" />
          <Tab icon={<SecurityIcon fontSize="small" />} iconPosition="start" label="الحماية" disabled />
        </Tabs>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', py: 2.5, pl: 2.5 }}>

            {/* Tab 1: معلومات المؤسسة */}
            <TabPanel value={tabValue} index={0}>
              <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Paper variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 2 }}>
                        <FieldGroup title="المعلومات الأساسية" icon={BusinessIcon}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField fullWidth size="small" label="اسم المؤسسة" value={formData.name} onChange={handleChange('name')} error={!!errors.name} helperText={errors.name} required />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField fullWidth size="small" label="نوع النشاط" value={formData.businessType} onChange={handleChange('businessType')} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField fullWidth size="small" label="الهاتف" value={formData.phone} onChange={handleChange('phone')} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField fullWidth size="small" label="البريد" value={formData.email} onChange={handleChange('email')} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField fullWidth size="small" label="الموقع" value={formData.website} onChange={handleChange('website')} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <TextField fullWidth size="small" label="العنوان" value={formData.address} onChange={handleChange('address')} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <TextField fullWidth size="small" label="الرقم الضريبي" value={formData.taxNumber} onChange={handleChange('taxNumber')} />
                            </Grid>
                          </Grid>
                        </FieldGroup>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 5 }}>
                      <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                            <FieldGroup title="الشعار">
                              <Box display="flex" flexDirection="column" gap={1.5}>
                                <Box sx={{
                                  width: '100%',
                                  height: 100,
                                  borderRadius: 2,
                                  border: '2px dashed',
                                  borderColor: 'divider',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: alpha('#000', 0.02)
                                }}>
                                  <img src={formData.logoUrl || waadLogoFallback} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%' }} onError={(e) => e.target.src = waadLogoFallback} />
                                </Box>
                                <TextField fullWidth size="small" label="رابط الشعار" value={formData.logoUrl} onChange={handleChange('logoUrl')} />
                                <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} fullWidth>
                                  رفع من الجهاز
                                  <input type="file" hidden accept="image/*" onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => setFormData(p => ({ ...p, logoUrl: reader.result }));
                                      reader.readAsDataURL(e.target.files[0]);
                                    }
                                  }} />
                                </Button>
                              </Box>
                            </FieldGroup>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                            <FieldGroup title="الخط والحجم">
                              <FormControl fullWidth size="small">
                                <RadioGroup row value={formData.fontFamily} onChange={handleChange('fontFamily')}>
                                  <FormControlLabel value="Tajawal" control={<Radio size="small" />} label={<span style={{ fontFamily: 'Tajawal', fontSize: '0.875rem' }}>تجوال</span>} />
                                  <FormControlLabel value="Cairo" control={<Radio size="small" />} label={<span style={{ fontFamily: 'Cairo', fontSize: '0.875rem' }}>كايرو</span>} />
                                </RadioGroup>
                              </FormControl>
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">حجم الخط</Typography>
                                <Slider
                                  value={formData.fontSize}
                                  onChange={(e, val) => setFormData(p => ({ ...p, fontSize: val }))}
                                  min={12}
                                  max={18}
                                  step={1}
                                  marks={[
                                    { value: 12, label: '12' },
                                    { value: 14, label: '14' },
                                    { value: 16, label: '16' },
                                    { value: 18, label: '18' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                              </Box>
                            </FieldGroup>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                            <FieldGroup title="ألوان الواجهة" icon={CloudUploadIcon} color="secondary.main">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    bgcolor: formData.cardTitleColor,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    flexShrink: 0
                                  }}
                                />
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="لون عناوين الكروت"
                                  value={formData.cardTitleColor}
                                  onChange={handleChange('cardTitleColor')}
                                  placeholder="#1890ff"
                                  InputProps={{
                                    endAdornment: (
                                      <input
                                        type="color"
                                        value={formData.cardTitleColor}
                                        onChange={(e) => setFormData(p => ({ ...p, cardTitleColor: e.target.value }))}
                                        style={{ width: 30, height: 30, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}
                                      />
                                    )
                                  }}
                                />
                              </Box>
                            </FieldGroup>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.paper' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={updateCompanyMutation?.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    disabled={updateCompanyMutation?.isPending}
                  >
                    {updateCompanyMutation?.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </Box>
              </Box>
            </TabPanel>

            {/* Tab 1: المستخدمين */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                <UsersList isEmbedded={true} />
              </Box>
            </TabPanel>

            {/* Tab 2: الأدوار */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                <RolesList isEmbedded={true} />
              </Box>
            </TabPanel>

            {/* Tab 3: المحرك التشغيلي */}
            <TabPanel value={tabValue} index={3}>
              <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', py: 3 }}>
                    <Box sx={{ maxWidth: 900, width: '100%' }}>
                      <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, lg: 7 }}>
                          <Stack spacing={2.5}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                              <FieldGroup title="الإعدادات المالية والزمنية" icon={SpeedIcon}>
                                <Grid container spacing={2}>
                                  <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField fullWidth size="small" label="العملة" value={formData.currency} onChange={handleChange('currency')} helperText="SAR, USD" />
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 4 }}>
                                    <Paper sx={{ p: 1.5, bgcolor: alpha('#1890ff', 0.08), border: '1px solid', borderColor: alpha('#1890ff', 0.2), borderRadius: 1 }}>
                                      <Typography variant="caption" color="primary" fontWeight={600} display="block" gutterBottom>SLA المطالبات</Typography>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={formData.claimSlaDays}
                                        onChange={(e) => setFormData(p => ({ ...p, claimSlaDays: parseInt(e.target.value) || 10 }))}
                                        InputProps={{ endAdornment: <Typography variant="caption">يوم</Typography> }}
                                      />
                                    </Paper>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 4 }}>
                                    <Paper sx={{ p: 1.5, bgcolor: alpha('#52c41a', 0.08), border: '1px solid', borderColor: alpha('#52c41a', 0.2), borderRadius: 1 }}>
                                      <Typography variant="caption" color="success.dark" fontWeight={600} display="block" gutterBottom>SLA الموافقات</Typography>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={formData.preApprovalSlaDays}
                                        onChange={(e) => setFormData(p => ({ ...p, preApprovalSlaDays: parseInt(e.target.value) || 3 }))}
                                        InputProps={{ endAdornment: <Typography variant="caption">يوم</Typography> }}
                                      />
                                    </Paper>
                                  </Grid>
                                </Grid>
                              </FieldGroup>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                              <FieldGroup title="صيغة الترقيم الذكي">
                                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                                  <Typography variant="caption" fontWeight={600}>الرموز:</Typography>
                                  <Typography variant="caption" sx={{ ml: 1 }}><code>[PRO]</code> المزود | <code>[YEAR]</code> السنة | <code>[EMP_NO]</code> الرقم | <code>[REL_SUFFIX]</code> القرابة</Typography>
                                </Alert>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="تنسيق رقم البطاقة"
                                  value={formData.cardNumberFormat}
                                  onChange={handleChange('cardNumberFormat')}
                                  placeholder="[PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]"
                                />
                              </FieldGroup>
                            </Paper>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 5 }}>
                          <Stack spacing={2.5}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                              <FieldGroup title="تفضيلات العرض" icon={SpeedIcon}>
                                <Grid container spacing={2}>
                                  <Grid size={{ xs: 12, sm: 12 }}>
                                    <TextField
                                      select
                                      fullWidth
                                      size="small"
                                      label="التقويم"
                                      value={formData.dateCalendar}
                                      onChange={handleChange('dateCalendar')}
                                    >
                                      <MenuItem value="gregory">ميلادي (Gregorian)</MenuItem>
                                      <MenuItem value="islamic">هجري (Islamic)</MenuItem>
                                    </TextField>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                      select
                                      fullWidth
                                      size="small"
                                      label="تنسيق الشهر"
                                      value={formData.monthFormat}
                                      onChange={handleChange('monthFormat')}
                                    >
                                      <MenuItem value="numeric">رقمي (12)</MenuItem>
                                      <MenuItem value="2-digit">رقمان (12)</MenuItem>
                                      <MenuItem value="long">نصي (ديسمبر)</MenuItem>
                                      <MenuItem value="short">نصي مختصر (ديس)</MenuItem>
                                    </TextField>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                      select
                                      fullWidth
                                      size="small"
                                      label="نظام الأرقام"
                                      value={formData.numberSystem}
                                      onChange={handleChange('numberSystem')}
                                    >
                                      <MenuItem value="latn">لاتيني (123)</MenuItem>
                                      <MenuItem value="arab">عربي (١٢٣)</MenuItem>
                                    </TextField>
                                  </Grid>
                                </Grid>
                              </FieldGroup>
                            </Paper>
                            <RBACGuard requiredRoles={['SUPER_ADMIN']}>
                              <Paper sx={{ p: 2.5, bgcolor: alpha('#ff4d4f', 0.05), border: '2px solid', borderColor: 'error.main', borderRadius: 2, height: '100%' }}>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                  <Chip label="Admin Only" size="small" color="error" />
                                  <Typography variant="subtitle2" fontWeight={700} color="error.main">منطقة النظام</Typography>
                                </Box>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="بادئة الباركود"
                                  value={formData.barcodePrefix}
                                  onChange={handleChange('barcodePrefix')}
                                  helperText="مثل: WAAD-XXXX"
                                  sx={{ mb: 2 }}
                                />
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>معلومات النظام</Typography>
                                <Stack spacing={1}>
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="caption">البادئة:</Typography>
                                    <Chip label={formData.barcodePrefix} size="small" color="primary" />
                                  </Box>
                                </Stack>
                              </Paper>
                            </RBACGuard>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                </Box>

                <Divider />
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.paper' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={updateCompanyMutation?.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    disabled={updateCompanyMutation?.isPending}
                  >
                    {updateCompanyMutation?.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </Box>
              </Box>
            </TabPanel>

            {/* Tab 4: Security */}
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Alert severity="info">
                  <Typography variant="h6">قريباً</Typography>
                  <Typography variant="body2">إعدادات الحماية والوصول قيد التطوير</Typography>
                </Alert>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default ProfessionalSettingsPage;
