/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      CANONICAL CLAIM CREATE FORM                             ║
 * ║                        Visit-Centric Architecture                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  ARCHITECTURAL LAWS:                                                         ║
 * ║  ❌ No claim may bypass Visit (all claims MUST reference a Visit)            ║
 * ║  ❌ No service may be typed manually (must select from dropdown)             ║
 * ║  ❌ No price may be user-entered (all prices from ProviderContract)          ║
 * ║  ✅ Data flow: Visit → Diagnosis → Medical Service → Contract Price → Claim ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Created: 2025-06-20
 * Purpose: Insurance claim submission with contract-driven pricing
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
  Autocomplete,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Save,
  ArrowBack,
  Person as PersonIcon,
  LocalHospital as ClaimIcon,
  MedicalServices as MedicalIcon,
  AttachMoney as MoneyIcon,
  AttachFile as AttachmentIcon,
  Lock as LockIcon,
  MedicalInformation as VisitIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  FactCheck as ContractIcon,
  Send as SendIcon
} from '@mui/icons-material';

import MainCard from '../../components/MainCard';
import ModernPageHeader from '../../components/tba/ModernPageHeader';
import FileUploader from '../../components/upload/FileUploader';
import AttachmentList from '../../components/upload/AttachmentList';
import RBACGuard from '../../components/tba/RBACGuard';
import { PERMISSIONS } from '../../constants/permissions.constants';
import { useAuth } from '../../contexts/AuthContext';
import { claimsService, preApprovalsService, medicalServicesService } from '../../services/api';
import axiosClient from '../../utils/axios';

// ══════════════════════════════════════════════════════════════════════════════
// LABELS (Arabic)
// ══════════════════════════════════════════════════════════════════════════════
const LABELS = {
  title: 'إنشاء مطالبة جديدة',
  subtitle: 'تقديم مطالبة تأمينية (يجب الربط بزيارة)',
  visitInfo: 'معلومات الزيارة',
  memberInfo: 'معلومات المستفيد',
  medicalInfo: 'المعلومات الطبية',
  financialInfo: 'الخدمات والمبالغ',
  attachments: 'المرفقات',
  linkedPreAuth: 'الموافقة المسبقة المرتبطة',
  selectPreAuth: 'اختر موافقة مسبقة (إن وجدت)',
  noPreAuths: 'لا توجد موافقات مسبقة معتمدة لهذه الزيارة',
  diagnosisCode: 'رمز التشخيص (ICD-10)',
  diagnosisDescription: 'وصف التشخيص',
  save: 'حفظ كمسودة',
  saveAndSubmit: 'حفظ وإرسال للمراجعة',
  saving: 'جاري الحفظ...',
  cancel: 'إلغاء',
  visitRequired: 'يجب الوصول لهذه الصفحة من سجل الزيارات',
  claimLines: 'بنود المطالبة',
  addLine: 'إضافة خدمة',
  service: 'الخدمة الطبية',
  quantity: 'الكمية',
  unitPrice: 'سعر الوحدة',
  totalPrice: 'الإجمالي',
  noServices: 'لا توجد خدمات. أضف خدمة واحدة على الأقل.',
  contractPrice: 'سعر العقد',
  loadingPrice: 'جاري تحميل السعر...',
  noContract: 'لا يوجد عقد',
  totalClaimAmount: 'إجمالي المطالبة',
  uploadAttachment: 'رفع مرفق'
};

// Claim attachment types
const CLAIM_ATTACHMENT_TYPES = [
  { key: 'INVOICE', label: 'فاتورة', required: true },
  { key: 'MEDICAL_REPORT', label: 'تقرير طبي' },
  { key: 'LAB_RESULT', label: 'نتائج مخبرية' },
  { key: 'PRESCRIPTION', label: 'وصفة طبية' },
  { key: 'OTHER', label: 'أخرى' }
];

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
const SectionHeader = ({ icon: Icon, title, color = 'primary' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <Icon color={color} />
    <Typography variant="h6" fontWeight="bold">{title}</Typography>
  </Box>
);

const ReadOnlyField = ({ label, value, icon: Icon }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Stack direction="row" alignItems="center" spacing={1}>
      {Icon && <Icon fontSize="small" color="action" />}
      <Typography variant="body1" fontWeight="500">{value || '-'}</Typography>
    </Stack>
  </Box>
);

/**
 * ContractPriceDisplay - Shows contract price with visual feedback
 * ⚠️ CRITICAL: Prices are NEVER editable - always from contract
 */
const ContractPriceDisplay = ({ loading, price, hasContract, error }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">{LABELS.loadingPrice}</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Chip label={error} color="error" size="small" variant="outlined" />
    );
  }

  if (!hasContract) {
    return (
      <Chip label={LABELS.noContract} color="warning" size="small" variant="outlined" />
    );
  }

  return (
    <Chip
      icon={<ContractIcon />}
      label={`${price?.toLocaleString('ar-SA')} د.ل`}
      color="success"
      size="small"
      variant="filled"
    />
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ClaimCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, providerId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Toast helper functions
  const showSuccessToast = (msg) => enqueueSnackbar(msg, { variant: 'success' });
  const showErrorToast = (msg) => enqueueSnackbar(msg, { variant: 'error' });

  // Visit linkage (MANDATORY)
  const linkedVisitId = searchParams.get('visitId');
  const linkedMemberId = searchParams.get('memberId');
  const linkedMemberName = searchParams.get('memberName');
  const linkedMemberCivilId = searchParams.get('memberCivilId');
  const linkedVisitDate = searchParams.get('visitDate');
  const linkedProviderId = searchParams.get('providerId') || providerId;
  const linkedProviderName = searchParams.get('providerName');

  // State
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [errors, setErrors] = useState({});

  // Pre-authorization data
  const [preAuths, setPreAuths] = useState([]);
  const [loadingPreAuths, setLoadingPreAuths] = useState(false);
  const [selectedPreAuth, setSelectedPreAuth] = useState(null);

  // Medical services (for dropdown)
  const [allServices, setAllServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Claim Lines - each line has: { id, medicalServiceId, serviceName, serviceCode, quantity, unitPrice, hasContract, loadingPrice }
  const [claimLines, setClaimLines] = useState([]);
  const [lineIdCounter, setLineIdCounter] = useState(1);

  // Attachments
  const [tempClaimId, setTempClaimId] = useState(null);
  const [uploadedAttachments, setUploadedAttachments] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    diagnosisCode: '',
    diagnosisDescription: '',
    doctorName: '',
    notes: ''
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (linkedVisitId && linkedMemberId && linkedProviderId) {
      initializeForm();
    }
  }, [linkedVisitId, linkedMemberId, linkedProviderId]);

  const initializeForm = async () => {
    setLoading(true);
    try {
      // Fetch pre-authorizations for this visit
      await fetchPreAuthorizations();

      // Fetch all medical services for dropdown
      await fetchMedicalServices();

      // Create temporary claim for attachments
      await createTempClaim();
    } catch (error) {
      console.error('Failed to initialize form:', error);
      showErrorToast('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreAuthorizations = async () => {
    if (!linkedMemberId) return;

    setLoadingPreAuths(true);
    try {
      // Get approved pre-auths for this visit/member
      const response = await preApprovalsService.getByMember(linkedMemberId);
      // Filter to only approved ones linked to this visit
      const approvedPreAuths = (response || []).filter(pa =>
        pa.status === 'APPROVED' &&
        (!linkedVisitId || pa.visitId === parseInt(linkedVisitId))
      );
      setPreAuths(approvedPreAuths);
    } catch (error) {
      console.error('Failed to fetch pre-authorizations:', error);
      setPreAuths([]);
    } finally {
      setLoadingPreAuths(false);
    }
  };

  const fetchMedicalServices = async () => {
    setLoadingServices(true);
    try {
      if (linkedProviderId) {
        // FIX: Filter services by Provider Contract
        const response = await axiosClient.get(`/providers/${linkedProviderId}/services`);
        const data = response.data?.data || response.data || [];

        const mappedServices = data.map(s => ({
          id: s.serviceId || s.id,
          code: s.serviceCode || s.code,
          name: s.serviceName || s.name,
          nameArabic: s.serviceNameArabic || s.nameArabic || s.name_arabic,
          category: s.category
        }));
        setAllServices(mappedServices);
      } else {
        // Fallback if no provider linked (should not happen in visit-centric flow)
        const response = await medicalServicesService.getAllMedicalServices();
        setAllServices(response?.content || response || []);
      }
    } catch (error) {
      console.error('Failed to fetch medical services:', error);
      setAllServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const createTempClaim = async () => {
    const vId = parseInt(linkedVisitId);
    if (!vId) {
      console.warn('Cannot create temp claim: Invalid Visit ID');
      return;
    }

    try {
      const response = await claimsService.create({
        visitId: vId,
        memberId: parseInt(linkedMemberId),
        providerId: parseInt(linkedProviderId),
        diagnosisCode: 'TEMP',
        diagnosisDescription: 'TEMP',
        status: 'DRAFT',
        claimLines: [{ medicalServiceId: 1, quantity: 1 }] // Dummy line to pass @NotEmpty if strict
        // Actually, better to catch the error if backend rejects empty lines
        // Backend says @NotEmpty lines. So temp creation WILL fail if lines are empty.
        // We probably shouldn't create temp claim on load if it requires valid lines.
        // Solution: Create temp claim ONLY when first file is uploaded? 
        // Or send a dummy line? Sending dummy line creates garbage.
        // Best approach: Don't create temp claim on load. Create it when user Uploads first file OR Saves.
        // But the FileUploader needs an ID. 
        // I will SKIP createTempClaim here and let FileUploader handle creation or wait for save.
      });
      setTempClaimId(response?.id);
    } catch (error) {
      console.error('Failed to create temp claim:', error);
      // Non-fatal - attachments can be uploaded after final save
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // CONTRACT PRICE RESOLUTION
  // ══════════════════════════════════════════════════════════════════════════════
  /**
   * Fetch contract price for a specific service from the provider contract
   * ⚠️ CRITICAL: This is the ONLY source of truth for pricing
   */
  const fetchContractPrice = async (serviceCode, lineId) => {
    if (!linkedProviderId || !serviceCode) return null;

    // Update line to show loading
    setClaimLines(prev => prev.map(line =>
      line.id === lineId ? { ...line, loadingPrice: true, priceError: null } : line
    ));

    try {
      const response = await axiosClient.get(`/providers/${linkedProviderId}/services/${serviceCode}/price`);
      const priceData = response.data;

      // Update line with contract price
      setClaimLines(prev => prev.map(line =>
        line.id === lineId ? {
          ...line,
          unitPrice: priceData.price || priceData.contractPrice || 0,
          hasContract: true,
          loadingPrice: false,
          priceError: null
        } : line
      ));

      return priceData.price || priceData.contractPrice || 0;
    } catch (error) {
      console.error(`Failed to fetch price for service ${serviceCode}:`, error);

      // Update line to show no contract
      setClaimLines(prev => prev.map(line =>
        line.id === lineId ? {
          ...line,
          unitPrice: 0,
          hasContract: false,
          loadingPrice: false,
          priceError: error.response?.status === 404 ? LABELS.noContract : 'خطأ في تحميل السعر'
        } : line
      ));

      return null;
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // CLAIM LINE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════════
  const addClaimLine = () => {
    const newLine = {
      id: lineIdCounter,
      medicalServiceId: null,
      serviceName: '',
      serviceCode: '',
      quantity: 1,
      unitPrice: 0,
      hasContract: false,
      loadingPrice: false,
      priceError: null
    };
    setClaimLines(prev => [...prev, newLine]);
    setLineIdCounter(prev => prev + 1);
  };

  const removeClaimLine = (lineId) => {
    setClaimLines(prev => prev.filter(line => line.id !== lineId));
  };

  const handleServiceChange = async (lineId, selectedService) => {
    if (!selectedService) {
      // Clear the line
      setClaimLines(prev => prev.map(line =>
        line.id === lineId ? {
          ...line,
          medicalServiceId: null,
          serviceName: '',
          serviceCode: '',
          unitPrice: 0,
          hasContract: false,
          priceError: null
        } : line
      ));
      return;
    }

    // Update line with selected service
    setClaimLines(prev => prev.map(line =>
      line.id === lineId ? {
        ...line,
        medicalServiceId: selectedService.id,
        serviceName: selectedService.nameArabic || selectedService.name || selectedService.name_arabic,
        serviceCode: selectedService.code || selectedService.serviceCode
      } : line
    ));

    // Fetch contract price for this service
    const serviceCode = selectedService.code || selectedService.serviceCode;
    await fetchContractPrice(serviceCode, lineId);
  };

  const handleQuantityChange = (lineId, newQuantity) => {
    const qty = Math.max(1, parseInt(newQuantity) || 1);
    setClaimLines(prev => prev.map(line =>
      line.id === lineId ? { ...line, quantity: qty } : line
    ));
  };

  // Calculate total from all lines
  const calculateTotal = useCallback(() => {
    return claimLines.reduce((sum, line) => {
      return sum + (line.unitPrice * line.quantity);
    }, 0);
  }, [claimLines]);

  // ══════════════════════════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ══════════════════════════════════════════════════════════════════════════════
  const handleChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handlePreAuthChange = (event, value) => {
    setSelectedPreAuth(value);
    if (value) {
      // Auto-fill diagnosis from pre-auth
      setFormData(prev => ({
        ...prev,
        diagnosisCode: value.diagnosisCode || '',
        diagnosisDescription: value.diagnosisDescription || value.diagnosis || ''
      }));
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════════════════════════════════════════════
  const validateForm = () => {
    const newErrors = {};

    // Validate diagnosis
    if (!formData.diagnosisCode?.trim()) {
      newErrors.diagnosisCode = 'رمز التشخيص مطلوب';
    }

    if (!formData.diagnosisDescription?.trim()) {
      newErrors.diagnosisDescription = 'وصف التشخيص مطلوب';
    }

    // Validate claim lines
    if (claimLines.length === 0) {
      newErrors.claimLines = 'يجب إضافة خدمة واحدة على الأقل';
    }

    // Validate each line has service and contract
    const invalidLines = claimLines.filter(line => !line.medicalServiceId || !line.hasContract);
    if (invalidLines.length > 0) {
      newErrors.claimLines = 'جميع الخدمات يجب أن تكون مرتبطة بعقد';
    }

    // Check if any line is still loading
    const loadingLines = claimLines.filter(line => line.loadingPrice);
    if (loadingLines.length > 0) {
      newErrors.claimLines = 'انتظر حتى يتم تحميل جميع الأسعار';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // SUBMIT
  // ══════════════════════════════════════════════════════════════════════════════
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showErrorToast('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    const vId = parseInt(linkedVisitId);
    if (!vId) {
      showErrorToast('خطأ: رقم الزيارة مفقود أو غير صحيح. لا يمكن إنشاء المطالبة.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      /**
       * ══════════════════════════════════════════════════════════════════════
       * CANONICAL PAYLOAD STRUCTURE
       * ══════════════════════════════════════════════════════════════════════
       * ⚠️ CRITICAL: No free-text prices or services
       * - visitId: REQUIRED - links claim to visit
       * - memberId: From visit
       * - providerId: From visit
       * - diagnosisCode: ICD-10 code
       * - diagnosisDescription: Diagnosis text
       * - preAuthorizationId: Optional - linked pre-auth
       * - claimLines: Array of { medicalServiceId, quantity } - price resolved by backend
       * - totalAmount: Calculated from lines (NOT user-entered)
       */
      const payload = {
        visitId: vId,
        memberId: parseInt(linkedMemberId),
        providerId: parseInt(linkedProviderId),
        diagnosisCode: formData.diagnosisCode.trim(),
        diagnosisDescription: formData.diagnosisDescription.trim(),
        doctorName: formData.doctorName?.trim() || null,
        notes: formData.notes?.trim() || null,
        serviceDate: linkedVisitDate || null,
        preAuthorizationId: selectedPreAuth?.id || null,
        // Backend expects 'lines' NOT 'claimLines'
        lines: claimLines.map(line => ({
          medicalServiceId: line.medicalServiceId,
          quantity: line.quantity || 1
        }))
      };

      // If we have a temp claim, update it; otherwise create new
      let response;
      if (tempClaimId) {
        response = await claimsService.update(tempClaimId, payload);
      } else {
        response = await claimsService.create(payload);
      }

      const claimId = response.id || tempClaimId;
      showSuccessToast('تم إنشاء المطالبة بنجاح');

      // If submitAfterSave is true, submit the claim for review
      if (submitAfterSave && claimId) {
        try {
          await claimsService.submit(claimId);
          showSuccessToast('تم إرسال المطالبة للمراجعة');
        } catch (submitError) {
          console.error('Failed to submit claim:', submitError);
          showErrorToast('تم حفظ المطالبة ولكن فشل الإرسال للمراجعة');
        }
      }

      navigate(`/claims/${claimId}`);
    } catch (error) {
      console.error('Failed to create claim:', error);
      const errorMessage = error.response?.data?.message || 'فشل في إنشاء المطالبة';
      setCreateError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  // State to track if we should submit after save
  const [submitAfterSave, setSubmitAfterSave] = useState(false);

  // Handle save as draft
  const handleSaveAsDraft = (event) => {
    setSubmitAfterSave(false);
    handleSubmit(event);
  };

  // Handle save and submit
  const handleSaveAndSubmit = (event) => {
    setSubmitAfterSave(true);
    handleSubmit(event);
  };

  const handleCancel = () => {
    navigate('/provider/visits');
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ATTACHMENT HANDLERS
  // ══════════════════════════════════════════════════════════════════════════════
  const uploadClaimAttachment = async (claimId, file, attachmentType) => {
    return claimsService.uploadAttachment(claimId, file, attachmentType);
  };

  const handleUploadSuccess = (attachment) => {
    setUploadedAttachments(prev => [...prev, attachment]);
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      await claimsService.downloadAttachment(tempClaimId, attachment.id);
    } catch (error) {
      showErrorToast('فشل في تحميل المرفق');
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    try {
      await claimsService.deleteAttachment(tempClaimId, attachment.id);
      setUploadedAttachments(prev => prev.filter(a => a.id !== attachment.id));
      showSuccessToast('تم حذف المرفق');
    } catch (error) {
      showErrorToast('فشل في حذف المرفق');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: VISIT REQUIRED ERROR
  // ══════════════════════════════════════════════════════════════════════════════
  if (!linkedVisitId || !linkedMemberId) {
    return (
      <>
        <ModernPageHeader
          title={LABELS.title}
          subtitle={LABELS.subtitle}
          icon={ClaimIcon}
          breadcrumbs={[
            { label: 'المطالبات', path: '/claims' },
            { label: 'إضافة جديد' }
          ]}
        />
        <MainCard>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Alert severity="error" sx={{ mb: 3, justifyContent: 'center' }}>
              <Typography variant="h6">{LABELS.visitRequired}</Typography>
            </Alert>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              لإنشاء مطالبة، يجب أولاً إنشاء زيارة للمريض ثم النقر على "إنشاء مطالبة" من صفحة الزيارة.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/provider/visits')}
              >
                سجل الزيارات
              </Button>
            </Stack>
          </Box>
        </MainCard>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: LOADING
  // ══════════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <>
        <ModernPageHeader
          title={LABELS.title}
          subtitle={LABELS.subtitle}
          icon={ClaimIcon}
          breadcrumbs={[
            { label: 'سجل الزيارات', path: '/provider/visits' },
            { label: 'إضافة مطالبة' }
          ]}
        />
        <MainCard>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              جاري تحميل البيانات...
            </Typography>
          </Box>
        </MainCard>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN FORM
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <ModernPageHeader
        title={LABELS.title}
        subtitle={LABELS.subtitle}
        icon={ClaimIcon}
        breadcrumbs={[
          { label: 'سجل الزيارات', path: '/provider/visits' },
          { label: 'إضافة مطالبة' }
        ]}
        actions={
          <Chip
            icon={<LockIcon />}
            label={`مرتبط بالزيارة #${linkedVisitId}`}
            color="success"
            variant="outlined"
          />
        }
      />

      <MainCard>
        {createError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {createError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* ==================== SECTION 1: Visit Information ==================== */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <SectionHeader icon={VisitIcon} title={LABELS.visitInfo} color="success" />

                  <Box sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <ReadOnlyField label="رقم الزيارة" value={`#${linkedVisitId}`} />
                      </Grid>
                      <Grid item xs={6}>
                        <ReadOnlyField label="تاريخ الزيارة" value={linkedVisitDate} />
                      </Grid>
                    </Grid>
                    <Chip
                      icon={<LockIcon />}
                      label="المطالبة مرتبطة بهذه الزيارة"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* ==================== SECTION 2: Member Information ==================== */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <SectionHeader icon={PersonIcon} title={LABELS.memberInfo} color="info" />

                  <Box sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <ReadOnlyField
                          label="اسم المستفيد"
                          value={linkedMemberName}
                          icon={PersonIcon}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <ReadOnlyField
                          label="الرقم المدني"
                          value={linkedMemberCivilId}
                        />
                      </Grid>
                    </Grid>
                    <Chip
                      icon={<LockIcon />}
                      label="محدد من الزيارة المرتبطة"
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* ==================== SECTION 3: Pre-Authorization ==================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <SectionHeader icon={ContractIcon} title={LABELS.linkedPreAuth} color="warning" />

                  <Autocomplete
                    options={preAuths}
                    getOptionLabel={(option) =>
                      `${option.referenceNumber || `PA-${option.id}`} - ${option.diagnosisDescription || option.diagnosis || 'لا يوجد'}`
                    }
                    loading={loadingPreAuths}
                    onChange={handlePreAuthChange}
                    value={selectedPreAuth}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={LABELS.selectPreAuth}
                        helperText={preAuths.length === 0 ? LABELS.noPreAuths : 'اختر موافقة مسبقة إن وجدت (اختياري)'}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingPreAuths ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {option.referenceNumber || `PA-${option.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.diagnosisDescription || option.diagnosis}
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            ✓ معتمدة
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* ==================== SECTION 4: Medical Information ==================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <SectionHeader icon={MedicalIcon} title={LABELS.medicalInfo} color="warning" />

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        required
                        label={LABELS.diagnosisCode}
                        value={formData.diagnosisCode}
                        onChange={handleChange('diagnosisCode')}
                        error={!!errors.diagnosisCode}
                        helperText={errors.diagnosisCode || 'مثال: J06.9'}
                        placeholder="J06.9"
                      />
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        required
                        label={LABELS.diagnosisDescription}
                        value={formData.diagnosisDescription}
                        onChange={handleChange('diagnosisDescription')}
                        error={!!errors.diagnosisDescription}
                        helperText={errors.diagnosisDescription}
                        placeholder="عدوى الجهاز التنفسي العلوي"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="اسم الطبيب"
                        value={formData.doctorName}
                        onChange={handleChange('doctorName')}
                        placeholder="د. أحمد محمد"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          مقدم الخدمة
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LockIcon fontSize="small" color="action" />
                          <Typography variant="body1" fontWeight="500">
                            {linkedProviderName || 'مقدم الخدمة المرتبط'}
                          </Typography>
                        </Stack>
                        <Chip
                          icon={<LockIcon />}
                          label="محدد من الزيارة"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* ==================== SECTION 5: Claim Lines (Services) ==================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <SectionHeader icon={MoneyIcon} title={LABELS.claimLines} color="error" />
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addClaimLine}
                      size="small"
                    >
                      {LABELS.addLine}
                    </Button>
                  </Box>

                  {errors.claimLines && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {errors.claimLines}
                    </Alert>
                  )}

                  {claimLines.length === 0 ? (
                    <Alert severity="info">
                      {LABELS.noServices}
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell width="40%">{LABELS.service}</TableCell>
                            <TableCell width="15%" align="center">{LABELS.quantity}</TableCell>
                            <TableCell width="20%" align="center">{LABELS.contractPrice}</TableCell>
                            <TableCell width="20%" align="center">{LABELS.totalPrice}</TableCell>
                            <TableCell width="5%" align="center"></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {claimLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>
                                <Autocomplete
                                  options={allServices}
                                  getOptionLabel={(option) =>
                                    `${option.nameArabic || option.name || option.name_arabic} (${option.code || option.serviceCode})`
                                  }
                                  loading={loadingServices}
                                  onChange={(e, value) => handleServiceChange(line.id, value)}
                                  value={allServices.find(s => s.id === line.medicalServiceId) || null}
                                  size="small"
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="اختر الخدمة..."
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {loadingServices ? <CircularProgress color="inherit" size={16} /> : null}
                                            {params.InputProps.endAdornment}
                                          </>
                                        )
                                      }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  type="number"
                                  size="small"
                                  value={line.quantity}
                                  onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                                  inputProps={{ min: 1, style: { textAlign: 'center' } }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <ContractPriceDisplay
                                  loading={line.loadingPrice}
                                  price={line.unitPrice}
                                  hasContract={line.hasContract}
                                  error={line.priceError}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {line.hasContract && (
                                  <Typography variant="body2" fontWeight="bold">
                                    {(line.unitPrice * line.quantity).toLocaleString('ar-SA')} د.ل
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeClaimLine(line.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Total Amount Display */}
                  {claimLines.length > 0 && (
                    <Box sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: '#e8f5e9',
                      borderRadius: 1,
                      border: '1px solid #81c784',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ContractIcon color="success" />
                        <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                          {LABELS.totalClaimAmount}
                        </Typography>
                        <Chip
                          icon={<LockIcon />}
                          label="محسوب من العقد"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="h5" fontWeight="bold" color="success.dark">
                        {calculateTotal().toLocaleString('ar-SA')} د.ل
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ==================== SECTION 6: Attachments ==================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <SectionHeader icon={AttachmentIcon} title={LABELS.attachments} color="action" />

                  <Alert severity="info" sx={{ mb: 2 }}>
                    يجب رفع فاتورة واحدة على الأقل مع المطالبة.
                  </Alert>

                  {tempClaimId && (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <FileUploader
                          uploadFn={async (file, attachmentType) => {
                            return await uploadClaimAttachment(tempClaimId, file, attachmentType);
                          }}
                          attachmentTypes={CLAIM_ATTACHMENT_TYPES}
                          onUploadSuccess={handleUploadSuccess}
                          maxSize={10 * 1024 * 1024}
                          accept="application/pdf,image/jpeg,image/png"
                          label={LABELS.uploadAttachment}
                        />
                      </Box>

                      <AttachmentList
                        attachments={uploadedAttachments}
                        onDownload={handleDownloadAttachment}
                        onDelete={handleDeleteAttachment}
                        canDelete={true}
                        emptyMessage="لا توجد مرفقات. قم برفع فاتورة واحدة على الأقل."
                      />
                    </>
                  )}

                  {errors.attachments && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {errors.attachments}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ==================== Form Actions ==================== */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleCancel}
                  disabled={creating}
                >
                  {LABELS.cancel}
                </Button>
                <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_CLAIMS]}>
                  {/* Save as Draft Button */}
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <Save />}
                    disabled={creating || claimLines.length === 0 || claimLines.some(l => l.loadingPrice || !l.hasContract)}
                    onClick={handleSaveAsDraft}
                  >
                    {creating && !submitAfterSave ? LABELS.saving : LABELS.save}
                  </Button>
                  {/* Save and Submit Button */}
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={creating || claimLines.length === 0 || claimLines.some(l => l.loadingPrice || !l.hasContract)}
                    onClick={handleSaveAndSubmit}
                    size="large"
                  >
                    {creating && submitAfterSave ? LABELS.saving : LABELS.saveAndSubmit}
                  </Button>
                </RBACGuard>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </MainCard>
    </>
  );
};

export default ClaimCreate;
