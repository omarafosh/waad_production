/**
 * RBAC User Create Page - Phase D3 Step 3
 * 2-Step Stepper: User Info → Roles Assignment
 *
 * ⚠️ Key Features:
 * 1. Step 1: Basic info (username, email, password, fullName, phone)
 * 2. Step 2: Assign roles (multi-select)
 * 3. SUPER_ADMIN only access
 * 4. Arabic UI
 * 5. Validation with Arabic errors
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// MUI Components
import {
  Box,
  Grid,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Checkbox,
  Paper,
  Stack,
  Avatar,
  Chip,
  Autocomplete,
  Collapse
} from '@mui/material';

// MUI Icons
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PhoneIcon from '@mui/icons-material/Phone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DomainIcon from '@mui/icons-material/Domain';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import TbaFormSection from 'components/tba/form/TbaFormSection';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Services
import { usersService, rolesService } from 'services/rbac';
import { providersService } from 'services/api/providers.service';
import employersService from 'services/api/employers.service';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// Utils
import { validatePassword } from 'utils/passwordValidator';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = ['معلومات المستخدم', 'تعيين الأدوار'];

const INITIAL_FORM = {
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',

  phone: '',
  active: true,
  employerId: null,
  providerId: null,

  // Provider specific permissions
  allowAllCompanies: false,
  permittedCompanies: []
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get role color based on role name
 */
const getRoleColor = (roleName) => {
  const roleColors = {
    SUPER_ADMIN: 'error',
    INSURANCE_ADMIN: 'warning',
    EMPLOYER_ADMIN: 'primary',
    REVIEWER: 'secondary',
    PROVIDER: 'info',
    USER: 'default',
    MEMBER: 'default'
  };
  return roleColors[roleName] || 'primary';
};

/**
 * Validate Step 1 fields
 * Updated to use CONTRACT password policy (8+ chars + complexity)
 */
const validateStep1 = (form) => {
  const errors = {};

  // Username validation
  if (!form.username?.trim()) {
    errors.username = 'اسم المستخدم مطلوب';
  } else if (form.username.length < 3) {
    errors.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
  } else if (form.username.length > 50) {
    errors.username = 'اسم المستخدم يجب أن لا يتجاوز 50 حرف';
  }

  // Full name validation
  if (!form.fullName?.trim()) {
    errors.fullName = 'الاسم الكامل مطلوب';
  }



  // Password validation - NEW: Use contract policy
  const passwordValidation = validatePassword(form.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.errors.join(' • ');
  }

  // Confirm password validation
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'كلمة المرور غير متطابقة';
  }

  return errors;
};

// ============================================================================
// STEP 1 COMPONENT - User Info
// ============================================================================

const Step1UserInfo = ({ form, setForm, errors, setErrors }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <TbaFormSection title="معلومات المستخدم الأساسية" icon={PersonIcon}>
      <Grid container spacing={2.5}>
        {/* Username */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="اسم المستخدم"
            value={form.username}
            onChange={handleChange('username')}
            error={!!errors.username}
            helperText={errors.username}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* Full Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="الاسم الكامل"
            value={form.fullName}
            onChange={handleChange('fullName')}
            error={!!errors.fullName}
            helperText={errors.fullName}
            required
          />
        </Grid>



        {/* Phone */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="رقم الهاتف"
            value={form.phone}
            onChange={handleChange('phone')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* Password */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="كلمة المرور"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* Confirm Password */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="تأكيد كلمة المرور"
            type={showConfirmPassword ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* Active Status */}
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={form.active} onChange={handleChange('active')} color="primary" />}
            label="المستخدم نشط"
          />
        </Grid>

        {/* Employer/Provider ID - Required if specific roles assigned */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<AdminPanelSettingsIcon />}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              ملاحظة: حقول employerId و providerId
            </Typography>
            <Typography variant="caption">
              سيظهر حقل اختيار المؤسسة (employerId) في الخطوة التالية إذا قمت بتعيين دور EMPLOYER_ADMIN، وحقل مقدم الخدمة (providerId) إذا قمت بتعيين دور PROVIDER
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </TbaFormSection>
  );
};

// ============================================================================
// STEP 2 COMPONENT - Roles Assignment
// ============================================================================

const Step2Roles = ({ selectedRoles, setSelectedRoles, allRoles, allProviders, allEmployers, loading, loadingProviders, loadingEmployers, form, setForm, errors, setErrors }) => {
  // Check if EMPLOYER_ADMIN role is selected
  const hasEmployerAdminRole = selectedRoles.some((roleId) => {
    const role = allRoles.find((r) => r?.id === roleId);
    return role?.name === 'EMPLOYER_ADMIN';
  });

  // Check if PROVIDER role is selected
  const hasProviderRole = selectedRoles.some((roleId) => {
    const role = allRoles.find((r) => r?.id === roleId);
    return role?.name === 'PROVIDER';
  });

  const handleToggleRole = (roleId) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((id) => id !== roleId);
      }
      return [...prev, roleId];
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TbaFormSection title="تعيين الأدوار للمستخدم" subtitle="اختر دوراً واحداً أو أكثر" icon={AdminPanelSettingsIcon}>
      <Alert severity="info" sx={{ mb: 2 }}>
        الأدوار تحدد صلاحيات المستخدم في النظام. يمكنك تعيين أكثر من دور للمستخدم.
      </Alert>

      <Grid container spacing={2}>
        {allRoles.map((role) => {
          const isSelected = selectedRoles.includes(role?.id);
          const roleName = role?.name || '';
          // SUPER_ADMIN role is always disabled in create (only existing SUPER_ADMIN can assign it)
          const isProtected = roleName === 'SUPER_ADMIN';

          return (
            <Grid item xs={12} sm={6} md={4} key={role?.id}>
              <Paper
                onClick={() => !isProtected && handleToggleRole(role?.id)}
                elevation={isSelected ? 3 : 0}
                sx={{
                  p: 2,
                  cursor: isProtected ? 'not-allowed' : 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                  opacity: isProtected ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: isProtected ? 'divider' : 'primary.light',
                    bgcolor: isProtected ? 'background.paper' : isSelected ? 'primary.lighter' : 'grey.50'
                  }
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Checkbox
                    checked={isSelected}
                    disabled={isProtected}
                    onChange={() => handleToggleRole(role?.id)}
                    sx={{ p: 0, mt: 0.25 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" fontWeight="medium">
                        {role?.name || '-'}
                      </Typography>
                      <Chip
                        label={roleName}
                        size="small"
                        color={getRoleColor(roleName)}
                        variant="light"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {role?.description || `${role?.permissions?.length || 0} صلاحية`}
                    </Typography>
                  </Box>
                  {isSelected && <CheckCircleIcon color="primary" fontSize="small" />}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {allRoles.length === 0 && <Alert severity="warning">لا توجد أدوار متاحة في النظام</Alert>}

      {/* Employer ID Field - Shown only if EMPLOYER_ADMIN is selected */}
      {hasEmployerAdminRole && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'warning.main' }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              دور EMPLOYER_ADMIN يتطلب تحديد الشريك (Employer)
            </Typography>
          </Alert>
          <Autocomplete
            fullWidth
            options={allEmployers}
            getOptionLabel={(option) => option?.label || option?.code || ''}
            value={allEmployers.find((e) => e.id === form.employerId) || null}
            onChange={(event, newValue) => {
              setForm((prev) => ({ ...prev, employerId: newValue?.id || null }));
              if (errors.employerId) {
                setErrors((prev) => ({ ...prev, employerId: null }));
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="الشريك (Employer)"
                error={!!errors.employerId}
                helperText={errors.employerId || 'اختر الشريك الذي سيتم ربط المستخدم به'}
                required
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Stack>
                  <Typography variant="body2">{option.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    الكود: {option.code}
                  </Typography>
                </Stack>
              </Box>
            )}
            loading={loadingEmployers}
            loadingText="جاري التحميل..."
            noOptionsText="لا يوجد شركاء"
            sx={{ mb: 3 }}
          />


        </Box>
      )}

      {/* Provider ID Field - Shown only if PROVIDER is selected */}
      {hasProviderRole && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'info.main' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              دور PROVIDER يتطلب تحديد مقدم الخدمة (Provider)
            </Typography>
          </Alert>
          <Autocomplete
            fullWidth
            options={allProviders}
            getOptionLabel={(option) => option?.name || ''}
            value={allProviders.find((p) => p.id === form.providerId) || null}
            onChange={(event, newValue) => {
              setForm((prev) => ({ ...prev, providerId: newValue?.id || null }));
              if (errors.providerId) {
                setErrors((prev) => ({ ...prev, providerId: null }));
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="مقدم الخدمة (Provider)"
                error={!!errors.providerId}
                helperText={errors.providerId || 'اختر مقدم الخدمة (مستشفى، عيادة، مختبر، صيدلية)'}
                required
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Stack>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.providerType}
                  </Typography>
                </Stack>
              </Box>
            )}
            loading={loadingProviders}
            loadingText="جاري التحميل..."
            noOptionsText="لا توجد مقدمي خدمة"
          />
        </Box>
      )}

      {/* Provider Company Visibility */}
      {hasProviderRole && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px dashed', borderColor: 'info.main' }}>
          <Alert severity="info" icon={<DomainIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              نطاق الوصول للشركات (Provider Visibility)
            </Typography>
            <Typography variant="caption">
              حدد الشركات التي يمكن لهذا الموظف رؤية أعضائها والتحقق من أهليتهم
            </Typography>
          </Alert>

          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.allowAllCompanies}
                  onChange={(e) => setForm({ ...form, allowAllCompanies: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="medium">الوصول الكامل لجميع الشركات</Typography>
                  <Typography variant="caption" color="text.secondary">يمكنه البحث عن أعضاء كافة الشركات المتعاقد معها المستشفى</Typography>
                </Box>
              }
            />

            {!form.allowAllCompanies && (
              <Collapse in={!form.allowAllCompanies}>
                <Box sx={{ pl: 4, mt: 1 }}>
                  <Autocomplete
                    multiple
                    options={allEmployers}
                    getOptionLabel={(option) => option?.label || option?.name || option?.code || ''}
                    value={form.permittedCompanies || []}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(event, newValue) => {
                      setForm({ ...form, permittedCompanies: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="اختر الشركات المسموح بها"
                        placeholder="ابحث عن شركة..."
                        helperText="سيتمكن الموظف من الوصول لأعضاء هذه الشركات فقط"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            variant="outlined"
                            label={option?.label || option?.name || '-'}
                            size="small"
                            color="primary"
                            {...tagProps}
                          />
                        );
                      })
                    }
                  />
                  {(!form.permittedCompanies || form.permittedCompanies.length === 0) && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      * يجب اختيار شركة واحدة على الأقل في حال إيقاف خيار "الوصول الكامل"
                    </Typography>
                  )}
                </Box>
              </Collapse>
            )}
          </Stack>
        </Box>
      )}

      {/* Selected roles summary */}
      {selectedRoles.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            الأدوار المختارة ({selectedRoles.length}):
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedRoles.map((roleId) => {
              const role = allRoles.find((r) => r?.id === roleId);
              return (
                <Chip
                  key={roleId}
                  label={role?.name || roleId}
                  color={getRoleColor(role?.name)}
                  size="small"
                  onDelete={() => handleToggleRole(roleId)}
                />
              );
            })}
          </Stack>
        </Box>
      )}
    </TbaFormSection>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UserCreate = () => {
  const navigate = useNavigate();
  const { triggerRefresh } = useTableRefresh();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [allEmployers, setAllEmployers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingEmployers, setLoadingEmployers] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Load roles on mount
  useEffect(() => {
    loadRoles();
    loadProviders();
    loadEmployers();
  }, []);

  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await rolesService.getAllRoles();
      const roles = response?.data?.data || response?.data || [];
      setAllRoles(Array.isArray(roles) ? roles : []);
    } catch (err) {
      console.error('[UserCreate] Load roles error:', err);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoadingProviders(true);
      // Use getSelector endpoint which returns simple array for dropdowns
      const providers = await providersService.getSelector();
      setAllProviders(Array.isArray(providers) ? providers : []);
    } catch (err) {
      console.error('[UserCreate] Load providers error:', err);
      setAllProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadEmployers = async () => {
    try {
      setLoadingEmployers(true);
      // Use getEmployerSelectors endpoint which returns simple array for dropdowns
      const employers = await employersService.getEmployerSelectors();
      setAllEmployers(Array.isArray(employers) ? employers : []);
    } catch (err) {
      console.error('[UserCreate] Load employers error:', err);
      setAllEmployers([]);
    } finally {
      setLoadingEmployers(false);
    }
  };

  // ========================================
  // STEP NAVIGATION
  // ========================================

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate Step 1
      const step1Errors = validateStep1(form);
      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        return;
      }
    }

    if (activeStep === 1) {
      // Validate Step 2 - Check employerId if EMPLOYER_ADMIN role selected, providerId if PROVIDER role selected
      const hasEmployerAdminRole = selectedRoles.some((roleId) => {
        const role = allRoles.find((r) => r?.id === roleId);
        return role?.name === 'EMPLOYER_ADMIN';
      });

      const hasProviderRole = selectedRoles.some((roleId) => {
        const role = allRoles.find((r) => r?.id === roleId);
        return role?.name === 'PROVIDER';
      });

      if (hasEmployerAdminRole && !form.employerId) {
        setErrors({ employerId: 'معرف المؤسسة مطلوب لدور EMPLOYER_ADMIN' });
        return;
      }

      if (hasProviderRole && !form.providerId) {
        setErrors({ providerId: 'معرف مقدم الخدمة مطلوب لدور PROVIDER' });
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // ========================================
  // SUBMIT HANDLER
  // ========================================

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setSubmitError(null);

      // Validate employerId if EMPLOYER_ADMIN role selected
      const hasEmployerAdminRole = selectedRoles.some((roleId) => {
        const role = allRoles.find((r) => r?.id === roleId);
        return role?.name === 'EMPLOYER_ADMIN';
      });

      // Validate providerId if PROVIDER role selected
      const hasProviderRole = selectedRoles.some((roleId) => {
        const role = allRoles.find((r) => r?.id === roleId);
        return role?.name === 'PROVIDER';
      });

      if (hasEmployerAdminRole && !form.employerId) {
        setErrors({ employerId: 'معرف المؤسسة مطلوب لدور EMPLOYER_ADMIN' });
        setLoading(false);
        return;
      }

      if (hasProviderRole && !form.providerId) {
        setErrors({ providerId: 'معرف مقدم الخدمة مطلوب لدور PROVIDER' });
        setLoading(false);
        return;
      }

      // Prepare payload - NO ROLES (contract requirement)
      // Auto-generate email based on unified username system
      // Standard Format: username@tba.ly
      const generatedEmail = `${form.username.trim()}@tba.ly`;

      const payload = {
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email: generatedEmail,
        phone: form.phone?.trim() || null
      };

      // Add employerId only if EMPLOYER_ADMIN role is selected
      if (hasEmployerAdminRole && form.employerId) {
        payload.employerId = form.employerId;
      }

      // Add providerId only if PROVIDER role is selected
      if (hasProviderRole && form.providerId) {
        payload.providerId = form.providerId;
        // Add company permissions
        payload.allowAllCompanies = form.allowAllCompanies;
        payload.permittedCompanyIds = form.permittedCompanies?.map(c => c.id) || [];
      }

      // Step 1: Create user (without roles)
      const createResponse = await usersService.createUser(payload);
      const createdUser = createResponse?.data?.data || createResponse?.data;

      if (!createdUser?.id) {
        throw new Error('فشل الحصول على معرف المستخدم المُنشأ');
      }

      // Step 2: Assign roles separately (contract requirement)
      if (selectedRoles.length > 0) {
        await usersService.assignRoles(createdUser.id, selectedRoles);
      }

      // Success
      openSnackbar({
        open: true,
        message: 'تم إنشاء المستخدم وتعيين الأدوار بنجاح',
        variant: 'alert',
        alert: { color: 'success' }
      });

      // Refresh list and navigate
      triggerRefresh();
      navigate('/rbac/users');
    } catch (err) {
      console.error('[UserCreate] Submit error:', err);
      const errorMessage = err?.response?.data?.message || err.message || 'فشل إنشاء المستخدم. يرجى المحاولة لاحقاً';
      setSubmitError(errorMessage);

      openSnackbar({
        open: true,
        message: errorMessage,
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setLoading(false);
    }
  }, [form, selectedRoles, allRoles, triggerRefresh, navigate]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <Box>
      {/* Page Header */}
      <ModernPageHeader
        title="إنشاء مستخدم جديد"
        subtitle="إضافة مستخدم جديد للنظام وتعيين أدواره"
        icon={PersonAddIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'الصلاحيات', path: '/rbac' },
          { label: 'المستخدمين', path: '/rbac/users' },
          { label: 'إنشاء مستخدم' }
        ]}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/rbac/users')}>
            العودة للقائمة
          </Button>
        }
      />

      {/* Stepper */}
      <MainCard sx={{ mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </MainCard>

      {/* Error Alert */}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* Step Content */}
      <MainCard>
        {activeStep === 0 && <Step1UserInfo form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}

        {activeStep === 1 && (
          <Step2Roles
            selectedRoles={selectedRoles}
            setSelectedRoles={setSelectedRoles}
            allRoles={allRoles}
            allProviders={allProviders}
            allEmployers={allEmployers}
            loading={rolesLoading}
            loadingProviders={loadingProviders}
            loadingEmployers={loadingEmployers}
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
          />
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0 || loading} startIcon={<ArrowForwardIcon />}>
            السابق
          </Button>

          {activeStep === STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ المستخدم'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext} endIcon={<ArrowBackIcon />}>
              التالي
            </Button>
          )}
        </Box>
      </MainCard>
    </Box>
  );
};

export default UserCreate;
