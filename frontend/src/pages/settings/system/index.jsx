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
  Security as SecurityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { useSettings } from 'hooks/useSettings'; // Changed from useCompany
import { useSystemSettings } from 'contexts/SystemSettingsContext'; // Changed from CompanySettingsContext
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
  const { isUpdating } = useSystemSettings(); // Use context state if needed
  const { setField } = useConfig();

  const [formData, setFormData] = useState({
    id: null,
    systemName: '', // Changed from name
    systemCode: '', // Changed from code
    businessType: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    taxNumber: '',
    currency: 'LYD', // Changed default to LYD to match DB
    cardNumberFormat: '[PRO]-[YEAR]-[MP_NO][REL_SUFFIX]',
    claimSlaDays: 10,
    preApprovalSlaDays: 3,
    fontSize: 12,
    fontFamily: 'Cairo', // Changed default to Cairo
    barcodePrefix: 'TD', // Changed default
    dateCalendar: 'gregory',
    monthFormat: 'numeric',
    numberSystem: 'latn',
    logoUrl: '',
    primaryColor: '#1890ff',
    dependentSuffixes: '{"WIFE":"W","HUSBAND":"H","SON":"S","DAUGHTER":"D","FATHER":"F","MOTHER":"M","BROTHER":"B","SISTER":"I"}'
  });

  const [errors, setErrors] = useState({});
  // Use new hook
  const { settings, isLoading, error, updateSettings, isUpdating: isPending, refetch } = useSettings();

  useEffect(() => {
    if (settings) {
      setFormData({
        id: settings.id,
        systemName: settings.systemName || '', // Mapped
        systemCode: settings.systemCode || '', // Mapped
        businessType: settings.businessType || 'Health Insurance', // Not in SettingDto yet? Keep fallback
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        website: settings.website || '',
        taxNumber: settings.taxNumber || '',
        currency: settings.currency || 'LYD',
        cardNumberFormat: settings.cardNumberFormat || '[MP_NO]-[YEAR]-[PRO]',
        claimSlaDays: settings.claimSlaDays || 10,
        preApprovalSlaDays: settings.preApprovalSlaDays || 3,
        logoUrl: settings.logoUrl || '',
        fontFamily: settings.fontFamily || 'Cairo',
        fontSize: settings.fontSize || 12, // Not in DTO?
        barcodePrefix: settings.barcodePrefix || 'TD',
        dateCalendar: settings.dateCalendar || 'gregory',
        monthFormat: settings.monthFormat || 'numeric', // Not in DTO?
        numberSystem: settings.numberSystem || 'latn', // Not in DTO?
        primaryColor: settings.primaryColor || '#1890ff',
        dependentSuffixes: settings.dependentSuffixes || '{"WIFE":"W","HUSBAND":"H","SON":"S","DAUGHTER":"D","FATHER":"F","MOTHER":"M","BROTHER":"B","SISTER":"I"}'
      });
    }
  }, [settings]);

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

  const handleSuffixChange = (rel) => (event) => {
    try {
      const suffixes = JSON.parse(formData.dependentSuffixes);
      suffixes[rel] = event.target.value.toUpperCase();
      setFormData(prev => ({ ...prev, dependentSuffixes: JSON.stringify(suffixes) }));
    } catch (e) {
      console.error('Error updating suffix:', e);
    }
  };

  const relationshipLabels = {
    WIFE: 'زوجة',
    HUSBAND: 'زوج',
    SON: 'ابن',
    DAUGHTER: 'ابنة',
    FATHER: 'أب',
    MOTHER: 'أم',
    BROTHER: 'أخ',
    SISTER: 'أخت'
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.systemName?.trim()) newErrors.systemName = 'اسم المؤسسة مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const { id, ...updateData } = formData;

    try {
      await updateSettings(updateData);
      refetch(); // Refresh local data from API
      if (formData.fontFamily) setField('fontFamily', formData.fontFamily);
      if (formData.fontSize) setField('fontSize', formData.fontSize);
    } catch (err) {
      // handled by hook
    }
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
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', px: 0 }}>
      {/* Header Area - Compact */}
      <Box sx={{ px: 2, pt: 1, flexShrink: 0 }}>
        <ModernPageHeader
          title="إعدادات النظام"
          subtitle="التحكم في هوية وسلوك المنظومة"
          icon={<SettingsIcon sx={{ fontSize: '2.5rem', color: 'primary.main' }} />}
          noIconBox
          sx={{ mb: 1 }}
        />
      </Box>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 0, border: 'none', bgcolor: 'transparent', mx: 2, mb: 1 }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 40,
            bgcolor: 'background.paper',
            borderRadius: '8px 8px 0 0',
            '& .MuiTab-root': {
              minHeight: 40,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
              py: 0
            }
          }}
        >
          <Tab icon={<BusinessIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="معلومات المؤسسة" />
          <Tab icon={<ManageAccountsIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="المستخدمين" />
          <Tab icon={<AdminPanelSettingsIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="الأدوار" />
          <Tab icon={<SpeedIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="المحرك التشغيلي" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.paper', borderRadius: '0 0 8px 8px' }}>
          {/* Tab 0: Organization Info */}
          <TabPanel value={tabValue} index={0}>
            <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <Grid container spacing={2}>
                  {/* Branding/Identity on the RIGHT (Start) */}
                  <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <FieldGroup title="الهوية البصرية">
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{
                              width: 60, height: 60, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#000', 0.02), flexShrink: 0
                            }}>
                              <img src={formData.logoUrl || waadLogoFallback} alt="Logo" style={{ maxWidth: '80%', maxHeight: '80%' }} onError={(e) => e.target.src = waadLogoFallback} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} fullWidth sx={{ mb: 1 }}>
                                تغيير الشعار
                                <input type="file" hidden accept="image/*" onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setFormData(p => ({ ...p, logoUrl: reader.result }));
                                    reader.readAsDataURL(e.target.files[0]);
                                  }
                                }} />
                              </Button>
                              <TextField fullWidth size="small" label="رابط الشعار" value={formData.logoUrl} onChange={handleChange('logoUrl')} />
                            </Box>
                          </Box>
                        </FieldGroup>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <FieldGroup title="المظهر والخطوط">
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">لغة النظام</Typography>
                              <RadioGroup row value={formData.i18n || 'ar'} onChange={handleChange('i18n')}>
                                <FormControlLabel value="ar" control={<Radio size="small" />} label={<Typography variant="caption">عربي (AR)</Typography>} />
                                <FormControlLabel value="en" control={<Radio size="small" />} label={<Typography variant="caption">English (EN)</Typography>} />
                              </RadioGroup>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">نوع الخط</Typography>
                              <RadioGroup row value={formData.fontFamily} onChange={handleChange('fontFamily')}>
                                <FormControlLabel value="Tajawal" control={<Radio size="small" />} label={<span style={{ fontFamily: 'Tajawal', fontSize: '0.75rem' }}>تجوال</span>} />
                                <FormControlLabel value="Cairo" control={<Radio size="small" />} label={<span style={{ fontFamily: 'Cairo', fontSize: '0.75rem' }}>كايرو</span>} />
                              </RadioGroup>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">حجم الخط ({formData.fontSize}px)</Typography>
                              <Slider
                                value={formData.fontSize}
                                onChange={(e, val) => setFormData(p => ({ ...p, fontSize: val }))}
                                min={12} max={18} step={1} valueLabelDisplay="auto" size="small"
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box sx={{ width: 24, height: 24, borderRadius: 0.5, bgcolor: formData.primaryColor, border: '1px solid', borderColor: 'divider' }} />
                              <TextField
                                fullWidth size="small" label="لون العناوين" value={formData.primaryColor}
                                onChange={handleChange('primaryColor')}
                                InputProps={{
                                  endAdornment: (
                                    <input type="color" value={formData.primaryColor}
                                      onChange={(e) => setFormData(p => ({ ...p, primaryColor: e.target.value }))}
                                      style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} />
                                  )
                                }}
                              />
                            </Box>
                          </Stack>
                        </FieldGroup>
                      </Paper>
                    </Stack>
                  </Grid>

                  {/* Basic Info on the LEFT (End) */}
                  <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <FieldGroup title="المعلومات الأساسية" icon={BusinessIcon}>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="اسم المؤسسة" value={formData.systemName} onChange={handleChange('systemName')} error={!!errors.systemName} helperText={errors.systemName} required />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="نوع النشاط" value={formData.businessType} onChange={handleChange('businessType')} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth size="small" label="الهاتف" value={formData.phone} onChange={handleChange('phone')} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth size="small" label="البريد" value={formData.email} onChange={handleChange('email')} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField fullWidth size="small" label="الموقع" value={formData.website} onChange={handleChange('website')} />
                          </Grid>
                          <Grid item xs={12} sm={7}>
                            <TextField fullWidth size="small" label="العنوان" value={formData.address} onChange={handleChange('address')} />
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <TextField fullWidth size="small" label="الرقم الضريبي" value={formData.taxNumber} onChange={handleChange('taxNumber')} />
                          </Grid>
                        </Grid>
                      </FieldGroup>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.paper' }}>
                <Button type="submit" variant="contained" size="small" startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} disabled={isPending}>
                  {isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </Button>
              </Box>
            </Box>
          </TabPanel>

          {/* Tab 1: Users */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
              <UsersList isEmbedded={true} />
            </Box>
          </TabPanel>

          {/* Tab 2: Roles */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
              <RolesList isEmbedded={true} />
            </Box>
          </TabPanel>

          {/* Tab 3: Operational Engine */}
          <TabPanel value={tabValue} index={3}>
            <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <FieldGroup title="الإعدادات المالية" icon={SpeedIcon}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="العملة الأساسية" value={formData.currency} onChange={handleChange('currency')} helperText="SAR, USD" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="بادئة الباركود" value={formData.barcodePrefix} onChange={handleChange('barcodePrefix')} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 1, bgcolor: alpha('#1890ff', 0.05), borderRadius: 1 }}>
                              <Typography variant="caption" fontWeight={700}>SLA المطالبات (يوم)</Typography>
                              <TextField fullWidth size="small" type="number" value={formData.claimSlaDays} onChange={(e) => setFormData(p => ({ ...p, claimSlaDays: parseInt(e.target.value) }))} />
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 1, bgcolor: alpha('#52c41a', 0.05), borderRadius: 1 }}>
                              <Typography variant="caption" fontWeight={700}>SLA الموافقات (يوم)</Typography>
                              <TextField fullWidth size="small" type="number" value={formData.preApprovalSlaDays} onChange={(e) => setFormData(p => ({ ...p, preApprovalSlaDays: parseInt(e.target.value) }))} />
                            </Box>
                          </Grid>
                        </Grid>
                      </FieldGroup>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Stack spacing={2}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <FieldGroup title="تفضيلات النظام">
                          <Stack spacing={1.5}>
                            <TextField select fullWidth size="small" label="التقويم الافتراضي" value={formData.dateCalendar} onChange={handleChange('dateCalendar')}>
                              <MenuItem value="gregory">ميلادي (Gregorian)</MenuItem>
                              <MenuItem value="islamic">هجري (Islamic)</MenuItem>
                            </TextField>
                            <TextField select fullWidth size="small" label="نظام الأرقام" value={formData.numberSystem} onChange={handleChange('numberSystem')}>
                              <MenuItem value="latn">لاتيني (123)</MenuItem>
                              <MenuItem value="arab">عربي (١٢٣)</MenuItem>
                            </TextField>
                            <TextField fullWidth size="small" label="تنسيق رقم البطاقة" value={formData.cardNumberFormat} onChange={handleChange('cardNumberFormat')} />
                            <Box sx={{ p: 1, bgcolor: alpha('#000', 0.02), borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                              <Typography variant="caption" fontWeight={600} color="primary" display="block" sx={{ mb: 0.5 }}>الرموز المتاحة (يمكنك تغيير ترتيبها):</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {[
                                  { tag: '[PRO]', label: 'رمز المزود' },
                                  { tag: '[YEAR]', label: 'السنة' },
                                  { tag: '[MP_NO]', label: 'رقم العضو' },
                                  { tag: '[REL_SUFFIX]', label: 'لاحقة التابع' },
                                  { tag: '[COMP]', label: 'رمز الشركة' }
                                ].map(t => (
                                  <Chip key={t.tag} label={`${t.tag}: ${t.label}`} size="tiny" sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'background.paper' }} />
                                ))}
                              </Box>
                            </Box>
                          </Stack>
                        </FieldGroup>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <FieldGroup title="قواعد ترقيم التابعين (Suffixes)">
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            حدد الحروف المضافة لرقم البطاقة بناءً على صلة القرابة (مثلاً: W للزوجة)
                          </Typography>
                          <Grid container spacing={1}>
                            {Object.entries(relationshipLabels).map(([rel, label]) => {
                              let suffixValue = '';
                              try {
                                suffixValue = JSON.parse(formData.dependentSuffixes)[rel] || '';
                              } catch (e) { }
                              return (
                                <Grid item xs={6} key={rel}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label={label}
                                    value={suffixValue}
                                    onChange={handleSuffixChange(rel)}
                                    placeholder={rel[0]}
                                    inputProps={{ style: { textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold' } }}
                                  />
                                </Grid>
                              );
                            })}
                          </Grid>
                        </FieldGroup>
                      </Paper>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.paper' }}>
                <Button type="submit" variant="contained" size="small" startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} disabled={isPending}>
                  حفظ الإعدادات
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Box>
      </Card>
    </Box>
  );
};

export default ProfessionalSettingsPage;
