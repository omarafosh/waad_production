import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Tabs,
  Tab,
  Divider,
  Alert,
  InputAdornment,
  Chip,
  Stack,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Autocomplete,
  Avatar
} from '@mui/material';
import {
  ArrowBack,
  Save,
  LocalHospital as ProviderIcon,
  Business,
  LocationOn,
  Phone,
  Description,
  People,
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  Link as LinkIcon,
  PersonAdd
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import { useCreateProvider } from 'hooks/useProviders';
import { usersService } from 'services/rbac/users.service';
import { rolesService } from 'services/rbac/roles.service';
import { useTableRefresh } from 'contexts/TableRefreshContext';

const PROVIDER_TYPES = [
  { value: 'HOSPITAL', label: 'مستشفى', icon: '🏥' },
  { value: 'CLINIC', label: 'عيادة', icon: '🏥' },
  { value: 'LAB', label: 'مختبر', icon: '🔬' },
  { value: 'PHARMACY', label: 'صيدلية', icon: '💊' },
  { value: 'RADIOLOGY', label: 'مركز أشعة', icon: '📷' }
];

const NETWORK_STATUS_OPTIONS = [
  { value: 'IN_NETWORK', label: 'داخل الشبكة', description: 'مقدم خدمة معتمد داخل الشبكة' },
  { value: 'OUT_OF_NETWORK', label: 'خارج الشبكة', description: 'مقدم خدمة خارج الشبكة' },
  { value: 'PREFERRED', label: 'مزود مفضل', description: 'مقدم خدمة مفضل بخصومات أعلى' }
];

/**
 * Provider Create Page - Single Responsible User Binding
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Tabbed Interface
 * ✅ Single Responsible Binding (Link Existing User OR Create New)
 * 
 * @version 3.0
 */
const ProviderCreate = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { create, creating } = useCreateProvider();
  const { triggerRefresh } = useTableRefresh();

  // ──────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState(0);
  const [autoCode, setAutoCode] = useState('AUTO-GENERATED');

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    licenseNumber: '',
    taxNumber: '',
    providerType: '',
    networkStatus: '',

    // Location & Contact
    city: '',
    address: '',
    phone: '',
    email: '',

    // Contract
    contractStartDate: '',
    contractEndDate: '',
    defaultDiscountRate: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Account Management State
  const [accountMode, setAccountMode] = useState('CREATE'); // 'CREATE' | 'LINK' | 'SKIP'

  // Create New Account Form
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  // Link Existing Account State
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [selectedUserToLink, setSelectedUserToLink] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────

  // Load unassigned users when switching to LINK mode
  useEffect(() => {
    if (accountMode === 'LINK' && activeTab === 2) {
      loadUnassignedUsers();
    }
  }, [accountMode, activeTab]);

  const loadUnassignedUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await usersService.getUnassignedProviders();
      setUnassignedUsers(users || []);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('فشل تحميل المستخدمين غير المرتبطين', { variant: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Auto-fill account details from basic info
  useEffect(() => {
    if (formData.name && !accountForm.fullName) {
      setAccountForm(prev => ({ ...prev, fullName: formData.name }));
    }
    if (formData.name && !accountForm.username) {
      const generatedUsername = formData.name.trim().toLowerCase().replace(/\s+/g, '_');
      setAccountForm(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [formData.name]);

  // Generate auto code
  useEffect(() => {
    if (formData.providerType && formData.name) {
      const typePrefix = formData.providerType.substring(0, 3).toUpperCase();
      const nameInitials = formData.name
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('');
      const timestamp = Date.now().toString().slice(-4);
      setAutoCode(`${typePrefix}-${nameInitials || 'XX'}-${timestamp}`);
    } else {
      setAutoCode('AUTO-GENERATED');
    }
  }, [formData.providerType, formData.name]);

  // ──────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'اسم مقدم الخدمة مطلوب';
    if (!formData.licenseNumber) newErrors.licenseNumber = 'رقم الترخيص مطلوب';
    if (!formData.providerType) newErrors.providerType = 'نوع المزود مطلوب';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }
    setErrors(newErrors);

    if (newErrors.name || newErrors.licenseNumber || newErrors.providerType) {
      setActiveTab(0);
    } else if (newErrors.email) {
      setActiveTab(1);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      enqueueSnackbar('يرجى التأكد من صحة البيانات في جميع التبويبات', { variant: 'error' });
      return;
    }

    // Validate Account Logic
    if (accountMode === 'CREATE') {
      if (!accountForm.username || !accountForm.password) {
        enqueueSnackbar('يرجى إكمال بيانات حساب المسؤول الجديد', { variant: 'error' });
        setActiveTab(2);
        return;
      }
      if (accountForm.password !== accountForm.confirmPassword) {
        enqueueSnackbar('كلمة المرور غير متطابقة', { variant: 'error' });
        setActiveTab(2);
        return;
      }
    } else if (accountMode === 'LINK') {
      if (!selectedUserToLink) {
        enqueueSnackbar('يرجى اختيار مستخدم لربطه كمسؤول', { variant: 'error' });
        setActiveTab(2);
        return;
      }
    }

    try {
      const payload = { ...formData };
      const result = await create(payload);

      if (result.success) {
        const newProviderId = result.data?.id || result.data?.data?.id || result.data;

        // Handle Account Association
        if (newProviderId) {
          if (accountMode === 'CREATE') {
            await createNewAccount(newProviderId);
          } else if (accountMode === 'LINK' && selectedUserToLink) {
            await linkExistingAccount(newProviderId, selectedUserToLink.id);
          }
        }

        enqueueSnackbar('تم إنشاء مقدم الخدمة بنجاح', { variant: 'success' });
        triggerRefresh();
        navigate(`/providers/edit/${newProviderId}`);
      } else {
        enqueueSnackbar(result.error || 'فشل إنشاء مقدم الخدمة', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('حدث خطأ غير متوقع', { variant: 'error' });
    }
  };

  const createNewAccount = async (providerId) => {
    try {
      const userPayload = {
        username: accountForm.username,
        password: accountForm.password,
        fullName: accountForm.fullName || formData.name,
        email: `${accountForm.username}@provider.local`,
        providerId: providerId,
        enabled: true
      };

      const userRes = await usersService.createUser(userPayload);
      const userId = userRes?.data?.data?.id || userRes?.data?.id || userRes?.id;

      if (userId) {
        const rolesRes = await rolesService.getAllRoles();
        const roles = rolesRes?.data?.data || rolesRes?.data || [];
        const providerRole = roles.find(r => r.name === 'PROVIDER');
        if (providerRole) {
          await usersService.assignRoles(userId, [providerRole.id]);
        }
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      enqueueSnackbar('تم إنشاء المزود لكن فشل إنشاء المستخدم. يرجى مراجعة صفحة المستخدمين.', { variant: 'warning' });
    }
  };

  const linkExistingAccount = async (providerId, userId) => {
    try {
      // Assuming usersService.updateUser supports updating providerId
      // First get the user to preserve other fields if needed, or just partial update
      const existingUser = await usersService.getUserById(userId);
      const userDto = existingUser?.data || existingUser; // Adjust based on api response structure

      const updatePayload = {
        ...userDto,
        username: userDto.username,
        email: userDto.email,
        fullName: userDto.fullName,
        providerId: providerId // LINKING HERE
      };

      await usersService.updateUser(userId, updatePayload);
    } catch (error) {
      console.error('Failed to link account:', error);
      enqueueSnackbar('تم إنشاء المزود لكن فشل ربط المستخدم. يرجى الربط يدوياً.', { variant: 'warning' });
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // RENDER SECTIONS
  // ──────────────────────────────────────────────────────────────────────

  const renderBasicInfo = () => (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Business color="primary" />
        <Typography variant="h5">البيانات الأساسية</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>الرمز التلقائي:</strong> سيتم إنشاء رمز تلقائي لمقدم الخدمة عند الحفظ
            </Typography>
          </Alert>
          <TextField
            fullWidth label="الرمز التلقائي" value={autoCode} disabled
            InputProps={{ startAdornment: (<InputAdornment position="start"><Chip label="AUTO" size="small" color="primary" /></InputAdornment>) }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth required label="اسم مقدم الخدمة" placeholder="مثال: مستشفى الواحة"
            value={formData.name} onChange={handleChange('name')}
            error={!!errors.name} helperText={errors.name}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth required select label="نوع مقدم الخدمة"
            value={formData.providerType} onChange={handleChange('providerType')}
            error={!!errors.providerType} helperText={errors.providerType}
          >
            {PROVIDER_TYPES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{option.icon}</span><span>{option.label}</span>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth select label="حالة الشبكة" value={formData.networkStatus} onChange={handleChange('networkStatus')}>
            <MenuItem value=""><em>غير محدد</em></MenuItem>
            {NETWORK_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth required label="رقم الترخيص"
            value={formData.licenseNumber} onChange={handleChange('licenseNumber')}
            error={!!errors.licenseNumber} helperText={errors.licenseNumber}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth label="الرقم الضريبي (اختياري)"
            value={formData.taxNumber} onChange={handleChange('taxNumber')}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderLocationContact = () => (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <LocationOn color="primary" />
        <Typography variant="h5">الموقع والتواصل</Typography>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="المدينة" value={formData.city} onChange={handleChange('city')} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="العنوان" value={formData.address} onChange={handleChange('address')} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="رقم الهاتف" value={formData.phone} onChange={handleChange('phone')}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>) }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth type="email" label="البريد الإلكتروني" value={formData.email} onChange={handleChange('email')}
            error={!!errors.email} helperText={errors.email}
          />
        </Grid>
      </Grid>
      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Description color="secondary" />
        <Typography variant="h6" color="text.secondary">معلومات العقد الأولية (اختياري)</Typography>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth type="date" label="تاريخ بداية العقد" value={formData.contractStartDate} onChange={handleChange('contractStartDate')} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth type="date" label="تاريخ نهاية العقد" value={formData.contractEndDate} onChange={handleChange('contractEndDate')} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth type="number" label="نسبة الخصم (%)" value={formData.defaultDiscountRate} onChange={handleChange('defaultDiscountRate')} />
        </Grid>
      </Grid>
    </Box>
  );

  const renderAccountManager = () => (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <People color="primary" />
        <Typography variant="h5">المستخدم المسؤول (مدير الحساب)</Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        كل مقدم خدمة يجب أن يكون له "مستخدم مسؤول" واحد يدير حسابه. يمكنك إنشاء مستخدم جديد أو ربط مستخدم موجود مسبقاً (غير مرتبط بجهة أخرى).
      </Alert>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>كيف تريد تعيين المسؤول؟</Typography>
        <RadioGroup row value={accountMode} onChange={(e) => setAccountMode(e.target.value)}>
          <FormControlLabel
            value="CREATE"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonAdd fontSize="small" />
                <Typography>إنشاء حساب جديد</Typography>
              </Box>
            }
            sx={{ mr: 4 }}
          />
          <FormControlLabel
            value="LINK"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon fontSize="small" />
                <Typography>ربط مستخدم موجود (حر)</Typography>
              </Box>
            }
            sx={{ mr: 4 }}
          />
          <FormControlLabel
            value="SKIP"
            control={<Radio />}
            label="تخطي (بدون مسؤول حالياً)"
          />
        </RadioGroup>
      </Paper>

      {accountMode === 'CREATE' && (
        <Grid container spacing={3} maxWidth="md">
          <Grid item xs={12}><TextField fullWidth label="الاسم الكامل" value={accountForm.fullName} onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="اسم المستخدم" required value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><Person /></InputAdornment>) }} /></Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth required label="كلمة المرور" type={showPassword ? 'text' : 'password'} value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>)
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}><TextField fullWidth required label="تأكيد كلمة المرور" type={showPassword ? 'text' : 'password'} value={accountForm.confirmPassword} onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })} /></Grid>
        </Grid>
      )}

      {accountMode === 'LINK' && (
        <Box sx={{ maxWidth: 'md' }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            ابحث عن مستخدم لديه صلاحية (PROVIDER) وغير مرتبط بأي مستشفى حالياً.
          </Typography>
          <Autocomplete
            options={unassignedUsers}
            getOptionLabel={(option) => `${option.fullName} (${option.username}) - ${option.email || ''}`}
            loading={loadingUsers}
            value={selectedUserToLink}
            onChange={(event, newValue) => setSelectedUserToLink(newValue)}
            noOptionsText="لا يوجد مستخدمين أحرار (غير مرتبطين)"
            renderInput={(params) => (
              <TextField
                {...params}
                label="بحث عن مستخدم مسؤول"
                placeholder="ابحث بالاسم أو البريد..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start"><Person color="action" /></InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>{option.fullName?.charAt(0)}</Avatar>
                  <Box>
                    <Typography variant="body1">{option.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                  </Box>
                  <Chip label="متاح" size="small" color="success" variant="outlined" sx={{ ml: 'auto' }} />
                </Box>
              </li>
            )}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <ModernPageHeader
        title="إضافة مقدم خدمة صحية جديد"
        subtitle="إنشاء سجل جديد وتعيين المسؤول"
        icon={ProviderIcon}
        breadcrumbs={[{ label: 'مقدمو الخدمات', path: '/providers' }, { label: 'إضافة جديد' }]}
        actions={
          <Stack direction="row" spacing={2}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/providers')} disabled={creating} color="inherit">عودة</Button>
            <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_PROVIDERS]}>
              <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={creating}>
                {creating ? 'جاري الحفظ...' : 'حفظ مقدم الخدمة'}
              </Button>
            </RBACGuard>
          </Stack>
        }
      />

      <MainCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<Business />} label="البيانات الأساسية" iconPosition="start" />
            <Tab icon={<LocationOn />} label="الموقع والتواصل" iconPosition="start" />
            <Tab icon={<People />} label="مدير الحساب" iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ mb: 4, minHeight: 400 }}>
          <Box role="tabpanel" hidden={activeTab !== 0}>{activeTab === 0 && renderBasicInfo()}</Box>
          <Box role="tabpanel" hidden={activeTab !== 1}>{activeTab === 1 && renderLocationContact()}</Box>
          <Box role="tabpanel" hidden={activeTab !== 2}>{activeTab === 2 && renderAccountManager()}</Box>
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => navigate('/providers')} disabled={creating} size="large">إلغاء</Button>
        </Box>
      </MainCard>
    </>
  );
};

export default ProviderCreate;
