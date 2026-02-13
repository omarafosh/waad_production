import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CheckCircle as ActivateIcon,
  Pause as SuspendIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { orderBy } from 'lodash-es';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import MainCard from '../../components/MainCard';
import ModernPageHeader from '../../components/tba/ModernPageHeader';
import ContractStatusChip from '../../components/employers/ContractStatusChip';
import ContractFormDialog from '../../components/employers/ContractFormDialog';
import benefitPolicyService from '../../services/benefitPolicyService';
import api from 'utils/axios';

/**
 * Employer Contract Details Page
 * 
 * Displays comprehensive information about a benefit policy (contract).
 * 
 * Features:
 * - Contract basic information
 * - Coverage details and limits
 * - Benefit policy rules (covered services)
 * - Statistics
 * - Status management actions
 */
const EmployerContractDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Table State
  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'serviceName', direction: 'asc' }
  });

  // Client-side pagination/sorting for rules
  const processedRules = useMemo(() => {
    let data = [...rules];
    if (tableState.sorting.length > 0) {
      const { id, desc } = tableState.sorting[0];
      data = orderBy(data, [item => item[id]], [desc ? 'desc' : 'asc']);
    }
    return data;
  }, [rules, tableState.sorting]);

  const paginatedRules = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    return processedRules.slice(start, start + tableState.pageSize);
  }, [processedRules, tableState.page, tableState.pageSize]);

  // Load contract details
  useEffect(() => {
    const loadContract = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await benefitPolicyService.getById(id);
        setContract(response.data);
      } catch (err) {
        console.error('Error loading contract:', err);
        setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل تفاصيل العقد');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadContract();
    }
  }, [id]);

  // Load benefit policy rules
  useEffect(() => {
    const loadRules = async () => {
      if (!contract?.id) return;

      setRulesLoading(true);
      try {
        const response = await api.get(`/api/benefit-policy-rules/policy/${contract.id}`);
        setRules(response.data || []);
      } catch (err) {
        console.error('Error loading rules:', err);
      } finally {
        setRulesLoading(false);
      }
    };

    if (contract) {
      loadRules();
    }
  }, [contract]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleEdit = () => {
    setFormDialogOpen(true);
  };

  const handleFormSuccess = async (data) => {
    showSnackbar('تم تحديث العقد بنجاح', 'success');
    // Reload contract
    try {
      const response = await benefitPolicyService.getById(id);
      setContract(response.data);
    } catch (err) {
      console.error('Error reloading contract:', err);
    }
  };

  const handleStatusAction = (action) => {
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const executeAction = async () => {
    if (!contract || !confirmAction) return;

    try {
      switch (confirmAction) {
        case 'activate':
          await benefitPolicyService.activate(contract.id);
          showSnackbar('تم تفعيل العقد بنجاح', 'success');
          break;
        case 'suspend':
          await benefitPolicyService.suspend(contract.id);
          showSnackbar('تم تعليق العقد بنجاح', 'success');
          break;
        case 'cancel':
          await benefitPolicyService.cancel(contract.id);
          showSnackbar('تم إلغاء العقد بنجاح', 'success');
          break;
        default:
          break;
      }

      // Reload contract
      const response = await benefitPolicyService.getById(id);
      setContract(response.data);
    } catch (error) {
      console.error(`Error executing ${confirmAction}:`, error);
      showSnackbar(error.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية', 'error');
    } finally {
      setConfirmDialogOpen(false);
      setConfirmAction(null);
    }
  };

  const getConfirmMessage = () => {
    const messages = {
      activate: 'هل أنت متأكد من تفعيل هذا العقد؟',
      suspend: 'هل أنت متأكد من تعليق هذا العقد؟',
      cancel: 'هل أنت متأكد من إلغاء هذا العقد؟ هذا الإجراء لا يمكن التراجع عنه.'
    };
    return messages[confirmAction] || '';
  };

  // Rules GenericDataTable columns
  const rulesColumns = useMemo(() => [
    {
      accessorKey: 'serviceName',
      header: 'الخدمة',
      size: 200
    },
    {
      accessorKey: 'coveragePercent',
      header: 'نسبة التغطية',
      size: 120,
      cell: ({ getValue }) => `${getValue()}%`
    },
    {
      accessorKey: 'maxAmount',
      header: 'الحد الأقصى',
      size: 120,
      cell: ({ getValue }) => getValue() ? `${getValue().toLocaleString('ar-SA')} ر.س` : 'غير محدد'
    },
    {
      accessorKey: 'waitingPeriodDays',
      header: 'فترة الانتظار (أيام)',
      size: 120,
      cell: ({ getValue }) => getValue() || 0
    },
    {
      accessorKey: 'active',
      header: 'الحالة',
      size: 100,
      cell: ({ getValue }) => (
        <Chip
          label={getValue() ? 'نشط' : 'غير نشط'}
          color={getValue() ? 'success' : 'default'}
          size="small"
        />
      )
    }
  ], []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <ModernPageHeader
          title="تفاصيل العقد"
          subtitle="عرض معلومات العقد"
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employers/contracts')}
          sx={{ mt: 2 }}
        >
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  if (!contract) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          العقد غير موجود
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employers/contracts')}
          sx={{ mt: 2 }}
        >
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <ModernPageHeader
        title={contract.name}
        subtitle={`رقم العقد: ${contract.policyCode || 'غير محدد'}`}
        actionButton={{
          label: 'تعديل',
          onClick: handleEdit,
          icon: <EditIcon />
        }}
      />

      {/* Back Button */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/employers/contracts')}
        sx={{ mb: 2 }}
      >
        العودة للقائمة
      </Button>

      <Grid container spacing={3}>
        {/* Basic Info Card */}
        <Grid item xs={12} md={6}>
          <MainCard title="معلومات العقد" sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  اسم العقد
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {contract.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  رقم العقد
                </Typography>
                <Typography variant="body1">
                  {contract.policyCode || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  الوصف
                </Typography>
                <Typography variant="body2">
                  {contract.description || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  الحالة
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <ContractStatusChip status={contract.status} />
                  {contract.effective && (
                    <Chip label="ساري حالياً" color="success" size="small" sx={{ ml: 1 }} />
                  )}
                </Box>
              </Box>

              {contract.notes && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    ملاحظات
                  </Typography>
                  <Typography variant="body2">
                    {contract.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          </MainCard>
        </Grid>

        {/* Organizations Card */}
        <Grid item xs={12} md={6}>
          <MainCard title="الجهات المرتبطة" sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon fontSize="small" />
                  جهة العمل
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {contract.employerName || '-'}
                </Typography>
              </Box>

              {contract.insuranceName && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    شركة التأمين
                  </Typography>
                  <Typography variant="body1">
                    {contract.insuranceName}
                  </Typography>
                </Box>
              )}
            </Box>
          </MainCard>
        </Grid>

        {/* Dates Card */}
        <Grid item xs={12} md={6}>
          <MainCard title="الفترة الزمنية" sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon fontSize="small" />
                  تاريخ البدء
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {dayjs(contract.startDate).format('YYYY-MM-DD')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon fontSize="small" />
                  تاريخ الانتهاء
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {dayjs(contract.endDate).format('YYYY-MM-DD')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  المدة
                </Typography>
                <Typography variant="body1">
                  {dayjs(contract.endDate).diff(dayjs(contract.startDate), 'day')} يوم
                </Typography>
              </Box>
            </Box>
          </MainCard>
        </Grid>

        {/* Limits Card */}
        <Grid item xs={12} md={6}>
          <MainCard title="الحدود المالية" sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MoneyIcon fontSize="small" />
                  الحد السنوي
                </Typography>
                <Typography variant="h4" color="primary" fontWeight={700}>
                  {contract.annualLimit?.toLocaleString('ar-SA')} ر.س
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">
                  نسبة التغطية الافتراضية
                </Typography>
                <Typography variant="h5" color="success.main" fontWeight={600}>
                  {contract.defaultCoveragePercent}%
                </Typography>
              </Box>

              {contract.perMemberLimit && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الحد لكل منتفع
                  </Typography>
                  <Typography variant="body1">
                    {contract.perMemberLimit.toLocaleString('ar-SA')} ر.س
                  </Typography>
                </Box>
              )}

              {contract.perFamilyLimit && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الحد لكل عائلة
                  </Typography>
                  <Typography variant="body1">
                    {contract.perFamilyLimit.toLocaleString('ar-SA')} ر.س
                  </Typography>
                </Box>
              )}
            </Box>
          </MainCard>
        </Grid>

        {/* Statistics Card */}
        <Grid item xs={12}>
          <MainCard title="الإحصائيات">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PeopleIcon color="primary" />
                      <Typography variant="caption" color="textSecondary">
                        عدد المنتفعين المشمولين
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight={700}>
                      {contract.coveredMembersCount || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        عدد القواعد النشطة
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight={700}>
                      {contract.activeRulesCount || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        إجمالي القواعد
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight={700}>
                      {contract.rulesCount || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        {/* Benefit Policy Rules */}
        <Grid item xs={12}>
          <MainCard title="قواعد الخدمات المشمولة">
            <GenericDataTable
              data={paginatedRules}
              columns={rulesColumns}
              totalCount={processedRules.length}
              tableState={tableState}
              isLoading={rulesLoading}
              emptyMessage="لا توجد قواعد محددة"
            />
          </MainCard>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <MainCard>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {contract.status === 'DRAFT' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ActivateIcon />}
                  onClick={() => handleStatusAction('activate')}
                >
                  تفعيل العقد
                </Button>
              )}

              {contract.status === 'ACTIVE' && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<SuspendIcon />}
                  onClick={() => handleStatusAction('suspend')}
                >
                  تعليق العقد
                </Button>
              )}

              {contract.status === 'SUSPENDED' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ActivateIcon />}
                  onClick={() => handleStatusAction('activate')}
                >
                  إعادة التفعيل
                </Button>
              )}

              {(contract.status === 'ACTIVE' || contract.status === 'DRAFT') && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => handleStatusAction('cancel')}
                >
                  إلغاء العقد
                </Button>
              )}
            </Box>
          </MainCard>
        </Grid>
      </Grid>

      {/* Form Dialog */}
      <ContractFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSuccess={handleFormSuccess}
        contract={contract}
        mode="edit"
      />

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>تأكيد العملية</DialogTitle>
        <DialogContent>
          <DialogContentText>{getConfirmMessage()}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>إلغاء</Button>
          <Button onClick={executeAction} variant="contained" color="primary">
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployerContractDetails;
