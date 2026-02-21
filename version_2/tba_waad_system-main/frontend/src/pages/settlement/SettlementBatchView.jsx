/**
 * Settlement Batch View Page - Phase 3B Settlement
 * Shows batch details with claims and lifecycle actions
 *
 * Batch Lifecycle Actions:
 * - DRAFT: Add/Remove claims, Confirm, Cancel
 * - CONFIRMED: Pay, Cancel
 * - PAID: View only
 * - CANCELLED: View only
 *
 * Features:
 * - Batch summary (provider, totals, status)
 * - Claims list in batch
 * - Lifecycle action buttons (context-sensitive)
 *
 * Architecture:
 * ✅ All financial calculations done server-side
 * ❌ NO frontend financial modifications
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentsIcon from '@mui/icons-material/Payments';
import RefreshIcon from '@mui/icons-material/Refresh';
import DraftsIcon from '@mui/icons-material/Drafts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidIcon from '@mui/icons-material/Paid';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';

// MUI DataGrid
import { DataGrid } from '@mui/x-data-grid';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import PermissionGuard from 'components/PermissionGuard';

// Services
import { settlementBatchesService } from 'services/api/settlement.service';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'settlement-batch';

// Batch Status Configuration
const BATCH_STATUS_CONFIG = {
  DRAFT: {
    label: 'مسودة',
    color: 'warning',
    icon: DraftsIcon,
    description: 'قيد التحضير - يمكن التعديل',
    allowEdit: true,
    allowConfirm: true,
    allowPay: false,
    allowCancel: true
  },
  CONFIRMED: {
    label: 'مؤكد',
    color: 'info',
    icon: CheckCircleIcon,
    description: 'تم التأكيد - جاهز للدفع',
    allowEdit: false,
    allowConfirm: false,
    allowPay: true,
    allowCancel: true
  },
  PAID: {
    label: 'مدفوع',
    color: 'success',
    icon: PaidIcon,
    description: 'تم الدفع - مكتمل',
    allowEdit: false,
    allowConfirm: false,
    allowPay: false,
    allowCancel: false
  },
  CANCELLED: {
    label: 'ملغي',
    color: 'error',
    icon: CancelIcon,
    description: 'تم الإلغاء',
    allowEdit: false,
    allowConfirm: false,
    allowPay: false,
    allowCancel: false
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency with LYD - ALWAYS returns string
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 د.ل';
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

/**
 * Format date for display - ALWAYS returns string
 */
const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(date);
  }
};

/**
 * Safely get provider name from batch data
 */
const getProviderName = (batch) => {
  if (!batch) return '-';
  return batch.providerName || batch.provider?.name || `مقدم خدمة #${batch.providerId || ''}`;
};

// ============================================================================
// BATCH STATUS CHIP COMPONENT
// ============================================================================

const BatchStatusChip = ({ status, size = 'medium' }) => {
  const config = BATCH_STATUS_CONFIG[status] || {
    label: status,
    color: 'default',
    icon: null
  };
  const Icon = config.icon;

  return (
    <Tooltip title={config.description || ''}>
      <Chip
        icon={Icon ? <Icon fontSize="small" /> : null}
        label={config.label}
        color={config.color}
        variant="filled"
        size={size}
        sx={{ fontWeight: 600 }}
      />
    </Tooltip>
  );
};

// ============================================================================
// BATCH SUMMARY CARD
// ============================================================================

const BatchSummaryCard = ({ batch, isLoading }) => {
  if (isLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={40} />
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rectangular" height={100} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!batch) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        لم يتم العثور على بيانات الدفعة
      </Alert>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <PaymentsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight={600}>
                {batch.batchNumber || `BATCH-${batch.id}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {batch.providerName}
              </Typography>
            </Box>
          </Stack>
          <BatchStatusChip status={batch.status} size="large" />
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {/* Financial Summary */}
        <Grid container spacing={3}>
          {/* Total Amount */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                إجمالي المبلغ
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {formatCurrency(batch.totalAmount)}
              </Typography>
            </Paper>
          </Grid>

          {/* Claims Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                عدد المطالبات
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <ReceiptIcon color="info" />
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {batch.claimsCount || 0}
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* Created Date */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                تاريخ الإنشاء
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {formatDate(batch.createdAt)}
              </Typography>
            </Paper>
          </Grid>

          {/* Paid Date (if applicable) */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: batch.paidAt ? 'success.lighter' : 'grey.100',
                borderRadius: 2,
                textAlign: 'center'
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                تاريخ الدفع
              </Typography>
              <Typography variant="h6" fontWeight={600} color={batch.paidAt ? 'success.main' : 'text.secondary'}>
                {batch.paidAt ? formatDate(batch.paidAt) : 'لم يتم الدفع بعد'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Description */}
        {batch.description && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              الوصف
            </Typography>
            <Typography variant="body1">{batch.description}</Typography>
          </Box>
        )}

        {/* Payment Reference (if paid) */}
        {batch.paymentReference && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              مرجع الدفع
            </Typography>
            <Chip label={batch.paymentReference} color="success" variant="outlined" />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// CONFIRMATION DIALOGS
// ============================================================================

const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText, confirmColor = 'primary', isLoading }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={isLoading}>
        إلغاء
      </Button>
      <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={isLoading}>
        {isLoading ? 'جاري...' : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

const PaymentDialog = ({ open, onClose, onConfirm, isLoading }) => {
  const [paymentReference, setPaymentReference] = useState('');

  const handleConfirm = () => {
    onConfirm({ paymentReference, paymentMethod: 'BANK_TRANSFER' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6">تأكيد الدفع</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>تنبيه:</strong> عملية الدفع نهائية ولا يمكن التراجع عنها
        </Alert>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="مرجع الدفع"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            fullWidth
            placeholder="رقم الحوالة أو الشيك"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          إلغاء
        </Button>
        <Button onClick={handleConfirm} color="success" variant="contained" disabled={isLoading}>
          {isLoading ? 'جاري الدفع...' : 'تأكيد الدفع'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CancelDialog = ({ open, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CancelIcon color="error" />
          <Typography variant="h6">إلغاء الدفعة</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          سيتم إلغاء الدفعة وإعادة المطالبات إلى قائمة الانتظار
        </Alert>
        <TextField
          label="سبب الإلغاء"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="أدخل سبب الإلغاء (اختياري)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          تراجع
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={isLoading}>
          {isLoading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SettlementBatchView = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // ========================================
  // DATA FETCHING
  // ========================================

  // Fetch batch details
  const {
    data: batchData,
    isLoading: isLoadingBatch,
    isError: isBatchError,
    error: batchError,
    refetch: refetchBatch
  } = useQuery({
    queryKey: [QUERY_KEY, batchId],
    queryFn: () => settlementBatchesService.getById(batchId),
    enabled: !!batchId,
    staleTime: 1000 * 60 * 2
  });

  // Fetch batch items (claims)
  const {
    data: itemsData,
    isLoading: isLoadingItems,
    refetch: refetchItems
  } = useQuery({
    queryKey: [QUERY_KEY, batchId, 'items'],
    queryFn: () => settlementBatchesService.getItems(batchId),
    enabled: !!batchId,
    staleTime: 1000 * 60 * 2
  });

  // ========================================
  // MUTATIONS
  // ========================================

  // Confirm batch mutation
  const confirmMutation = useMutation({
    mutationFn: () => settlementBatchesService.confirm(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEY, batchId]);
      setConfirmDialogOpen(false);
      openSnackbar({
        message: 'تم تأكيد الدفعة بنجاح',
        variant: 'success'
      });
    },
    onError: (error) => {
      openSnackbar({
        message: error.message || 'فشل في تأكيد الدفعة',
        variant: 'error'
      });
    }
  });

  // Pay batch mutation
  const payMutation = useMutation({
    mutationFn: (data) => settlementBatchesService.pay(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEY, batchId]);
      setPaymentDialogOpen(false);
      openSnackbar({
        message: 'تم تسجيل الدفع بنجاح',
        variant: 'success'
      });
    },
    onError: (error) => {
      openSnackbar({
        message: error.message || 'فشل في تسجيل الدفع',
        variant: 'error'
      });
    }
  });

  // Cancel batch mutation
  const cancelMutation = useMutation({
    mutationFn: (reason) => settlementBatchesService.cancel(batchId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEY, batchId]);
      setCancelDialogOpen(false);
      openSnackbar({
        message: 'تم إلغاء الدفعة',
        variant: 'info'
      });
    },
    onError: (error) => {
      openSnackbar({
        message: error.message || 'فشل في إلغاء الدفعة',
        variant: 'error'
      });
    }
  });

  // ========================================
  // HANDLERS
  // ========================================

  const handleBack = useCallback(() => {
    navigate('/settlement/batches');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    refetchBatch();
    refetchItems();
    openSnackbar({
      message: 'جاري تحديث البيانات...',
      variant: 'info'
    });
  }, [refetchBatch, refetchItems]);

  const handleAddClaims = useCallback(() => {
    navigate(`/settlement/batches/${batchId}/add-claims`);
  }, [navigate, batchId]);

  // ========================================
  // TABLE COLUMNS
  // ========================================

  // ========================================
  // PROCESS ITEMS DATA
  // ========================================

  const processedItems = useMemo(() => {
    if (!itemsData) return [];
    const list = Array.isArray(itemsData) ? itemsData : itemsData?.content || [];
    return list.map((item, index) => ({
      id: item.id || item.claimId || `item-${index}`,
      claimId: item.claimId,
      claimNumber: item.claimNumber || `CLM-${item.claimId || index}`,
      memberName: item.memberName || '-',
      serviceDate: item.serviceDate,
      approvedAmount: Number(item.approvedAmount) || 0,
      claimStatus: item.claimStatus || 'BATCHED'
    }));
  }, [itemsData]);

  // ========================================
  // TABLE COLUMNS (DataGrid format)
  // ========================================

  const itemColumns = useMemo(
    () => [
      {
        field: 'claimNumber',
        headerName: 'رقم المطالبة',
        width: 150,
        renderCell: (params) => (
          <Typography fontWeight={600} color="primary.main">
            {String(params.value || '-')}
          </Typography>
        )
      },
      {
        field: 'memberName',
        headerName: 'اسم المستفيد',
        flex: 1,
        minWidth: 180,
        renderCell: (params) => <Typography>{String(params.value || '-')}</Typography>
      },
      {
        field: 'serviceDate',
        headerName: 'تاريخ الخدمة',
        width: 120,
        renderCell: (params) => <Typography variant="body2">{formatDate(params.value)}</Typography>
      },
      {
        field: 'approvedAmount',
        headerName: 'المبلغ المعتمد',
        width: 140,
        renderCell: (params) => (
          <Typography fontWeight={600} color="success.main">
            {formatCurrency(params.value)}
          </Typography>
        )
      },
      {
        field: 'claimStatus',
        headerName: 'حالة المطالبة',
        width: 120,
        renderCell: (params) => {
          const status = params.value;
          const label = status === 'SETTLED' ? 'مُسوّاة' : status === 'BATCHED' ? 'في دفعة' : String(status || '-');
          return <Chip label={label} color={status === 'SETTLED' ? 'success' : 'info'} size="small" variant="outlined" />;
        }
      }
    ],
    []
  );

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const currentStatusConfig = BATCH_STATUS_CONFIG[batchData?.status] || {};
  const canEdit = currentStatusConfig.allowEdit;
  const canConfirm = currentStatusConfig.allowConfirm && (itemsData?.length || 0) > 0;
  const canPay = currentStatusConfig.allowPay;
  const canCancel = currentStatusConfig.allowCancel;

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [
    { label: 'الرئيسية', path: '/' },
    { label: 'التسويات', path: '/settlement' },
    { label: 'دفعات التسوية', path: '/settlement/batches' },
    { label: batchData?.batchNumber || 'تفاصيل الدفعة' }
  ];

  // ========================================
  // PAGE ACTIONS
  // ========================================

  const pageActions = (
    <Stack direction="row" spacing={1}>
      {/* Add Claims Button (DRAFT only) */}
      {canEdit && (
        <PermissionGuard resource="settlements" action="create">
          <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={handleAddClaims}>
            إضافة مطالبات
          </Button>
        </PermissionGuard>
      )}

      {/* Confirm Button (DRAFT only) */}
      {canConfirm && (
        <PermissionGuard resource="settlements" action="confirm">
          <Button variant="contained" color="info" startIcon={<CheckCircleIcon />} onClick={() => setConfirmDialogOpen(true)}>
            تأكيد الدفعة
          </Button>
        </PermissionGuard>
      )}

      {/* Pay Button (CONFIRMED only) */}
      {canPay && (
        <PermissionGuard resource="settlements" action="pay">
          <Button variant="contained" color="success" startIcon={<PaidIcon />} onClick={() => setPaymentDialogOpen(true)}>
            تسجيل الدفع
          </Button>
        </PermissionGuard>
      )}

      {/* Cancel Button (DRAFT or CONFIRMED) */}
      {canCancel && (
        <PermissionGuard resource="settlements" action="cancel">
          <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setCancelDialogOpen(true)}>
            إلغاء
          </Button>
        </PermissionGuard>
      )}

      <Tooltip title="تحديث">
        <IconButton onClick={handleRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="رجوع">
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  // ========================================
  // RENDER
  // ========================================

  if (isBatchError) {
    return (
      <Box>
        <UnifiedPageHeader
          title="تفاصيل الدفعة"
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          }
        />
        <Alert severity="error">{batchError?.message || 'فشل في تحميل بيانات الدفعة'}</Alert>
      </Box>
    );
  }

  return (
    <PermissionGuard resource="settlements" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="تفاصيل دفعة التسوية"
          subtitle={batchData?.batchNumber || ''}
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={pageActions}
        />

        {/* Lock Warning for non-editable batches */}
        {!canEdit && batchData?.status !== 'DRAFT' && (
          <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
            {batchData?.status === 'PAID'
              ? 'هذه الدفعة مكتملة ولا يمكن التعديل عليها'
              : batchData?.status === 'CANCELLED'
                ? 'هذه الدفعة ملغاة'
                : 'هذه الدفعة مؤكدة - يمكن تسجيل الدفع أو الإلغاء فقط'}
          </Alert>
        )}

        {/* Batch Summary */}
        <BatchSummaryCard batch={batchData} isLoading={isLoadingBatch} />

        {/* Claims Table */}
        <MainCard title="المطالبات في هذه الدفعة" sx={{ mt: 2 }}>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={processedItems}
              columns={itemColumns}
              loading={isLoadingItems}
              pageSizeOptions={[10, 20, 50]}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
              localeText={{
                noRowsLabel: 'لا توجد مطالبات في هذه الدفعة',
                MuiTablePagination: {
                  labelRowsPerPage: 'عدد الصفوف:',
                  labelDisplayedRows: ({ from, to, count }) => `${from}-${to} من ${count}`
                }
              }}
            />
          </Box>
        </MainCard>

        {/* Dialogs */}
        <ConfirmDialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={() => confirmMutation.mutate()}
          title="تأكيد الدفعة"
          message="هل تريد تأكيد هذه الدفعة؟ بعد التأكيد لن تتمكن من إضافة أو إزالة مطالبات."
          confirmText="تأكيد"
          confirmColor="info"
          isLoading={confirmMutation.isPending}
        />

        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          onConfirm={(data) => payMutation.mutate(data)}
          isLoading={payMutation.isPending}
        />

        <CancelDialog
          open={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          onConfirm={(reason) => cancelMutation.mutate(reason)}
          isLoading={cancelMutation.isPending}
        />
      </Box>
    </PermissionGuard>
  );
};

export default SettlementBatchView;
