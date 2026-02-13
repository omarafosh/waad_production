/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║       PROVIDER CLAIMS SUBMISSION - Visit-Centric Canonical Architecture      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  REBUILD: 2026-01-16                                                         ║
 * ║  REDESIGNED: 2026-01-29 - Desktop-First Professional UX                      ║
 * ║  ARCHITECTURAL LAWS ENFORCED:                                                ║
 * ║  ❌ No claim without Visit (visitId is MANDATORY)                            ║
 * ║  ❌ No free-text service (must select from dropdown)                         ║
 * ║  ❌ No manual price entry (price comes from Provider Contract)               ║
 * ║  ✅ Data Flow: Visit → Member → Contract → Services → Prices → Claim         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
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
  Delete as DeleteIcon,
  Person as PersonIcon,
  MedicalServices as MedicalServicesIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  CreditCard as CardIcon,
  LocalHospital as VisitIcon,
  Lock as LockIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Attachment as AttachmentIcon,
  CloudUpload as UploadIcon,
  Category as CategoryIcon,
  Healing as HealingIcon,
  Description as DiagnosisIcon,
  Notes as NotesIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  AccountBalance as LimitIcon,
  Receipt as ReceiptIcon
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
  pageTitle: 'إنشاء مطالبة',
  pageSubtitle: 'تقديم مطالبة تأمينية من سجل الزيارات',
  visitRequired: 'يجب الوصول لهذه الصفحة من سجل الزيارات',
  visitInfo: 'بيانات الزيارة',
  memberInfo: 'بيانات المستفيد',
  serviceLines: 'الخدمات الطبية المطالب بها',
  addService: 'إضافة خدمة',
  selectCategory: 'التصنيف الطبي',
  selectService: 'الخدمة الطبية',
  quantity: 'الكمية',
  unitPrice: 'سعر الوحدة',
  totalPrice: 'الإجمالي',
  noServices: 'أضف خدمة واحدة على الأقل للمتابعة',
  noContract: 'لا يوجد عقد لهذه الخدمة',
  diagnosis: 'بيانات التشخيص',
  diagnosisCode: 'رمز التشخيص (ICD-10)',
  diagnosisDescription: 'وصف التشخيص',
  notes: 'ملاحظات طبية',
  submit: 'تقديم المطالبة',
  submitting: 'جاري التقديم...',
  cancel: 'إلغاء',
  back: 'رجوع',
  totalClaimAmount: 'إجمالي المطالبة',
  remainingLimit: 'الحد المتبقي',
  annualLimit: 'الحد السنوي',
  usedAmount: 'المستخدم',
  priceReadOnly: 'السعر محدد تلقائياً من عقد مقدم الخدمة',
  attachments: 'المرفقات والمستندات',
  attachmentHint: 'يمكنك إرفاق التقارير الطبية، الفواتير، أو المستندات الداعمة',
  selectFiles: 'اختر ملفات للرفع',
  uploadingFiles: 'جاري رفع الملفات...',
  coverageInfo: 'معلومات التغطية'
};

const VISIT_TYPE_LABELS = {
  OUTPATIENT: 'عيادة خارجية',
  INPATIENT: 'تنويم',
  EMERGENCY: 'طوارئ',
  DENTAL: 'أسنان',
  OPTICAL: 'بصريات',
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
  if (!hasContract) return <Chip label={LABELS.noContract} color="warning" size="small" />;
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
// BLOCKED ACCESS PAGE
// ══════════════════════════════════════════════════════════════════════════════
const BlockedAccessPage = ({ onBack }) => (
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
        يرجى الانتقال إلى سجل الزيارات واختيار زيارة لإنشاء مطالبة منها.
      </Typography>
      <Button variant="contained" size="large" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ borderRadius: 2, px: 4 }}>
        الذهاب إلى سجل الزيارات
      </Button>
    </Card>
  </Box>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function ProviderClaimsSubmission() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME (MEDICAL THEME)
  // ═══════════════════════════════════════════════════════════════════════════
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tableHeaderBg = isDark ? '#1E3A5F' : MEDICAL_COLORS.primary.main;
  const tableHeaderColor = '#FFFFFF';

  // ═══════════════════════════════════════════════════════════════════════════
  // VISIT CONTEXT (FROM STATE OR URL PARAMS - supports refresh)
  // ═══════════════════════════════════════════════════════════════════════════
  const fromVisitLog = location.state?.fromVisitLog || searchParams.get('fromVisitLog') === 'true';
  const linkedVisitId = location.state?.visitId || searchParams.get('visitId') ? parseInt(searchParams.get('visitId')) : null;
  const linkedMemberId = location.state?.memberId || searchParams.get('memberId') ? parseInt(searchParams.get('memberId')) : null;
  const linkedMemberName = location.state?.memberName || searchParams.get('memberName') || null;
  const linkedMemberCivilId = location.state?.memberCivilId || searchParams.get('memberCivilId') || null;
  const linkedMemberCardNumber = location.state?.memberCardNumber || searchParams.get('cardNumber') || null;
  const linkedEmployerName = location.state?.employerName || searchParams.get('employer') || null;
  const linkedMemberPhone = location.state?.memberPhone || searchParams.get('phone') || null;
  const linkedVisitDate = location.state?.visitDate || searchParams.get('visitDate') || null;
  const linkedVisitTime = location.state?.visitTime || searchParams.get('visitTime') || null;
  const linkedVisitType = location.state?.visitType || searchParams.get('visitType') || null;
  const linkedProviderName = location.state?.providerName || searchParams.get('providerName') || null;

  // SUPER_ADMIN check
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

  // ARCHITECTURAL ENFORCEMENT: Block direct access (SUPER_ADMIN can bypass)
  const accessBlocked = !linkedVisitId && !isSuperAdmin;

  // Provider from user session
  const userProviderId = user?.providerId || null;
  const userProviderName = user?.providerName || null;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Visit details loaded from backend
  const [visitDetails, setVisitDetails] = useState(null);

  // Member remaining limit
  const [memberLimit, setMemberLimit] = useState(null);

  // Medical services from Provider Contract
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Medical Categories
  const [medicalCategories, setMedicalCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Claim Lines
  const [claimLines, setClaimLines] = useState([]);
  const [lineIdCounter, setLineIdCounter] = useState(1);

  // Form Data
  const [formData, setFormData] = useState({
    diagnosisCode: '',
    diagnosisDescription: '',
    doctorName: '',
    notes: '',
    preAuthorizationId: ''
  });

  // Attachments State
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (linkedVisitId && !accessBlocked) {
      initializePage();
    }
  }, [linkedVisitId, accessBlocked]);

  const initializePage = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchVisitDetails(),
        fetchAvailableServices(),
        fetchMemberLimit(),
        fetchMedicalCategories()
      ]);

      results.forEach((result, index) => {
        const names = ['Visit Details', 'Services', 'Member Limit', 'Medical Categories'];
        if (result.status === 'rejected') {
          console.warn(`Failed to load ${names[index]}:`, result.reason);
        }
      });
    } catch (err) {
      console.error('Initialization error:', err);
      setError('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await axiosClient.get('/api/provider/medical-categories');
      const categories = response.data?.data || response.data || [];
      setMedicalCategories(categories);
    } catch (err) {
      console.error('Failed to fetch medical categories:', err);
      setMedicalCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchVisitDetails = async () => {
    if (!linkedVisitId) return;
    try {
      const response = await axiosClient.get(`/provider/visits/${linkedVisitId}`);
      setVisitDetails(response.data?.data || response.data);
    } catch (err) {
      console.error('Failed to fetch visit:', err);
    }
  };

  const fetchAvailableServices = async () => {
    setLoadingServices(true);
    try {
      const response = await axiosClient.get('/provider/my-contract/services', {
        params: { size: 2000 }
      });

      const data = response.data?.data || response.data;
      const items = data?.content || data?.items || data || [];

      if (items.length === 0) {
        setAvailableServices([]);
        return;
      }

      setAvailableServices(
        items.map((item) => {
          const serviceId = item.medicalServiceId || item.id;
          return {
            id: serviceId,
            code: item.serviceCode,
            name: item.serviceName,
            category: item.categoryName || '',
            categoryCode: item.categoryCode || '',
            requiresPA: item.requiresPA || item.requiresPreAuth || false,
            price: item.contractPrice,
            basePrice: item.basePrice,
            contractId: item.contractId,
            hasContract: item.hasContract !== false
          };
        })
      );
    } catch (err) {
      console.error('Failed to fetch services:', err);

      try {
        const response = await axiosClient.get('/provider/my-services');
        const services = response.data?.data || response.data || [];
        setAvailableServices(
          services.map((s) => ({
            id: s.serviceId || s.id,
            code: s.service_code || s.serviceCode || s.code,
            name: s.service_name || s.serviceName || s.name,
            category: s.category_name || s.categoryName || s.category || '',
            categoryCode: s.category_code || s.categoryCode || '',
            requiresPA: s.requires_pre_auth ?? s.requiresPreAuth ?? s.requiresPA ?? false,
            hasContract: true
          }))
        );
      } catch (fallbackErr) {
        setAvailableServices([]);
      }
    } finally {
      setLoadingServices(false);
    }
  };

  // Filter services by category (and exclude PA-required services for claims)
  // Backend returns 'requiresPreAuth' from ContractServiceDto
  // Claims should ONLY show services where requiresPreAuth === false
  const filteredServices = useMemo(() => {
    return availableServices.filter((s) => s.requiresPA !== true && s.requiresPreAuth !== true);
  }, [availableServices]);

  const fetchMemberLimit = async () => {
    if (!linkedMemberId) return;
    try {
      const response = await axiosClient.get(`/members/${linkedMemberId}/remaining-limit`);
      setMemberLimit(response.data?.data || response.data);
    } catch (err) {
      console.error('Failed to fetch member limit:', err);
      setMemberLimit(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACT PRICE RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchContractPrice = useCallback(
    async (serviceCode, lineId) => {
      if (!userProviderId || !serviceCode) return;

      const cachedService = availableServices.find((s) => s.code === serviceCode);
      if (cachedService && cachedService.hasContract && cachedService.price !== undefined) {
        setClaimLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? {
                ...line,
                unitPrice: cachedService.price,
                hasContract: true,
                loadingPrice: false,
                priceError: null
              }
              : line
          )
        );
        return;
      }

      setClaimLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, loadingPrice: true, priceError: null } : line)));

      try {
        const response = await axiosClient.get(`/provider/my-services/${serviceCode}/price`);
        const priceData = response.data?.data || response.data;

        if (priceData.hasContract && priceData.contractPrice != null) {
          setClaimLines((prev) =>
            prev.map((line) =>
              line.id === lineId
                ? {
                  ...line,
                  unitPrice: priceData.contractPrice,
                  hasContract: true,
                  loadingPrice: false
                }
                : line
            )
          );
        } else {
          setClaimLines((prev) =>
            prev.map((line) =>
              line.id === lineId
                ? {
                  ...line,
                  unitPrice: 0,
                  hasContract: false,
                  loadingPrice: false,
                  priceError: LABELS.noContract
                }
                : line
            )
          );
        }
      } catch (err) {
        setClaimLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? {
                ...line,
                unitPrice: 0,
                hasContract: false,
                loadingPrice: false,
                priceError: LABELS.noContract
              }
              : line
          )
        );
      }
    },
    [userProviderId, availableServices]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAIM LINE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const addClaimLine = () => {
    setClaimLines((prev) => [
      ...prev,
      {
        id: lineIdCounter,
        medicalCategoryId: null,
        medicalCategoryName: '',
        medicalServiceId: null,
        serviceName: '',
        serviceCode: '',
        quantity: 1,
        unitPrice: 0,
        hasContract: false,
        loadingPrice: false,
        priceError: null,
        requiresPA: false,
        filteredServices: []
      }
    ]);
    setLineIdCounter((prev) => prev + 1);
  };

  const removeClaimLine = (lineId) => {
    setClaimLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const updateClaimLine = (lineId, field, value) => {
    setClaimLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)));
  };

  const handleLineCategoryChange = async (lineId, category) => {
    if (!category) {
      setClaimLines((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? {
              ...line,
              medicalCategoryId: null,
              medicalCategoryName: '',
              medicalServiceId: null,
              serviceName: '',
              serviceCode: '',
              unitPrice: 0,
              hasContract: false,
              filteredServices: [],
              priceError: null
            }
            : line
        )
      );
      return;
    }

    const categoryServices = availableServices.filter((s) => {
      const matchesCategory = s.category === category.name || s.categoryCode === category.code;
      // Exclude services that require pre-authorization
      const isPARequired = s.requiresPA === true || s.requiresPreAuth === true;
      return matchesCategory && !isPARequired;
    });

    setClaimLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
            ...line,
            medicalCategoryId: category.id,
            medicalCategoryName: category.name,
            medicalServiceId: null,
            serviceName: '',
            serviceCode: '',
            unitPrice: 0,
            hasContract: false,
            filteredServices: categoryServices,
            priceError: null
          }
          : line
      )
    );
  };

  const handleServiceSelect = (lineId, service) => {
    if (!service) {
      updateClaimLine(lineId, 'medicalServiceId', null);
      updateClaimLine(lineId, 'serviceName', '');
      updateClaimLine(lineId, 'serviceCode', '');
      updateClaimLine(lineId, 'unitPrice', 0);
      updateClaimLine(lineId, 'hasContract', false);
      updateClaimLine(lineId, 'requiresPA', false);
      return;
    }

    const currentLine = claimLines.find((l) => l.id === lineId);
    if (!currentLine?.medicalCategoryId) {
      return;
    }

    const hasContractPrice = service.hasContract !== false && service.price !== undefined && service.price !== null;

    setClaimLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
            ...line,
            medicalServiceId: service.id,
            serviceName: service.name,
            serviceCode: service.code,
            unitPrice: hasContractPrice ? service.price : 0,
            hasContract: hasContractPrice,
            loadingPrice: false,
            priceError: hasContractPrice ? null : LABELS.noContract,
            requiresPA: service.requiresPA || false
          }
          : line
      )
    );

    if (!hasContractPrice) {
      fetchContractPrice(service.code, lineId);
    }
  };

  // Calculate totals
  const calculateLineTotal = (line) => (line.unitPrice || 0) * (line.quantity || 1);
  const totalClaimAmount = claimLines.reduce((sum, line) => sum + calculateLineTotal(line), 0);

  // Validation checks
  const linesWithoutCategory = claimLines.filter((line) => !line.medicalCategoryId);
  const hasCategoryViolation = linesWithoutCategory.length > 0;
  const isFormValid = claimLines.length > 0 && !hasCategoryViolation && claimLines.every((l) => l.medicalServiceId && l.hasContract);

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map((file) => ({
      file,
      type: 'MEDICAL_REPORT'
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
    event.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileTypeChange = (index, type) => {
    setPendingFiles((prev) => prev.map((f, i) => (i === index ? { ...f, type } : f)));
  };

  const uploadAttachments = async (claimId) => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const { file, type } of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachmentType', type);

        await axiosClient.post(`/claims/${claimId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploaded++;
        setUploadProgress(Math.round((uploaded / pendingFiles.length) * 100));
      } catch (err) {
        console.error('Failed to upload file:', file.name, err);
      }
    }

    setUploading(false);
    setUploadProgress(0);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFormChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validateForm = () => {
    if (!linkedVisitId) {
      setError('لا يوجد رقم زيارة مرتبط');
      return false;
    }

    if (claimLines.length === 0) {
      setError('يجب إضافة خدمة واحدة على الأقل');
      return false;
    }

    const linesWithoutCategory = claimLines.filter((line) => !line.medicalCategoryId);
    if (linesWithoutCategory.length > 0) {
      setError('🚫 يجب اختيار التصنيف الطبي لجميع الخدمات');
      return false;
    }

    const invalidLines = claimLines.filter((line) => !line.medicalServiceId || !line.hasContract);
    if (invalidLines.length > 0) {
      setError('بعض الخدمات غير صالحة أو غير موجودة في العقد');
      return false;
    }

    if (claimLines.some((l) => l.requiresPA) && !formData.preAuthorizationId) {
      setError('يجب إدخال رقم الموافقة المسبقة لأن المطالبة تحتوي على خدمات تتطلب موافقة');
      return false;
    }

    if (pendingFiles.length === 0) {
      setError('يجب إرفاق ملف واحد على الأقل (تقرير طبي أو فاتورة) لتقديم المطالبة');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        visitId: parseInt(linkedVisitId),
        memberId: parseInt(linkedMemberId),
        providerId: userProviderId,
        preAuthorizationId: formData.preAuthorizationId || null,
        diagnosisCode: formData.diagnosisCode || null,
        diagnosisDescription: formData.diagnosisDescription || null,
        doctorName: formData.doctorName || null,
        serviceDate: linkedVisitDate || visitDetails?.visitDate || null,
        notes: formData.notes || null,
        lines: claimLines.map((line) => ({
          medicalServiceId: line.medicalServiceId,
          serviceCategoryId: line.medicalCategoryId,
          serviceCategoryName: line.medicalCategoryName,
          quantity: line.quantity || 1
        }))
      };

      const response = await axiosClient.post('/claims', payload);
      const result = response.data?.data || response.data;
      const claimId = result.id;

      if (pendingFiles.length > 0 && claimId) {
        await uploadAttachments(claimId);
      }

      await axiosClient.post(`/claims/${claimId}/submit`);

      setSuccess({
        message: 'تم تقديم المطالبة للمراجعة بنجاح',
        claimId: claimId,
        referenceNumber: result.claimNumber || result.referenceNumber,
        attachmentsCount: pendingFiles.length
      });
    } catch (err) {
      console.error('Submit error:', err);
      const errorData = err.response?.data;
      let errorMsg = 'فشل في تقديم المطالبة';

      if (errorData) {
        if (errorData.message) errorMsg = errorData.message;
        else if (errorData.error) errorMsg = errorData.error;
        else if (typeof errorData === 'string') errorMsg = errorData;
      }

      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = useCallback(() => {
    navigate('/provider/visits');
  }, [navigate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - BLOCKED ACCESS
  // ═══════════════════════════════════════════════════════════════════════════
  if (accessBlocked) {
    return <BlockedAccessPage onBack={handleBack} />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - MAIN PAGE (Desktop-First Layout)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* ═══════════════════════ PAGE HEADER ═══════════════════════ */}
      <ModernPageHeader
        title={LABELS.pageTitle}
        subtitle={LABELS.pageSubtitle}
        icon={ReceiptIcon}
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

      {/* Success Dialog */}
      <SuccessDialog
        open={!!success}
        type="claim"
        title="تم تقديم المطالبة بنجاح! 🎉"
        subtitle="تم إرسال المطالبة للمراجعة من قبل فريق التأمين"
        referenceNumber={success?.referenceNumber || success?.claimId}
        attachmentsCount={success?.attachmentsCount || 0}
        redirectPath="/provider/visits"
        redirectLabel="العودة لسجل الزيارات"
        countdownSeconds={5}
        viewDetailsPath={success?.claimId ? `/claims/${success.claimId}` : null}
        additionalInfo={[
          { label: 'المستفيد', value: linkedMemberName || '—' },
          { label: 'عدد الخدمات', value: `${claimLines.length} خدمة` }
        ]}
      />

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
                  <ReadOnlyField icon={BadgeIcon} label="رقم الزيارة" value={`#${linkedVisitId}`} highlight />
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField icon={CalendarIcon} label="تاريخ الزيارة" value={linkedVisitDate || visitDetails?.visitDate} />
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
                      label={VISIT_TYPE_LABELS[linkedVisitType] || linkedVisitType || 'غير محدد'}
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
                    value={linkedProviderName || userProviderName || visitDetails?.providerName}
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
                  <ReadOnlyField icon={PersonIcon} label="اسم المستفيد" value={linkedMemberName} highlight />
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField label="الرقم المدني" value={linkedMemberCivilId} />
                </Grid>
                <Grid item xs={6}>
                  <ReadOnlyField icon={CardIcon} label="رقم البطاقة التأمينية" value={linkedMemberCardNumber} />
                </Grid>
                <Grid item xs={12}>
                  <ReadOnlyField icon={BusinessIcon} label="جهة العمل / الوثيقة" value={linkedEmployerName} />
                </Grid>
              </Grid>

              {/* Member Limit Info */}
              {memberLimit && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08), p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                      <LimitIcon color="warning" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        {LABELS.coverageInfo}
                      </Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {LABELS.annualLimit}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {Number(memberLimit.annualLimit || 0).toLocaleString()} د.ل
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {LABELS.usedAmount}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="error.main">
                          {Number(memberLimit.usedAmount || 0).toLocaleString()} د.ل
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {LABELS.remainingLimit}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {Number(memberLimit.remainingLimit || 0).toLocaleString()} د.ل
                        </Typography>
                      </Grid>
                    </Grid>
                    <LinearProgress
                      variant="determinate"
                      value={memberLimit.usagePercentage || 0}
                      color={memberLimit.usagePercentage >= 80 ? 'error' : 'success'}
                      sx={{ mt: 1.5, height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </>
              )}
            </InfoCard>
          </Grid>
        </Grid>

        {/* ═══════════════════════ ROW 2: SERVICE LINES ═══════════════════════ */}
        <FormSection highlighted>
          <SectionHeader
            icon={MedicalServicesIcon}
            title={LABELS.serviceLines}
            subtitle="اختر التصنيف أولاً ثم الخدمة الطبية لكل سطر"
            color="primary"
            action={
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={addClaimLine}
                disabled={submitting || success}
                sx={{ borderRadius: 2 }}
              >
                {LABELS.addService}
              </Button>
            }
          />
          <Divider sx={{ mb: 3 }} />

          {/* Category Violation Warning */}
          {hasCategoryViolation && claimLines.length > 0 && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
              ⚠️ يجب اختيار التصنيف الطبي لكل خدمة قبل اختيار الخدمة نفسها
            </Alert>
          )}

          {claimLines.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">{LABELS.noServices}</Typography>
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: tableHeaderBg }}>
                    <TableCell width="25%" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
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
                    <TableCell width="25%" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
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
                    <TableCell width="10%" align="center" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
                      {LABELS.quantity}
                    </TableCell>
                    <TableCell width="15%" align="center" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
                      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                        <LockIcon fontSize="small" />
                        <span>{LABELS.unitPrice}</span>
                      </Stack>
                    </TableCell>
                    <TableCell width="15%" align="center" sx={{ color: tableHeaderColor, fontWeight: 600 }}>
                      {LABELS.totalPrice}
                    </TableCell>
                    <TableCell width="10%" align="center" sx={{ color: tableHeaderColor }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {claimLines.map((line) => (
                    <TableRow key={line.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      {/* Category Selector (Step 1) */}
                      <TableCell>
                        <Autocomplete
                          size="small"
                          options={medicalCategories}
                          getOptionLabel={(option) => option?.name || ''}
                          value={medicalCategories.find((c) => c.id === line.medicalCategoryId) || null}
                          loading={loadingCategories}
                          onChange={(_, value) => handleLineCategoryChange(line.id, value)}
                          disabled={submitting || success}
                          isOptionEqualToValue={(option, value) => option?.id === value?.id}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="اختر التصنيف أولاً..."
                              error={!line.medicalCategoryId && claimLines.length > 0}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: line.medicalCategoryId
                                    ? (theme) => alpha(theme.palette.success.main, 0.1)
                                    : (theme) => alpha(theme.palette.warning.main, 0.1)
                                }
                              }}
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            const serviceCount = availableServices.filter(
                              (s) => s.category === option.name || s.categoryCode === option.code
                            ).length;
                            return (
                              <li key={key} {...otherProps}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                  <CategoryIcon fontSize="small" color="primary" />
                                  <Typography variant="body2" fontWeight="medium">
                                    {option.name}
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
                          options={line.filteredServices || []}
                          getOptionLabel={(option) => {
                            const code = option.code ? `[${option.code}] ` : '';
                            return `${code}${option.name || ''}`;
                          }}
                          filterOptions={(options, { inputValue }) => {
                            const search = inputValue.toLowerCase();
                            return options.filter(
                              (opt) =>
                                (opt.code && opt.code.toLowerCase().includes(search)) ||
                                (opt.name && opt.name.toLowerCase().includes(search))
                            );
                          }}
                          value={
                            line.medicalServiceId ? (line.filteredServices || []).find((s) => s.id === line.medicalServiceId) || null : null
                          }
                          loading={loadingServices}
                          onChange={(_, value) => handleServiceSelect(line.id, value)}
                          disabled={submitting || success || !line.medicalCategoryId}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={line.medicalCategoryId ? 'ابحث برمز الخدمة أو اسمها...' : '⚠️ اختر التصنيف أولاً'}
                              error={line.medicalCategoryId && !line.medicalServiceId}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: !line.medicalCategoryId ? 'grey.100' : undefined
                                }
                              }}
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            return (
                              <li key={key} {...otherProps}>
                                <Stack spacing={0.5} sx={{ width: '100%' }}>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Chip
                                      label={option.code}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }}
                                    />
                                    <Typography variant="body2" fontWeight="medium">
                                      {option.name}
                                    </Typography>
                                  </Stack>
                                  {option.price && (
                                    <Typography variant="caption" color="success.main">
                                      💰 سعر العقد: {Number(option.price).toLocaleString()} د.ل
                                    </Typography>
                                  )}
                                </Stack>
                              </li>
                            );
                          }}
                        />
                      </TableCell>

                      {/* Quantity */}
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={line.quantity}
                          onChange={(e) => updateClaimLine(line.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={submitting || success}
                          inputProps={{ min: 1, style: { textAlign: 'center' } }}
                          sx={{ width: 70 }}
                        />
                      </TableCell>

                      {/* Unit Price */}
                      <TableCell align="center">
                        <ContractPriceChip
                          loading={line.loadingPrice}
                          price={line.unitPrice}
                          hasContract={line.hasContract}
                          error={line.priceError}
                        />
                      </TableCell>

                      {/* Line Total */}
                      <TableCell align="center">
                        <Typography fontWeight="bold" color="primary.main">
                          {calculateLineTotal(line).toLocaleString()} د.ل
                        </Typography>
                      </TableCell>

                      {/* Delete */}
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => removeClaimLine(line.id)} disabled={submitting || success}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total Row */}
                  <TableRow sx={{ bgcolor: isDark ? alpha(MEDICAL_COLORS.primary.main, 0.15) : alpha(MEDICAL_COLORS.primary.main, 0.1) }}>
                    <TableCell colSpan={4} align="left">
                      <Typography variant="h6" fontWeight={700}>
                        {LABELS.totalClaimAmount}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="h5" color="primary.main" fontWeight={700}>
                        {totalClaimAmount.toLocaleString()} د.ل
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} icon={<LockIcon />}>
            <Typography variant="body2">{LABELS.priceReadOnly}</Typography>
          </Alert>
        </FormSection>

        {/* ═══════════════════════ ROW 3: DIAGNOSIS & ATTACHMENTS ═══════════════════════ */}
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
                  value={formData.diagnosisCode}
                  onChange={handleFormChange('diagnosisCode')}
                  disabled={submitting || success}
                  placeholder="مثال: J06.9"
                  helperText="أدخل رمز التشخيص حسب تصنيف ICD-10"
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontWeight: 600 }
                  }}
                />
                <TextField
                  fullWidth
                  label={LABELS.diagnosisDescription}
                  value={formData.diagnosisDescription}
                  onChange={handleFormChange('diagnosisDescription')}
                  disabled={submitting || success}
                  placeholder="وصف التشخيص الطبي..."
                  multiline
                  rows={2}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label={LABELS.notes}
                  value={formData.notes}
                  onChange={handleFormChange('notes')}
                  disabled={submitting || success}
                  placeholder="أدخل أي ملاحظات طبية إضافية..."
                  InputProps={{
                    startAdornment: <NotesIcon color="action" sx={{ mr: 1, mt: 1, alignSelf: 'flex-start' }} />
                  }}
                />
              </Stack>
            </FormSection>
          </Grid>

          {/* Attachments Section */}
          <Grid item xs={12} md={6}>
            <FormSection>
              <SectionHeader icon={AttachmentIcon} title={LABELS.attachments} subtitle="المستندات الداعمة للمطالبة" color="warning" />
              <Divider sx={{ mb: 3 }} />

              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                {LABELS.attachmentHint}
              </Alert>

              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<UploadIcon />}
                disabled={submitting || success}
                sx={{
                  height: 80,
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderRadius: 2,
                  mb: 2
                }}
              >
                {LABELS.selectFiles}
                <input type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileSelect} />
              </Button>

              {pendingFiles.length > 0 && (
                <Stack spacing={1}>
                  {pendingFiles.map((item, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <AttachmentIcon color="action" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap fontWeight={500}>
                            {item.file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                        <TextField
                          select
                          size="small"
                          value={item.type}
                          onChange={(e) => handleFileTypeChange(index, e.target.value)}
                          SelectProps={{ native: true }}
                          sx={{ width: 130 }}
                        >
                          <option value="MEDICAL_REPORT">تقرير طبي</option>
                          <option value="INVOICE">فاتورة</option>
                          <option value="LAB_RESULT">نتائج مختبر</option>
                          <option value="XRAY">أشعة</option>
                          <option value="PRESCRIPTION">وصفة طبية</option>
                          <option value="OTHER">أخرى</option>
                        </TextField>
                        <IconButton size="small" color="error" onClick={() => handleRemoveFile(index)} disabled={submitting || success}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    📎 سيتم رفع {pendingFiles.length} ملف عند تقديم المطالبة
                  </Typography>
                </Stack>
              )}

              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1 }} />
                  <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={0.5}>
                    {LABELS.uploadingFiles} {uploadProgress}%
                  </Typography>
                </Box>
              )}
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
              {claimLines.length === 0 && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">⚠️ أضف خدمة واحدة على الأقل</Typography>
                </Alert>
              )}
              {claimLines.length > 0 && !isFormValid && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">⚠️ أكمل بيانات الخدمات</Typography>
                </Alert>
              )}
              {claimLines.length > 0 && isFormValid && pendingFiles.length === 0 && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="body2">⚠️ أرفق ملف واحد على الأقل</Typography>
                </Alert>
              )}
              {isFormValid && pendingFiles.length > 0 && (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    ✅ جاهز للتقديم • {claimLines.length} خدمة • {totalClaimAmount.toLocaleString()} د.ل
                  </Typography>
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
              {!success && (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  onClick={handleSubmit}
                  disabled={submitting || claimLines.length === 0}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {submitting ? LABELS.submitting : LABELS.submit}
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
