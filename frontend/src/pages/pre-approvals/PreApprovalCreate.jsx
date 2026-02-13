import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Grid,
  TextField,
  Stack,
  Alert,
  Typography,
  Chip,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Autocomplete,
  Paper,
  Skeleton,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Avatar,
  Tooltip,
  Collapse,
  LinearProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack,
  AssignmentTurnedIn as PreApprovalIcon,
  Lock as LockIcon,
  Block as BlockIcon,
  Person as PersonIcon,
  LocalHospital as VisitIcon,
  MedicalServices as MedicalIcon,
  CreditCard as CardIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Attachment as AttachmentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CloudUpload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  MonetizationOn as MoneyIcon,
  Edit as EditIcon,
  CheckCircleOutline as CheckOutlineIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import FileUploader from 'components/upload/FileUploader';
import AttachmentList from 'components/upload/AttachmentList';
import MedicalServicePicker from 'components/MedicalServicePicker';
import SuccessDialog from 'components/SuccessDialog';
import { useAuth } from 'contexts/AuthContext';
import { useCreatePreApproval } from 'hooks/usePreApprovals';
import axiosClient from 'utils/axios';
import {
  getActiveContractByProvider,
  getContractPricingItems,
  getMyActiveContract,
  getMyContractServices
} from 'services/api/provider-contracts.service';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pre-Approval Create Page - MODERN MEDICAL SYSTEM (2026-01-16)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * ✅ Multi-service selection with quantities
 * ✅ Complete member info (card, employer, contact)
 * ✅ Complete visit info (time, provider, location)
 * ✅ File upload BEFORE submission
 * ✅ Modern, flexible UI like healthcare systems
 * ✅ ICD-10 diagnosis support
 * ✅ Contract-based pricing (read-only)
 */

// ========================= STYLED COMPONENTS =========================

const InfoCard = ({ icon: Icon, title, children, color = 'primary', expanded = true, collapsible = false }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: `${color}.light`,
        borderRadius: 2,
        overflow: 'visible',
        mb: 2
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          bgcolor: `${color}.lighter`,
          borderBottom: isExpanded ? '1px solid' : 'none',
          borderColor: `${color}.light`,
          cursor: collapsible ? 'pointer' : 'default'
        }}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 36, height: 36 }}>
            <Icon sx={{ fontSize: 20 }} />
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold" color={`${color}.dark`}>
            {title}
          </Typography>
        </Stack>
        {collapsible && (
          <IconButton size="small">
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>
      <Collapse in={isExpanded}>
        <CardContent sx={{ p: 2.5 }}>
          {children}
        </CardContent>
      </Collapse>
    </Card>
  );
};

const DataField = ({ icon: Icon, label, value, highlight = false, fullWidth = false }) => (
  <Grid size={{ xs: 12, sm: fullWidth ? 12 : 6, md: fullWidth ? 12 : 4 }}>
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      {Icon && (
        <Avatar sx={{ bgcolor: highlight ? 'primary.lighter' : 'grey.100', width: 32, height: 32 }}>
          <Icon sx={{ fontSize: 16, color: highlight ? 'primary.main' : 'grey.600' }} />
        </Avatar>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={highlight ? 600 : 500}
          color={highlight ? 'primary.main' : 'text.primary'}
          sx={{ wordBreak: 'break-word' }}
        >
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  </Grid>
);

// ========================= SERVICE ITEM ROW =========================

const ServiceRow = ({ service, index, onRemove, onQuantityChange }) => (
  <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
    <TableCell sx={{ fontWeight: 500 }}>{index + 1}</TableCell>
    <TableCell>
      <Stack>
        <Typography variant="body2" fontWeight="bold">{service.code}</Typography>
        <Typography variant="caption" color="text.secondary">{service.category || 'عام'}</Typography>
      </Stack>
    </TableCell>
    <TableCell>
      <Typography variant="body2">{service.name}</Typography>
    </TableCell>
    <TableCell align="center">
      <TextField
        type="number"
        size="small"
        value={service.quantity || 1}
        onChange={(e) => onQuantityChange(index, Math.max(1, parseInt(e.target.value) || 1))}
        inputProps={{ min: 1, max: 99, style: { textAlign: 'center', width: 50 } }}
      />
    </TableCell>
    <TableCell align="right">
      <Chip
        label={`${Number(service.price || 0).toLocaleString()} د.ل`}
        color="success"
        size="small"
        icon={<LockIcon sx={{ fontSize: 14 }} />}
      />
    </TableCell>
    <TableCell align="right">
      <Typography variant="body2" fontWeight="bold" color="primary">
        {Number((service.price || 0) * (service.quantity || 1)).toLocaleString()} د.ل
      </Typography>
    </TableCell>
    <TableCell align="center">
      <IconButton size="small" color="error" onClick={() => onRemove(index)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </TableCell>
  </TableRow>
);

// ========================= MAIN COMPONENT =========================
const PreApprovalCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { create, creating, error } = useCreatePreApproval();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // ========================= USER ROLE DETECTION =========================
  const isProviderUser = user?.roles?.includes('PROVIDER');
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  const userProviderId = user?.providerId || null;
  const userProviderName = user?.providerName || null;

  // ========================= VISIT CONTEXT (FROM STATE OR URL PARAMS) =========================
  // Support both location.state (navigation) and URL params (direct link / refresh)
  const fromVisitLog = location.state?.fromVisitLog || searchParams.get('fromVisitLog') === 'true';
  const linkedVisitId = location.state?.visitId || searchParams.get('visitId') ? parseInt(searchParams.get('visitId')) : null;
  const linkedMemberId = location.state?.memberId || searchParams.get('memberId') ? parseInt(searchParams.get('memberId')) : null;
  const linkedMemberName = location.state?.memberName || searchParams.get('memberName') || null;
  const linkedMemberCivilId = location.state?.memberCivilId || searchParams.get('memberCivilId') || null;
  const linkedMemberCardNumber = location.state?.memberCardNumber || location.state?.cardNumber || searchParams.get('cardNumber') || null;
  const linkedEmployerName = location.state?.employerName || location.state?.employer || searchParams.get('employer') || null;
  const linkedMemberPhone = location.state?.memberPhone || location.state?.phone || searchParams.get('phone') || null;
  const linkedMemberEmail = location.state?.memberEmail || location.state?.email || searchParams.get('email') || null;
  const linkedVisitDate = location.state?.visitDate || searchParams.get('visitDate') || new Date().toISOString().split('T')[0];
  const linkedVisitTime = location.state?.visitTime || location.state?.createdAt?.split('T')[1]?.substring(0, 5) || searchParams.get('visitTime') || '—';
  const linkedVisitType = location.state?.visitType || searchParams.get('visitType') || 'OUTPATIENT';
  const linkedProviderId = location.state?.providerId || searchParams.get('providerId') ? parseInt(searchParams.get('providerId')) : userProviderId;
  const linkedProviderName = location.state?.providerName || searchParams.get('providerName') || userProviderName || null;
  const linkedProviderLocation = location.state?.providerLocation || location.state?.location || searchParams.get('location') || null;

  // ARCHITECTURAL ENFORCEMENT: Block direct access without visitId
  // SUPER_ADMIN can bypass this check for testing/support purposes
  const accessBlocked = !linkedVisitId && !isSuperAdmin;

  // ========================= STATE =========================
  const [selectedServices, setSelectedServices] = useState([]);
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisDescription, setDiagnosisDescription] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [preAuthId, setPreAuthId] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ========================= MEDICAL SERVICES STATE =========================
  const [medicalServices, setMedicalServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState(null);

  // ========================= TOAST HELPERS =========================
  const showSuccessToast = (msg) => enqueueSnackbar(msg, { variant: 'success' });
  const showErrorToast = (msg) => enqueueSnackbar(msg, { variant: 'error' });
  const showInfoToast = (msg) => enqueueSnackbar(msg, { variant: 'info' });

  // ========================= FETCH SERVICES REQUIRING PRE-APPROVAL =========================
  const fetchContractServices = useCallback(async () => {
    if (!linkedMemberId) {
      console.warn('No member ID available to fetch services requiring pre-approval');
      setMedicalServices([]);
      return;
    }

    try {
      setLoadingServices(true);

      // ════════════════════════════════════════════════════════════════════════
      // FIX 2026-01-25: Use new endpoint that returns ONLY services requiring
      // pre-approval based on member's BenefitPolicyRule
      // ════════════════════════════════════════════════════════════════════════

      if (isProviderUser) {
        // PROVIDER role: Use self-access endpoint for services requiring pre-auth
        try {
          const response = await axiosClient.get('/provider/my-contract/services/requiring-preauth', {
            params: { memberId: linkedMemberId }
          });

          const data = response.data?.data || response.data;
          const items = Array.isArray(data) ? data : (data?.content || data?.items || []);

          if (items.length === 0) {
            setMedicalServices([]);
            return;
          }

          // Map to standard service format
          const mappedServices = items.map(item => {
            const serviceId = item.medicalServiceId || item.id;
            return {
              id: serviceId,  // MUST be MedicalService ID
              pricingItemId: item.id,
              code: item.serviceCode,
              name: item.serviceName,
              category: item.categoryName,
              price: item.contractPrice,
              requiresPreAuth: true,  // All items here require pre-auth
              isActive: true,
              hasContract: true,
              displayLabel: `${item.serviceCode} - ${item.serviceName}`
            };
          }); setMedicalServices(mappedServices);
        } catch (providerErr) {
          console.error('Error fetching services requiring pre-auth:', providerErr);
          showErrorToast('فشل في تحميل خدمات الموافقة المسبقة');
          setMedicalServices([]);
        }
      } else if (linkedProviderId) {
        // Admin role with provider context: Use admin endpoint
        try {
          const response = await axiosClient.get(`/providers/${linkedProviderId}/contract/services/requiring-preauth`, {
            params: { memberId: linkedMemberId }
          });

          const data = response.data?.data || response.data;
          const items = Array.isArray(data) ? data : (data?.content || data?.items || []);

          const mappedServices = items.map(item => {
            const svc = item.medicalService || {};
            const serviceId = svc.id || item.medicalServiceId || item.id;
            return {
              id: serviceId,
              pricingItemId: item.id,
              code: svc.code || item.serviceCode,
              name: svc.name || item.serviceName,
              category: svc.category?.name || item.categoryName,
              price: item.contractPrice,
              basePrice: item.basePrice,
              requiresPreAuth: true,
              isActive: true,
              hasContract: true,
              displayLabel: `${svc.code || item.serviceCode} - ${svc.name || item.serviceName}`
            };
          });

          setMedicalServices(mappedServices);
        } catch (contractErr) {
          console.error('Error fetching contract services:', contractErr);
          // Fallback: use all contract services
          try {
            const pricingResponse = await getContractPricingItems(await getActiveContractByProvider(linkedProviderId).then(c => c?.id), { size: 2000 });
            const items = pricingResponse?.content || pricingResponse?.items || [];

            setMedicalServices(items.map(item => {
              const svc = item.medicalService || {};
              return {
                id: svc.id || item.medicalServiceId || item.id,
                code: svc.code || item.serviceCode,
                name: svc.name || item.serviceName,
                category: item.categoryName,
                price: item.contractPrice,
                hasContract: true
              };
            }));
          } catch {
            setMedicalServices([]);
          }
        }
      } else {
        // No provider context - fallback to all services
        setMedicalServices([]);
      }

    } catch (err) {
      console.error('Error fetching medical services:', err);
      showErrorToast('فشل في تحميل قائمة الخدمات');
      setMedicalServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, [linkedProviderId, linkedMemberId, isProviderUser]);

  // ========================= FETCH CONTRACT PRICE =========================
  const fetchServicePrice = useCallback(async (service) => {
    // Optimization: If we already have the contract price from the selection list, don't re-fetch
    if (service.hasContract && service.contractId && service.price !== undefined) {
      return service;
    }

    if (!linkedProviderId || !service?.code) return service;

    try {
      // ════════════════════════════════════════════════════════════════════════
      // FIX: Use Provider Portal endpoint for PROVIDER role (supports PROVIDER auth)
      // Admin roles continue using the admin endpoint
      // ════════════════════════════════════════════════════════════════════════
      const endpoint = isProviderUser
        ? `/provider/my-services/${service.code}/price`
        : `/providers/${linkedProviderId}/services/${service.code}/price`;

      const response = await axiosClient.get(endpoint, { params: { date: linkedVisitDate } });

      const priceData = response.data?.data || response.data;
      return {
        ...service,
        price: priceData?.contractPrice || service.price || 0,
        hasContract: priceData?.hasContract || false
      };
    } catch (err) {
      console.error('Error fetching price:', err);
      return { ...service, price: service.price || 0, hasContract: false };
    }
  }, [linkedProviderId, linkedVisitDate, isProviderUser]);

  // ========================= EFFECTS =========================
  useEffect(() => {
    if (!accessBlocked && linkedMemberId) {
      fetchContractServices();
    }
  }, [accessBlocked, linkedMemberId, fetchContractServices]);

  // ========================= HANDLERS =========================
  const handleAddService = async (selectedService) => {
    // Handle both formats: direct value or (event, value) from Autocomplete
    const newValue = selectedService?.target ? null : selectedService;

    if (!newValue) return;

    // Check if already added
    if (selectedServices.some(s => s.id === newValue.id)) {
      showInfoToast('الخدمة مضافة مسبقاً');
      setServiceSearch(null);
      return;
    }// OPTIMIZATION: Use price from pre-loaded service if available
    let serviceWithPrice = newValue;
    if (!newValue.hasContract || newValue.price === undefined) {
      serviceWithPrice = await fetchServicePrice(newValue);
    }

    setSelectedServices(prev => [...prev, { ...serviceWithPrice, quantity: 1 }]);
    setServiceSearch(null);

    if (formErrors.services) {
      setFormErrors(prev => ({ ...prev, services: null }));
    }
  };

  const handleRemoveService = (index) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, quantity) => {
    setSelectedServices(prev => prev.map((s, i) => i === index ? { ...s, quantity } : s));
  };

  const calculateTotal = () => {
    return selectedServices.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
  };

  // ========================= FILE HANDLING =========================
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      file,
      type: 'MEDICAL_REPORT',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setPendingFiles(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleFileTypeChange = (index, type) => {
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, type } : f));
  };

  const uploadFiles = async (preAuthId) => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const { file, type } of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachmentType', type);

        await axiosClient.post(`/pre-authorizations/${preAuthId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        uploaded++;
        setUploadProgress(Math.round((uploaded / pendingFiles.length) * 100));
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    setUploading(false);
    setUploadProgress(0);
  };

  // ========================= VALIDATION =========================
  const validate = () => {
    const errors = {};

    if (!linkedVisitId) {
      errors.visitId = 'معرف الزيارة مطلوب';
    }

    if (!linkedMemberId) {
      errors.memberId = 'المؤمَّن عليه مطلوب';
    }

    if (!linkedProviderId) {
      errors.providerId = 'مقدم الخدمة مطلوب';
    }

    if (selectedServices.length === 0) {
      errors.services = 'يجب اختيار خدمة طبية واحدة على الأقل';
    }

    // Check if all services have contracts
    const servicesWithoutContract = selectedServices.filter(s => !s.hasContract);
    if (servicesWithoutContract.length > 0) {
      errors.contracts = `الخدمات التالية ليس لها عقد: ${servicesWithoutContract.map(s => s.code).join(', ')}`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========================= SUBMIT =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showErrorToast('يرجى تصحيح الأخطاء');
      return;
    }

    try {
      // Create pre-auth for the first service (main service)
      // In a real multi-service system, you'd create a bundle or loop
      const mainService = selectedServices[0];

      const payload = {
        memberId: linkedMemberId,
        visitId: linkedVisitId,
        providerId: linkedProviderId,
        medicalServiceId: mainService.id,
        diagnosisCode: diagnosisCode?.trim() || 'N/A',
        diagnosisDescription: diagnosisDescription?.trim() || null,
        doctorName: doctorName?.trim() || null,
        notes: notes?.trim() || null,
        // Additional services info in notes
        additionalInfo: selectedServices.length > 1
          ? `خدمات إضافية: ${selectedServices.slice(1).map(s => s.code).join(', ')}`
          : null
      };

      const result = await create(payload);

      if (result && result.id) {
        // Upload files if any
        if (pendingFiles.length > 0) {
          await uploadFiles(result.id);
        }

        showSuccessToast(`تم إنشاء طلب الموافقة رقم #${result.id} بنجاح`);
        setPreAuthId(result.id);
      }
    } catch (err) {
      console.error('Create error:', err);
      showErrorToast('فشل في إنشاء الطلب');
    }
  };

  const handleFinish = () => {
    navigate(fromVisitLog ? '/provider/visits' : '/pre-approvals');
  };

  const handleCancel = () => {
    navigate(fromVisitLog ? '/provider/visits' : '/pre-approvals');
  };

  // ========================= ACCESS BLOCKED UI =========================
  if (accessBlocked) {
    return (
      <>
        <ModernPageHeader
          title="طلب موافقة مسبقة"
          icon={PreApprovalIcon}
          breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'الموافقات المسبقة', href: '/pre-approvals' }, { label: 'طلب جديد' }]}
        />
        <MainCard>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'error.lighter', mx: 'auto', mb: 3 }}>
              <BlockIcon sx={{ fontSize: 48, color: 'error.main' }} />
            </Avatar>
            <Typography variant="h4" color="error" gutterBottom>
              الوصول غير مسموح
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              يجب إنشاء طلب الموافقة المسبقة من خلال سجل الزيارات لضمان ربط الطلب بزيارة موثقة.
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'info.lighter', maxWidth: 500, mx: 'auto', mb: 4, borderRadius: 2 }}>
              <Typography variant="subtitle2" color="info.dark" gutterBottom>الخطوات المطلوبة:</Typography>
              <Stack spacing={1} textAlign="right">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'info.main', fontSize: 12 }}>1</Avatar>
                  <Typography variant="body2">اذهب إلى <strong>التحقق من الأهلية</strong></Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'info.main', fontSize: 12 }}>2</Avatar>
                  <Typography variant="body2">سجّل <strong>زيارة جديدة</strong> للمؤمَّن عليه</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'info.main', fontSize: 12 }}>3</Avatar>
                  <Typography variant="body2">من <strong>سجل الزيارات</strong>، اضغط على "موافقة مسبقة"</Typography>
                </Stack>
              </Stack>
            </Paper>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={() => navigate('/provider/eligibility-check')}>
                التحقق من الأهلية
              </Button>
              <Button variant="outlined" onClick={() => navigate('/provider/visits')}>
                سجل الزيارات
              </Button>
            </Stack>
          </Box>
        </MainCard>
      </>
    );
  }

  // ========================= MAIN FORM UI =========================
  const visitTypeLabel = {
    'OUTPATIENT': 'عيادة خارجية',
    'INPATIENT': 'تنويم',
    'EMERGENCY': 'طوارئ',
    'DENTAL': 'أسنان',
    'OPTICAL': 'بصريات'
  }[linkedVisitType] || linkedVisitType;

  return (
    <>
      <ModernPageHeader
        title="طلب موافقة مسبقة جديد"
        subtitle="نظام الموافقات الطبية المسبقة"
        icon={PreApprovalIcon}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'سجل الزيارات', href: '/provider/visits' },
          { label: 'طلب موافقة مسبقة' }
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Chip icon={<VisitIcon />} label={`زيارة #${linkedVisitId}`} color="success" />
            <Chip icon={<TimeIcon />} label={linkedVisitDate} variant="outlined" />
          </Stack>
        }
      />

      <MainCard>
        <form onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Grid container spacing={3}>
            {/* ========== SECTION 1: MEMBER INFO ========== */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <InfoCard icon={PersonIcon} title="بيانات المؤمَّن عليه" color="info">
                <Grid container spacing={2}>
                  <DataField icon={PersonIcon} label="الاسم الكامل" value={linkedMemberName} highlight />
                  <DataField icon={CardIcon} label="رقم البطاقة" value={linkedMemberCardNumber} highlight />
                  <DataField icon={BadgeIcon} label="الرقم المدني" value={linkedMemberCivilId} />
                  <DataField icon={BusinessIcon} label="جهة العمل" value={linkedEmployerName} />
                  <DataField icon={PhoneIcon} label="الهاتف" value={linkedMemberPhone} />
                  <DataField icon={EmailIcon} label="البريد الإلكتروني" value={linkedMemberEmail} />
                </Grid>
              </InfoCard>
            </Grid>

            {/* ========== SECTION 2: VISIT INFO ========== */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <InfoCard icon={VisitIcon} title="بيانات الزيارة" color="success">
                <Grid container spacing={2}>
                  <DataField icon={VisitIcon} label="رقم الزيارة" value={`#${linkedVisitId}`} highlight />
                  <DataField icon={CategoryIcon} label="نوع الزيارة" value={visitTypeLabel} />
                  <DataField icon={CalendarIcon} label="تاريخ الزيارة" value={linkedVisitDate} />
                  <DataField icon={TimeIcon} label="وقت الزيارة" value={linkedVisitTime} />
                  <DataField icon={BusinessIcon} label="مقدم الخدمة" value={linkedProviderName} fullWidth />
                  {linkedProviderLocation && (
                    <DataField icon={LocationIcon} label="الموقع" value={linkedProviderLocation} fullWidth />
                  )}
                </Grid>
              </InfoCard>
            </Grid>

            {/* ========== SECTION 3: MEDICAL SERVICES ========== */}
            <Grid size={12}>
              <InfoCard icon={MedicalIcon} title="الخدمات الطبية المطلوبة" color="warning">
                {/* Service Selector with Category Filter */}
                <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
                  اختر الخدمات الطبية من القائمة. يمكنك البحث بالكود أو الاسم أو الفلترة بالتصنيف.
                </Alert>

                <MedicalServicePicker
                  services={medicalServices}
                  loading={loadingServices}
                  onSelect={handleAddService}
                  selectedIds={selectedServices.map(s => s.id)}
                  placeholder="ابحث برمز الخدمة أو اسمها..."
                  showCategoryFilter={true}
                  showPrices={true}
                  error={!!formErrors.services}
                  helperText={formErrors.services}
                />

                {formErrors.contracts && (
                  <Alert severity="error" sx={{ mb: 2 }}>{formErrors.contracts}</Alert>
                )}

                {/* Selected Services Table */}
                {selectedServices.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>الكود</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>اسم الخدمة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>الكمية</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>سعر الوحدة</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>الإجمالي</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>حذف</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedServices.map((service, index) => (
                          <ServiceRow
                            key={service.id}
                            service={service}
                            index={index}
                            onRemove={handleRemoveService}
                            onQuantityChange={handleQuantityChange}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      bgcolor: 'grey.50',
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      mb: 2
                    }}
                  >
                    <MedicalIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography color="text.secondary">
                      لم يتم اختيار أي خدمات. ابحث واختر من القائمة أعلاه.
                    </Typography>
                  </Paper>
                )}

                {/* Total */}
                {selectedServices.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'success.lighter',
                      border: '2px solid',
                      borderColor: 'success.main',
                      borderRadius: 2
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <MoneyIcon color="success" />
                        <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                          إجمالي المبلغ المطلوب
                        </Typography>
                        <Chip label={`${selectedServices.length} خدمة`} size="small" color="success" variant="outlined" />
                      </Stack>
                      <Typography variant="h4" color="success.dark" fontWeight="bold">
                        {calculateTotal().toLocaleString('ar-SA', { minimumFractionDigits: 2 })} د.ل
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </InfoCard>
            </Grid>

            {/* ========== SECTION 4: DIAGNOSIS ========== */}
            <Grid size={{ xs: 12, md: 6 }}>
              <InfoCard icon={DescriptionIcon} title="التشخيص والطبيب" color="error" collapsible>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="رمز التشخيص (ICD-10)"
                    placeholder="مثال: J06.9"
                    value={diagnosisCode}
                    onChange={(e) => setDiagnosisCode(e.target.value)}
                    helperText="اختياري - رمز التشخيص الدولي"
                  />
                  <TextField
                    fullWidth
                    label="وصف التشخيص"
                    placeholder="وصف الحالة المرضية..."
                    value={diagnosisDescription}
                    onChange={(e) => setDiagnosisDescription(e.target.value)}
                    multiline
                    rows={2}
                  />
                  <TextField
                    fullWidth
                    label="اسم الطبيب المعالج"
                    placeholder="د. ..."
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                  />
                </Stack>
              </InfoCard>
            </Grid>

            {/* ========== SECTION 5: ATTACHMENTS ========== */}
            <Grid size={{ xs: 12, md: 6 }}>
              <InfoCard icon={AttachmentIcon} title="المرفقات والمستندات" color="secondary" collapsible>
                <Alert severity="info" sx={{ mb: 2 }}>
                  يمكنك إرفاق التقارير الطبية، نتائج الفحوصات، أو الأشعة لدعم الطلب.
                </Alert>

                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<UploadIcon />}
                  sx={{
                    height: 80,
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    mb: 2
                  }}
                >
                  اختر ملفات للرفع
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                </Button>

                {pendingFiles.length > 0 && (
                  <Stack spacing={1}>
                    {pendingFiles.map((item, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <AttachmentIcon color="action" />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>{item.file.name}</Typography>
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
                            sx={{ width: 120 }}
                          >
                            <option value="MEDICAL_REPORT">تقرير طبي</option>
                            <option value="LAB_RESULT">نتائج مختبر</option>
                            <option value="XRAY">أشعة</option>
                            <option value="PRESCRIPTION">وصفة طبية</option>
                            <option value="OTHER">أخرى</option>
                          </TextField>
                          <IconButton size="small" color="error" onClick={() => handleRemoveFile(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      سيتم رفع {pendingFiles.length} ملف عند إرسال الطلب
                    </Typography>
                  </Stack>
                )}

                {uploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={0.5}>
                      جاري رفع الملفات... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </InfoCard>
            </Grid>

            {/* ========== SECTION 6: NOTES ========== */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="ملاحظات إضافية"
                placeholder="أي معلومات إضافية تود إضافتها للطلب..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
              />
            </Grid>

            {/* ========== ACTIONS ========== */}
            <Grid size={12}>
              <Divider sx={{ mb: 3 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleCancel}
                  disabled={creating || uploading}
                  size="large"
                >
                  إلغاء والعودة
                </Button>
                <Stack direction="row" spacing={2}>
                  {pendingFiles.length > 0 && (
                    <Chip
                      icon={<AttachmentIcon />}
                      label={`${pendingFiles.length} مرفق`}
                      color="info"
                    />
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={creating || uploading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    disabled={creating || uploading || selectedServices.length === 0}
                    size="large"
                    color="success"
                    sx={{ minWidth: 200 }}
                  >
                    {creating ? 'جاري الحفظ...' : uploading ? 'جاري الرفع...' : 'إرسال الطلب'}
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </MainCard>

      {/* Success Dialog - Central notification with auto-redirect */}
      <SuccessDialog
        open={!!preAuthId}
        type="preauth"
        title="تم إرسال طلب الموافقة بنجاح! 🎉"
        subtitle="تم إرسال الطلب للمراجعة من قبل فريق التأمين"
        referenceNumber={preAuthId}
        attachmentsCount={pendingFiles.length}
        redirectPath={fromVisitLog ? '/provider/visits' : '/pre-approvals'}
        redirectLabel={fromVisitLog ? 'العودة لسجل الزيارات' : 'العودة للموافقات'}
        countdownSeconds={5}
        viewDetailsPath={preAuthId ? `/pre-approvals/${preAuthId}` : null}
        additionalInfo={[
          { label: 'المؤمَّن عليه', value: linkedMemberName || '—' },
          { label: 'عدد الخدمات', value: `${selectedServices.length} خدمة` },
          { label: 'إجمالي المبلغ', value: `${calculateTotal().toLocaleString()} د.ل` },
          { label: 'الحالة', value: 'قيد المراجعة' }
        ]}
      />
    </>
  );
};

export default PreApprovalCreate;
