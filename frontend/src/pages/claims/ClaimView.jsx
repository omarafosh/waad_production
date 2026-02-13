import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Receipt as ReceiptIcon,
  MedicalServices as MedicalIcon,
  AttachFile as AttachmentIcon,
  Send as SendIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Replay as ReturnIcon,
  PlayArrow as StartReviewIcon,
  Payment as SettleIcon,
  Visibility as ShowDocsIcon,
  VisibilityOff as HideDocsIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import MainCard from 'components/MainCard';
import { ModernPageHeader, DocumentSidePanel } from 'components/tba';
import { useClaimDetails } from 'hooks/useClaims';
import { FileUploader, AttachmentList } from 'components/upload';
import { uploadClaimAttachment, getClaimAttachments, downloadClaimAttachment, deleteClaimAttachment } from 'services/api/files.service';
import { claimsService } from 'services/api';
// import MedicalDocumentSidePreview from 'components/medical/MedicalDocumentSidePreview';
// import DocumentSideViewer from 'components/documents/DocumentSideViewer';
import DocumentPreviewPanel from 'components/documents/DocumentPreviewPanel';

// Insurance UX Components - Phase B2 Step 2
import { StatusTimeline, AmountComparisonBar, CardStatusBadge, NetworkBadge, getWorkflowSteps } from 'components/insurance';

// Claim Status Mapping for CardStatusBadge
const CLAIM_STATUS_MAP = {
  PENDING_REVIEW: 'PENDING',
  PREAPPROVED: 'ACTIVE',
  APPROVED: 'ACTIVE',
  PARTIALLY_APPROVED: 'ACTIVE',
  REJECTED: 'BLOCKED',
  RETURNED_FOR_INFO: 'SUSPENDED',
  CANCELLED: 'INACTIVE',
  SETTLED: 'ACTIVE'
};

const CLAIM_ATTACHMENT_TYPES = [
  { value: 'INVOICE', label: 'فاتورة' },
  { value: 'MEDICAL_REPORT', label: 'تقرير طبي' },
  { value: 'PRESCRIPTION', label: 'وصفة طبية' },
  { value: 'LAB_RESULT', label: 'نتيجة مختبر' },
  { value: 'XRAY', label: 'أشعة' },
  { value: 'OTHER', label: 'أخرى' }
];

// Helper function to get file icon
const getFileIcon = (fileType) => {
  if (!fileType) return FileIcon;
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return PdfIcon;
  if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')) return ImageIcon;
  return FileIcon;
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const InfoRow = ({ label, value, valueColor }) => (
  <Grid container spacing={2} sx={{ mb: 1.5 }}>
    <Grid item xs={4}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
    </Grid>
    <Grid item xs={8}>
      <Typography variant="body1" color={valueColor || 'text.primary'}>
        {value ?? '-'}
      </Typography>
    </Grid>
  </Grid>
);

const ClaimView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { claim, loading, refresh } = useClaimDetails(id);
  const { enqueueSnackbar } = useSnackbar();

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Document Side Panel state (old)
  const [showDocumentPanel, setShowDocumentPanel] = useState(true);

  // Medical Document Side Preview (new)
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [useSystemCalculation, setUseSystemCalculation] = useState(true);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  // Fetch attachments when claim is loaded
  useEffect(() => {
    if (claim?.id) {
      fetchAttachments();
    }
  }, [claim?.id]);

  const fetchAttachments = async () => {
    if (!claim?.id) return;

    try {
      setLoadingAttachments(true);
      const data = await getClaimAttachments(claim.id);
      setAttachments(data || []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Submit claim for review (DRAFT → SUBMITTED)
  const handleSubmitClaim = useCallback(async () => {
    if (!claim?.id) return;

    setActionLoading(true);
    try {
      await claimsService.submit(claim.id);
      enqueueSnackbar('تم إرسال المطالبة للمراجعة بنجاح', { variant: 'success' });
      if (refresh) refresh();
    } catch (error) {
      console.error('Failed to submit claim:', error);
      const errorMessage = error.response?.data?.message || 'فشل في إرسال المطالبة';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  }, [claim?.id, enqueueSnackbar, refresh]);

  // Start review (SUBMITTED → UNDER_REVIEW)
  const handleStartReview = useCallback(async () => {
    if (!claim?.id) return;

    setActionLoading(true);
    try {
      await claimsService.startReview(claim.id);
      enqueueSnackbar('تم استلام المطالبة للمراجعة', { variant: 'success' });
      if (refresh) refresh();
    } catch (error) {
      console.error('Failed to start review:', error);
      const errorMessage = error.response?.data?.message || 'فشل في بدء المراجعة';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  }, [claim?.id, enqueueSnackbar, refresh]);

  // Approve claim - Open dialog with cost breakdown
  const handleApprove = useCallback(async () => {
    if (!claim?.id) return;

    setApprovalNotes('');
    setUseSystemCalculation(true);
    setCostBreakdown(null);

    // Fetch cost breakdown from backend
    try {
      const breakdown = await claimsService.getCostBreakdown(claim.id);
      setCostBreakdown(breakdown);
      // Pre-fill with system-calculated net provider amount (what insurance pays)
      if (breakdown?.netProviderAmount != null) {
        setApprovedAmount(breakdown.netProviderAmount.toString());
      } else {
        setApprovedAmount(claim?.requestedAmount?.toString() || '');
      }
    } catch (error) {
      console.error('Error fetching cost breakdown:', error);
      // Fallback to requested amount if breakdown fails
      setApprovedAmount(claim?.requestedAmount?.toString() || '');
    }

    setApproveDialogOpen(true);
  }, [claim?.id, claim?.requestedAmount]);

  // Confirm approval (Split-Phase with Polling)
  const handleApproveConfirm = useCallback(async () => {
    if (!claim?.id) return;

    // When using system calculation, approvedAmount is not required
    // Otherwise, validate the manual amount
    if (!useSystemCalculation) {
      if (!approvedAmount) {
        enqueueSnackbar('المبلغ المعتمد مطلوب', { variant: 'error' });
        return;
      }
      const amount = parseFloat(approvedAmount);
      if (isNaN(amount) || amount <= 0) {
        enqueueSnackbar('المبلغ المعتمد يجب أن يكون رقم موجب', { variant: 'error' });
        return;
      }
    }

    setActionLoading(true);
    try {
      const amount = approvedAmount ? parseFloat(approvedAmount) : null;

      // Phase 1: Request approval (returns immediately with APPROVAL_IN_PROGRESS)
      const response = await claimsService.approve(claim.id, {
        approvedAmount: useSystemCalculation ? null : amount,
        notes: approvalNotes || undefined,
        useSystemCalculation
      });

      // Close dialog and show processing message
      setApproveDialogOpen(false);
      setApprovedAmount('');
      setApprovalNotes('');
      enqueueSnackbar('جاري معالجة الموافقة...', { variant: 'info' });

      // Phase 2: Poll for final status
      const pollInterval = setInterval(async () => {
        try {
          const updated = await claimsService.getById(claim.id);

          if (updated.status === 'APPROVED') {
            clearInterval(pollInterval);
            setActionLoading(false);
            enqueueSnackbar('تمت الموافقة على المطالبة بنجاح', { variant: 'success' });
            if (refresh) refresh();
          } else if (updated.status === 'REJECTED') {
            clearInterval(pollInterval);
            setActionLoading(false);
            enqueueSnackbar('تم رفض المطالبة: ' + (updated.reviewerComment || 'خطأ في المعالجة'), { variant: 'error' });
            if (refresh) refresh();
          }
          // If still APPROVAL_IN_PROGRESS, continue polling
        } catch (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(pollInterval);
          setActionLoading(false);
          enqueueSnackbar('خطأ في التحقق من حالة الموافقة', { variant: 'error' });
        }
      }, 3000); // Poll every 3 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (actionLoading) {
          setActionLoading(false);
          enqueueSnackbar('انتهت مهلة معالجة الموافقة. يرجى تحديث الصفحة للتحقق من الحالة.', { variant: 'warning' });
          if (refresh) refresh();
        }
      }, 120000);

    } catch (error) {
      console.error('Failed to approve claim:', error);
      const errorMessage = error.response?.data?.message || error?.message || 'فشل في الموافقة على المطالبة';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setActionLoading(false);
    }
  }, [claim?.id, approvedAmount, approvalNotes, useSystemCalculation, enqueueSnackbar, refresh, actionLoading]);

  // Reject claim with reason
  const handleRejectConfirm = useCallback(async () => {
    if (!claim?.id || !rejectReason.trim()) return;

    setActionLoading(true);
    try {
      await claimsService.reject(claim.id, { rejectionReason: rejectReason });
      enqueueSnackbar('تم رفض المطالبة', { variant: 'success' });
      setRejectDialogOpen(false);
      setRejectReason('');
      if (refresh) refresh();
    } catch (error) {
      console.error('Failed to reject claim:', error);
      const errorMessage = error.response?.data?.message || 'فشل في رفض المطالبة';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  }, [claim?.id, rejectReason, enqueueSnackbar, refresh]);

  // Return for info with reason
  const handleReturnForInfoConfirm = useCallback(async () => {
    if (!claim?.id || !returnReason.trim()) return;

    setActionLoading(true);
    try {
      await claimsService.returnForInfo(claim.id, {
        reason: returnReason,
        requiredDocuments: requiredDocuments || undefined
      });
      enqueueSnackbar('تم إعادة المطالبة لطلب معلومات إضافية', { variant: 'success' });
      setReturnDialogOpen(false);
      setReturnReason('');
      setRequiredDocuments('');
      if (refresh) refresh();
    } catch (error) {
      console.error('Failed to return claim for info:', error);
      const errorMessage = error.response?.data?.message || 'فشل في إعادة المطالبة';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  }, [claim?.id, returnReason, requiredDocuments, enqueueSnackbar, refresh]);

  // Settle claim - Open dialog
  const handleSettle = useCallback(() => {
    if (!claim?.id) return;
    setPaymentReference('');
    setSettlementNotes('');
    setSettleDialogOpen(true);
  }, [claim?.id]);

  // Confirm settlement
  const handleSettleConfirm = useCallback(async () => {
    if (!claim?.id || !paymentReference.trim()) return;

    setActionLoading(true);
    try {
      await claimsService.settle(claim.id, {
        paymentReference: paymentReference.trim(),
        notes: settlementNotes || undefined
      });
      enqueueSnackbar('تمت تسوية المطالبة بنجاح', { variant: 'success' });
      setSettleDialogOpen(false);
      setPaymentReference('');
      setSettlementNotes('');
      if (refresh) refresh();
    } catch (error) {
      console.error('Failed to settle claim:', error);
      const errorMessage = error.response?.data?.message || 'فشل في تسوية المطالبة';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  }, [claim?.id, paymentReference, settlementNotes, enqueueSnackbar, refresh]);

  // Helper to check if action is allowed based on Backend response
  const isActionAllowed = (targetStatus) => {
    return claim?.allowedNextStatuses?.includes(targetStatus);
  };

  const handleUploadSuccess = () => {
    fetchAttachments();
  };

  const handleDownload = async (attachmentId) => {
    return await downloadClaimAttachment(claim.id, attachmentId);
  };

  const handleDelete = async (attachmentId) => {
    try {
      await deleteClaimAttachment(claim.id, attachmentId);
      await fetchAttachments();
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  // Medical Document Preview Handler
  const handlePreviewDocument = useCallback((attachment) => {
    if (!attachment) return;

    // Build file key for preview endpoint
    // Format: /api/files/{folder}/{filename}/preview
    const fileKey = attachment.fileKey || `claims/${attachment.fileName || attachment.id}`;

    setPreviewDocument({
      id: attachment.id,
      name: attachment.fileName || attachment.originalFileName || 'مستند طبي',
      type: attachment.contentType || attachment.mimeType,
      mimeType: attachment.contentType || attachment.mimeType,
      fileKey: fileKey,
      description: CLAIM_ATTACHMENT_TYPES.find(t => t.value === attachment.attachmentType)?.label
    });
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewDocument(null);
  }, []);

  const handleToggleFocus = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  // Build download URL for document preview
  const buildDocumentPreviewUrl = useCallback(
    async (document) => {
      if (!claim?.id || !document?.id) {
        console.warn('Missing claim ID or document ID for preview');
        return null;
      }
      try {const blob = await downloadClaimAttachment(claim.id, document.id);
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error('Error building preview URL:', err);
        // Return null instead of throwing to prevent panel crash
        return null;
      }
    },
    [claim?.id]
  );

  // Convert attachments to document panel format
  const documentPanelData = attachments.map((att) => ({
    id: att.id,
    documentType: att.attachmentType || att.type,
    documentTypeLabel: CLAIM_ATTACHMENT_TYPES.find((t) => t.value === (att.attachmentType || att.type))?.label || att.attachmentType,
    status: att.status || 'UPLOADED',
    fileName: att.fileName || att.originalFileName,
    fileSize: att.fileSize || att.size,
    fileType: att.contentType || att.mimeType,
    mimeType: att.contentType || att.mimeType,
    rejectionReason: att.rejectionReason
  }));

  if (loading) {
    return (
      <MainCard title="تفاصيل المطالبة">
        <Typography>جاري التحميل...</Typography>
      </MainCard>
    );
  }

  if (!claim) {
    return (
      <MainCard title="تفاصيل المطالبة">
        <Typography>المطالبة غير موجودة</Typography>
      </MainCard>
    );
  }

  // Get workflow steps for timeline
  const timelineSteps = getWorkflowSteps('claim', claim?.status, 'ar');

  return (
    <>
      <ModernPageHeader
        title={`مطالبة ${claim?.claimNumber ?? `#${claim?.id}` ?? '-'}`}
        subtitle={claim?.memberName ?? claim?.memberFullName ?? '-'}
        icon={ReceiptIcon}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المطالبات', href: '/claims' },
          { label: `مطالبة ${claim?.claimNumber ?? `#${claim?.id}` ?? '-'}` }
        ]}
        actions={
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <CardStatusBadge
              status={CLAIM_STATUS_MAP[claim?.status] ?? 'PENDING'}
              customLabel={claim?.statusLabel}
              size="medium"
              variant="detailed"
            />

            {/* Backend-Driven Actions - Based on allowedNextStatuses */}

            {/* Submit Button - DRAFT → SUBMITTED */}
            {isActionAllowed('SUBMITTED') && (
              <Button
                variant="contained"
                color="primary"
                startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSubmitClaim}
                disabled={actionLoading}
              >
                إرسال للمراجعة
              </Button>
            )}

            {/* Start Review - SUBMITTED → UNDER_REVIEW */}
            {isActionAllowed('UNDER_REVIEW') && (
              <Button
                variant="contained"
                color="info"
                startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <StartReviewIcon />}
                onClick={handleStartReview}
                disabled={actionLoading}
              >
                استلام للمراجعة
              </Button>
            )}

            {/* Approve - UNDER_REVIEW → APPROVED */}
            {(isActionAllowed('APPROVED') || claim?.status === 'UNDER_REVIEW') && (
              <Button variant="contained" color="success" startIcon={<ApproveIcon />} onClick={handleApprove} disabled={actionLoading}>
                موافقة
              </Button>
            )}

            {/* Reject - UNDER_REVIEW → REJECTED */}
            {isActionAllowed('REJECTED') && (
              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => setRejectDialogOpen(true)}
                disabled={actionLoading}
              >
                رفض
              </Button>
            )}

            {/* Return for Info - UNDER_REVIEW → RETURNED_FOR_INFO */}
            {isActionAllowed('RETURNED_FOR_INFO') && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ReturnIcon />}
                onClick={() => setReturnDialogOpen(true)}
                disabled={actionLoading}
              >
                طلب معلومات إضافية
              </Button>
            )}

            {/* Settle - APPROVED → SETTLED */}
            {isActionAllowed('SETTLED') && (
              <Button variant="contained" color="success" startIcon={<SettleIcon />} onClick={handleSettle} disabled={actionLoading}>
                تسوية
              </Button>
            )}

            {/* Edit - Only if canEdit is true from Backend */}
            {claim?.canEdit && (
              <Button variant="contained" startIcon={<Edit />} onClick={() => navigate(`/claims/edit/${id}`)}>
                تعديل
              </Button>
            )}

            {/* Toggle Document Panel */}
            <Tooltip title={showDocumentPanel ? 'إخفاء المستندات' : 'عرض المستندات'}>
              <IconButton
                onClick={() => setShowDocumentPanel((prev) => !prev)}
                color={showDocumentPanel ? 'primary' : 'default'}
                sx={{
                  bgcolor: showDocumentPanel ? 'primary.lighter' : 'grey.100',
                  '&:hover': { bgcolor: showDocumentPanel ? 'primary.light' : 'grey.200' }
                }}
              >
                {showDocumentPanel ? <HideDocsIcon /> : <ShowDocsIcon />}
              </IconButton>
            </Tooltip>

            <Button startIcon={<ArrowBack />} onClick={() => navigate('/claims/inbox')}>
              عودة
            </Button>
          </Stack>
        }
      />

      {/* ===================== SPLIT VIEW LAYOUT ===================== */}
      <Grid container spacing={2}>
        {/* Left Panel - Claim Details */}
        <Grid item xs={12} md={showDocumentPanel ? 7 : 12}>
          <MainCard>
            <Stack spacing={3}>
              {/* ===================== CLAIM TIMELINE ===================== */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    مسار المطالبة
                  </Typography>
                  {/* Insurance UX - StatusTimeline */}
                  <StatusTimeline
                    steps={timelineSteps}
                    currentStep={claim?.status}
                    variant="horizontal"
                    size="medium"
                    showDates={true}
                    language="ar"
                  />
                </CardContent>
              </Card>

              <Grid container spacing={3}>
                {/* ===================== BASIC INFORMATION ===================== */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        المعلومات الأساسية
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <InfoRow label="رقم المطالبة" value={claim?.claimNumber || `CLM-${claim?.id}`} />
                      <InfoRow label="المؤمَّن عليه" value={claim?.memberName ?? claim?.memberFullName} />
                      <InfoRow label="الرقم الوطني" value={claim?.memberNationalNumber} />
                      <InfoRow label="جهة العمل" value={claim?.employerName ?? '-'} />

                      {/* PreAuthorization Link */}
                      {claim?.preApprovalId && (
                        <Grid container spacing={2} sx={{ mb: 1.5 }}>
                          <Grid item xs={4}>
                            <Typography variant="subtitle2" color="text.secondary">
                              الموافقة المسبقة
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={claim?.preApprovalReferenceNumber || `PA-${claim.preApprovalId}`}
                                color="success"
                                size="small"
                                icon={<MedicalIcon />}
                                onClick={() => navigate(`/pre-approvals/${claim.preApprovalId}`)}
                                sx={{ cursor: 'pointer' }}
                              />
                              {claim?.preApprovalStatus && (
                                <Typography variant="caption" color="success.main">
                                  ({claim.preApprovalStatus})
                                </Typography>
                              )}
                            </Stack>
                          </Grid>
                        </Grid>
                      )}

                      {/* NOTE: InsuranceCompany/Policy/Package fields REMOVED - Use BenefitPolicy via member only */}
                    </CardContent>
                  </Card>
                </Grid>

                {/* ===================== MEDICAL INFORMATION ===================== */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <MedicalIcon color="primary" fontSize="small" />
                        <Typography variant="h6">المعلومات الطبية</Typography>
                      </Stack>
                      <Divider sx={{ mb: 2 }} />

                      {/* Provider with NetworkBadge */}
                      <Grid container spacing={2} sx={{ mb: 1.5 }}>
                        <Grid item xs={4}>
                          <Typography variant="subtitle2" color="text.secondary">
                            مقدم الخدمة
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body1">{claim?.providerName ?? '-'}</Typography>
                            {/* Insurance UX - NetworkBadge */}
                            <NetworkBadge networkTier={claim?.networkTier ?? 'IN_NETWORK'} size="small" variant="chip" language="ar" />
                          </Stack>
                        </Grid>
                      </Grid>

                      <InfoRow label="الطبيب" value={claim?.doctorName} />
                      <InfoRow label="التشخيص" value={claim?.diagnosis} />
                      <InfoRow
                        label="تاريخ الزيارة"
                        value={claim?.visitDate ? new Date(claim.visitDate).toLocaleDateString('ar-SA') : '-'}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* ===================== FINANCIAL BREAKDOWN ===================== */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        الملخص المالي
                      </Typography>
                      <Divider sx={{ mb: 3 }} />

                      {/* Insurance UX - AmountComparisonBar */}
                      <AmountComparisonBar
                        requestedAmount={typeof claim?.requestedAmount === 'number' ? claim.requestedAmount : 0}
                        approvedAmount={
                          // If claim is not yet decided (APPROVED/REJECTED/SETTLED), show full amount as potentially approved
                          // This prevents showing "Rejected Amount" before a decision is made
                          ['APPROVED', 'SETTLED', 'REJECTED'].includes(claim?.status)
                            ? typeof claim?.approvedAmount === 'number'
                              ? claim.approvedAmount
                              : 0
                            : typeof claim?.requestedAmount === 'number'
                              ? claim.requestedAmount
                              : 0
                        }
                        currency="LYD"
                        copayPercentage={typeof claim?.copayPercentage === 'number' ? claim.copayPercentage : 0}
                        deductible={typeof claim?.deductible === 'number' ? claim.deductible : 0}
                        showBreakdown={true}
                        size="medium"
                        language="ar"
                        status={claim?.status}
                      />

                      {/* Reviewer Comment */}
                      {claim?.reviewerComment && (
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            تعليق المراجع
                          </Typography>
                          <Typography variant="body2">{claim.reviewerComment}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* ===================== SETTLEMENT INFORMATION ===================== */}
                {(claim?.status === 'SETTLED' || claim?.settlementBatchId) && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ bgcolor: 'success.lighter', borderColor: 'success.light' }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <SettleIcon color="success" />
                          <Typography variant="h6" color="success.dark">معلومات التسوية المالية</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2, borderColor: 'success.light' }} />
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <InfoRow label="رقم الدفعة" value={claim.settlementBatchId ? `#${claim.settlementBatchId}` : '-'} />
                            <InfoRow label="تاريخ التسوية" value={claim.settlementDate ? new Date(claim.settlementDate).toLocaleDateString('ar-SA') : '-'} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <InfoRow label="مرجع الدفع" value={claim.paymentReference || '-'} />
                            <InfoRow label="طريقة الدفع" value={claim.paymentMethod || 'تحويل بنكي'} />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* ===================== SERVICE LINES ===================== */}
                {Array.isArray(claim?.lines) && claim.lines.length > 0 && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <MedicalIcon color="primary" fontSize="small" />
                          <Typography variant="h6">الخدمات الطبية ({claim.lines.length})</Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  كود الخدمة
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  الوصف
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  الكمية
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  سعر الوحدة
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  المجموع
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {claim.lines.map((line, index) => (
                                <TableRow key={line?.id ?? index} hover>
                                  <TableCell align="right">
                                    <Chip label={line?.serviceCode ?? '-'} size="small" variant="outlined" color="primary" />
                                  </TableCell>
                                  <TableCell align="right">{line?.description ?? '-'}</TableCell>
                                  <TableCell align="center">{line?.quantity ?? 1}</TableCell>
                                  <TableCell align="right">
                                    {typeof line?.unitPrice === 'number'
                                      ? line.unitPrice.toLocaleString('ar-SA', { minimumFractionDigits: 2 })
                                      : '-'}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography fontWeight={500}>
                                      {typeof line?.totalPrice === 'number'
                                        ? line.totalPrice.toLocaleString('ar-SA', { minimumFractionDigits: 2 })
                                        : '-'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* ===================== ATTACHMENTS - DocumentsLibrary Style ===================== */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AttachmentIcon color="primary" />
                          <Typography variant="h6">المرفقات ({attachments.length})</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="تحديث">
                            <IconButton size="small" onClick={fetchAttachments} disabled={loadingAttachments}>
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                      <Divider sx={{ mb: 2 }} />

                      {/* File Uploader */}
                      <Box sx={{ mb: 3 }}>
                        <FileUploader
                          uploadFn={async (file, attachmentType) => {
                            return await uploadClaimAttachment(claim.id, file, attachmentType);
                          }}
                          attachmentTypes={CLAIM_ATTACHMENT_TYPES}
                          onUploadSuccess={handleUploadSuccess}
                          maxSize={10 * 1024 * 1024} // 10MB
                          accept="application/pdf,image/jpeg,image/png"
                          label="رفع مرفق جديد"
                        />
                      </Box>

                      {/* Attachments List - DocumentsLibrary Style */}
                      {loadingAttachments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress />
                        </Box>
                      ) : attachments.length === 0 ? (
                        <Alert severity="info">لا توجد مرفقات لهذه المطالبة</Alert>
                      ) : (
                        <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                          {attachments.map((att, index) => {
                            const FileTypeIcon = getFileIcon(att.fileType || att.contentType);
                            const typeLabel =
                              CLAIM_ATTACHMENT_TYPES.find((t) => t.value === att.attachmentType)?.label || att.attachmentType || 'مرفق';

                            return (
                              <ListItem
                                key={att.id || index}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  mb: 1,
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <ListItemIcon>
                                  <FileTypeIcon color="primary" sx={{ fontSize: 40 }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Typography variant="body1" fontWeight={500}>
                                        {att.fileName || att.originalFileName || `مرفق ${index + 1}`}
                                      </Typography>
                                      <Chip label={typeLabel} size="small" color="primary" variant="outlined" />
                                    </Stack>
                                  }
                                  secondary={
                                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(att.fileSize || att.size)}
                                      </Typography>
                                      {att.createdAt && (
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(att.createdAt).toLocaleDateString('ar-LY')}
                                        </Typography>
                                      )}
                                    </Stack>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="معاينة">
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handlePreviewDocument(att)}
                                      >
                                        <ShowDocsIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="تحميل">
                                      <IconButton
                                        size="small"
                                        color="info"
                                        onClick={async () => {
                                          try {
                                            const blob = await handleDownload(att.id);
                                            if (blob) {
                                              const url = window.URL.createObjectURL(blob);
                                              const a = document.createElement('a');
                                              a.href = url;
                                              a.download = att.fileName || att.originalFileName || `attachment-${att.id}`;
                                              a.click();
                                              window.URL.revokeObjectURL(url);
                                              enqueueSnackbar('تم تحميل الملف بنجاح', { variant: 'success' });
                                            }
                                          } catch (err) {
                                            console.error('Download error:', err);
                                            enqueueSnackbar('فشل في تحميل الملف', { variant: 'error' });
                                          }
                                        }}
                                      >
                                        <DownloadIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="حذف">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                          if (window.confirm('هل أنت متأكد من حذف هذا المرفق؟')) {
                                            handleDelete(att.id);
                                            enqueueSnackbar('تم حذف المرفق', { variant: 'success' });
                                          }
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </ListItemSecondaryAction>
                              </ListItem>
                            );
                          })}
                        </List>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Stack>
          </MainCard>
        </Grid>

        {/* Right Panel - Document Side Preview (PDF/Image) */}
        {showDocumentPanel && (
          <Grid item xs={12} md={5}>
            <Box sx={{ position: 'sticky', top: 80, height: 'calc(100vh - 100px)' }}>
              {/* If no document selected, show list or empty state */}
              {!previewDocument ? (
                <DocumentSidePanel
                  documents={documentPanelData}
                  loading={loadingAttachments}
                  onRefresh={fetchAttachments}
                  onDocumentSelect={async (doc) => {
                    try {
                      const url = await buildDocumentPreviewUrl(doc);
                      if (url) {
                        setPreviewDocument({
                          fileUrl: url,
                          fileName: doc.fileName,
                          fileType: doc.fileType,
                          mimeType: doc.mimeType
                        });
                      }
                    } catch (e) {
                      console.error('Preview failed', e);
                    }
                  }}
                  downloadUrlBuilder={buildDocumentPreviewUrl}
                  title="المستندات المرفقة"
                  variant="list-only"
                  collapsible={false}
                  defaultExpanded={true}
                  emptyMessage="اختر مستنداً للمعاينة"
                />
              ) : (
                <DocumentPreviewPanel
                  fileUrl={previewDocument.fileUrl}
                  fileType={previewDocument.fileType || previewDocument.mimeType}
                  fileName={previewDocument.fileName}
                  onClose={() => setPreviewDocument(null)}
                />
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {/* ===================== REJECT DIALOG ===================== */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>رفض المطالبة</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            يرجى إدخال سبب رفض المطالبة. هذا الحقل إلزامي.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="سبب الرفض"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            error={rejectReason.length > 0 && rejectReason.length < 10}
            helperText={rejectReason.length > 0 && rejectReason.length < 10 ? 'السبب يجب أن يكون 10 أحرف على الأقل' : ''}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading || rejectReason.length < 10}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <RejectIcon />}
          >
            تأكيد الرفض
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== RETURN FOR INFO DIALOG ===================== */}
      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>طلب معلومات إضافية</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            يرجى توضيح المعلومات الإضافية المطلوبة من صاحب المطالبة.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="سبب طلب المعلومات"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            error={returnReason.length > 0 && returnReason.length < 10}
            helperText={returnReason.length > 0 && returnReason.length < 10 ? 'السبب يجب أن يكون 10 أحرف على الأقل' : ''}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="المستندات المطلوبة (اختياري)"
            value={requiredDocuments}
            onChange={(e) => setRequiredDocuments(e.target.value)}
            placeholder="مثال: صورة من الهوية، تقرير طبي مفصل..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleReturnForInfoConfirm}
            color="warning"
            variant="contained"
            disabled={actionLoading || returnReason.length < 10}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <ReturnIcon />}
          >
            تأكيد الإرسال
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== APPROVE DIALOG ===================== */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>الموافقة على المطالبة</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {/* Cost Breakdown Display */}
          {costBreakdown && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                📊 الحساب التلقائي للمبالغ
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    المبلغ المطلوب:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {costBreakdown.requestedAmount?.toLocaleString()} د.ل
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    نسبة التحمل (Co-Pay):
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">
                    {costBreakdown.coPayPercent?.toFixed(0)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    مبلغ تحمل المستفيد:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {costBreakdown.patientCoPay?.toLocaleString()} د.ل
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    مبلغ التأمين (لمقدم الخدمة):
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {costBreakdown.netProviderAmount?.toLocaleString()} د.ل
                  </Typography>
                </Grid>
                {costBreakdown.deductibleApplied > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      خصم سابق (Deductible):
                    </Typography>
                    <Typography variant="body2">{costBreakdown.deductibleApplied?.toLocaleString()} د.ل</Typography>
                  </Grid>
                )}
              </Grid>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                ✅ المعادلة: {costBreakdown.patientCoPay?.toLocaleString()} + {costBreakdown.netProviderAmount?.toLocaleString()} ={' '}
                {costBreakdown.requestedAmount?.toLocaleString()} د.ل
              </Typography>
            </Paper>
          )}

          {/* System Calculation Toggle */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: useSystemCalculation ? 'success.lighter' : 'grey.100', borderRadius: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useSystemCalculation}
                onChange={(e) => {
                  setUseSystemCalculation(e.target.checked);
                  if (e.target.checked && costBreakdown?.netProviderAmount != null) {
                    setApprovedAmount(costBreakdown.netProviderAmount.toString());
                  }
                }}
                style={{ marginLeft: 8 }}
              />
              <Typography variant="body2" color={useSystemCalculation ? 'success.main' : 'text.secondary'}>
                استخدام الحساب التلقائي (موصى به)
              </Typography>
            </label>
          </Box>

          {!useSystemCalculation && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                المبلغ المطلوب: <strong>{claim?.requestedAmount?.toLocaleString()} د.ل</strong>
              </Typography>
              <TextField
                autoFocus
                fullWidth
                type="number"
                label="المبلغ المعتمد (د.ل) - يدوي"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                error={approvedAmount && (isNaN(parseFloat(approvedAmount)) || parseFloat(approvedAmount) <= 0)}
                helperText={approvedAmount && parseFloat(approvedAmount) <= 0 ? 'المبلغ يجب أن يكون أكبر من صفر' : ''}
                required
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </>
          )}

          <TextField
            fullWidth
            multiline
            rows={2}
            label="ملاحظات (اختياري)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="أي ملاحظات حول الموافقة..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>إلغاء</Button>
          <Button
            onClick={handleApproveConfirm}
            color="success"
            variant="contained"
            disabled={actionLoading || (!useSystemCalculation && (!approvedAmount || parseFloat(approvedAmount) <= 0))}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <ApproveIcon />}
          >
            {actionLoading
              ? 'جاري المعالجة... قد يستغرق دقيقة'
              : useSystemCalculation
                ? 'تأكيد الموافقة (تلقائي)'
                : 'تأكيد الموافقة (يدوي)'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== SETTLE DIALOG ===================== */}
      <Dialog open={settleDialogOpen} onClose={() => setSettleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.dark', color: 'white' }}>تسوية المطالبة</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            المبلغ المعتمد: <strong>{claim?.approvedAmount?.toLocaleString()} د.ل</strong>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="رقم مرجع الدفع"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            error={paymentReference.length > 0 && paymentReference.trim().length < 3}
            helperText={paymentReference.length > 0 && paymentReference.trim().length < 3 ? 'رقم المرجع يجب أن يكون 3 أحرف على الأقل' : ''}
            required
            sx={{ mb: 2 }}
            placeholder="مثال: TRN-2026-001234"
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="ملاحظات التسوية (اختياري)"
            value={settlementNotes}
            onChange={(e) => setSettlementNotes(e.target.value)}
            placeholder="أي ملاحظات حول التسوية..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettleDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleSettleConfirm}
            color="success"
            variant="contained"
            disabled={actionLoading || !paymentReference.trim() || paymentReference.trim().length < 3}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <SettleIcon />}
          >
            تأكيد التسوية
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Preview Panel */}
      <DocumentPreviewPanel
        open={previewOpen}
        onClose={handleClosePreview}
        document={previewDocument}
        onDownload={() => handleDownload(previewDocument?.id)}
      />
    </>
  );
};

export default ClaimView;
