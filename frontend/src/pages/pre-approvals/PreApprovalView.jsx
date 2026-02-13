import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, CircularProgress, Divider, Grid, Paper, Stack, Typography, Alert } from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack,
  AssignmentTurnedIn as PreApprovalIcon,
  MedicalServices as MedicalIcon,
  AttachFile as AttachmentIcon,
  Receipt as ClaimIcon,
  Timeline as TimelineIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { usePreApprovalDetails } from 'hooks/usePreApprovals';
import { FileUploader, AttachmentList } from 'components/upload';
import {
  uploadPreAuthAttachment,
  getPreAuthAttachments,
  downloadPreAuthAttachment,
  deletePreAuthAttachment
} from 'services/api/files.service';

// Insurance UX Components - Phase B2 Step 3
import {
  StatusTimeline,
  CardStatusBadge,
  PriorityBadge,
  ValidityCountdown,
  AmountComparisonBar,
  getWorkflowSteps
} from 'components/insurance';

// Pre-Approval Status Mapping for CardStatusBadge
const PREAPPROVAL_STATUS_MAP = {
  PENDING: 'PENDING',
  REQUESTED: 'PENDING',
  UNDER_REVIEW: 'PENDING',
  PENDING_DOCUMENTS: 'SUSPENDED',
  APPROVED: 'ACTIVE',
  REJECTED: 'BLOCKED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'INACTIVE'
};

// Arabic labels for statuses
const STATUS_LABELS = {
  PENDING: 'قيد المراجعة',
  REQUESTED: 'تم الإرسال',
  UNDER_REVIEW: 'قيد المراجعة الطبية',
  PENDING_DOCUMENTS: 'مطلوب مستندات',
  APPROVED: 'تمت الموافقة',
  REJECTED: 'مرفوض',
  EXPIRED: 'منتهية الصلاحية',
  CANCELLED: 'ملغى'
};

// Helper Info Row Component
const InfoRow = ({ label, value, valueColor }) => (
  <Grid container spacing={2} sx={{ mb: 1.5 }}>
    <Grid item xs={12} sm={4}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
    </Grid>
    <Grid item xs={12} sm={8}>
      <Typography variant="body1" color={valueColor || 'text.primary'}>
        {value ?? '-'}
      </Typography>
    </Grid>
  </Grid>
);

const PreApprovalView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { preApproval, loading, error } = usePreApprovalDetails(id);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Fetch attachments when preApproval loads
  const fetchAttachments = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingAttachments(true);
      const result = await getPreAuthAttachments(id);
      setAttachments(result?.data || result || []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAttachments();
    }
  }, [id, fetchAttachments]);

  // Upload success handler
  const handleUploadSuccess = async () => {
    await fetchAttachments();
  };

  // Download attachment
  const handleDownloadAttachment = async (attachmentId) => {
    try {
      const blob = await downloadPreAuthAttachment(id, attachmentId);
      const attachment = attachments.find(a => a.id === attachmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment?.fileName || attachment?.originalFileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading attachment:', err);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deletePreAuthAttachment(id, attachmentId);
      await fetchAttachments();
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/pre-approvals/edit/${id}`);
  };

  const handleBack = () => {
    navigate('/pre-approvals');
  };

  const handleViewAudit = () => {
    navigate(`/pre-approvals/${id}/audit`);
  };

  // Placeholder for Convert to Claim (UI only - no logic)
  const handleConvertToClaim = () => {
    // TODO: Implement in future phase
  };

  if (loading) {
    return (
      <MainCard>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard>
        <Alert severity="error">{error}</Alert>
      </MainCard>
    );
  }

  if (!preApproval) {
    return (
      <MainCard>
        <Alert severity="warning">لم يتم العثور على الطلب</Alert>
      </MainCard>
    );
  }

  // Get workflow steps for timeline
  const timelineSteps = getWorkflowSteps('preapproval', preApproval?.status, 'ar');

  return (
    <>
      <ModernPageHeader
        title={`طلب موافقة مسبقة ${preApproval?.referenceNumber ?? `#${preApproval?.id}` ?? '-'}`}
        subtitle={preApproval?.memberName ?? preApproval?.member?.fullName ?? '-'}
        icon={PreApprovalIcon}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الموافقات المسبقة', href: '/pre-approvals' },
          { label: `طلب ${preApproval?.referenceNumber ?? `#${preApproval?.id}` ?? '-'}` }
        ]}
        actions={
          <Stack direction="row" spacing={2} alignItems="center">
            <CardStatusBadge
              status={PREAPPROVAL_STATUS_MAP[preApproval?.status] ?? 'PENDING'}
              customLabel={STATUS_LABELS[preApproval?.status] ?? preApproval?.status}
              size="medium"
              variant="detailed"
            />
            <PriorityBadge
              priority={preApproval?.priority ?? 'ROUTINE'}
              size="medium"
              variant="chip"
              showResponseTime={false}
              language="ar"
            />
            <Button variant="outlined" startIcon={<TimelineIcon />} onClick={handleViewAudit}>
              سجل التدقيق
            </Button>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack}>
              رجوع
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              تعديل
            </Button>
          </Stack>
        }
      />
      <MainCard>
        <Stack spacing={2}>
          {/* ===================== WORKFLOW TIMELINE ===================== */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                مسار الطلب
              </Typography>
              {/* Insurance UX - StatusTimeline */}
              <StatusTimeline
                steps={timelineSteps}
                currentStep={preApproval?.status === 'PENDING' ? 'MEDICAL_REVIEW' : preApproval?.status}
                variant="horizontal"
                size="medium"
                showDates={true}
                language="ar"
              />
            </CardContent>
          </Card>

          {/* ===================== VALIDITY COUNTDOWN (APPROVED ONLY) ===================== */}
          {preApproval?.status === 'APPROVED' && (
            <Card variant="outlined" sx={{ bgcolor: 'success.lighter', borderColor: 'success.light' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  صلاحية الموافقة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {/* Insurance UX - ValidityCountdown */}
                <ValidityCountdown
                  approvalDate={preApproval?.reviewedAt ?? preApproval?.updatedAt ?? preApproval?.createdAt}
                  validityDays={preApproval?.validityDays ?? 30}
                  status={preApproval?.status}
                  showAction={true}
                  showProgress={true}
                  onConvertToClaim={handleConvertToClaim}
                  size="medium"
                  language="ar"
                />
              </CardContent>
            </Card>
          )}

          <Grid container spacing={2}>
            {/* ===================== BASIC INFORMATION ===================== */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    المعلومات الأساسية
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <InfoRow label="رقم الطلب" value={preApproval?.referenceNumber || `PA-${preApproval?.id}`} />
                  <InfoRow label="المؤمَّن عليه" value={preApproval?.memberName ?? preApproval?.member?.fullName} />
                  <InfoRow label="الرقم الوطني" value={preApproval?.memberNationalNumber ?? preApproval?.member?.nationalNumber} />
                  <InfoRow label="رقم البطاقة" value={preApproval?.memberCardNumber ?? '-'} />
                  <InfoRow label="جهة العمل" value={preApproval?.member?.employerName ?? preApproval?.employerName ?? '-'} />
                  {/* NOTE: InsuranceCompany/InsurancePolicy/BenefitPackage fields REMOVED - Use BenefitPolicy only */}
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
                  <InfoRow label="مقدم الخدمة" value={preApproval?.providerName} />
                  <InfoRow label="الخدمة" value={preApproval?.serviceName ?? preApproval?.serviceCode ?? '-'} />
                  <InfoRow label="التشخيص" value={preApproval?.diagnosisDescription ?? preApproval?.diagnosisCode ?? '-'} />
                  <InfoRow label="سعر العقد" value={preApproval?.contractPrice ? `${Number(preApproval.contractPrice).toFixed(2)} د.ل` : '-'} valueColor="primary.main" />
                </CardContent>
              </Card>
            </Grid>

            {/* ===================== ATTACHMENTS SECTION ===================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <AttachmentIcon color="primary" fontSize="small" />
                    <Typography variant="h6">المرفقات والمستندات</Typography>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />

                  {/* Upload Section - Only for non-finalized statuses */}
                  {preApproval?.status !== 'APPROVED' && preApproval?.status !== 'REJECTED' && preApproval?.status !== 'CANCELLED' && (
                    <Box sx={{ mb: 3 }}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          يمكنك رفع المستندات الداعمة مثل التقارير الطبية، الفحوصات، الأشعة وغيرها
                        </Typography>
                      </Alert>
                      <FileUploader
                        uploadFn={async (file, attachmentType) => {
                          return await uploadPreAuthAttachment(id, file, attachmentType);
                        }}
                        attachmentTypes={[
                          { value: 'MEDICAL_REPORT', label: 'تقرير طبي' },
                          { value: 'LAB_RESULT', label: 'نتائج مختبر' },
                          { value: 'RADIOLOGY', label: 'أشعة / تصوير' },
                          { value: 'PRESCRIPTION', label: 'وصفة طبية' },
                          { value: 'REFERRAL', label: 'تحويل طبي' },
                          { value: 'OTHER', label: 'مستند آخر' }
                        ]}
                        onUploadSuccess={handleUploadSuccess}
                        maxSize={10 * 1024 * 1024}
                        accept="application/pdf,image/jpeg,image/png"
                        label="رفع مستند داعم"
                      />
                    </Box>
                  )}

                  {/* Attachments List */}
                  {loadingAttachments ? (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <AttachmentList
                      attachments={attachments}
                      onDownload={handleDownloadAttachment}
                      onDelete={handleDeleteAttachment}
                      canDelete={preApproval?.status !== 'APPROVED' && preApproval?.status !== 'REJECTED' && preApproval?.status !== 'CANCELLED'}
                      emptyMessage="لا توجد مرفقات. يمكنك رفع المستندات الداعمة من الأعلى."
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ===================== FINANCIAL INFORMATION ===================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    المعلومات المالية والموافقة
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  {/* Insurance UX - AmountComparisonBar */}
                  <AmountComparisonBar
                    requestedAmount={typeof preApproval?.requestedAmount === 'number' ? preApproval.requestedAmount : 0}
                    approvedAmount={typeof preApproval?.approvedAmount === 'number' ? preApproval.approvedAmount : 0}
                    currency="د.ل"
                    copayPercentage={typeof preApproval?.copayPercentage === 'number' ? preApproval.copayPercentage : 0}
                    deductible={typeof preApproval?.deductible === 'number' ? preApproval.deductible : 0}
                    showBreakdown={true}
                    size="medium"
                    language="ar"
                    status={preApproval?.status}
                  />

                  {/* Reviewer Comment */}
                  {preApproval?.reviewerComment && (
                    <Box
                      sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: preApproval?.status === 'REJECTED' ? 'error.lighter' : 'success.lighter'
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        تعليق المراجع
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {preApproval.reviewerComment}
                      </Typography>
                    </Box>
                  )}

                  {/* Review Date */}
                  {preApproval?.reviewedAt && (
                    <Box sx={{ mt: 2 }}>
                      <InfoRow label="تاريخ المراجعة" value={new Date(preApproval.reviewedAt).toLocaleString('ar-KW')} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* ===================== ACTION HINT (APPROVED ONLY) ===================== */}
            {preApproval?.status === 'APPROVED' && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'info.lighter', borderColor: 'info.light' }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          تحويل إلى مطالبة
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          يمكنك تحويل هذه الموافقة المسبقة إلى مطالبة بعد تقديم الخدمة للمؤمَّن عليه
                        </Typography>
                      </Box>
                      {/* Placeholder button - disabled until implementation */}
                      <Button variant="contained" color="info" startIcon={<ClaimIcon />} disabled sx={{ opacity: 0.7 }}>
                        تحويل إلى مطالبة
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* ===================== AUDIT INFORMATION ===================== */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    معلومات التدقيق
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <InfoRow
                        label="تاريخ الإنشاء"
                        value={preApproval?.createdAt ? new Date(preApproval.createdAt).toLocaleString('ar-KW') : '-'}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <InfoRow
                        label="تاريخ آخر تحديث"
                        value={preApproval?.updatedAt ? new Date(preApproval.updatedAt).toLocaleString('ar-KW') : '-'}
                      />
                    </Grid>
                    {preApproval?.createdBy && (
                      <Grid item xs={12} md={6}>
                        <InfoRow label="أنشئ بواسطة" value={preApproval.createdBy} />
                      </Grid>
                    )}
                    {preApproval?.updatedBy && (
                      <Grid item xs={12} md={6}>
                        <InfoRow label="آخر تحديث بواسطة" value={preApproval.updatedBy} />
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </MainCard>
    </>
  );
};

export default PreApprovalView;
