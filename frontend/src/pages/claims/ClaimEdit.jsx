import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Grid, TextField, MenuItem, Alert,
  Typography, Divider, CircularProgress, InputAdornment,
  Card, CardContent, Chip
} from '@mui/material';
import { ArrowBack, Save, Receipt as ClaimIcon, Info } from '@mui/icons-material';
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { useClaimDetails, useUpdateClaim } from 'hooks/useClaims';
import { useSnackbar } from 'notistack';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLAIM EDIT PAGE (CANONICAL)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ALLOWED UPDATES (as per ClaimUpdateDto):
 * - doctorName (correction)
 * - diagnosisCode/diagnosisDescription (correction)
 * - approvedAmount (reviewer only)
 * - reviewerComment (reviewer only)
 * 
 * NOT ALLOWED (derived from Visit/Contract):
 * - providerName, visitDate, requestedAmount, lines
 * 
 * STATUS CHANGES use dedicated endpoints:
 * - /submit, /start-review, /approve, /reject, /settle
 */
const ClaimEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { claim, loading, error: loadError, refresh } = useClaimDetails(id);
  const { update, updating } = useUpdateClaim();
  const { showSuccessToast, showErrorToast } = useSnackbar();

  const [formData, setFormData] = useState({
    doctorName: '',
    diagnosisCode: '',
    diagnosisDescription: '',
    approvedAmount: '',
    reviewerComment: ''
  });

  // Check if claim is editable (DRAFT or RETURNED_FOR_INFO)
  const isEditable = claim?.status === 'DRAFT' || claim?.status === 'RETURNED_FOR_INFO';

  // Check if user can review (SUBMITTED or UNDER_REVIEW)
  const canReview = claim?.status === 'SUBMITTED' || claim?.status === 'UNDER_REVIEW';

  useEffect(() => {
    if (claim) {
      setFormData({
        doctorName: claim.doctorName || '',
        diagnosisCode: claim.diagnosisCode || '',
        diagnosisDescription: claim.diagnosisDescription || '',
        approvedAmount: claim.approvedAmount || '',
        reviewerComment: claim.reviewerComment || ''
      });
    }
  }, [claim]);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build payload with only allowed fields
    const payload = {};

    // Always allow these corrections
    if (formData.doctorName !== claim?.doctorName) {
      payload.doctorName = formData.doctorName || null;
    }
    if (formData.diagnosisCode !== claim?.diagnosisCode) {
      payload.diagnosisCode = formData.diagnosisCode || null;
    }
    if (formData.diagnosisDescription !== claim?.diagnosisDescription) {
      payload.diagnosisDescription = formData.diagnosisDescription || null;
    }

    // Reviewer fields (only if reviewing)
    if (canReview) {
      if (formData.approvedAmount && formData.approvedAmount !== claim?.approvedAmount) {
        payload.approvedAmount = parseFloat(formData.approvedAmount);
      }
      if (formData.reviewerComment !== claim?.reviewerComment) {
        payload.reviewerComment = formData.reviewerComment || null;
      }
    }

    if (Object.keys(payload).length === 0) {
      showErrorToast('لا توجد تغييرات لحفظها');
      return;
    }

    const result = await update(id, payload);
    if (result.success) {
      showSuccessToast('تم تحديث المطالبة بنجاح');
      navigate(`/claims/${id}`);
    } else {
      showErrorToast(result.error || 'فشل في تحديث المطالبة');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {loadError}
      </Alert>
    );
  }

  return (
    <>
      <ModernPageHeader
        title="تعديل المطالبة"
        subtitle={`تعديل مطالبة #${claim?.claimNumber || id}`}
        icon={ClaimIcon}
        breadcrumbs={[{ label: 'المطالبات', path: '/claims' }, { label: 'تعديل' }]}
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => navigate(`/claims/${id}`)}>
            عودة
          </Button>
        }
      />

      {/* Status Warning */}
      {!isEditable && !canReview && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          لا يمكن تعديل هذه المطالبة في الحالة الحالية ({claim?.statusLabel || claim?.status})
        </Alert>
      )}

      <MainCard>
        {/* Read-Only Info Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            <Info fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            معلومات ثابتة (لا يمكن تعديلها)
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">مقدم الخدمة</Typography>
              <Typography variant="body1" fontWeight={500}>{claim?.providerName || '-'}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">تاريخ الخدمة</Typography>
              <Typography variant="body1" fontWeight={500}>{claim?.serviceDate || claim?.visitDate || '-'}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">المبلغ المطلوب</Typography>
              <Typography variant="body1" fontWeight={500}>
                {claim?.requestedAmount ? `${Number(claim.requestedAmount).toLocaleString()} د.ل` : '-'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">الحالة</Typography>
              <Chip
                label={claim?.statusLabel || claim?.status || '-'}
                color={claim?.status === 'APPROVED' ? 'success' : claim?.status === 'REJECTED' ? 'error' : 'default'}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">المستفيد</Typography>
              <Typography variant="body1" fontWeight={500}>{claim?.memberName || '-'}</Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Editable Fields */}
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            الحقول القابلة للتعديل
          </Typography>

          <Grid container spacing={3}>
            {/* Doctor Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم الطبيب"
                value={formData.doctorName}
                onChange={handleChange('doctorName')}
                disabled={!isEditable && !canReview}
              />
            </Grid>

            {/* Diagnosis Code */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رمز التشخيص (ICD-10)"
                value={formData.diagnosisCode}
                onChange={handleChange('diagnosisCode')}
                disabled={!isEditable && !canReview}
                placeholder="مثال: J00"
              />
            </Grid>

            {/* Diagnosis Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="وصف التشخيص"
                value={formData.diagnosisDescription}
                onChange={handleChange('diagnosisDescription')}
                disabled={!isEditable && !canReview}
                multiline
                rows={2}
              />
            </Grid>

            {/* Reviewer Section - Only visible for SUBMITTED/UNDER_REVIEW */}
            {canReview && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom color="primary">
                    قسم المراجعة
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="المبلغ الموافق عليه"
                    value={formData.approvedAmount}
                    onChange={handleChange('approvedAmount')}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">د.ل</InputAdornment>,
                      inputProps: { step: '0.01', min: 0 }
                    }}
                    helperText={`المبلغ المطلوب: ${claim?.requestedAmount ? Number(claim.requestedAmount).toLocaleString() : 0} د.ل`}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="تعليق المراجع"
                    value={formData.reviewerComment}
                    onChange={handleChange('reviewerComment')}
                    placeholder="أضف ملاحظات حول المطالبة..."
                  />
                </Grid>
              </>
            )}

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate(`/claims/${id}`)}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  disabled={updating || (!isEditable && !canReview)}
                >
                  {updating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </MainCard>
    </>
  );
};

export default ClaimEdit;
