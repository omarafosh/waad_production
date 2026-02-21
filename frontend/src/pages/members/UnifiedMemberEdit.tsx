/**
 * Unified Member Edit Page
 * 
 * Edits a Principal or Dependent member.
 * Matches UnifiedMemberCreate layout (Tabs + Photo inside Tab 0).
 * 
 * @module UnifiedMemberEdit
 * @since 2026-01-31
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  CircularProgress,
  Alert,
  Box,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  FamilyRestroom as FamilyRestroomIcon,
  ContactPhone as ContactPhoneIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import {
  getMember, updateMember, deleteMember,
} from 'services/api/unified-members.service';
import axiosClient from 'utils/axios';
import { openSnackbar } from 'api/snackbar';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import { MEMBERS_AR } from 'locales/ar/members.ar';
import { COMMON_AR } from 'locales/ar/common.ar';
import { useMemberForm } from 'hooks/useMemberForm';
import {
  PersonalInfoTab,
  EmploymentTab,
  ContactInfoTab,
  DependentsTab,
  PhotoUploadSection
} from './components';

/**
 * Unified Member Edit Component
 */
const UnifiedMemberEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Tab State
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const menuProps = {
    PaperProps: {
      sx: {
        '& .MuiMenuItem-root': { fontSize: '12px' },
        maxHeight: 300,
        minWidth: 200
      }
    }
  };

  // Loading & States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Dependents Management
  const [dependents, setDependents] = useState([]);

  // Form State using Custom Hook
  const { form, setForm, errors, setErrors, handleChange, setFieldError } = useMemberForm({
    fullName: '',
    nationalNumber: '',
    birthDate: null,
    gender: '',
    nationality: 'ليبي',
    phone: '',
    email: '',
    address: '',
    relationship: '',
    employerId: '',
    employeeNumber: '',
    policyNumber: '',
    benefitPolicyId: '',
    startDate: null,
    endDate: null,
    joinDate: null,
    occupation: '',
    maritalStatus: '',
    status: 'ACTIVE',
    notes: '',
    photoPreview: null,
    photoFile: null,
    hasExistingPhoto: false
  });

  // Lookup Data
  const [employers, setEmployers] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [isPrincipal, setIsPrincipal] = useState(false);

  /**
   * Helper to check if a tab has validation errors
   */
  const getTabErrorCount = (index) => {
    if (index === 0) {
      return (errors.fullName ? 1 : 0) + (errors.birthDate ? 1 : 0) + (errors.gender ? 1 : 0) + (errors.nationalNumber ? 1 : 0) + (errors.relationship ? 1 : 0);
    }
    if (index === 1) {
      return (errors.employerId ? 1 : 0);
    }
    if (index === 2) {
      return (errors.phone ? 1 : 0) + (errors.email ? 1 : 0);
    }
    return 0;
  };

  useEffect(() => {
    fetchMemberData();
    fetchLookupData();
  }, [id]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      const data = await getMember(id);

      const isPrinc = data.type === 'PRINCIPAL';
      setIsPrincipal(isPrinc);
      setDependents(data.dependents || []);

      setForm({
        fullName: data.fullName || '',
        nationalNumber: data.nationalNumber || '',
        birthDate: data.birthDate ? dayjs(data.birthDate) : null,
        gender: data.gender || '',
        nationality: data.nationality || 'ليبي',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        relationship: data.relationship || '',
        employerId: data.employerId || '',
        employeeNumber: data.employeeNumber || '',
        policyNumber: data.policyNumber || '',
        benefitPolicyId: data.benefitPolicyId || '',
        startDate: data.startDate ? dayjs(data.startDate) : null,
        endDate: data.endDate ? dayjs(data.endDate) : null,
        joinDate: data.joinDate ? dayjs(data.joinDate) : null,
        occupation: data.occupation || '',
        status: data.status || 'ACTIVE',
        notes: data.notes || '',
        photoPreview: data.photoUrl || data.profilePhotoPath || null,
        hasExistingPhoto: !!data.profilePhotoPath || !!data.photoUrl
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      setFetchError('فشل في تحميل بيانات المنتفع');
    } finally {
      setLoading(false);
    }
  };

  const fetchEffectivePolicy = async (employerId, initial = false) => {
    if (!employerId) {
      setActivePolicy(null);
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
        if (!initial) {
          setForm(prev => ({
            ...prev,
            benefitPolicyId: policy.id,
            policyNumber: policy.policyCode || '',
            startDate: policy.startDate ? dayjs(policy.startDate) : null,
            endDate: policy.endDate ? dayjs(policy.endDate) : null
          }));
        }
      } else {
        setActivePolicy(null);
      }
    } catch (error) {
      console.error('Error fetching effective policy:', error);
      setActivePolicy(null);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const handleEmployerChange = async (employerId) => {
    setForm(prev => ({ ...prev, employerId }));
    await fetchEffectivePolicy(employerId);
  };

  useEffect(() => {
    if (form.employerId && isPrincipal) {
      fetchEffectivePolicy(form.employerId, true);
    }
  }, [form.employerId, isPrincipal]);

  const fetchLookupData = async () => {
    try {
      const orgsRes = await axiosClient.get('/employers/selectors');
      setEmployers(orgsRes.data?.data || []);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  /**
   * Photo Management
   */
  const handlePhotoChange = (file, preview) => {
    setForm(prev => ({
      ...prev,
      photoFile: file,
      photoPreview: preview
    }));
  };

  const handleDeletePhoto = async () => {
    try {
      await deletePhoto(id);
      setForm(prev => ({
        ...prev,
        photoFile: null,
        photoPreview: null,
        hasExistingPhoto: false
      }));
      openSnackbar({ message: 'تم حذف الصورة بنجاح', variant: 'alert', alert: { color: 'success' } });
    } catch (error) {
      console.error('Photo delete failed', error);
      openSnackbar({ message: 'فشل حذف الصورة', variant: 'alert', alert: { color: 'error' } });
    }
  };

  const handleStatusToggle = (event) => {
    setForm(prev => ({ ...prev, status: event.target.checked ? 'ACTIVE' : 'SUSPENDED' }));
  };

  /**
   * Validation
   */
  const validateForm = () => {
    const newErrors = {};
    if (!form.fullName?.trim()) newErrors.fullName = 'الاسم الكامل مطلوب';
    if (!form.birthDate) newErrors.birthDate = 'تاريخ الميلاد مطلوب';
    if (!form.gender) newErrors.gender = 'الجنس مطلوب';

    if (isPrincipal && !form.employerId) newErrors.employerId = 'جهة العمل مطلوبة';
    if (!isPrincipal && !form.relationship) newErrors.relationship = 'صلة القرابة مطلوبة';

    if (form.nationalNumber && form.nationalNumber.length !== 12) {
      newErrors.nationalNumber = 'الرقم الوطني يجب أن يتكون من 12 خانة';
    }

    if (form.phone && !/^(091|092|094|093|095|096)\d{7}$/.test(form.phone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      openSnackbar({
        message: 'يرجى تصحيح الأخطاء في الحقول المطلوبة قبل الحفظ',
        variant: 'alert',
        alert: { color: 'error' }
      });

      if (newErrors.fullName || newErrors.birthDate || newErrors.gender || newErrors.nationalNumber || newErrors.relationship) {
        setTabValue(0);
      } else if (newErrors.employerId) {
        setTabValue(1);
      } else if (newErrors.phone || newErrors.email) {
        setTabValue(2);
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        fullName: form.fullName.trim(),
        nationalNumber: form.nationalNumber?.trim() || null,
        birthDate: form.birthDate ? dayjs(form.birthDate).format('YYYY-MM-DD') : null,
        gender: form.gender || 'UNDEFINED',
        nationality: form.nationality || 'ليبي',
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        employeeNumber: form.employeeNumber || null,
        joinDate: form.joinDate ? dayjs(form.joinDate).format('YYYY-MM-DD') : null,
        occupation: form.occupation || null,
        status: form.status || 'ACTIVE',
        startDate: form.startDate ? dayjs(form.startDate).format('YYYY-MM-DD') : null,
        endDate: form.endDate ? dayjs(form.endDate).format('YYYY-MM-DD') : null,
        policyNumber: form.policyNumber || null,
        benefitPolicyId: form.benefitPolicyId || null,
        notes: form.notes || null,
      };

      if (isPrincipal) {
        payload.employerId = form.employerId;
      } else {
        payload.relationship = form.relationship;
      }

      await updateMember(id, payload);

      if (form.photoFile) {
        try {
          await uploadPhoto(id, form.photoFile);
        } catch (photoError) {
          console.error('Photo upload failed but member data was saved:', photoError);
          openSnackbar({
            message: 'تم حفظ البيانات بنجاح، ولكن فشل تحميل الصورة',
            variant: 'alert',
            alert: { color: 'warning' }
          });
          navigate('/members');
          return;
        }
      }

      openSnackbar({ message: 'تم تحديث بيانات المنتفع بنجاح', variant: 'alert', alert: { color: 'success' } });
      setTimeout(() => {
        navigate('/members');
      }, 500);
    } catch (error) {
      console.error('Error updating member:', error);
      openSnackbar({
        message: error.response?.data?.message || 'خطأ في تحديث البيانات',
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  if (fetchError) return <MainCard><Alert severity="error">{fetchError}</Alert><Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/members')}>رجوع</Button></MainCard>;

  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_MEMBERS]}>
      <ModernPageHeader
        title={`تعديل بيانات ${isPrincipal ? 'المنتفع الرئيسي' : 'المنتفع التابع'}`}
        subtitle={form.fullName}
        icon={<EditIcon />}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/members')}>
            رجوع
          </Button>
        }
      />

      <MainCard
        content={false}
        sx={{
          height: 'calc(100vh - 180px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
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
            <Tab
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>{MEMBERS_AR.tabs.personalInfo}</span>
                  {getTabErrorCount(0) > 0 && <span style={{ color: '#f44336', fontSize: '16px' }}>●</span>}
                </Stack>
              }
              icon={<PersonIcon />}
              iconPosition="start"
              sx={{ color: getTabErrorCount(0) > 0 ? 'error.main' : 'inherit' }}
            />
            <Tab
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>{isPrincipal ? MEMBERS_AR.tabs.employment : MEMBERS_AR.labels.relationship}</span>
                  {getTabErrorCount(1) > 0 && <span style={{ color: '#f44336', fontSize: '16px' }}>●</span>}
                </Stack>
              }
              icon={isPrincipal ? <BadgeIcon /> : <FamilyRestroomIcon />}
              iconPosition="start"
              sx={{ color: getTabErrorCount(1) > 0 ? 'error.main' : 'inherit' }}
            />
            <Tab
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>{MEMBERS_AR.tabs.contact}</span>
                  {getTabErrorCount(2) > 0 && <span style={{ color: '#f44336', fontSize: '16px' }}>●</span>}
                </Stack>
              }
              icon={<ContactPhoneIcon />}
              iconPosition="start"
              sx={{ color: getTabErrorCount(2) > 0 ? 'error.main' : 'inherit' }}
            />
            {isPrincipal && (
              <Tab
                label={`${MEMBERS_AR.tabs.dependents} (${dependents.length})`}
                icon={<FamilyRestroomIcon />}
                iconPosition="start"
              />
            )}
          </Tabs>
        </Box>

        {Object.keys(errors).length > 0 && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert
              severity="error"
              variant="outlined"
              sx={{
                bgcolor: 'error.lighter',
                borderColor: 'error.light',
                '& .MuiAlert-message': { fontWeight: 600, fontSize: '13px' }
              }}
            >
              {MEMBERS_AR.errors.invalidData} (عدد الحقول المعيبة: {Object.keys(errors).length})
            </Alert>
          </Box>
        )}

        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {/* Tab 0: Personal Info */}
          <div role="tabpanel" hidden={tabValue !== 0}>
            {tabValue === 0 && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 9 }}>
                  <Alert severity="info" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: '12px' } }}>
                    {MEMBERS_AR.info.barcodeUpdateHint || "يتم تحديث رقم البطاقة والباركود آلياً عند الحفظ إذا لزم الأمر."}
                  </Alert>
                  <PersonalInfoTab
                    form={form}
                    errors={errors}
                    handleChange={handleChange}
                    isPrincipal={isPrincipal}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <PhotoUploadSection
                    member={form}
                    photoPreview={form.photoPreview}
                    onPhotoChange={handlePhotoChange}
                    setError={setFieldError}
                  />
                  {(form.photoPreview || form.hasExistingPhoto) && (
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDeletePhoto}
                      >
                        {MEMBERS_AR.buttons.removePhoto}
                      </Button>
                    </Box>
                  )}
                </Grid>
              </Grid>
            )}
          </div>

          {/* Tab 1: Employment Info */}
          <div role="tabpanel" hidden={tabValue !== 1}>
            {tabValue === 1 && (
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
          </div>

          {/* Tab 2: Contact Info */}
          <div role="tabpanel" hidden={tabValue !== 2}>
            {tabValue === 2 && (
              <ContactInfoTab
                form={form}
                errors={errors}
                handleChange={handleChange}
              />
            )}
          </div>

          {/* Tab 3: Dependents (Only for Principals) */}
          <div role="tabpanel" hidden={tabValue !== 3}>
            {tabValue === 3 && isPrincipal && (
              <DependentsTab
                isPrincipal={isPrincipal}
                dependents={dependents}
                principalId={id}
                onDependentSaved={fetchMemberData}
                onDependentDeleted={async (dep) => {
                  if (window.confirm(MEMBERS_AR.confirmations.delete)) {
                    try {
                      await deleteMember(dep.id);
                      openSnackbar({ message: MEMBERS_AR.success.dependentDeleted, variant: 'alert', alert: { color: 'success' } });
                      fetchMemberData();
                    } catch (error) {
                      openSnackbar({ message: MEMBERS_AR.errors.deleteFailed, variant: 'alert', alert: { color: 'error' } });
                    }
                  }
                }}
              />
            )}
          </div>
        </Box>

        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: 'background.default' }}>
          <Button variant="outlined" onClick={() => navigate('/members')}>{COMMON_AR.actions.cancel}</Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? COMMON_AR.messages.saving : MEMBERS_AR.buttons.save}
          </Button>
        </Box>
      </MainCard>


    </RBACGuard>
  );
};

export default UnifiedMemberEdit;
