import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon, ArrowBack, AssignmentTurnedIn as PreApprovalIcon } from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { usePreApprovalDetails, useUpdatePreApproval } from 'hooks/usePreApprovals';
import { getAllMembers } from 'services/api/unified-members.service';

const PreApprovalEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { preApproval, loading, error: fetchError } = usePreApprovalDetails(id);
  const { update, updating, error: updateError } = useUpdatePreApproval();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // NOTE: insurancePolicyId and benefitPackageId REMOVED - No Policy concept in backend. Use BenefitPolicy only.
  const [formData, setFormData] = useState({
    memberId: null,
    providerName: '',
    doctorName: '',
    diagnosis: '',
    procedure: '',
    requestedAmount: '',
    status: 'PENDING',
    reviewerComment: '',
    approvedAmount: '',
    attachmentsCount: 0
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (preApproval) {
      setFormData({
        memberId: preApproval.member?.id || null,
        providerName: preApproval.providerName || '',
        doctorName: preApproval.doctorName || '',
        diagnosis: preApproval.diagnosis || '',
        procedure: preApproval.procedure || '',
        requestedAmount: preApproval.requestedAmount || '',
        status: preApproval.status || 'PENDING',
        reviewerComment: preApproval.reviewerComment || '',
        approvedAmount: preApproval.approvedAmount || '',
        attachmentsCount: preApproval.attachmentsCount || 0
      });
    }
  }, [preApproval]);

  const fetchMembers = async (searchTerm = '') => {
    try {
      setLoadingMembers(true);
      const result = await getAllMembers({ page: 0, size: 100, search: searchTerm });
      setMembers(result.content || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  const handleMemberChange = (event, newValue) => {
    setFormData({ ...formData, memberId: newValue?.id || null });
    if (formErrors.memberId) {
      setFormErrors({ ...formErrors, memberId: null });
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.providerName?.trim()) {
      errors.providerName = 'اسم مقدم الخدمة مطلوب';
    }

    if (!formData.diagnosis?.trim()) {
      errors.diagnosis = 'التشخيص مطلوب';
    }

    if (!formData.requestedAmount || isNaN(Number(formData.requestedAmount)) || Number(formData.requestedAmount) <= 0) {
      errors.requestedAmount = 'المبلغ المطلوب يجب أن يكون أكبر من صفر';
    }

    if (formData.status === 'APPROVED') {
      if (!formData.approvedAmount || isNaN(Number(formData.approvedAmount)) || Number(formData.approvedAmount) <= 0) {
        errors.approvedAmount = 'المبلغ الموافق عليه مطلوب ويجب أن يكون أكبر من صفر عند الموافقة';
      }
    }

    if (formData.status === 'REJECTED') {
      if (!formData.reviewerComment?.trim()) {
        errors.reviewerComment = 'تعليق المراجع مطلوب عند الرفض';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // NOTE: insurancePolicyId and benefitPackageId REMOVED from payload
      const payload = {
        providerName: formData.providerName.trim(),
        doctorName: formData.doctorName?.trim() || null,
        diagnosis: formData.diagnosis.trim(),
        procedure: formData.procedure?.trim() || null,
        requestedAmount: Number(formData.requestedAmount),
        status: formData.status,
        reviewerComment: formData.reviewerComment?.trim() || null,
        approvedAmount: formData.approvedAmount ? Number(formData.approvedAmount) : null,
        attachmentsCount: Number(formData.attachmentsCount) || 0
      };

      await update(id, payload);
      navigate('/pre-approvals');
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleCancel = () => {
    navigate('/pre-approvals');
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

  if (fetchError) {
    return (
      <MainCard>
        <Alert severity="error">{fetchError}</Alert>
      </MainCard>
    );
  }

  return (
    <>
      <ModernPageHeader
        title="تعديل طلب الموافقة المسبقة"
        icon={PreApprovalIcon}
        breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'الموافقات المسبقة', href: '/pre-approvals' }, { label: 'تعديل' }]}
      />
      <MainCard>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {updateError && (
              <Grid item xs={12}>
                <Alert severity="error">{updateError}</Alert>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={members}
                getOptionLabel={(option) => `${option.fullName} (${option.nationalNumber || '-'})`}
                loading={loadingMembers}
                value={members.find((m) => m.id === formData.memberId) || null}
                onChange={handleMemberChange}
                onInputChange={(e, value) => {
                  if (value) fetchMembers(value);
                }}
                disabled
                renderInput={(params) => <TextField {...params} label="المؤمَّن عليه" disabled />}
              />
            </Grid>

            {/* NOTE: Insurance Company & Policy fields REMOVED - No InsuranceCompany/Policy concept in backend */}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم مقدم الخدمة (المستشفى/العيادة)"
                name="providerName"
                value={formData.providerName}
                onChange={handleChange}
                error={!!formErrors.providerName}
                helperText={formErrors.providerName}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="اسم الطبيب" name="doctorName" value={formData.doctorName} onChange={handleChange} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="التشخيص (ICD10)"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                error={!!formErrors.diagnosis}
                helperText={formErrors.diagnosis}
                multiline
                rows={3}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الإجراء الطبي (CPT)"
                name="procedure"
                value={formData.procedure}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المبلغ المطلوب"
                name="requestedAmount"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={formData.requestedAmount}
                onChange={handleChange}
                error={!!formErrors.requestedAmount}
                helperText={formErrors.requestedAmount}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="عدد المرفقات"
                name="attachmentsCount"
                type="number"
                inputProps={{ min: 0 }}
                value={formData.attachmentsCount}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select name="status" value={formData.status} onChange={handleChange} label="الحالة">
                  <MenuItem value="PENDING">قيد المراجعة</MenuItem>
                  <MenuItem value="APPROVED">موافق عليه</MenuItem>
                  <MenuItem value="REJECTED">مرفوض</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المبلغ الموافق عليه"
                name="approvedAmount"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={formData.approvedAmount}
                onChange={handleChange}
                error={!!formErrors.approvedAmount}
                helperText={formErrors.approvedAmount}
                disabled={formData.status !== 'APPROVED'}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="تعليق المراجع"
                name="reviewerComment"
                value={formData.reviewerComment}
                onChange={handleChange}
                error={!!formErrors.reviewerComment}
                helperText={formErrors.reviewerComment}
                multiline
                rows={4}
                required={formData.status === 'REJECTED'}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleCancel}>
                  إلغاء
                </Button>
                <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={updating}>
                  {updating ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </MainCard>
    </>
  );
};

export default PreApprovalEdit;
