import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import benefitPolicyService from '../../services/benefitPolicyService';
import organizationService from '../../services/organizationService';

/**
 * Contract Form Dialog
 * 
 * Create or edit a benefit policy (employer contract).
 * 
 * Features:
 * - Create new contract
 * - Edit existing contract
 * - Employer and insurance organization selection
 * - Date range validation
 * - Financial limits configuration
 * - Coverage percentage
 * - Form validation with Yup
 */
const ContractFormDialog = ({ open, onClose, onSuccess, contract = null, mode = 'create' }) => {
  const [loading, setLoading] = useState(false);
  const [employers, setEmployers] = useState([]);
  const [insuranceOrgs, setInsuranceOrgs] = useState([]);
  const [error, setError] = useState(null);

  const isEditMode = mode === 'edit' && contract !== null;

  // Validation schema
  const validationSchema = Yup.object({
    name: Yup.string()
      .required('اسم العقد مطلوب')
      .max(255, 'الاسم يجب ألا يتجاوز 255 حرف'),
    policyCode: Yup.string()
      .max(50, 'رقم العقد يجب ألا يتجاوز 50 حرف'),
    description: Yup.string()
      .max(2000, 'الوصف يجب ألا يتجاوز 2000 حرف'),
    employerOrgId: Yup.number()
      .required('الشريك مطلوب')
      .positive('يجب اختيار شريك صحيح'),
    insuranceOrgId: Yup.number()
      .nullable()
      .positive('يجب اختيار شركة تأمين صحيحة'),
    startDate: Yup.date()
      .required('تاريخ البدء مطلوب')
      .typeError('تاريخ البدء غير صحيح'),
    endDate: Yup.date()
      .required('تاريخ الانتهاء مطلوب')
      .typeError('تاريخ الانتهاء غير صحيح')
      .min(Yup.ref('startDate'), 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء'),
    annualLimit: Yup.number()
      .required('الحد السنوي مطلوب')
      .min(0, 'الحد السنوي يجب أن يكون صفر أو أكثر')
      .typeError('يجب إدخال رقم صحيح'),
    defaultCoveragePercent: Yup.number()
      .required('نسبة التغطية مطلوبة')
      .min(0, 'النسبة يجب أن تكون بين 0 و 100')
      .max(100, 'النسبة يجب أن تكون بين 0 و 100')
      .typeError('يجب إدخال رقم صحيح'),
    perMemberLimit: Yup.number()
      .nullable()
      .min(0, 'الحد لكل منتفع يجب أن يكون صفر أو أكثر')
      .typeError('يجب إدخال رقم صحيح'),
    perFamilyLimit: Yup.number()
      .nullable()
      .min(0, 'الحد لكل عائلة يجب أن يكون صفر أو أكثر')
      .typeError('يجب إدخال رقم صحيح'),
    defaultWaitingPeriodDays: Yup.number()
      .nullable()
      .min(0, 'فترة الانتظار يجب أن تكون صفر أو أكثر')
      .typeError('يجب إدخال رقم صحيح'),
    notes: Yup.string()
      .max(1000, 'الملاحظات يجب ألا تتجاوز 1000 حرف')
  });

  // Form initialization
  const formik = useFormik({
    initialValues: {
      name: contract?.name || '',
      policyCode: contract?.policyCode || '',
      description: contract?.description || '',
      employerOrgId: contract?.employerOrgId || '',
      insuranceOrgId: contract?.insuranceOrgId || '',
      startDate: contract?.startDate ? dayjs(contract.startDate) : null,
      endDate: contract?.endDate ? dayjs(contract.endDate) : null,
      annualLimit: contract?.annualLimit || '',
      defaultCoveragePercent: contract?.defaultCoveragePercent || 80,
      perMemberLimit: contract?.perMemberLimit || '',
      perFamilyLimit: contract?.perFamilyLimit || '',
      defaultWaitingPeriodDays: contract?.defaultWaitingPeriodDays || 0,
      notes: contract?.notes || ''
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);

      try {
        // Prepare data
        const data = {
          name: values.name,
          policyCode: values.policyCode || null,
          description: values.description || null,
          employerOrgId: values.employerOrgId,
          insuranceOrgId: values.insuranceOrgId || null,
          startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
          endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
          annualLimit: parseFloat(values.annualLimit),
          defaultCoveragePercent: parseInt(values.defaultCoveragePercent, 10),
          perMemberLimit: values.perMemberLimit ? parseFloat(values.perMemberLimit) : null,
          perFamilyLimit: values.perFamilyLimit ? parseFloat(values.perFamilyLimit) : null,
          defaultWaitingPeriodDays: values.defaultWaitingPeriodDays ? parseInt(values.defaultWaitingPeriodDays, 10) : 0,
          notes: values.notes || null
        };

        // Submit
        let response;
        if (isEditMode) {
          response = await benefitPolicyService.update(contract.id, data);
        } else {
          response = await benefitPolicyService.create(data);
        }

        // Success
        onSuccess(response.data);
        handleClose();
      } catch (err) {
        console.error('Error saving contract:', err);
        setError(err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ العقد');
      } finally {
        setLoading(false);
      }
    }
  });

  // Load employers and insurance organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        // Load employers (type EMPLOYER)
        const employerResponse = await organizationService.getByType('EMPLOYER');
        setEmployers(employerResponse.data || []);

        // Load insurance organizations (type INSURANCE)
        const insuranceResponse = await organizationService.getByType('INSURANCE');
        setInsuranceOrgs(insuranceResponse.data || []);
      } catch (err) {
        console.error('Error loading organizations:', err);
      }
    };

    if (open) {
      loadOrganizations();
    }
  }, [open]);

  const handleClose = () => {
    formik.resetForm();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'تعديل العقد' : 'إنشاء عقد جديد'}
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Contract Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="اسم العقد"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                placeholder="مثال: Gold Plan 2025"
              />
            </Grid>

            {/* Policy Code */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم العقد"
                name="policyCode"
                value={formik.values.policyCode}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.policyCode && Boolean(formik.errors.policyCode)}
                helperText={formik.touched.policyCode && formik.errors.policyCode}
                placeholder="مثال: BP-2025-001"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الوصف"
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
                placeholder="وصف تفصيلي للعقد..."
              />
            </Grid>

            {/* Employer Organization */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={formik.touched.employerOrgId && Boolean(formik.errors.employerOrgId)}>
                <InputLabel>الشريك</InputLabel>
                <Select
                  label="الشريك"
                  name="employerOrgId"
                  value={formik.values.employerOrgId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <MenuItem value="">
                    <em>اختر الشريك</em>
                  </MenuItem>
                  {Array.isArray(employers) && employers.map((employer) => (
                    <MenuItem key={employer.id} value={employer.id}>
                      {employer.nameAr || employer.name}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.employerOrgId && formik.errors.employerOrgId && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                    {formik.errors.employerOrgId}
                  </Box>
                )}
              </FormControl>
            </Grid>

            {/* Insurance Organization (Optional) */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>شركة التأمين (اختياري)</InputLabel>
                <Select
                  label="شركة التأمين (اختياري)"
                  name="insuranceOrgId"
                  value={formik.values.insuranceOrgId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <MenuItem value="">
                    <em>لا يوجد</em>
                  </MenuItem>
                  {insuranceOrgs.map((insurance) => (
                    <MenuItem key={insurance.id} value={insurance.id}>
                      {insurance.nameAr || insurance.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Start Date */}
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="تاريخ البدء *"
                  value={formik.values.startDate}
                  onChange={(value) => formik.setFieldValue('startDate', value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.startDate && Boolean(formik.errors.startDate),
                      helperText: formik.touched.startDate && formik.errors.startDate,
                      onBlur: () => formik.setFieldTouched('startDate', true)
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* End Date */}
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="تاريخ الانتهاء *"
                  value={formik.values.endDate}
                  onChange={(value) => formik.setFieldValue('endDate', value)}
                  minDate={formik.values.startDate}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.endDate && Boolean(formik.errors.endDate),
                      helperText: formik.touched.endDate && formik.errors.endDate,
                      onBlur: () => formik.setFieldTouched('endDate', true)
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Annual Limit */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="الحد السنوي"
                name="annualLimit"
                value={formik.values.annualLimit}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.annualLimit && Boolean(formik.errors.annualLimit)}
                helperText={formik.touched.annualLimit && formik.errors.annualLimit}
                InputProps={{
                  endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Coverage Percent */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="نسبة التغطية"
                name="defaultCoveragePercent"
                value={formik.values.defaultCoveragePercent}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.defaultCoveragePercent && Boolean(formik.errors.defaultCoveragePercent)}
                helperText={formik.touched.defaultCoveragePercent && formik.errors.defaultCoveragePercent}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* Per Member Limit */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="حد المنتفع (اختياري)"
                name="perMemberLimit"
                value={formik.values.perMemberLimit}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.perMemberLimit && Boolean(formik.errors.perMemberLimit)}
                helperText={formik.touched.perMemberLimit && formik.errors.perMemberLimit}
                InputProps={{
                  endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Per Family Limit */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="حد العائلة (اختياري)"
                name="perFamilyLimit"
                value={formik.values.perFamilyLimit}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.perFamilyLimit && Boolean(formik.errors.perFamilyLimit)}
                helperText={formik.touched.perFamilyLimit && formik.errors.perFamilyLimit}
                InputProps={{
                  endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Waiting Period */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="فترة الانتظار (أيام)"
                name="defaultWaitingPeriodDays"
                value={formik.values.defaultWaitingPeriodDays}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.defaultWaitingPeriodDays && Boolean(formik.errors.defaultWaitingPeriodDays)}
                helperText={formik.touched.defaultWaitingPeriodDays && formik.errors.defaultWaitingPeriodDays}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                name="notes"
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
                placeholder="ملاحظات إضافية..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !formik.isValid}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'جاري الحفظ...' : (isEditMode ? 'تحديث' : 'إنشاء')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

ContractFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  contract: PropTypes.object,
  mode: PropTypes.oneOf(['create', 'edit'])
};

export default ContractFormDialog;
