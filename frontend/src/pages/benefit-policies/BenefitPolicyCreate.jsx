import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';

// MUI Components
import {
  Grid,
  Button,
  Stack,
  MenuItem,
  InputAdornment,
  Alert,
  Typography,
  Divider,
  Container,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Autocomplete
} from '@mui/material';
import TextField from '@mui/material/TextField';
import { LoadingButton } from '@mui/lab';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PolicyIcon from '@mui/icons-material/Policy';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';

// Services
import { createBenefitPolicy } from 'services/api/benefit-policies.service';
import { getEmployerSelectors } from 'services/api/employers.service';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`benefit-policy-tabpanel-${index}`}
      aria-labelledby={`benefit-policy-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Validation Schema - Yup
 * Defines all validation rules for the Benefit Policy form
 */
const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('اسم الوثيقة مطلوب')
    .min(5, 'الاسم يجب أن يكون 5 أحرف على الأقل')
    .max(255, 'الاسم يجب أن لا يتجاوز 255 حرفاً'),

  employerOrgId: Yup.mixed()
    .required('يجب اختيار الشريك (صاحب العمل)'),

  policyCode: Yup.string().nullable(),

  startDate: Yup.date()
    .nullable()
    .required('تاريخ البدء مطلوب')
    .typeError('تاريخ غير صالح'),

  endDate: Yup.date()
    .nullable()
    .required('تاريخ الانتهاء مطلوب')
    .min(Yup.ref('startDate'), 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء')
    .typeError('تاريخ غير صالح'),

  annualLimit: Yup.number()
    .required('السقف السنوي مطلوب')
    .positive('يجب أن يكون أكبر من صفر')
    .max(10000000, 'قيمة السقف السنوي كبيرة جداً'),

  defaultCoveragePercent: Yup.number()
    .required('نسبة التغطية مطلوبة')
    .min(0, 'النسبة لا تقل عن 0%')
    .max(100, 'النسبة لا تزيد عن 100%'),

  perMemberLimit: Yup.mixed()
    .test('is-positive', 'يجب أن يكون رقماً موجباً', (val) => !val || (!isNaN(val) && Number(val) > 0))
    .nullable(),

  perFamilyLimit: Yup.mixed()
    .test('is-positive', 'يجب أن يكون رقماً موجباً', (val) => !val || (!isNaN(val) && Number(val) > 0))
    .nullable(),

  status: Yup.string().required('الحالة مطلوبة'),

  distributionType: Yup.string().required('نوع التوزيع مطلوب'),

  description: Yup.string().max(1000, 'الوصف طويل جداً')
});

/**
 * Benefit Policy Create Page
 * Modern implementation using Formik, Yup, and Material UI v5
 */
const BenefitPolicyCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [employers, setEmployers] = useState([]);
  const [loadingEmployers, setLoadingEmployers] = useState(true);
  const [generalError, setGeneralError] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Get employerId from URL if provided
  const employerIdFromUrl = searchParams.get('employerId');

  // Initial Form Values
  const initialValues = {
    name: '',
    policyCode: '',
    description: '',
    employerOrgId: employerIdFromUrl || '',
    startDate: dayjs(),
    endDate: dayjs().add(1, 'year'),
    annualLimit: '60000',
    defaultCoveragePercent: 75,
    perFamilyLimit: '',
    distributionType: 'UNIFIED',
    notes: '',
    status: 'DRAFT'
  };

  // Fetch Employers Data Function
  const fetchEmployers = async () => {
    setLoadingEmployers(true);
    try {
      const data = await getEmployerSelectors();
      // Normalize data if needed, assuming API returns [{id, label}, ...]
      setEmployers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch employers:', err);
      // Error is handled silently for selector, just empty list
    } finally {
      setLoadingEmployers(false);
    }
  };

  // Fetch Employers on Mount
  useEffect(() => {
    fetchEmployers();
  }, []);

  // Handle Form Submission
  const handleSubmit = async (values, { setSubmitting }) => {
    setGeneralError(null);
    try {
      // Transform Form Values to API Payload
      const payload = {
        name: values.name.trim(),
        policyCode: values.policyCode?.trim() || null,
        description: values.description?.trim() || null,
        employerOrgId: values.employerOrgId, // Assuming ID is stored directly
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : null,
        endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : null,
        annualLimit: parseFloat(values.annualLimit),
        defaultCoveragePercent: parseInt(values.defaultCoveragePercent, 10),
        perMemberLimit: values.perMemberLimit ? parseFloat(values.perMemberLimit) : null,
        perFamilyLimit: values.perFamilyLimit ? parseFloat(values.perFamilyLimit) : null,
        distributionType: values.distributionType,
        notes: values.notes?.trim() || null,
        status: values.status
      };

      await createBenefitPolicy(payload);

      // Success - Navigate back
      navigate('/benefit-policies');
    } catch (err) {
      console.error('Create Policy Error:', err);
      const msg = err.response?.data?.message || err.message || 'فشل إنشاء وثيقة المنافع. يرجى المحاولة لاحقاً.';
      setGeneralError(msg);
      setSubmitting(false);
    }
  };

  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_BENEFIT_POLICIES]}>
      {/* Page Header */}
      <ModernPageHeader
        title="إنشاء وثيقة منافع جديدة"
        subtitle="إدخال بيانات وثيقة التأمين والشروط المالية"
        icon={PolicyIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/dashboard' },
          { label: 'وثائق المنافع', path: '/benefit-policies' },
          { label: 'إنشاء وثيقة' }
        ]}
      />

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MainCard>
          {generalError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setGeneralError(null)}>
              {generalError}
            </Alert>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
              <Form autoComplete="off">
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs value={activeTab} onChange={handleTabChange} aria-label="benefit policy tabs">
                    <Tab
                      icon={<BusinessIcon />}
                      iconPosition="start"
                      label="البيانات الأساسية"
                      id="benefit-policy-tab-0"
                      aria-controls="benefit-policy-tabpanel-0"
                    />
                    <Tab
                      icon={<AttachMoneyIcon />}
                      iconPosition="start"
                      label="التغطية والحدود المالية"
                      id="benefit-policy-tab-1"
                      aria-controls="benefit-policy-tabpanel-1"
                    />
                    <Tab
                      icon={<CalendarTodayIcon />}
                      iconPosition="start"
                      label="فترة السريان"
                      id="benefit-policy-tab-2"
                      aria-controls="benefit-policy-tabpanel-2"
                    />
                    <Tab
                      icon={<DescriptionIcon />}
                      iconPosition="start"
                      label="توضيحات إضافية"
                      id="benefit-policy-tab-3"
                      aria-controls="benefit-policy-tabpanel-3"
                    />
                  </Tabs>
                </Box>

                {/* === Tab 1: Basic Information === */}
                <TabPanel value={activeTab} index={0}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="اسم الوثيقة"
                        name="name"
                        placeholder="مثال: وثيقة التأمين الصحي - شركة الواحة"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PolicyIcon fontSize="small" color="action" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="الشريك (صاحب العمل)"
                        name="employerOrgId"
                        value={values.employerOrgId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.employerOrgId && Boolean(errors.employerOrgId)}
                        helperText={(touched.employerOrgId && errors.employerOrgId) || "اختر المؤسسة صاحبة الوثيقة"}
                        disabled={loadingEmployers}
                      >
                        {loadingEmployers ? (
                          <MenuItem value="" disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} /> جارٍ التحميل...
                          </MenuItem>
                        ) : employers.length > 0 ? (
                          Array.isArray(employers) && employers.map((emp) => (
                            <MenuItem key={emp.id} value={emp.id}>
                              {emp.label || emp.nameAr || emp.name}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem value="" disabled>لا يوجد شركاء متاحين</MenuItem>
                        )}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Box sx={{
                        p: 2,
                        bgcolor: 'primary.lighter',
                        border: '1px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        minHeight: 56
                      }}>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                          ℹ️ سيتم توليد رمز الوثيقة تلقائياً بواسطة النظام فور الحفظ.
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="حالة الوثيقة"
                        name="status"
                        value={values.status}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.status && Boolean(errors.status)}
                        helperText={touched.status && errors.status}
                      >
                        <MenuItem value="DRAFT">مسودة (Draft)</MenuItem>
                        <MenuItem value="ACTIVE">نشط (Active)</MenuItem>
                        <MenuItem value="SUSPENDED">معلق (Suspended)</MenuItem>
                        <MenuItem value="EXPIRED">منتهي (Expired)</MenuItem>
                        <MenuItem value="CANCELLED">ملغي (Cancelled)</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="نظام توزيع الحدود المالية"
                        name="distributionType"
                        value={values.distributionType}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        helperText="موحد (سقف واحد لكل الخدمات) أو منفصل (سقوف مستقلة للأسنان والبصريات وغيرها)"
                      >
                        <MenuItem value="UNIFIED">موحد (Unified)</MenuItem>
                        <MenuItem value="DISTRIBUTED">منفصل (Distributed)</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* === Tab 2: Coverage & Limits === */}
                <TabPanel value={activeTab} index={1}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6} lg={6}>
                      <TextField
                        fullWidth
                        label="السقف السنوي"
                        name="annualLimit"
                        type="number"
                        value={values.annualLimit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.annualLimit && Boolean(errors.annualLimit)}
                        helperText={touched.annualLimit && errors.annualLimit}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6} lg={6}>
                      <TextField
                        fullWidth
                        label="نسبة التغطية"
                        name="defaultCoveragePercent"
                        type="number"
                        value={values.defaultCoveragePercent}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.defaultCoveragePercent && Boolean(errors.defaultCoveragePercent)}
                        helperText={touched.defaultCoveragePercent && errors.defaultCoveragePercent}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6} lg={6}>
                      <TextField
                        fullWidth
                        label="الحد للفرد"
                        name="perMemberLimit"
                        type="number"
                        value={values.perMemberLimit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.perMemberLimit && Boolean(errors.perMemberLimit)}
                        helperText={touched.perMemberLimit && errors.perMemberLimit || "اختياري"}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6} lg={6}>
                      <TextField
                        fullWidth
                        label="الحد للعائلة"
                        name="perFamilyLimit"
                        type="number"
                        value={values.perFamilyLimit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.perFamilyLimit && Boolean(errors.perFamilyLimit)}
                        helperText={touched.perFamilyLimit && errors.perFamilyLimit || "اختياري"}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                        }}
                      />
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* === Tab 3: Period === */}
                <TabPanel value={activeTab} index={2}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <DatePicker
                        label="تاريخ البدء *"
                        value={values.startDate}
                        onChange={(value) => setFieldValue('startDate', value)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: touched.startDate && Boolean(errors.startDate),
                            helperText: touched.startDate && errors.startDate
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <DatePicker
                        label="تاريخ الانتهاء *"
                        value={values.endDate}
                        onChange={(value) => setFieldValue('endDate', value)}
                        minDate={values.startDate || dayjs()}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: touched.endDate && Boolean(errors.endDate),
                            helperText: touched.endDate && errors.endDate
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* === Tab 4: Notes === */}
                <TabPanel value={activeTab} index={3}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="ملاحظات"
                        name="notes"
                        value={values.notes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="أضف وصفاً تفصيلياً أو ملاحظات إضافية..."
                      />
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* === Actions === */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2, px: 3, pb: 2 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate('/benefit-policies')}
                    startIcon={<CancelIcon />}
                    disabled={isSubmitting}
                  >
                    إلغاء
                  </Button>
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    loading={isSubmitting}
                    loadingPosition="start"
                    startIcon={<SaveIcon />}
                    sx={{ minWidth: 120 }}
                  >
                    حفظ الوثيقة
                  </LoadingButton>
                </Box>
              </Form>
            )}
          </Formik>
        </MainCard>
      </LocalizationProvider >
    </RBACGuard >
  );
};

export default BenefitPolicyCreate;
