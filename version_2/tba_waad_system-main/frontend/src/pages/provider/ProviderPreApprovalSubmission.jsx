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
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
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
  Badge as BadgeIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AccountBalance as LimitIcon
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
  pageSubtitle: 'طلب موافقة مسبقة للخدمات الطبية',
  visitRequired: 'يجب الوصول لهذه الصفحة من سجل الزيارات',
  visitInfo: 'بيانات الزيارة',
  memberInfo: 'بيانات المؤمن عليه',
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
  requiresPA: 'تتطلب موافقة مسبقة',
  allServicesShown: 'جميع الخدمات معروضة - الخدمات التي تتطلب موافقة مسبقة تظهر مع علامة 🟡'
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
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'primary', action }) => (
  <Box sx={{ mb: 2.5 }}>
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
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
      {action}
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

/**
 * Contract Price Chip
 */
const ContractPriceChip = ({ loading, price, hasContract, error }) => {
  if (loading) return <CircularProgress size={16} />;
  if (error) return <Chip label={error} color="error" size="small" />;
  if (!hasContract) return <Chip label="لا يوجد عقد" color="warning" size="small" />;
  return (
    <Chip
      icon={<LockIcon fontSize="small" />}
      label={`${Number(price).toLocaleString()} د.ل`}
      color="success"
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
};

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
      if (!visitData.fromVisitLog) {
        console.warn('[PRE-AUTH] Not from visit log, skipping contract load');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('[PRE-AUTH] Loading contract and categories...');

        const contractRes = await axiosClient.get('/api/provider/my-contract');
        if (contractRes.data?.data) {
          setContract(contractRes.data.data);
          console.log('[PRE-AUTH] Contract loaded:', contractRes.data.data);
        }

        const categoriesRes = await axiosClient.get('/api/provider/medical-categories');
        if (categoriesRes.data?.data) {
          setCategories(categoriesRes.data.data);
          console.log('[PRE-AUTH] Categories loaded:', categoriesRes.data.data.length);
        }
      } catch (err) {
        console.error('[PRE-AUTH] Error loading contract data:', err);
        setError('فشل في تحميل بيانات العقد');
      } finally {
        setLoading(false);
      }
    };

    loadContractData();
  }, [visitData.fromVisitLog]);

  // ══════════════════════════════════════════════════════════════════════════════
  // LOAD ALL CONTRACT SERVICES (NO FILTERING)
  // Show ALL services with a Badge indicator for those requiring pre-approval
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadServices = async () => {
      if (!visitData.fromVisitLog) {
        console.warn('[PRE-AUTH] Not from visit log, skipping services load');
        return;
      }

      try {
        setLoadingServices(true);
        console.log('[PRE-AUTH] Loading services...');

        // Get ALL contract services (no filtering by PA requirement)
        const res = await axiosClient.get('/api/provider/my-contract/services', {
          params: { page: 0, size: 500 }
        });

        let rawServices = [];
        if (res.data?.data?.content) {
          rawServices = res.data.data.content;
          console.log('[PRE-AUTH] Services loaded (from content):', rawServices.length);
        } else if (res.data?.data) {
          rawServices = res.data.data;
          console.log('[PRE-AUTH] Services loaded (from data):', rawServices.length);
        } else {
          console.warn('[PRE-AUTH] No services found in response');
        }

        // Normalize service data for consistent access
        const normalizedServices = rawServices.map((item) => ({
          // IDs
          id: item.medicalServiceId || item.serviceId || item.id,
          medicalServiceId: item.medicalServiceId || item.serviceId || item.id,

          // Service info
          serviceCode: item.serviceCode || item.code,
          serviceName: item.serviceName || item.name,
          code: item.serviceCode || item.code,
          name: item.serviceName || item.name,

          // Category info - MULTIPLE FIELDS FOR ROBUSTNESS
          categoryId: item.categoryId || item.serviceCategoryId,
          categoryName: item.categoryName || item.category,
          categoryCode: item.categoryCode,
          category: item.categoryName || item.category,

          // Pricing
          contractPrice: item.contractPrice || item.price,
          price: item.contractPrice || item.price,

          // Pre-approval flags
          requiresPreApproval: item.requiresPreApproval || item.requiresPreAuth || item.requiresPA || false,
          requiresPreAuth: item.requiresPreApproval || item.requiresPreAuth || item.requiresPA || false,

          // Contract
          hasContract: item.hasContract !== false
        }));

        setServices(normalizedServices);
        console.log('[PRE-AUTH] Services normalized:', {
          count: normalizedServices.length,
          sample: normalizedServices.slice(0, 2).map((s) => ({
            id: s.id,
            name: s.name,
            categoryId: s.categoryId,
            categoryName: s.categoryName,
            requiresPA: s.requiresPreApproval
          }))
        });
      } catch (err) {
        console.error('[PRE-AUTH] Error loading services:', err);
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, [visitData.fromVisitLog]);

  // ══════════════════════════════════════════════════════════════════════════════
  // FILTERED SERVICES BY SELECTED CATEGORY
  // Show ALL services in the category (with Badge for PA requirement)
  // ══════════════════════════════════════════════════════════════════════════════
  const filteredServices = useMemo(() => {
    if (!selectedCategory) {
      console.log('[PRE-AUTH] No category selected, returning empty array');
      return [];
    }

    console.log('[PRE-AUTH] Starting filter - Selected category:', {
      id: selectedCategory.id,
      name: selectedCategory.name,
      code: selectedCategory.code
    });

    console.log(
      '[PRE-AUTH] Sample services before filter:',
      services.slice(0, 3).map((s) => ({
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        categoryCode: s.categoryCode,
        category: s.category,
        serviceName: s.serviceName || s.name
      }))
    );

    const filtered = services.filter((s) => {
      // Multiple matching strategies for robustness
      const matchById = s.categoryId === selectedCategory.id;
      const matchByName = (s.categoryName || s.category) === selectedCategory.name;
      const matchByCode = (s.categoryCode || '') === (selectedCategory.code || '');
      const matchByNameLoose = (s.categoryName || s.category || '').toLowerCase().includes((selectedCategory.name || '').toLowerCase());

      return matchById || matchByName || matchByCode || matchByNameLoose;
    });

    console.log('[PRE-AUTH] Filtered services:', {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      totalServices: services.length,
      filteredCount: filtered.length,
      sample: filtered.slice(0, 3).map((s) => ({
        id: s.medicalServiceId || s.id,
        name: s.serviceName || s.name,
        code: s.serviceCode || s.code,
        requiresPA: s.requiresPreApproval || s.requiresPreAuth
      }))
    });

    return filtered;
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
    console.log('[PRE-AUTH] Category changed:', newValue);
    setSelectedCategory(newValue);
    setSelectedService(null);
    // ⚠️ DO NOT CLEAR SERVICES - they are loaded once and filtered by useMemo
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

      const response = await axiosClient.post('/pre-authorizations', payload);

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
                    value={
                      visitData.providerName && visitData.providerName !== '—'
                        ? visitData.providerName
                        : contract?.provider?.name || user?.name || '—'
                    }
                  />
                </Grid>
              </Grid>
            </InfoCard>
          </Grid>

          {/* Member Info Card */}
          <Grid item xs={12} md={6}>
            <InfoCard bgcolor={(theme) => alpha(theme.palette.success.main, 0.04)}>
              <SectionHeader icon={PersonIcon} title={LABELS.memberInfo} subtitle="بيانات المؤمن عليه (للقراءة فقط)" color="success" />
              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <ReadOnlyField icon={PersonIcon} label="اسم المؤمن عليه" value={visitData.memberName} highlight />
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

        {/* ═══════════════════════ ROW 2: SERVICE SELECTION TABLE ═══════════════════════ */}
        <FormSection highlighted>
          <SectionHeader
            icon={MedicalServicesIcon}
            title="الخدمة الطبية المطلوبة"
            subtitle="اختر التصنيف أولاً ثم الخدمة الطبية"
            color="primary"
          />
          <Divider sx={{ mb: 3 }} />

          {/* Info Alert - All Services Shown */}
          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2">📋 {LABELS.allServicesShown}</Typography>
          </Alert>

          {/* Service Selection Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tableHeaderBg }}>
                  <TableCell width="35%" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Chip
                        label="1"
                        size="small"
                        sx={{
                          bgcolor: 'white',
                          color: MEDICAL_COLORS.primary.main,
                          width: 22,
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}
                      />
                      <span>{LABELS.selectCategory}</span>
                    </Stack>
                  </TableCell>
                  <TableCell width="45%" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Chip
                        label="2"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.3)',
                          color: 'white',
                          width: 22,
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}
                      />
                      <span>{LABELS.selectService}</span>
                    </Stack>
                  </TableCell>
                  <TableCell width="20%" align="center" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                      <LockIcon fontSize="small" />
                      <span>السعر</span>
                    </Stack>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  {/* Category Selector (Step 1) */}
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={categories}
                      getOptionLabel={(option) => option?.name || option?.code || ''}
                      value={selectedCategory}
                      loading={loading}
                      onChange={handleCategoryChange}
                      disabled={submitting}
                      isOptionEqualToValue={(option, value) => option?.id === value?.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="اختر التصنيف أولاً..."
                          error={!selectedCategory}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: selectedCategory
                                ? (theme) => alpha(theme.palette.success.main, 0.1)
                                : (theme) => alpha(theme.palette.warning.main, 0.1)
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        // Count services with multiple matching strategies for robustness
                        const serviceCount = services.filter((s) => {
                          const matchById = s.categoryId === option.id;
                          const matchByName = (s.categoryName || s.category) === option.name;
                          const matchByCode = (s.categoryCode || '') === (option.code || '');
                          return matchById || matchByName || matchByCode;
                        }).length;

                        return (
                          <li key={key} {...otherProps}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                              <CategoryIcon fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight="medium">
                                {option.name || option.code}
                              </Typography>
                              <Chip label={`${serviceCount} خدمة`} size="small" color="primary" variant="outlined" />
                            </Stack>
                          </li>
                        );
                      }}
                    />
                  </TableCell>

                  {/* Service Selector (Step 2) */}
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={filteredServices}
                      getOptionLabel={(option) => {
                        const code = option.serviceCode || option.code ? `[${option.serviceCode || option.code}] ` : '';
                        return `${code}${option.serviceName || option.name || ''}`;
                      }}
                      filterOptions={(options, { inputValue }) => {
                        const search = inputValue.toLowerCase();
                        return options.filter(
                          (opt) =>
                            ((opt.serviceCode || opt.code) && (opt.serviceCode || opt.code).toLowerCase().includes(search)) ||
                            ((opt.serviceName || opt.name) && (opt.serviceName || opt.name).toLowerCase().includes(search))
                        );
                      }}
                      value={selectedService}
                      loading={loadingServices}
                      onChange={handleServiceChange}
                      disabled={submitting || !selectedCategory}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={selectedCategory ? 'ابحث برمز الخدمة أو اسمها...' : '⚠️ اختر التصنيف أولاً'}
                          error={selectedCategory && !selectedService}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: !selectedCategory ? 'grey.100' : undefined
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        const requiresPA = option.requiresPreApproval || option.requiresPreAuth || false;

                        return (
                          <li key={key} {...otherProps}>
                            <Stack spacing={0.5} sx={{ width: '100%' }}>
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Chip
                                  label={option.serviceCode || option.code}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }}
                                />
                                <Typography variant="body2" fontWeight="medium">
                                  {option.serviceName || option.name}
                                </Typography>
                                {requiresPA && (
                                  <Chip
                                    label="🟡 تتطلب موافقة مسبقة"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                  />
                                )}
                              </Stack>
                              {(option.contractPrice || option.price) && (
                                <Typography variant="caption" color="success.main">
                                  💰 سعر العقد: {Number(option.contractPrice || option.price).toLocaleString()} د.ل
                                </Typography>
                              )}
                            </Stack>
                          </li>
                        );
                      }}
                    />
                  </TableCell>

                  {/* Price */}
                  <TableCell align="center">
                    <ContractPriceChip
                      loading={loadingServices}
                      price={selectedService?.contractPrice || selectedService?.price || 0}
                      hasContract={!!selectedService}
                      error={null}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} icon={<LockIcon />}>
            <Typography variant="body2">{LABELS.priceReadOnly}</Typography>
          </Alert>
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
