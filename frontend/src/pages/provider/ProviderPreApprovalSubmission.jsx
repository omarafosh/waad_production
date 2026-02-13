/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     PROVIDER PRE-APPROVAL SUBMISSION - Visit-Centric Canonical Architecture  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  CREATED: 2026-01-29                                                         ║
 * ║  REDESIGNED: 2026-01-29 - Desktop-First Professional UX                      ║
 * ║  ARCHITECTURAL LAWS ENFORCED:                                                ║
 * ║  ❌ No pre-approval without Visit (visitId is MANDATORY)                     ║
 * ║  ❌ No free-text service (must select from dropdown)                         ║
 * ║  ❌ No manual price entry (price comes from Provider Contract)               ║
 * ║  ✅ Data Flow: Visit → Member → Contract → Service → Pre-Approval            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  Divider,
  LinearProgress,
  Chip,
  CircularProgress,
  Paper,
  Autocomplete,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Send as SendIcon,
  Person as PersonIcon,
  MedicalServices as MedicalServicesIcon,
  ArrowBack as ArrowBackIcon,
  CreditCard as CardIcon,
  LocalHospital as VisitIcon,
  Lock as LockIcon,
  CheckCircle as ApprovalIcon,
  Category as CategoryIcon,
  Healing as HealingIcon,
  Description as DiagnosisIcon,
  PriorityHigh as PriorityIcon,
  Notes as NotesIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import SuccessDialog from 'components/SuccessDialog';
import { useAuth } from 'contexts/AuthContext';
import axiosClient from 'utils/axios';
import { MEDICAL_COLORS } from 'themes/provider-theme';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & LABELS
// ══════════════════════════════════════════════════════════════════════════════
const LABELS = {
  pageTitle: 'إنشاء موافقة مسبقة',
  pageSubtitle: 'طلب موافقة مسبقة للخدمات الطبية التي تتطلب موافقة مسبقة',
  visitRequired: 'يجب الوصول لهذه الصفحة من سجل الزيارات',
  visitInfo: 'بيانات الزيارة',
  memberInfo: 'بيانات المستفيد',
  serviceSelection: 'التصنيف والخدمة الطبية',
  selectCategory: 'التصنيف الطبي',
  selectService: 'الخدمة الطبية',
  noContract: 'لا يوجد عقد ساري لمقدم الخدمة',
  diagnosis: 'بيانات التشخيص',
  diagnosisCode: 'رمز التشخيص (ICD-10)',
  diagnosisDescription: 'وصف التشخيص',
  requestDetails: 'تفاصيل الطلب',
  notes: 'ملاحظات طبية',
  priority: 'أولوية الطلب',
  submit: 'تقديم طلب الموافقة',
  submitting: 'جاري التقديم...',
  cancel: 'إلغاء',
  back: 'رجوع',
  contractPrice: 'سعر الخدمة حسب العقد',
  priceReadOnly: 'السعر محدد تلقائياً من عقد مقدم الخدمة',
  successTitle: 'تم إنشاء طلب الموافقة المسبقة بنجاح',
  successMessage: 'تم تقديم الطلب وسيتم مراجعته من قبل فريق التأمين',
  coverageInfo: 'معلومات التغطية',
  requiresPA: 'يتطلب موافقة مسبقة'
};

const PRIORITY_OPTIONS = [
  { value: 'EMERGENCY', label: 'طوارئ', color: 'error', description: 'حالة طارئة تحتاج موافقة فورية' },
  { value: 'URGENT', label: 'عاجل', color: 'warning', description: 'يحتاج موافقة خلال 24 ساعة' },
  { value: 'NORMAL', label: 'عادي', color: 'info', description: 'المعالجة الاعتيادية' },
  { value: 'LOW', label: 'منخفض', color: 'default', description: 'غير مستعجل' }
];

const VISIT_TYPE_LABELS = {
  OUTPATIENT: 'عيادة خارجية',
  INPATIENT: 'تنويم',
  EMERGENCY: 'طوارئ',
  DAY_CARE: 'رعاية يومية'
};

// ══════════════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS / SECTION COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Section Header Component
 */
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'primary' }) => (
  <Box sx={{ mb: 2.5 }}>
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
          color: `${color}.main`
        }}
      >
        <Icon />
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={600} color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  </Box>
);

/**
 * Read-Only Info Field
 */
const ReadOnlyField = ({ icon: Icon, label, value, highlight = false }) => (
  <Box sx={{ mb: 2 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: 'block',
        mb: 0.5,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: '0.7rem'
      }}
    >
      {label}
    </Typography>
    <Stack direction="row" spacing={1} alignItems="center">
      {Icon && <Icon fontSize="small" color="action" sx={{ opacity: 0.7 }} />}
      <Typography variant="body1" fontWeight={highlight ? 600 : 400} color={highlight ? 'primary.main' : 'text.primary'}>
        {value || '—'}
      </Typography>
    </Stack>
  </Box>
);

/**
 * Info Card (Read-Only)
 */
const InfoCard = ({ children, bgcolor = 'grey.50' }) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      bgcolor,
      borderColor: 'divider',
      borderRadius: 2,
      transition: 'box-shadow 0.2s',
      '&:hover': {
        boxShadow: 1
      }
    }}
  >
    <CardContent sx={{ p: 3 }}>{children}</CardContent>
  </Card>
);

/**
 * Form Section Card
 */
const FormSection = ({ children, highlighted = false }) => (
  <Card
    variant="outlined"
    sx={{
      borderRadius: 2,
      borderColor: highlighted ? 'primary.main' : 'divider',
      borderWidth: highlighted ? 2 : 1,
      bgcolor: highlighted ? (theme) => alpha(theme.palette.primary.main, 0.02) : 'background.paper'
    }}
  >
    <CardContent sx={{ p: 3 }}>{children}</CardContent>
  </Card>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ProviderPreApprovalSubmission = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME (MEDICAL THEME)
  // ═══════════════════════════════════════════════════════════════════════════
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tableHeaderBg = isDark ? '#1E3A5F' : MEDICAL_COLORS.primary.main;
  const tableHeaderColor = '#FFFFFF';

  // ── Visit Data from URL ──
  const visitData = useMemo(
    () => ({
      visitId: searchParams.get('visitId'),
      memberId: searchParams.get('memberId'),
      memberName: searchParams.get('memberName') || '',
      memberCivilId: searchParams.get('memberCivilId') || '',
      cardNumber: searchParams.get('cardNumber') || '',
      employer: searchParams.get('employer') || '',
      visitDate: searchParams.get('visitDate') || '',
      visitTime: searchParams.get('visitTime') || '',
      visitType: searchParams.get('visitType') || 'OUTPATIENT',
      providerId: searchParams.get('providerId') || '',
      providerName: searchParams.get('providerName') || '',
      fromVisitLog: searchParams.get('fromVisitLog') === 'true'
    }),
    [searchParams]
  );

  // ── State ──
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdPreApprovalId, setCreatedPreApprovalId] = useState(null);

  // Contract & Services
  const [contract, setContract] = useState(null);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Form Data
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisDescription, setDiagnosisDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [notes, setNotes] = useState('');

  // ══════════════════════════════════════════════════════════════════════════════
  // LOAD PROVIDER CONTRACT & CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadContractData = async () => {
      if (!visitData.fromVisitLog) return;

      try {
        setLoading(true);
        setError(null);

        const contractRes = await axiosClient.get('/api/provider/my-contract');
        if (contractRes.data?.data) {
          setContract(contractRes.data.data);
        }

        const categoriesRes = await axiosClient.get('/api/provider/medical-categories');
        if (categoriesRes.data?.data) {
          setCategories(categoriesRes.data.data);
        }
      } catch (err) {
        console.error('Error loading contract data:', err);
        setError('فشل في تحميل بيانات العقد');
      } finally {
        setLoading(false);
      }
    };

    loadContractData();
  }, [visitData.fromVisitLog]);

  // ══════════════════════════════════════════════════════════════════════════════
  // LOAD SERVICES THAT REQUIRE PRE-AUTHORIZATION
  // Uses the proper endpoint that checks member's benefit policy rules
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadServices = async () => {
      if (!visitData.memberId || !contract?.providerId) return;

      try {
        setLoadingServices(true);
        // Use the endpoint that checks member's benefit policy for PA requirements
        const res = await axiosClient.get('/api/provider/my-contract/services/requiring-preauth', {
          params: { memberId: visitData.memberId }
        });
        if (res.data?.data) {
          setServices(res.data.data);
        } else {
          setServices([]);
        }
      } catch (err) {
        console.error('Error loading services:', err);
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, [visitData.memberId, contract]);

  // ══════════════════════════════════════════════════════════════════════════════
  // FILTERED SERVICES BY SELECTED CATEGORY
  // All services already require PA (filtered by backend), just filter by category
  // ══════════════════════════════════════════════════════════════════════════════
  const filteredServices = useMemo(() => {
    if (!selectedCategory) return [];
    return services.filter((s) =>
      s.categoryId === selectedCategory.id ||
      s.categoryName === selectedCategory.name
    );
  }, [services, selectedCategory]);

  // ══════════════════════════════════════════════════════════════════════════════
  // FORM VALIDATION
  // ══════════════════════════════════════════════════════════════════════════════
  const isFormValid = useMemo(() => {
    return visitData.visitId && selectedService;
  }, [visitData.visitId, selectedService]);

  // ══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════════
  const handleCategoryChange = useCallback((event, newValue) => {
    setSelectedCategory(newValue);
    setSelectedService(null);
    setServices([]);
  }, []);

  const handleServiceChange = useCallback((event, newValue) => {
    setSelectedService(newValue);
  }, []);

  const handleBack = useCallback(() => {
    navigate('/provider/visits');
  }, [navigate]);

  const handleSubmit = useCallback(async () => {
    if (!visitData.visitId) {
      setError('معرف الزيارة مطلوب');
      return;
    }
    if (!selectedService) {
      setError('يجب اختيار خدمة طبية');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        visitId: parseInt(visitData.visitId),
        memberId: visitData.memberId ? parseInt(visitData.memberId) : null,
        medicalServiceId: selectedService.medicalServiceId || selectedService.serviceId || selectedService.id,
        serviceCategoryId: selectedCategory?.id || null,
        diagnosisCode: diagnosisCode || null,
        diagnosisDescription: diagnosisDescription || null,
        priority: priority,
        notes: notes || null,
        currency: 'LYD'
      };

      const response = await axiosClient.post('/api/pre-authorizations', payload);

      if (response.data?.data?.id) {
        setCreatedPreApprovalId(response.data.data.id);
        setSuccessDialogOpen(true);
      }
    } catch (err) {
      console.error('Error creating pre-approval:', err);
      const errorMessage = err.response?.data?.message || err.message || 'فشل في إنشاء الموافقة المسبقة';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [visitData, selectedService, selectedCategory, diagnosisCode, diagnosisDescription, priority, notes]);

  const handleSuccessClose = useCallback(() => {
    setSuccessDialogOpen(false);
    navigate('/provider/visits');
  }, [navigate]);

  const handleViewPreApproval = useCallback(() => {
    setSuccessDialogOpen(false);
    if (createdPreApprovalId) {
      navigate(`/pre-approvals/${createdPreApprovalId}`);
    }
  }, [navigate, createdPreApprovalId]);

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER - NO VISIT DATA (ACCESS BLOCKED)
  // ══════════════════════════════════════════════════════════════════════════════
  if (!visitData.fromVisitLog || !visitData.visitId) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Card variant="outlined" sx={{ borderRadius: 3, textAlign: 'center', p: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'warning.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <LockIcon sx={{ fontSize: 40, color: 'warning.main' }} />
          </Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            الوصول المباشر غير مسموح
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {LABELS.visitRequired}
            <br />
            يرجى الانتقال إلى سجل الزيارات واختيار زيارة لإنشاء موافقة مسبقة منها.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/provider/visits')}
            sx={{ borderRadius: 2, px: 4 }}
          >
            الذهاب إلى سجل الزيارات
          </Button>
        </Card>
      </Box>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER - MAIN FORM (Desktop-First Layout)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* ═══════════════════════ PAGE HEADER ═══════════════════════ */}
      <ModernPageHeader
        title={LABELS.pageTitle}
        subtitle={LABELS.pageSubtitle}
        icon={ApprovalIcon}
        breadcrumbs={[{ label: 'بوابة مقدم الخدمة' }, { label: 'سجل الزيارات', href: '/provider/visits' }, { label: LABELS.pageTitle }]}
      />

      {/* ═══════════════════════ LOADING BAR ═══════════════════════ */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* ═══════════════════════ ERROR ALERT ═══════════════════════ */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ═══════════════════════ CONTRACT WARNING ═══════════════════════ */}
      {!contract && !loading && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography fontWeight={600}>{LABELS.noContract}</Typography>
          <Typography variant="body2">تواصل مع إدارة النظام للتحقق من حالة عقد مقدم الخدمة.</Typography>
        </Alert>
      )}

      <Stack spacing={3}>
        {/* ═══════════════════════ ROW 1: VISIT & MEMBER INFO ═══════════════════════ */}
        <Grid container spacing={3}>
          {/* Visit Info Card */}
          <Grid item xs={12} md={6}>
            <InfoCard bgcolor={(theme) => alpha(theme.palette.info.main, 0.04)}>
              <SectionHeader icon={VisitIcon} title={LABELS.visitInfo} subtitle="معلومات الزيارة المرتبطة (للقراءة فقط)" color="info" />
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <ReadOnlyField icon={BadgeIcon} label="رقم الزيارة" value={`#${visitData.visitId}`} highlight />
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField icon={CalendarIcon} label="تاريخ الزيارة" value={visitData.visitDate} />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mb: 0.5,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        fontSize: '0.7rem'
                      }}
                    >
                      نوع الزيارة
                    </Typography>
                    <Chip
                      label={VISIT_TYPE_LABELS[visitData.visitType] || visitData.visitType}
                      size="small"
                      color="info"
                      variant="filled"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField
                    icon={BusinessIcon}
                    label="مقدم الخدمة"
                    value={(visitData.providerName && visitData.providerName !== '—') ? visitData.providerName : (contract?.provider?.name || user?.name || '—')}
                  />
                </Grid>
              </Grid>
            </InfoCard>
          </Grid>

          {/* Member Info Card */}
          <Grid item xs={12} md={6}>
            <InfoCard bgcolor={(theme) => alpha(theme.palette.success.main, 0.04)}>
              <SectionHeader icon={PersonIcon} title={LABELS.memberInfo} subtitle="بيانات المستفيد (للقراءة فقط)" color="success" />
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <ReadOnlyField icon={PersonIcon} label="اسم المستفيد" value={visitData.memberName} highlight />
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField label="الرقم المدني" value={visitData.memberCivilId} />
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField icon={CardIcon} label="رقم البطاقة التأمينية" value={visitData.cardNumber} />
                </Grid>
                <Grid item xs={12}>
                  <ReadOnlyField icon={BusinessIcon} label="جهة العمل / الوثيقة" value={visitData.employer} />
                </Grid>
              </Grid>
            </InfoCard>
          </Grid>
        </Grid>

        {/* ═══════════════════════ ROW 2: CATEGORY → SERVICE SELECTION ═══════════════════════ */}
        <FormSection highlighted>
          <SectionHeader
            icon={MedicalServicesIcon}
            title={LABELS.serviceSelection}
            subtitle="الخطوة الإلزامية: اختر التصنيف أولاً ثم الخدمة الطبية"
            color="primary"
          />
          <Divider sx={{ mb: 3 }} />

          {/* Contract Info */}
          {contract && (
            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>العقد الساري:</strong> {contract.contractCode || contract.contractNumber}
                {' • '}
                <strong>مقدم الخدمة:</strong> {contract.provider?.name || visitData.providerName}
              </Typography>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Step 1: Category Selection */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <Chip
                  label="الخطوة 1"
                  size="small"
                  color="primary"
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: 0,
                    zIndex: 1,
                    fontWeight: 600
                  }}
                />
                <Autocomplete
                  options={categories}
                  getOptionLabel={(option) => option.name || option.code || ''}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={LABELS.selectCategory}
                      placeholder="اختر التصنيف الطبي أولاً..."
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <CategoryIcon color="action" sx={{ ml: 1, mr: 0.5 }} />
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  noOptionsText="لا توجد تصنيفات متاحة"
                  disabled={!contract}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CategoryIcon fontSize="small" color="primary" />
                          <Typography>{option.name || option.code}</Typography>
                        </Stack>
                      </li>
                    );
                  }}
                />
              </Box>
            </Grid>

            {/* Step 2: Service Selection */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <Chip
                  label="الخطوة 2"
                  size="small"
                  color={selectedCategory ? 'primary' : 'default'}
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: 0,
                    zIndex: 1,
                    fontWeight: 600
                  }}
                />
                <Autocomplete
                  options={filteredServices}
                  getOptionLabel={(option) => `${option.serviceCode || option.code || ''} - ${option.serviceName || option.name || ''}`}
                  value={selectedService}
                  onChange={handleServiceChange}
                  loading={loadingServices}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={LABELS.selectService}
                      placeholder={selectedCategory ? 'اختر الخدمة الطبية...' : 'اختر التصنيف أولاً'}
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <HealingIcon color="action" sx={{ ml: 1, mr: 0.5 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {loadingServices ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  noOptionsText={
                    !selectedCategory
                      ? '⚠️ يجب اختيار التصنيف أولاً'
                      : services.length > 0 && filteredServices.length === 0
                        ? 'لا توجد خدمات تتطلب موافقة مسبقة في هذا التصنيف'
                        : 'لا توجد خدمات في هذا التصنيف'
                  }
                  disabled={!selectedCategory}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        <Stack spacing={0.5} sx={{ width: '100%' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={option.serviceCode || option.code}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {option.serviceName || option.name}
                            </Typography>
                          </Stack>
                          {option.contractPrice && (
                            <Typography variant="caption" color="success.main">
                              💰 سعر العقد: {option.contractPrice.toFixed(2)} د.ل
                            </Typography>
                          )}
                        </Stack>
                      </li>
                    );
                  }}
                />
              </Box>
            </Grid>

            {/* Services Count Info */}
            {selectedCategory && services.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                  <Typography variant="body2">
                    📊 عرض <strong>{filteredServices.length}</strong> خدمة تتطلب موافقة مسبقة من أصل <strong>{services.length}</strong> خدمة
                    في هذا التصنيف
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Selected Service - Price Display */}
            {selectedService && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                    borderColor: 'success.main',
                    borderRadius: 2
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Chip
                          label={selectedService.serviceCode || selectedService.code}
                          color="primary"
                          sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                        />
                        <Typography variant="h6" fontWeight={500}>
                          {selectedService.serviceName || selectedService.name}
                        </Typography>
                        <Chip label={LABELS.requiresPA} size="small" color="warning" variant="outlined" />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {LABELS.contractPrice}
                        </Typography>
                        <Typography variant="h4" color="success.main" fontWeight={700}>
                          {selectedService.contractPrice?.toFixed(2) || '0.00'} <small>د.ل</small>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {LABELS.priceReadOnly}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </FormSection>

        {/* ═══════════════════════ ROW 3: DIAGNOSIS & REQUEST DETAILS ═══════════════════════ */}
        <Grid container spacing={3}>
          {/* Diagnosis Section */}
          <Grid item xs={12} md={6}>
            <FormSection>
              <SectionHeader icon={DiagnosisIcon} title={LABELS.diagnosis} subtitle="رمز ووصف التشخيص الطبي" />
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label={LABELS.diagnosisCode}
                  value={diagnosisCode}
                  onChange={(e) => setDiagnosisCode(e.target.value)}
                  placeholder="مثال: J06.9"
                  helperText="أدخل رمز التشخيص حسب تصنيف ICD-10"
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontWeight: 600 }
                  }}
                />
                <TextField
                  fullWidth
                  label={LABELS.diagnosisDescription}
                  value={diagnosisDescription}
                  onChange={(e) => setDiagnosisDescription(e.target.value)}
                  placeholder="وصف التشخيص الطبي..."
                  multiline
                  rows={2}
                />
              </Stack>
            </FormSection>
          </Grid>

          {/* Request Details Section */}
          <Grid item xs={12} md={6}>
            <FormSection>
              <SectionHeader icon={PriorityIcon} title={LABELS.requestDetails} subtitle="أولوية الطلب والملاحظات الطبية" />
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={2.5}>
                <FormControl fullWidth>
                  <InputLabel>{LABELS.priority}</InputLabel>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value)} label={LABELS.priority}>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                          <Chip label={opt.label} size="small" color={opt.color} sx={{ minWidth: 70 }} />
                          <Typography variant="body2" color="text.secondary">
                            {opt.description}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={LABELS.notes}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات طبية إضافية تساعد في مراجعة الطلب..."
                  InputProps={{
                    startAdornment: <NotesIcon color="action" sx={{ mr: 1, mt: 1, alignSelf: 'flex-start' }} />
                  }}
                />
              </Stack>
            </FormSection>
          </Grid>
        </Grid>

        {/* ═══════════════════════ ROW 4: ACTION BUTTONS (Sticky Footer) ═══════════════════════ */}
        <Paper
          elevation={3}
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: 'background.paper',
            position: 'sticky',
            bottom: 16,
            zIndex: 10,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            {/* Left: Form Status */}
            <Stack direction="row" spacing={2} alignItems="center">
              {!isFormValid && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">⚠️ يجب اختيار الخدمة الطبية لتقديم الطلب</Typography>
                </Alert>
              )}
              {isFormValid && (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  <Typography variant="body2">✅ جاهز للتقديم</Typography>
                </Alert>
              )}
            </Stack>

            {/* Right: Action Buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                disabled={submitting}
                sx={{ borderRadius: 2, px: 3 }}
              >
                {LABELS.cancel}
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSubmit}
                disabled={submitting || !isFormValid}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  boxShadow: 2,
                  '&:hover': { boxShadow: 4 }
                }}
              >
                {submitting ? LABELS.submitting : LABELS.submit}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      {/* ═══════════════════════ SUCCESS DIALOG ═══════════════════════ */}
      <SuccessDialog
        open={successDialogOpen}
        onClose={handleSuccessClose}
        title={LABELS.successTitle}
        message={LABELS.successMessage}
        primaryAction={{
          label: 'عرض الطلب',
          onClick: handleViewPreApproval
        }}
        secondaryAction={{
          label: 'العودة لسجل الزيارات',
          onClick: handleSuccessClose
        }}
      />
    </Box>
  );
};

export default ProviderPreApprovalSubmission;
