import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAppLocale } from 'utils/locale-helper';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
  Autocomplete,
  MenuItem
} from '@mui/material';
import TextField from '@mui/material/TextField';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CheckCircle as ActivateIcon,
  PauseCircle as SuspendIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Policy as PolicyIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Percent as PercentIcon,
  Code as CodeIcon,
  Info as InfoIcon,
  Rule as RuleIcon,
  RestoreFromTrash as RestoreIcon,
  ContentCopy as CloneIcon,
  Science as SimulateIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { useSnackbar } from 'notistack';

import {
  getBenefitPolicyById,
  activateBenefitPolicy,
  suspendBenefitPolicy,
  cancelBenefitPolicy,
  deleteBenefitPolicy,
  restoreBenefitPolicy,
  cloneBenefitPolicy,
  simulateCoverage
} from 'services/api/benefit-policies.service';
import { getEmployers } from 'services/api/employers.service';
import { lookupMedicalServices } from 'services/api/medical-services.service';

import BenefitPolicyRulesTab from './BenefitPolicyRulesTab';
import BenefitPolicyDistributionsTab from './BenefitPolicyDistributionsTab';

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  DRAFT: {
    label: 'مسودة',
    color: 'default',
    labelEn: 'Draft',
    canActivate: true,
    canSuspend: false,
    canCancel: true,
    canDelete: true
  },
  ACTIVE: {
    label: 'نشط',
    color: 'success',
    labelEn: 'Active',
    canActivate: false,
    canSuspend: true,
    canCancel: true,
    canDelete: false
  },
  SUSPENDED: {
    label: 'موقوف',
    color: 'warning',
    labelEn: 'Suspended',
    canActivate: true,
    canSuspend: false,
    canCancel: true,
    canDelete: false
  },
  EXPIRED: {
    label: 'منتهي',
    color: 'error',
    labelEn: 'Expired',
    canActivate: false,
    canSuspend: false,
    canCancel: false,
    canDelete: true
  },
  CANCELLED: {
    label: 'ملغي',
    color: 'error',
    labelEn: 'Cancelled',
    canActivate: false,
    canSuspend: false,
    canCancel: false,
    canDelete: true
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detail row component for displaying label-value pairs
 */
const DetailRow = ({ label, value, icon: Icon }) => (
  <Grid container spacing={2} sx={{ mb: 2 }}>
    <Grid item xs={12} sm={4}>
      <Stack direction="row" spacing={1} alignItems="center">
        {Icon && <Icon fontSize="small" color="action" />}
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      </Stack>
    </Grid>
    <Grid item xs={12} sm={8}>
      <Typography variant="body1">{value || 'غير متوفر'}</Typography>
    </Grid>
  </Grid>
);

/**
 * Status chip with proper colors
 */
const StatusChip = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="medium" sx={{ fontWeight: 600, fontSize: '0.875rem' }} />;
};

/**
 * Confirmation dialog for actions
 */
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, loading, confirmColor = 'primary' }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading}>
        إلغاء
      </Button>
      <Button
        onClick={onConfirm}
        color={confirmColor}
        variant="contained"
        disabled={loading}
        startIcon={loading && <CircularProgress size={16} color="inherit" />}
      >
        تأكيد
      </Button>
    </DialogActions>
  </Dialog>
);

/**
 * Simulation Result Card
 */
const SimulationResult = ({ result }) => (
  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
    <Typography variant="subtitle2" gutterBottom color="primary">نتائج المحاكاة:</Typography>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant="caption" color="text.secondary">نسبة التغطية:</Typography>
        <Typography variant="body2" fontWeight="bold">{result.coveragePercent}%</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="caption" color="text.secondary">مصدر القاعدة:</Typography>
        <Typography variant="body2">{result.ruleSource === 'SERVICE' ? 'قاعدة الخدمة' : result.ruleSource === 'CATEGORY' ? 'قاعدة التصنيف' : 'افتراضي الوثيقة'}</Typography>
      </Grid>
      {result.amountLimit && (
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">الحد الأقصى:</Typography>
          <Typography variant="body2">{result.amountLimit} د.ل</Typography>
        </Grid>
      )}
      <Grid item xs={6}>
        <Typography variant="caption" color="text.secondary">الموافقة المسبقة:</Typography>
        <Typography variant="body2">{result.requiresPreApproval ? 'مطلوبة' : 'غير مطلوبة'}</Typography>
      </Grid>
    </Grid>
    {result.notes && (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">ملاحظات:</Typography>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{result.notes}</Typography>
      </Box>
    )}
  </Box>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Benefit Policy View/Management Page
 *
 * Features:
 * - Display policy header details (Odoo-like design)
 * - Tabs: Overview | Rules
 * - Lifecycle actions: Activate, Suspend, Cancel, Delete
 * - RBAC permission checks
 *
 * Route: /benefit-policies/:id
 */
const BenefitPolicyView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [dialogState, setDialogState] = useState({
    open: false,
    action: null,
    title: '',
    message: ''
  });

  // Clone/Simulate States
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const [cloneData, setCloneData] = useState({
    name: '',
    targetEmployerId: null,
    startDate: '',
    endDate: ''
  });

  const [simData, setSimData] = useState({
    serviceId: null,
    encounterType: 'CONSULTATION'
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const {
    data: policy,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['benefit-policy', id],
    queryFn: () => getBenefitPolicyById(id),
    enabled: !!id
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const activateMutation = useMutation({
    mutationFn: () => activateBenefitPolicy(id),
    onSuccess: () => {
      enqueueSnackbar('تم تفعيل الوثيقة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy', id]);
      refetch();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل تفعيل الوثيقة', { variant: 'error' });
    }
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendBenefitPolicy(id),
    onSuccess: () => {
      enqueueSnackbar('تم إيقاف الوثيقة مؤقتاً', { variant: 'warning' });
      queryClient.invalidateQueries(['benefit-policy', id]);
      refetch();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل إيقاف الوثيقة', { variant: 'error' });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBenefitPolicy(id),
    onSuccess: () => {
      enqueueSnackbar('تم إلغاء الوثيقة', { variant: 'info' });
      queryClient.invalidateQueries(['benefit-policy', id]);
      refetch();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل إلغاء الوثيقة', { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBenefitPolicy(id),
    onSuccess: () => {
      enqueueSnackbar('تم حذف الوثيقة', { variant: 'success' });
      navigate('/benefit-policies');
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل حذف الوثيقة', { variant: 'error' });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreBenefitPolicy(id),
    onSuccess: () => {
      enqueueSnackbar('تم استعادة الوثيقة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy', id]);
      refetch();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشلت عملية الاستعادة', { variant: 'error' });
    }
  });

  const cloneMutation = useMutation({
    mutationFn: (payload) => cloneBenefitPolicy(id, payload),
    onSuccess: (newPolicy) => {
      enqueueSnackbar('تم استنساخ الوثيقة بنجاح', { variant: 'success' });
      navigate(`/benefit-policies/${newPolicy.id}`);
      setCloneDialogOpen(false);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل استنساخ الوثيقة', { variant: 'error' });
    }
  });

  const simulateMutation = useMutation({
    mutationFn: (payload) => simulateCoverage(payload),
    onSuccess: (result) => {
      setSimulationResult(result);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشلت عملية المحاكاة', { variant: 'error' });
    }
  });

  // Lookups for dialogs
  const { data: employers = [] } = useQuery({
    queryKey: ['employers-lookup'],
    queryFn: async () => {
      const res = await getEmployers({ size: 100 });
      return res.content || [];
    },
    enabled: cloneDialogOpen
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services-lookup'],
    queryFn: () => lookupMedicalServices({ size: 100 }),
    enabled: simulationDialogOpen
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const openConfirmDialog = useCallback((action, title, message) => {
    setDialogState({ open: true, action, title, message });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({ open: false, action: null, title: '', message: '' });
  }, []);

  const handleConfirmAction = useCallback(() => {
    switch (dialogState.action) {
      case 'activate':
        activateMutation.mutate();
        break;
      case 'suspend':
        suspendMutation.mutate();
        break;
      case 'cancel':
        cancelMutation.mutate();
        break;
      case 'delete':
        deleteMutation.mutate();
        break;
      case 'restore':
        restoreMutation.mutate();
        break;
      default:
        break;
    }
    closeDialog();
  }, [dialogState.action, activateMutation, suspendMutation, cancelMutation, deleteMutation, restoreMutation, closeDialog]);

  const handleActivate = () => {
    openConfirmDialog(
      'activate',
      'تفعيل الوثيقة',
      'هل أنت متأكد من تفعيل هذه الوثيقة؟ سيتم إلغاء تفعيل أي وثيقة أخرى نشطة لنفس الشريك.'
    );
  };

  const handleSuspend = () => {
    openConfirmDialog(
      'suspend',
      'إيقاف الوثيقة مؤقتاً',
      'هل أنت متأكد من إيقاف هذه الوثيقة مؤقتاً؟ لن يتمكن الأعضاء من تقديم مطالبات جديدة.'
    );
  };

  const handleCancel = () => {
    openConfirmDialog('cancel', 'إلغاء الوثيقة', 'هل أنت متأكد من إلغاء هذه الوثيقة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.');
  };

  const handleDelete = () => {
    openConfirmDialog('delete', 'حذف الوثيقة', 'هل أنت متأكد من حذف هذه الوثيقة؟ سيتم حذفها بشكل نهائي.');
  };

  const handleRestore = () => {
    openConfirmDialog('restore', 'استعادة الوثيقة', 'هل أنت متأكد من استعادة هذه الوثيقة؟');
  };

  // Tab change handler
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <>
        <ModernPageHeader
          title="وثيقة المنافع"
          subtitle="عرض تفاصيل الوثيقة"
          icon={PolicyIcon}
          breadcrumbs={[
            { label: 'وثائق المنافع', path: '/benefit-policies' },
            { label: 'عرض', path: `/benefit-policies/${id}` }
          ]}
        />
        <MainCard>
          <Alert severity="error">{error.response?.data?.message || error.message || 'فشل تحميل بيانات الوثيقة'}</Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/benefit-policies')}>
              العودة للقائمة
            </Button>
          </Box>
        </MainCard>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[policy?.status] || STATUS_CONFIG.DRAFT;
  const isLoading_Action = activateMutation.isPending || suspendMutation.isPending || cancelMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;
  const isDeleted = policy?.active === false;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <RBACGuard requiredPermissions={['benefit_policies.view']} fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      {/* Page Header with Integrated Tabs */}
      <ModernPageHeader
        title={policy?.name || 'وثيقة المنافع'}
        subtitle={`رقم الوثيقة: ${policy?.policyCode || 'N/A'}${isDeleted ? ' (محذوفة)' : ''}`}
        icon={PolicyIcon}
        breadcrumbs={[
          { label: 'وثائق المنافع', path: '/benefit-policies' },
          { label: policy?.name || 'عرض', path: `/benefit-policies/${id}` }
        ]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {/* Back Button */}
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/benefit-policies')} variant="outlined" size="small">
              رجوع
            </Button>

            {/* Restore Button - يظهر فقط للمحذوفات */}
            {isDeleted && (
              <RBACGuard requiredPermissions={['benefit_policies.delete']}>
                <Button
                  startIcon={<RestoreIcon />}
                  onClick={handleRestore}
                  variant="contained"
                  color="success"
                  size="small"
                  disabled={isLoading_Action}
                >
                  استعادة
                </Button>
              </RBACGuard>
            )}

            {/* Edit Button - يخفى للمحذوفات */}
            {!isDeleted && (
              <RBACGuard requiredPermissions={['benefit_policies.update']}>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/benefit-policies/edit/${id}`)}
                  variant="outlined"
                  color="primary"
                  size="small"
                  disabled={policy?.status === 'CANCELLED'}
                >
                  تعديل
                </Button>
              </RBACGuard>
            )}

            {/* Clone Button */}
            {!isDeleted && (
              <RBACGuard requiredPermissions={['benefit_policies.create']}>
                <Button
                  startIcon={<CloneIcon />}
                  onClick={() => {
                    setCloneData({
                      name: `${policy?.name} (نسخة)`,
                      targetEmployerId: policy?.employerId,
                      startDate: '',
                      endDate: ''
                    });
                    setCloneDialogOpen(true);
                  }}
                  variant="outlined"
                  color="info"
                  size="small"
                >
                  استنساخ
                </Button>
              </RBACGuard>
            )}

            {/* Simulate Button */}
            {!isDeleted && policy?.status === 'ACTIVE' && (
              <Button
                startIcon={<SimulateIcon />}
                onClick={() => {
                  setSimulationResult(null);
                  setSimulationDialogOpen(true);
                }}
                variant="outlined"
                color="secondary"
                size="small"
              >
                محاكاة التغطية
              </Button>
            )}

            {/* Activate Button */}
            {!isDeleted && statusConfig.canActivate && (
              <RBACGuard requiredPermissions={['benefit_policies.activate']}>
                <Button
                  startIcon={<ActivateIcon />}
                  onClick={handleActivate}
                  variant="contained"
                  color="success"
                  size="small"
                  disabled={isLoading_Action}
                >
                  تفعيل
                </Button>
              </RBACGuard>
            )}

            {/* Suspend Button */}
            {!isDeleted && statusConfig.canSuspend && (
              <RBACGuard requiredPermissions={['benefit_policies.suspend']}>
                <Button
                  startIcon={<SuspendIcon />}
                  onClick={handleSuspend}
                  variant="contained"
                  color="warning"
                  size="small"
                  disabled={isLoading_Action}
                >
                  إيقاف مؤقت
                </Button>
              </RBACGuard>
            )}

            {/* Cancel Button */}
            {!isDeleted && statusConfig.canCancel && (
              <RBACGuard requiredPermissions={['benefit_policies.cancel']}>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={isLoading_Action}
                >
                  إلغاء
                </Button>
              </RBACGuard>
            )}

            {/* Delete Button */}
            {!isDeleted && statusConfig.canDelete && (
              <RBACGuard requiredPermissions={['benefit_policies.delete']}>
                <Button
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={isLoading_Action}
                >
                  حذف
                </Button>
              </RBACGuard>
            )}
          </Stack>
        }
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 600,
              fontSize: '0.875rem'
            }
          }}
        >
          <Tab icon={<InfoIcon />} iconPosition="start" label="نظرة عامة" />
          <Tab icon={<RuleIcon />} iconPosition="start" label="قواعد التغطية" />
          <Tab icon={<LayersIcon />} iconPosition="start" label="القطاعات والاستهلاك" />
        </Tabs>
      </ModernPageHeader>

      {/* Tab Content */}
      {activeTab === 0 && (
        /* Overview Tab - Policy Header Card - Odoo Style */
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <MainCard title="معلومات أساسية" secondary={<StatusChip status={policy?.status} />}>
              <DetailRow label="اسم الوثيقة" value={policy?.name} icon={PolicyIcon} />
              <DetailRow label="رمز الوثيقة" value={policy?.policyCode} icon={CodeIcon} />
              <DetailRow label="الشريك" value={policy?.employerName} icon={BusinessIcon} />
              <Divider sx={{ my: 2 }} />
              <DetailRow
                label="تاريخ البدء"
                value={policy?.startDate ? new Date(policy.startDate).toLocaleDateString(getAppLocale()) : null}
                icon={CalendarIcon}
              />
              <DetailRow
                label="تاريخ الانتهاء"
                value={policy?.endDate ? new Date(policy.endDate).toLocaleDateString(getAppLocale()) : null}
                icon={CalendarIcon}
              />
            </MainCard>
          </Grid>

          {/* Coverage Information */}
          <Grid item xs={12} md={6}>
            <MainCard title="معلومات التغطية">
              <DetailRow
                label="الحد السنوي"
                value={policy?.annualLimit ? `${Number(policy.annualLimit).toLocaleString(getAppLocale())} د.ل` : 'غير محدد'}
                icon={MoneyIcon}
              />
              <DetailRow
                label="نسبة التغطية الافتراضية"
                value={
                  policy?.defaultCoveragePercent !== null && policy?.defaultCoveragePercent !== undefined
                    ? `${policy.defaultCoveragePercent}%`
                    : 'غير محدد'
                }
                icon={PercentIcon}
              />
              <Divider sx={{ my: 2 }} />
              {/* عدد القواعد removed - see BenefitPolicyRulesTab for count */}
              <DetailRow label="عدد الأعضاء المرتبطين" value={policy?.membersCount || 0} />
            </MainCard>
          </Grid>

          {/* Description / Notes */}
          {policy?.description && (
            <Grid item xs={12}>
              <MainCard title="الوصف">
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {policy.description}
                </Typography>
              </MainCard>
            </Grid>
          )}

          {/* Audit Information */}
          <Grid item xs={12}>
            <MainCard title="معلومات النظام">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailRow
                    label="تاريخ الإنشاء"
                    value={policy?.createdAt ? new Date(policy.createdAt).toLocaleString(getAppLocale()) : null}
                    icon={CalendarIcon}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow
                    label="آخر تحديث"
                    value={policy?.updatedAt ? new Date(policy.updatedAt).toLocaleString(getAppLocale()) : null}
                    icon={CalendarIcon}
                  />
                </Grid>
              </Grid>
            </MainCard>
          </Grid>
        </Grid>
      )}

      {/* Rules Tab */}
      {activeTab === 1 && <BenefitPolicyRulesTab policyId={id} policyStatus={policy?.status} distributionType={policy?.distributionType || 'UNIFIED'} />}

      {/* Distributions Tab */}
      {activeTab === 2 && (
        <BenefitPolicyDistributionsTab
          policyId={Number(id)}
          policyStatus={policy?.status}
          distributionType={policy?.distributionType || 'UNIFIED'}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        onConfirm={handleConfirmAction}
        onCancel={closeDialog}
        loading={isLoading_Action}
        confirmColor={dialogState.action === 'delete' || dialogState.action === 'cancel' ? 'error' : 'primary'}
      />

      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>استنساخ الوثيقة</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">سيتم نسخ جميع قواعد التغطية والحدود من الوثيقة الحالية إلى وثيقة جديدة في حالة "مسودة".</Typography>
            <TextField
              label="اسم الوثيقة الجديدة"
              fullWidth
              value={cloneData.name}
              onChange={(e) => setCloneData({ ...cloneData, name: e.target.value })}
            />
            <Autocomplete
              options={employers}
              getOptionLabel={(option) => option.name}
              value={employers.find(e => e.id === cloneData.targetEmployerId) || null}
              onChange={(_, val) => setCloneData({ ...cloneData, targetEmployerId: val?.id })}
              renderInput={(params) => <TextField {...params} label="الشريك المستهدف" />}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ البدء"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={cloneData.startDate}
                  onChange={(e) => setCloneData({ ...cloneData, startDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ الانتهاء"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={cloneData.endDate}
                  onChange={(e) => setCloneData({ ...cloneData, endDate: e.target.value })}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => cloneMutation.mutate(cloneData)}
            disabled={cloneMutation.isPending || !cloneData.name}
          >
            تأكيد الاستنساخ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Simulation Dialog */}
      <Dialog open={simulationDialogOpen} onClose={() => setSimulationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>محاكاة التغطية (اختبار تجريبي)</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">اختبر كيف سيقوم النظام بحساب التغطية لخدمة معينة تحت هذه الوثيقة.</Typography>
            <Autocomplete
              options={services}
              getOptionLabel={(option) => `[${option.code}] ${option.name}`}
              value={services.find(s => s.id === simData.serviceId) || null}
              onChange={(_, val) => setSimData({ ...simData, serviceId: val?.id })}
              renderInput={(params) => <TextField {...params} label="اختر الخدمة الطبية" />}
            />
            <TextField
              select
              label="نوع الزيارة"
              fullWidth
              value={simData.encounterType}
              onChange={(e) => setSimData({ ...simData, encounterType: e.target.value })}
            >
              <MenuItem value="CONSULTATION">استشارة (Consultation)</MenuItem>
              <MenuItem value="EMERGENCY">طوارئ (Emergency)</MenuItem>
              <MenuItem value="INPATIENT">إيواء (Inpatient)</MenuItem>
            </TextField>

            {simulationResult && <SimulationResult result={simulationResult} />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationDialogOpen(false)}>إغلاق</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => simulateMutation.mutate({ policyId: id, ...simData })}
            disabled={simulateMutation.isPending || !simData.serviceId}
          >
            {simulateMutation.isPending ? 'جاري الاختبار...' : 'بدء المحاكاة'}
          </Button>
        </DialogActions>
      </Dialog>
    </RBACGuard>
  );
};

export default BenefitPolicyView;
