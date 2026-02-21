import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, Grid, Paper, Stack, Typography, IconButton,
  Divider, Tabs, Tab, Box, Alert, CircularProgress, Switch, FormControlLabel, Badge
} from '@mui/material';
import {
  Save as SaveIcon, ArrowBack as ArrowBackIcon,
  PersonAdd as PersonAddIcon, Badge as BadgeIcon, ContactPhone as ContactPhoneIcon,
  Person as PersonIcon, FlashOn as FlashIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { MEMBERS_AR } from 'locales/ar/members.ar';
import { COMMON_AR } from 'locales/ar/common.ar';
import { useMemberForm } from 'hooks/useMemberForm';
import { createPrincipalMember, uploadPhoto } from 'services/api/unified-members.service';
import axiosClient from 'utils/axios';
import { openSnackbar } from 'api/snackbar';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import {
  PersonalInfoTab,
  EmploymentTab,
  ContactInfoTab,
  PhotoUploadSection
} from './components';

const UnifiedMemberCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [employers, setEmployers] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  // Form State using Custom Hook
  const {
    form, setForm, errors, isSubmitting, setIsSubmitting,
    handleChange, setFieldError, updateForm, validate
  } = useMemberForm({
    fullName: '',
    nationalNumber: '',
    birthDate: null,
    gender: '',
    nationality: 'ليبي',
    phone: '',
    email: '',
    address: '',
    maritalStatus: '',
    employerId: '',
    employeeNumber: '',
    policyNumber: '',
    benefitPolicyId: '',
    startDate: dayjs().startOf('year'),
    endDate: dayjs().endOf('year'),
    joinDate: null,
    occupation: '',
    institutionId: '',
    isFastTrack: false,
    isVip: false,
    isUrgent: false,
    emergencyNotes: '',
    photoPreview: null,
    photoFile: null,
    status: 'ACTIVE',
    notes: ''
  });

  const isFastTrack = form.isFastTrack;

  useEffect(() => {
    fetchLookupData();
    if (searchParams.get('mode') === 'fast-track') {
      updateForm({
        isFastTrack: true,
        isVip: true,
        isUrgent: true
      });
    }
  }, [searchParams]);

  const fetchLookupData = async () => {
    try {
      const orgsRes = await axiosClient.get('/employers/selectors');
      setEmployers(orgsRes.data?.data || []);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const fetchEffectivePolicy = async (employerId) => {
    if (!employerId) {
      setActivePolicy(null);
      updateForm({
        benefitPolicyId: '',
        policyNumber: '',
        startDate: null,
        endDate: null
      });
      return;
    }

    try {
      setIsLoadingPolicy(true);
      const res = await axiosClient.get('/benefit-policies/effective', {
        params: { employerOrgId: employerId, date: dayjs().format('YYYY-MM-DD') }
      });

      const policy = res.data?.data;
      if (policy) {
        setActivePolicy(policy);
        updateForm({
          benefitPolicyId: policy.id,
          policyNumber: policy.policyCode || '',
          startDate: policy.startDate ? dayjs(policy.startDate) : null,
          endDate: policy.endDate ? dayjs(policy.endDate) : null
        });
      } else {
        setActivePolicy(null);
        updateForm({
          benefitPolicyId: '',
          policyNumber: '',
          startDate: null,
          endDate: null
        });
        openSnackbar({
          message: 'لا توجد وثيقة منافع فعالة لهذا الطرف حالياً',
          variant: 'alert',
          alert: { color: 'warning' }
        });
      }
    } catch (error) {
      console.error('Error fetching effective policy:', error);
      setActivePolicy(null);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const handleEmployerChange = (employerId) => {
    updateForm({ employerId });
    fetchEffectivePolicy(employerId);
  };

  const handlePhotoChange = (file, preview) => {
    updateForm({
      photoFile: file,
      photoPreview: preview
    });
  };

  const handleDeletePhoto = () => {
    updateForm({
      photoFile: null,
      photoPreview: null
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      // Prepare payload
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        birthDate: form.birthDate ? dayjs(form.birthDate).format('YYYY-MM-DD') : (isFastTrack ? '1900-01-01' : null),
        startDate: form.startDate ? dayjs(form.startDate).format('YYYY-MM-DD') : null,
        endDate: form.endDate ? dayjs(form.endDate).format('YYYY-MM-DD') : null,
        joinDate: form.joinDate ? dayjs(form.joinDate).format('YYYY-MM-DD') : null,
        gender: form.gender || (isFastTrack ? 'UNDEFINED' : null),
        maritalStatus: form.maritalStatus || (isFastTrack ? 'SINGLE' : null),
        type: 'PRINCIPAL'
      };

      const response = await createPrincipalMember(payload);
      const memberId = response?.data?.id || response?.id;

      if (form.photoFile && memberId) {
        await uploadPhoto(memberId, form.photoFile);
      }

      openSnackbar({ message: MEMBERS_AR.success.created, variant: 'alert', alert: { color: 'success' } });
      navigate(`/members/${memberId}`);
    } catch (error) {
      console.error('Member Creation Error:', error);
      const msg = error.response?.data?.message || MEMBERS_AR.errors.createFailed;
      openSnackbar({ message: msg, variant: 'alert', alert: { color: 'error' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to check for errors in specific tab fields
  const getTabErrorCount = (index) => {
    if (index === 0) {
      return (errors.fullName ? 1 : 0) + (errors.birthDate ? 1 : 0) + (errors.gender ? 1 : 0);
    }
    if (index === 1) {
      return (errors.employerId ? 1 : 0) + (errors.benefitPolicyId ? 1 : 0) + (errors.policyNumber ? 1 : 0) + (errors.startDate ? 1 : 0) + (errors.endDate ? 1 : 0);
    }
    if (index === 2) {
      return (errors.phone ? 1 : 0) + (errors.email ? 1 : 0);
    }
    return 0;
  };

  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_MEMBERS]}>
      <ModernPageHeader
        title={isFastTrack ? "تسجيل طارئ / VIP (مسار سريع)" : "إضافة منتفع رئيسي جديد"}
        icon={isFastTrack ? <FlashIcon sx={{ color: '#ff9100' }} /> : <PersonAddIcon />}
        actions={
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch color="warning" checked={!!isFastTrack} onChange={(e) => {
                setValue('isFastTrack', e.target.checked);
                if (e.target.checked) setTabValue(0);
              }} />}
              label={<Typography variant="subtitle2">وضع التسجيل السريع (طوارئ)</Typography>}
            />
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/members')}>رجوع</Button>
          </Stack>
        }
      />

      <MainCard
        title="بيانات المنتفع الرئيسي"
        content={false}
        sx={{ height: 'calc(100vh - 230px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="scrollable"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                fontSize: '13px',
                px: 3,
                '&.Mui-selected': { color: 'primary.main', bgcolor: 'primary.lighter', fontWeight: 600 }
              }
            }}
          >
            <Tab label={
              <Badge variant="dot" color="error" invisible={getTabErrorCount(0) === 0}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PersonIcon fontSize="small" />
                  <span>{MEMBERS_AR.tabs.personalInfo}</span>
                </Stack>
              </Badge>
            } />
            {!isFastTrack && (
              <Tab label={
                <Badge variant="dot" color="error" invisible={getTabErrorCount(1) === 0}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BadgeIcon fontSize="small" />
                    <span>{MEMBERS_AR.tabs.employment}</span>
                  </Stack>
                </Badge>
              } />
            )}
            {!isFastTrack && (
              <Tab label={
                <Badge variant="dot" color="error" invisible={getTabErrorCount(2) === 0}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ContactPhoneIcon fontSize="small" />
                    <span>{MEMBERS_AR.tabs.contact}</span>
                  </Stack>
                </Badge>
              } />
            )}
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, minHeight: 0 }}>
          <form id="member-form" onSubmit={handleSubmit}>
            {tabValue === 0 && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 9 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {MEMBERS_AR.info.barcodeGenerationHint || "يتم توليد رقم البطاقة والباركود تلقائياً عند الحفظ."}
                  </Alert>

                  {isFastTrack && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.lighter', border: '1px dashed', borderColor: 'warning.main' }}>
                      <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FlashIcon fontSize="small" /> {MEMBERS_AR.info.fastTrackTitle || "تفاصيل حالة الطوارئ / VIP"}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <PersonalInfoTab
                            form={form}
                            errors={errors}
                            handleChange={handleChange}
                            isPrincipal={true}
                            hideNonEssential={true}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <EmploymentTab
                            form={form}
                            errors={errors}
                            handleChange={handleEmployerChange}
                            isPrincipal={true}
                            employers={employers}
                            onlyEmployer={true}
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <ContactInfoTab
                            form={form}
                            errors={errors}
                            handleChange={handleChange}
                            onlyPhone={true}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, mt: 1 }}>
                          <Divider />
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>{MEMBERS_AR.labels.emergencyNotes}</Typography>
                            <textarea
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                              rows={2}
                              value={form.emergencyNotes}
                              onChange={(e) => updateForm({ emergencyNotes: e.target.value })}
                              placeholder={MEMBERS_AR.info.emergencyNotesPlaceholder}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}

                  {!isFastTrack && (
                    <PersonalInfoTab
                      form={form}
                      errors={errors}
                      handleChange={handleChange}
                      isPrincipal={true}
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <PhotoUploadSection
                    member={form}
                    photoPreview={form.photoPreview}
                    onPhotoChange={handlePhotoChange}
                    setError={setFieldError}
                  />
                  {form.photoPreview && (
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleDeletePhoto}>
                        {MEMBERS_AR.buttons.removePhoto}
                      </Button>
                    </Box>
                  )}
                </Grid>
              </Grid>
            )}

            {tabValue === 1 && !isFastTrack && (
              <EmploymentTab
                form={form}
                errors={errors}
                handleChange={handleChange}
                onEmployerChange={handleEmployerChange}
                isPrincipal={true}
                employers={employers}
                activePolicy={activePolicy}
                isLoadingPolicy={isLoadingPolicy}
              />
            )}

            {tabValue === 2 && !isFastTrack && (
              <ContactInfoTab
                form={form}
                errors={errors}
                handleChange={handleChange}
              />
            )}
          </form>
        </Box>

        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: 'background.default' }}>
          <Button variant="outlined" onClick={() => navigate('/members')}>{COMMON_AR.actions.cancel}</Button>
          <Button
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? COMMON_AR.messages.saving : MEMBERS_AR.buttons.save}
          </Button>
        </Box>
      </MainCard>
    </RBACGuard>
  );
};

export default UnifiedMemberCreate;
