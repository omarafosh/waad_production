import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, FormControlLabel, Grid, Stack, Switch, TextField, Divider } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Business as BusinessIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import { createEmployer } from 'services/api/employers.service';

// Static Arabic labels
const LABELS = {
  list: 'جهات العمل',
  add: 'إضافة جهة عمل',
  back: 'رجوع',
  code: 'رمز جهة العمل (مطلوب للترقيم الذكي)',
  codePlaceholder: 'أدخل رمزاً فريداً (مثل: ABC, WAAD)',
  name: 'اسم جهة العمل',
  namePlaceholder: 'أدخل اسم جهة العمل (عربي أو إنجليزي)',
  active: 'نشط',
  cancel: 'إلغاء',
  save: 'حفظ',
  saving: 'جار الحفظ...',
  required: 'مطلوب',
  fixErrors: 'الرجاء تصحيح الأخطاء',
  createdSuccess: 'تم إنشاء جهة العمل بنجاح',
  saveError: 'فشل في حفظ جهة العمل',
  autoCode: 'سيتم توليد الرمز تلقائياً'
};

// Tip message for mandatory code
const CODE_HELPER_TEXT = 'هذا الرمز سيظهر في رقم بطاقة المستفيد كـ [PRO]. يرجى إدخاله بدقة.';

const emptyEmployer = {
  code: '',
  name: '',
  active: true
};

const EmployerCreate = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [employer, setEmployer] = useState(emptyEmployer);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setEmployer((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!employer.code?.trim()) {
      newErrors.code = LABELS.required;
    }
    if (!employer.name?.trim()) {
      newErrors.name = LABELS.required;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      enqueueSnackbar(LABELS.fixErrors, { variant: 'warning' });
      return;
    }

    try {
      setSaving(true);
      await createEmployer(employer);
      enqueueSnackbar(LABELS.createdSuccess, { variant: 'success' });
      navigate('/employers');
    } catch (err) {
      console.error('Failed to create employer:', err);
      enqueueSnackbar(LABELS.saveError, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModernPageHeader
        title={LABELS.add}
        icon={BusinessIcon}
        breadcrumbs={[
          { label: LABELS.list, path: '/employers' },
          { label: LABELS.add, path: '/employers/create' }
        ]}
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/employers')} variant="outlined">
            {LABELS.back}
          </Button>
        }
      />

      <MainCard>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2.5}>
            {/* Name - Primary Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label={LABELS.name}
                value={employer.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                placeholder={LABELS.namePlaceholder}
                autoFocus
              />
            </Grid>

            {/* Code - Mandatory */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label={LABELS.code}
                value={employer.code}
                onChange={handleChange('code')}
                error={!!errors.code}
                helperText={errors.code || CODE_HELPER_TEXT}
                placeholder={LABELS.codePlaceholder}
              />
            </Grid>

            {/* Active Status */}
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={<Switch checked={employer.active} onChange={handleChange('active')} color="primary" />}
                label={LABELS.active}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>

          {/* Form Actions */}
          <Divider sx={{ my: 3 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate('/employers')} disabled={saving}>
              {LABELS.cancel}
            </Button>
            <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_EMPLOYERS]}>
              <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
                {saving ? LABELS.saving : LABELS.save}
              </Button>
            </RBACGuard>
          </Stack>
        </Box>
      </MainCard>
    </>
  );
};

export default EmployerCreate;
