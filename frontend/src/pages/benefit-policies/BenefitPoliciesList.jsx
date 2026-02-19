import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PolicyIcon from '@mui/icons-material/Policy';
import RefreshIcon from '@mui/icons-material/Refresh';

import AddIcon from '@mui/icons-material/Add';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import ToggleButton from '@mui/material/ToggleButton';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

import LifecycleActionModal from 'components/common/lifecycle/LifecycleActionModal';

import MainCard from 'components/MainCard';
import { GenericDataTable, ModernPageHeader, RBACGuard } from 'components/tba';
import TableErrorBoundary from 'components/TableErrorBoundary';

// Constants
import { PERMISSIONS } from 'constants/permissions.constants';

// Hooks
import { useTableState } from 'hooks/useTableState';

// Style Utils
import { headerButtonStyle } from 'utils/styleUtils';

import { getBenefitPolicies, activateBenefitPolicy } from 'services/api/benefit-policies.service';

const QUERY_KEY = 'benefit-policies';

const STATUS_CONFIG = {
  DRAFT: { label: 'مسودة', color: 'default' },
  ACTIVE: { label: 'نشط', color: 'success' },
  INACTIVE: { label: 'غير نشط', color: 'default' },
  SUSPENDED: { label: 'موقوف', color: 'warning' },
  EXPIRED: { label: 'منتهي', color: 'error' },
  CANCELLED: { label: 'ملغي', color: 'error' }
};

const BenefitPoliciesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [showDeleted, setShowDeleted] = useState(false);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    onConfirm: null,
    confirmText: 'نعم',
    cancelText: 'إلغاء',
    severity: 'warning'
  });

  // Lifecycle Modal State
  const [lifecycleModal, setLifecycleModal] = useState({
    open: false,
    policyId: null
  });

  // Persist pagination size
  const savedPageSize = localStorage.getItem('benefitPolicies_pageSize');

  const tableState = useTableState({
    initialPageSize: savedPageSize ? parseInt(savedPageSize, 10) : 10,
    allowedPageSizes: [10, 25, 50, 100],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    initialFilters: {},
    storageKey: 'benefitPolicies_pageSize'
  });

  // Save page size when it changes
  useEffect(() => {
    localStorage.setItem('benefitPolicies_pageSize', tableState.pageSize);
  }, [tableState.pageSize]);

  const handleNavigateAdd = useCallback(() => navigate('/benefit-policies/create'), [navigate]);
  const handleNavigateView = useCallback((id) => navigate(`/benefit-policies/${id}`), [navigate]);
  const handleNavigateEdit = useCallback((id) => navigate(`/benefit-policies/edit/${id}`), [navigate]);

  const closeDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // Activate Mutation
  const activateMutation = useMutation({
    mutationFn: activateBenefitPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['employers'] }); // Refresh employer active policy too
      enqueueSnackbar('تم تفعيل الوثيقة بنجاح', { variant: 'success' });
      closeDialog();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل التفعيل', { variant: 'error' });
      closeDialog();
    }
  });

  const handleActivate = useCallback((id) => {
    setConfirmDialog({
      open: true,
      title: 'تأكيد التفعيل',
      content: "هل أنت متأكد من تفعيل هذه الوثيقة؟ سيتم تعطيل أي وثيقة نشطة أخرى لنفس جهة العمل.",
      confirmText: 'نعم، تفعيل',
      severity: 'success',
      onConfirm: () => {
        activateMutation.mutate(id);
      }
    });
  }, [activateMutation]);

  const handleOpenLifecycle = useCallback((id) => {
    setLifecycleModal({ open: true, policyId: id });
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, showDeleted],
    queryFn: async () => {
      const params = {
        page: tableState.page,
        size: tableState.pageSize,
        includeDeleted: showDeleted
      };
      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
      }
      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) params[key] = value;
      });
      return await getBenefitPolicies(params);
    }
  });

  const columns = useMemo(() => [
    {
      accessorKey: 'policyCode',
      header: 'رمز السياسة',
      enableSorting: true,
      enableColumnFilter: false,
      minWidth: 120,
      align: 'right',
      cell: ({ getValue }) => <Chip label={getValue() || '-'} size="small" variant="outlined" color="primary" />
    },
    {
      accessorKey: 'name',
      header: 'اسم السياسة',
      enableSorting: true,
      enableColumnFilter: false,
      minWidth: 250,
      align: 'right',
      cell: ({ getValue }) => <Typography variant="body2" fontWeight={500}>{getValue() || '-'}</Typography>
    },
    {
      accessorKey: 'employerName',
      header: 'الشريك',
      enableSorting: true,
      enableColumnFilter: false,
      minWidth: 200,
      align: 'right',
      cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
    },
    {
      accessorKey: 'startDate',
      header: 'تاريخ البدء',
      enableSorting: true,
      enableColumnFilter: false,
      minWidth: 120,
      align: 'center',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? <Chip label={dayjs(date).format('YYYY-MM-DD')} size="small" variant="outlined" /> : '-';
      }
    },
    {
      accessorKey: 'endDate',
      header: 'تاريخ الانتهاء',
      enableSorting: true,
      enableColumnFilter: false,
      minWidth: 120,
      align: 'center',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? <Chip label={dayjs(date).format('YYYY-MM-DD')} size="small" variant="outlined" /> : '-';
      }
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      enableSorting: true,
      enableColumnFilter: false,
      minWidth: 120,
      align: 'center',
      cell: ({ getValue, row }) => {
        const status = getValue();
        // If row is deleted (active=false) but status is not CANCELLED/INACTIVE, show as Deleted
        if (row.original.active === false && status !== 'CANCELLED' && status !== 'INACTIVE') {
          return <Chip label="محذوف" color="error" size="small" />;
        }
        const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" />
      }
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      enableSorting: false,
      enableColumnFilter: false,
      minWidth: 150,
      align: 'center',
      cell: ({ row }) => {
        const isDeleted = !row.original?.active || row.original.status === 'CANCELLED';

        return (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            {/* View Always available */}
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleNavigateView(row.original?.id); }}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Edit available for non-deleted (mostly Draft/Active) */}
            {!isDeleted && (
              <RBACGuard requiredPermissions={[PERMISSIONS.BENEFIT_POLICY_EDIT]}>
                <Tooltip title="تعديل">
                  <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleNavigateEdit(row.original?.id); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </RBACGuard>
            )}

            {/* Standard Status Actions (Quick Activation) */}
            {!isDeleted && row.original.status === 'DRAFT' && (
              <RBACGuard requiredPermissions={[PERMISSIONS.BENEFIT_POLICY_ACTIVATE]}>
                <Tooltip title="تفعيل">
                  <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); handleActivate(row.original?.id); }}>
                    <PolicyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </RBACGuard>
            )}

            {/* Hub: Lifecycle & Deletion Management */}
            <RBACGuard requiredPermissions={[PERMISSIONS.BENEFIT_POLICY_DELETE, PERMISSIONS.BENEFIT_POLICY_EDIT]}>
              <Tooltip title={isDeleted ? "استعادة / إدارة" : "إدارة الحالة والحذف"}>
                <IconButton
                  size="small"
                  color={isDeleted ? "success" : "secondary"}
                  onClick={(e) => { e.stopPropagation(); handleOpenLifecycle(row.original?.id); }}
                >
                  {isDeleted ? <RestoreFromTrashIcon fontSize="small" /> : <SettingsSuggestIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </RBACGuard>
          </Stack>
        )
      }
    }
  ], [handleNavigateView, handleNavigateEdit, handleActivate, handleOpenLifecycle]);

  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.BENEFIT_POLICY_VIEW]}>
      <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ModernPageHeader
          title="سياسات المنافع"
          subtitle="إدارة سياسات المنافع والتغطية التأمينية"
          icon={<PolicyIcon />}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'سياسات المنافع' }]}
          actions={
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })} color="primary">
                <RefreshIcon />
              </IconButton>

              <ToggleButton
                value="check"
                selected={showDeleted}
                onChange={() => setShowDeleted(!showDeleted)}
                color="warning"
                size="small"
                sx={(theme) => ({
                  borderRadius: 2,
                  px: 2,
                  height: 38,
                  borderColor: theme.palette.warning.main,
                  color: showDeleted ? theme.palette.warning.contrastText : theme.palette.warning.main,
                  backgroundColor: showDeleted ? theme.palette.warning.main : 'transparent',
                  '&:hover': {
                    backgroundColor: showDeleted ? theme.palette.warning.dark : `${theme.palette.warning.main}10`,
                  }
                })}
              >
                <DeleteSweepIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" fontWeight={600}>
                  {showDeleted ? 'قائمة الوثائق' : 'المحذوفات'}
                </Typography>
              </ToggleButton>

              <RBACGuard requiredPermissions={[PERMISSIONS.BENEFIT_POLICY_CREATE]}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleNavigateAdd}
                  sx={(theme) => headerButtonStyle('add', theme)}
                >
                  إنشاء سياسة
                </Button>
              </RBACGuard>
            </Stack>
          }
          sx={{ mb: 1.5 }}
        />

        <MainCard content={false} sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2
        }}>
          {isError && (
            <Alert severity="error" sx={{ m: 2 }}>
              فشل تحميل البيانات: {error?.response?.data?.message || error?.message || 'خطأ غير معروف'}
            </Alert>
          )}
          <TableErrorBoundary>
            <GenericDataTable
              columns={columns}
              data={data?.content || []}
              totalCount={data?.totalElements || 0}
              isLoading={isLoading}
              tableState={tableState}
              enableFiltering={false}
              enableSorting={true}
              enablePagination={true}
              stickyHeader={true}
              onRowClick={(row) => handleNavigateView(row.id)}
              emptyMessage="لا توجد سياسات"
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </TableErrorBoundary>
        </MainCard>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeDialog}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.content}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit">{confirmDialog.cancelText}</Button>
          <Button onClick={confirmDialog.onConfirm} color={confirmDialog.severity === 'error' ? 'error' : 'primary'} autoFocus>
            {confirmDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unified Lifecycle Action Modal */}
      <LifecycleActionModal
        open={lifecycleModal.open}
        onClose={() => setLifecycleModal(prev => ({ ...prev, open: false }))}
        entityType="BENEFIT_POLICY"
        entityId={lifecycleModal.policyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
          enqueueSnackbar('تم تحديث حالة الوثيقة بنجاح', { variant: 'success' });
        }}
      />
    </RBACGuard>
  );
};

export default BenefitPoliciesList;
