/**
 * RBAC User Edit Page - Phase D3 Step 3
 * 2-Step Stepper: User Info → Roles Assignment
 *
 * ⚠️ Key Features:
 * 1. Step 1: Basic info (fullName, email, phone) - username readonly
 * 2. Step 2: Assign roles (multi-select)
 * 3. Password change optional (only if filled)
 * 4. SUPER_ADMIN only access
 * 5. Arabic UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  Chip,
  Collapse,
  Autocomplete
} from '@mui/material';

// MUI Icons
import EditIcon from '@mui/icons-material/Edit';
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
import KeyIcon from '@mui/icons-material/Key';
import BusinessIcon from '@mui/icons-material/Business';
import DomainIcon from '@mui/icons-material/Domain';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import TbaFormSection from 'components/tba/form/TbaFormSection';
import CircularLoader from 'components/CircularLoader';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Services
import { usersService, rolesService } from 'services/rbac';
import { getEmployerSelectors } from 'services/api/employers.service';
import { getProviderSelector } from 'services/api/providers.service';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = ['معلومات المستخدم', 'تعيين الأدوار'];

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
 * Validate Step 1 fields (Edit mode - NO password changes)
 */
const validateStep1 = (form) => {
  const errors = {};

  // Full name validation
  if (!form.fullName?.trim()) {
    errors.fullName = 'الاسم الكامل مطلوب';
  }

  // Email validation
  if (!form.email?.trim()) {
    errors.email = 'البريد الإلكتروني مطلوب';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'البريد الإلكتروني غير صالح';
  }

  // NO password validation - password changes require separate endpoint

  return errors;
};

// ============================================================================
// STEP 1 COMPONENT - User Info (Edit Mode)
// ============================================================================

const Step1UserInfoEdit = ({ form, setForm, errors, setErrors }) => {
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
        {/* Username (readonly) */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="اسم المستخدم"
            value={form.username}
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              )
            }}
            helperText="لا يمكن تغيير اسم المستخدم"
          />
        </Grid>

        {/* Full Name */}
        <Grid size={{ xs: 12, sm: 6 }}>
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

        {/* Email */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* Phone */}
        <Grid size={{ xs: 12, sm: 6 }}>
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

        {/* Active Status */}
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={<Switch checked={form.active} onChange={handleChange('active')} color="primary" />}
            label="المستخدم نشط"
          />
        </Grid>

        {/* Password Change Notice */}
        <Grid size={{ xs: 12 }}>
          <Alert severity="info" icon={<KeyIcon />}>
            <Typography variant="body2" fontWeight="medium">
              تغيير كلمة المرور غير متاح حالياً
            </Typography>
            <Typography variant="caption">يتطلب تغيير كلمة المرور استخدام endpoint منفصل (غير مُنفذ حالياً)</Typography>
          </Alert>
        </Grid>
      </Grid>
    </TbaFormSection>
  );
};

// ============================================================================
// STEP 2 COMPONENT - Roles Assignment
// ============================================================================

const Step2Roles = ({ selectedRoles, setSelectedRoles, allRoles, loading, form, setForm }) => {
  const isEmployerRole = selectedRoles.some((roleId) => {
    const role = allRoles.find((r) => r?.id === roleId);
    return role?.name === 'EMPLOYER_ADMIN' || role?.name === 'EMPLOYER_USER';
  });

  const isProviderRole = selectedRoles.some((roleId) => {
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
          const isProtected = roleName === 'SUPER_ADMIN';

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={role?.id}>
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

      {/* Provider Assignment Dropdown */}
      {isProviderRole && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              ربط مقدم الخدمة (مطلوب)
            </Typography>
            <Typography variant="caption">
              يجب ربط المستخدم بمقدم خدمة محدد ليتمكن من الدخول للنظام
            </Typography>
          </Alert>

          <Autocomplete
            options={form.allProviders || []}
            getOptionLabel={(option) => option.name || option.label || ''}
            value={form.allProviders?.find(p => p.id === form.providerId) || null}
            onChange={(event, newValue) => {
              setForm({ ...form, providerId: newValue ? newValue.id : null });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="اختر مقدم الخدمة*"
                placeholder="ابحث عن مقدم خدمة..."
                helperText="سيتم ربط هذا المستخدم ببيانات هذا المزود"
                error={!form.providerId}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <li key={key} {...otherProps}>
                  <Box>
                    <Typography variant="body1">{option.name}</Typography>
                    {option.licenseNumber && (
                      <Typography variant="caption" color="text.secondary">
                        ترخيص: {option.licenseNumber}
                      </Typography>
                    )}
                  </Box>
                </li>
              );
            }}
          />
        </Box>
      )}



      {/* Provider Company Visibility */}
      {isProviderRole && (
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
              control={<Switch checked={form.allowAllCompanies} onChange={(e) => setForm({ ...form, allowAllCompanies: e.target.checked })} color="primary" />}
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
                    options={form.allEmployers || []}
                    getOptionLabel={(option) => option.label || option.name || '-'}
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
                            label={option.label || option.name || '-'}
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

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { triggerRefresh } = useTableRefresh();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    active: true,
    newPassword: '',
    confirmPassword: '',
    employerId: null,
    providerId: null,

    // Provider specific
    allowAllCompanies: true,
    permittedCompanies: [],
    allEmployers: [],
    allProviders: []
  });
  const [originalRoleIds, setOriginalRoleIds] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [submitError, setSubmitError] = useState(null);

  // Load user and roles on mount
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setRolesLoading(true);

      const [userRes, rolesRes] = await Promise.all([usersService.getUserById(id), rolesService.getAllRoles()]);

      const user = userRes?.data?.data || userRes?.data;
      const roles = rolesRes?.data?.data || rolesRes?.data || [];

      if (user) {
        setForm({
          username: user.username || '',
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          active: user.active !== false && user.enabled !== false,
          employerId: user.employerId || null,
          providerId: user.providerId || null,
        });

        // Set current roles
        const currentRoleIds = (user.roles || []).map((r) => r?.id);
        setOriginalRoleIds(currentRoleIds);
        setSelectedRoles(currentRoleIds);

        // Fetch employers and providers based on context logic
        // We fetch both to be ready if roles are toggled
        try {
          const [employers, providers] = await Promise.all([
            getEmployerSelectors(),
            getProviderSelector()
          ]);

          setForm(prev => ({
            ...prev,
            allEmployers: Array.isArray(employers) ? employers : [],
            allProviders: Array.isArray(providers) ? providers : [],
            allowAllCompanies: user.allowAllCompanies === true, // Defaults to false if undefined or not exactly true
            permittedCompanies: user.permittedCompanies || []
          }));
        } catch (dataErr) {
          console.error('[UserEdit] Failed to load selectors:', dataErr);
        }
      }

      setAllRoles(Array.isArray(roles) ? roles : []);
    } catch (err) {
      console.error('[UserEdit] Load error:', err);
      setSubmitError(err?.response?.data?.message || 'فشل تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
      setRolesLoading(false);
    }
  };

  // ========================================
  // STEP NAVIGATION
  // ========================================

  const handleNext = () => {
    if (activeStep === 0) {
      const step1Errors = validateStep1(form);
      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
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
      setSaving(true);
      setSubmitError(null);

      // Prepare update payload - CONTRACT: ONLY fullName, email, phone, active
      // NO username (immutable), NO password (requires separate endpoint), NO roles (handled separately)
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
        active: form.active,
        employerId: form.employerId,
        providerId: form.providerId
      };



      // Add provider specific fields
      const isProvider = selectedRoles.some((roleId) => {
        const role = allRoles.find((r) => r?.id === roleId);
        return role?.name === 'PROVIDER';
      });

      if (isProvider) {
        payload.allowAllCompanies = form.allowAllCompanies;
        payload.permittedCompanyIds = form.permittedCompanies?.map(c => c.id) || [];
      }

      // Update user info (basic fields only)
      await usersService.updateUser(id, payload);

      // Handle role changes separately (contract compliant)
      const rolesToAdd = selectedRoles.filter((r) => !originalRoleIds.includes(r));
      const rolesToRemove = originalRoleIds.filter((r) => !selectedRoles.includes(r));

      if (rolesToAdd.length > 0) {
        await usersService.assignRoles(id, rolesToAdd);
      }
      if (rolesToRemove.length > 0) {
        await usersService.removeRoles(id, rolesToRemove);
      }

      // Success
      openSnackbar({
        open: true,
        message: 'تم تحديث المستخدم وأدواره بنجاح',
        variant: 'alert',
        alert: { color: 'success' }
      });

      // Notify other tabs to refresh if they are this user
      try {
        const channel = new BroadcastChannel('tba-auth-channel');
        channel.postMessage({ type: 'REFRESH_USER', userId: Number(id) });
        channel.close();
      } catch (e) {
        console.warn('Failed to broadcast user update', e);
      }

      // Refresh list and navigate
      triggerRefresh();
      navigate('/rbac/users');
    } catch (err) {
      console.error('[UserEdit] Submit error:', err);
      const errorMessage = err?.response?.data?.message || 'فشل تحديث المستخدم. يرجى المحاولة لاحقاً';
      setSubmitError(errorMessage);

      openSnackbar({
        open: true,
        message: errorMessage,
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setSaving(false);
    }
  }, [form, selectedRoles, originalRoleIds, id, triggerRefresh, navigate]);

  // ========================================
  // LOADING STATE
  // ========================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularLoader />
      </Box>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <Box>
      {/* Page Header */}
      <ModernPageHeader
        title={`تعديل المستخدم: ${form.username}`}
        subtitle="تعديل بيانات المستخدم وأدواره"
        icon={EditIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'الصلاحيات', path: '/rbac' },
          { label: 'المستخدمين', path: '/rbac/users' },
          { label: 'تعديل' }
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
        {activeStep === 0 && <Step1UserInfoEdit form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}

        {activeStep === 1 && (
          <Step2Roles selectedRoles={selectedRoles} setSelectedRoles={setSelectedRoles} allRoles={allRoles} loading={rolesLoading} form={form} setForm={setForm} />
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0 || saving} startIcon={<ArrowForwardIcon />}>
            السابق
          </Button>

          {activeStep === STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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

export default UserEdit;
