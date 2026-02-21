/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 CLAIM VIEW (MEDICAL REVIEW) - Reference Implementation
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Example implementation of the new Medical Review UX System
 *
 * This is a REFERENCE IMPLEMENTATION showing how to use:
 * - UnifiedAttachmentViewer
 * - MedicalDecisionPanel
 * - MedicalReviewLayout
 *
 * Use this as a template for:
 * - Pre-Authorization View
 * - Approvals View
 * - Any medical review workflow
 *
 * @version 2.0 - Medical Review UX Optimization
 * @date 2026-02-07
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Receipt as ClaimIcon,
  Person as PersonIcon,
  Business as EmployerIcon,
  CreditCard as PolicyIcon,
  MedicalServices as ServiceIcon,
  Assessment as DiagnosisIcon,
  AttachMoney as CostIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// Components
import { ModernPageHeader } from 'components/tba';
import { UnifiedAttachmentViewer, MedicalDecisionPanel, MedicalReviewLayout } from 'components/medical-review';

// Services
import { claimsService } from 'services/api';
import { getClaimAttachments, downloadClaimAttachment } from 'services/api/files.service';

// Utils
import { formatCurrency, formatDate } from 'utils/formatters';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Compact Info Row
 */
const InfoRow = ({ label, value, icon: Icon }) => (
  <Box sx={{ mb: 1.5 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
      {Icon && <Icon sx={{ fontSize: 16, color: 'text.secondary' }} />}
      <Typography variant="caption" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="body2" fontWeight={500}>
      {value || '-'}
    </Typography>
  </Box>
);

/**
 * Collapsible Section Card
 */
const SectionCard = ({ title, icon: Icon, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card
      sx={{
        mb: 2,
        border: 1,
        borderColor: 'divider',
        boxShadow: 1
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: expanded ? 2 : 0, cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {Icon && <Icon color="primary" />}
            <Typography variant="subtitle2" fontWeight={600}>
              {title}
            </Typography>
          </Stack>
          <Chip
            label={expanded ? 'إخفاء' : 'عرض'}
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          />
        </Stack>
        {expanded && children}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClaimViewMedicalReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [claim, setClaim] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch claim data
  useEffect(() => {
    if (id) {
      fetchClaim();
      fetchAttachments();
    }
  }, [id]);

  const fetchClaim = async () => {
    try {
      setLoading(true);
      const data = await claimsService.getById(id);
      setClaim(data);
      setMedicalNotes(data.medicalNotes || '');
    } catch (error) {
      console.error('Error fetching claim:', error);
      enqueueSnackbar('فشل في تحميل المطالبة', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const data = await getClaimAttachments(id);

      // Transform to unified format
      const transformed = (data || []).map((att) => ({
        id: att.id,
        fileName: att.fileName || att.originalFileName,
        fileSize: att.fileSize,
        mimeType: att.contentType || att.mimeType,
        url: `/api/files/${att.fileKey}/preview`,
        downloadUrl: `/api/files/${att.fileKey}/download`
      }));

      setAttachments(transformed);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  // Decision handlers
  const handleApprove = useCallback(
    async (notes) => {
      setSubmitting(true);
      try {
        await claimsService.approve(id, { medicalNotes: notes });
        enqueueSnackbar('تمت الموافقة على المطالبة بنجاح', { variant: 'success' });
        navigate('/claims');
      } catch (error) {
        console.error('Error approving claim:', error);
        enqueueSnackbar(error.message || 'فشل في الموافقة على المطالبة', { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, navigate, enqueueSnackbar]
  );

  const handleReject = useCallback(
    async (notes) => {
      setSubmitting(true);
      try {
        await claimsService.reject(id, { medicalNotes: notes });
        enqueueSnackbar('تم رفض المطالبة', { variant: 'info' });
        navigate('/claims');
      } catch (error) {
        console.error('Error rejecting claim:', error);
        enqueueSnackbar(error.message || 'فشل في رفض المطالبة', { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, navigate, enqueueSnackbar]
  );

  const handleRequestInfo = useCallback(
    async (notes) => {
      setSubmitting(true);
      try {
        await claimsService.requestAdditionalInfo(id, { medicalNotes: notes });
        enqueueSnackbar('تم طلب معلومات إضافية', { variant: 'info' });
        navigate('/claims');
      } catch (error) {
        console.error('Error requesting info:', error);
        enqueueSnackbar(error.message || 'فشل في طلب المعلومات', { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, navigate, enqueueSnackbar]
  );

  const handleDownload = useCallback(
    async (attachment) => {
      try {
        await downloadClaimAttachment(id, attachment.id);
      } catch (error) {
        console.error('Error downloading attachment:', error);
        enqueueSnackbar('فشل في تحميل الملف', { variant: 'error' });
      }
    },
    [id, enqueueSnackbar]
  );

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!claim) {
    return <Alert severity="error">لم يتم العثور على المطالبة</Alert>;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CENTER PANEL - MEDICAL DATA
  // ═══════════════════════════════════════════════════════════════════════
  const centerPanel = (
    <Stack spacing={2}>
      {/* Patient Information */}
      <SectionCard title="معلومات المريض" icon={PersonIcon}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InfoRow label="الاسم الكامل" value={claim.memberName} icon={PersonIcon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="الرقم المدني" value={claim.memberCivilId} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="رقم البطاقة" value={claim.memberCardNumber} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="رقم الجوال" value={claim.memberPhone} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Policy & Coverage */}
      <SectionCard title="بيانات التأمين" icon={PolicyIcon}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InfoRow label="جهة العمل" value={claim.employerName} icon={EmployerIcon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="رقم البوليصة" value={claim.policyNumber} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="نوع التغطية" value={claim.coverageType} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="تاريخ المطالبة" value={formatDate(claim.claimDate)} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Services Requested */}
      <SectionCard title="الخدمات المطلوبة" icon={ServiceIcon}>
        {claim.services && claim.services.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableBody>
                {claim.services.map((service, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {service.serviceName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        كود: {service.serviceCode}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {service.quantity} × {formatCurrency(service.unitPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {formatCurrency(service.totalAmount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            لا توجد خدمات
          </Typography>
        )}
      </SectionCard>

      {/* Diagnosis */}
      <SectionCard title="التشخيص" icon={DiagnosisIcon}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InfoRow label="التشخيص الأساسي" value={claim.primaryDiagnosis} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="ICD Code" value={claim.icdCode} />
          </Grid>
          {claim.secondaryDiagnosis && (
            <Grid item xs={12}>
              <InfoRow label="تشخيص ثانوي" value={claim.secondaryDiagnosis} />
            </Grid>
          )}
        </Grid>
      </SectionCard>

      {/* Cost Summary */}
      <SectionCard title="ملخص التكاليف" icon={CostIcon}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">المبلغ المطالب به</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(claim.claimedAmount)}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">المبلغ الموافق عليه</Typography>
            <Typography variant="body2" fontWeight={600} color="success.main">
              {formatCurrency(claim.approvedAmount || 0)}
            </Typography>
          </Box>
          {claim.copayAmount > 0 && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">التحمل</Typography>
                <Typography variant="body2" fontWeight={600} color="warning.main">
                  {formatCurrency(claim.copayAmount)}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );

  return (
    <>
      {/* Page Header */}
      <ModernPageHeader
        title={`مطالبة رقم ${claim.claimNumber}`}
        subtitle="مراجعة طبية"
        icon={ClaimIcon}
        breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'المطالبات', href: '/claims' }, { label: `#${claim.claimNumber}` }]}
      />

      {/* 3-Panel Medical Review Layout */}
      <MedicalReviewLayout
        leftPanel={
          <UnifiedAttachmentViewer
            attachments={attachments}
            loading={false}
            onDownload={handleDownload}
            onRefresh={fetchAttachments}
            emptyMessage="لا توجد مستندات مرفقة بهذه المطالبة"
          />
        }
        centerPanel={centerPanel}
        rightPanel={
          <MedicalDecisionPanel
            status={claim.status}
            notes={medicalNotes}
            onNotesChange={setMedicalNotes}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestInfo={handleRequestInfo}
            loading={submitting}
            disabled={submitting || claim.status === 'APPROVED' || claim.status === 'REJECTED'}
            canApprove={claim.status !== 'APPROVED'}
            canReject={claim.status !== 'REJECTED'}
            confirmApprove={true}
            confirmReject={true}
          />
        }
        documentsCount={attachments.length}
        showLeftPanel={true}
        showRightPanel={true}
        collapsible={true}
      />
    </>
  );
};

export default ClaimViewMedicalReview;
