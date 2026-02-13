import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Assignment as PreApprovalIcon,
  MedicalServices as MedicalIcon,
  PlayArrow as StartReviewIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import { preApprovalsService } from 'services/api';

/**
 * Pre-Approvals Inbox - صندوق الموافقات المسبقة
 *
 * يعرض طلبات الموافقة المسبقة المعلقة (SUBMITTED/UNDER_REVIEW) ويتيح الموافقة أو الرفض
 */
const PreApprovalsInbox = () => {
  const navigate = useNavigate();

  // State
  const [preApprovals, setPreApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // Table State
  const tableState = useTableState({
    initialPageSize: 20,
    defaultSort: { field: 'createdAt', direction: 'asc' }
  });

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPreApproval, setSelectedPreApproval] = useState(null);

  // Form states
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Error/Success states
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch pending pre-approvals
  const fetchPreApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preApprovalsService.getPending({
        page: tableState.page + 1,
        size: tableState.pageSize,
        sortBy: tableState.sorting.length > 0 ? tableState.sorting[0].id : 'createdAt',
        sortDir: tableState.sorting.length > 0 ? (tableState.sorting[0].desc ? 'desc' : 'asc') : 'asc'
      });
      setPreApprovals(response.items || []);
      setTotalRows(response.total || 0);
    } catch (err) {
      console.error('Error fetching pre-approvals:', err);
      setError(err.userMessage || err.response?.data?.message || 'فشل في تحميل طلبات الموافقة المسبقة');
    } finally {
      setLoading(false);
    }
  }, [tableState.page, tableState.pageSize, tableState.sorting]);

  useEffect(() => {
    fetchPreApprovals();
  }, [fetchPreApprovals]);

  // Open approve dialog
  const handleOpenApprove = (preApproval) => {
    setSelectedPreApproval(preApproval);
    setApprovedAmount(preApproval.requestedAmount?.toString() || '');
    setApprovalNotes('');
    setApproveDialogOpen(true);
  };

  // Open reject dialog
  const handleOpenReject = (preApproval) => {
    setSelectedPreApproval(preApproval);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  // Start Review - transition from SUBMITTED to UNDER_REVIEW
  const handleStartReview = async (preApproval) => {
    try {
      setActionLoading(true);
      setError(null);
      await preApprovalsService.startReview(preApproval.id);
      setSuccess('تم بدء مراجعة الطلب');
      fetchPreApprovals();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في بدء المراجعة');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve pre-approval
  const handleApprove = async () => {
    if (!selectedPreApproval) return;

    try {
      setActionLoading(true);
      setError(null);
      await preApprovalsService.approve(selectedPreApproval.id, {
        approvedAmount: parseFloat(approvedAmount) || selectedPreApproval.requestedAmount,
        notes: approvalNotes
      });

      setSuccess('تمت الموافقة على الطلب بنجاح');
      setApproveDialogOpen(false);
      fetchPreApprovals();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في الموافقة على الطلب');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject pre-approval
  const handleReject = async () => {
    if (!selectedPreApproval || !rejectionReason.trim()) {
      setError('يجب إدخال سبب الرفض');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await preApprovalsService.reject(selectedPreApproval.id, {
        rejectionReason: rejectionReason.trim()
      });

      setSuccess('تم رفض الطلب');
      setRejectDialogOpen(false);
      fetchPreApprovals();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في رفض الطلب');
    } finally {
      setActionLoading(false);
    }
  };

  // Status chip (using exact Backend enum values) - CANONICAL 2026-01-26
  // PreAuth workflow: PENDING → UNDER_REVIEW → APPROVED/REJECTED
  const getStatusChip = (status) => {
    const configs = {
      PENDING: { color: 'warning', label: 'معلق' },
      UNDER_REVIEW: { color: 'info', label: 'قيد المراجعة' },
      APPROVED: { color: 'success', label: 'موافق عليه' },
      REJECTED: { color: 'error', label: 'مرفوض' },
      EXPIRED: { color: 'default', label: 'منتهي' },
      CANCELLED: { color: 'default', label: 'ملغي' },
      USED: { color: 'info', label: 'مستخدم' }
    };
    const config = configs[status] || configs.PENDING;
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  // Priority badge (using exact Backend enum values)
  const getUrgencyBadge = (priority) => {
    if (priority === 'EMERGENCY') {
      return <Chip size="small" color="error" label="طارئ" variant="filled" />;
    }
    if (priority === 'URGENT') {
      return <Chip size="small" color="warning" label="عاجل" variant="outlined" />;
    }
    if (priority === 'ROUTINE') {
      return <Chip size="small" color="default" label="عادي" variant="outlined" />;
    }
    return null;
  };

  // GenericDataTable columns (CANONICAL - follows Backend DTO exactly)
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: '#',
      size: 100,
      cell: ({ row }) => row.original.referenceNumber || `-`
    },
    {
      accessorKey: 'memberName',
      header: 'اسم المستفيد',
      size: 180,
      cell: ({ row }) => row.original.memberName || '-'
    },
    {
      accessorKey: 'providerName',
      header: 'مقدم الخدمة',
      size: 180,
      cell: ({ row }) => row.original.providerName || '-'
    },
    {
      accessorKey: 'serviceName',
      header: 'الخدمة',
      size: 150,
      cell: ({ row }) => row.original.serviceName || '-'
    },
    {
      accessorKey: 'contractPrice',
      header: 'المبلغ',
      size: 120,
      cell: ({ row }) => {
        return row.original.contractPrice
          ? `${Number(row.original.contractPrice).toFixed(2)} ${row.original.currency || 'د.ل'}`
          : '-';
      }
    },
    {
      accessorKey: 'priority',
      header: 'الأولوية',
      size: 100,
      cell: ({ row }) => getUrgencyBadge(row.original.priority)
    },
    {
      accessorKey: 'requestDate',
      header: 'تاريخ الطلب',
      size: 130,
      cell: ({ row }) => {
        return row.original.requestDate
          ? new Date(row.original.requestDate).toLocaleDateString('ar-LY')
          : '-';
      }
    },
    {
      accessorKey: 'expiryDate',
      header: 'تاريخ الانتهاء',
      size: 130,
      cell: ({ row }) => {
        const date = row.original.expiryDate || row.original.expiresAt;
        return date ? new Date(date).toLocaleDateString('ar-SA') : '-';
      }
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      size: 120,
      cell: ({ row }) => getStatusChip(row.original.status)
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      size: 200,
      enableSorting: false,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="عرض التفاصيل">
            <IconButton size="small" color="primary" onClick={() => navigate(`/pre-approvals/${row.original.id}`)} disabled={actionLoading}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* PENDING → Start Review (transition to UNDER_REVIEW)
              CANONICAL 2026-01-26: PreAuth workflow starts at PENDING, not SUBMITTED
              PENDING means newly created and awaiting initial review */}
          {row.original.status === 'PENDING' && (
            <RBACGuard requiredPermission={PERMISSIONS.PREAPPROVAL_WRITE}>
              <Tooltip title="بدء المراجعة">
                <span>
                  <IconButton size="small" color="info" onClick={() => handleStartReview(row.original)} disabled={actionLoading}>
                    <StartReviewIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </RBACGuard>
          )}

          {/* PENDING/UNDER_REVIEW → Approve/Reject
              CANONICAL: Both states allow approval/rejection actions */}
          {(row.original.status === 'PENDING' || row.original.status === 'UNDER_REVIEW') && (
            <RBACGuard requiredPermission={PERMISSIONS.PREAPPROVAL_WRITE}>
              <Tooltip title="موافقة">
                <span>
                  <IconButton size="small" color="success" onClick={() => handleOpenApprove(row.original)} disabled={actionLoading}>
                    <ApproveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="رفض">
                <span>
                  <IconButton size="small" color="error" onClick={() => handleOpenReject(row.original)} disabled={actionLoading}>
                    <RejectIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </RBACGuard>
          )}
        </Stack>
      )
    }
  ], [actionLoading, navigate]);

  return (
    <>
      <ModernPageHeader
        title="صندوق الموافقات المسبقة"
        subtitle="طلبات الموافقة المسبقة المعلقة"
        icon={PreApprovalIcon}
        actions={
          <Button startIcon={<RefreshIcon />} onClick={fetchPreApprovals} disabled={loading}>
            تحديث
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <MainCard>
        <Box sx={{ width: '100%' }}>
          <GenericDataTable
            data={preApprovals}
            columns={columns}
            totalCount={totalRows}
            tableState={tableState}
            isLoading={loading}
            emptyMessage="لا توجد طلبات موافقة مسبقة معلقة"
            rowsPerPageOptions={[10, 20, 50]}
          />
        </Box>
      </MainCard>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => !actionLoading && setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ApproveIcon color="success" />
            <span>الموافقة على الطلب #{selectedPreApproval?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                تفاصيل الطلب
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>المستفيد</TableCell>
                    <TableCell>{selectedPreApproval?.memberFullNameArabic}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>مقدم الخدمة</TableCell>
                    <TableCell>{selectedPreApproval?.providerName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>نوع الخدمة</TableCell>
                    <TableCell>{selectedPreApproval?.serviceType || selectedPreApproval?.procedureName || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>المبلغ المطلوب</TableCell>
                    <TableCell>
                      <Typography color="primary" fontWeight="bold">
                        {selectedPreApproval?.requestedAmount?.toFixed(2)} د.ل
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />

          <TextField
            fullWidth
            type="number"
            label="المبلغ الموافق عليه"
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(e.target.value)}
            InputProps={{
              endAdornment: <Typography color="textSecondary">د.ل</Typography>
            }}
            sx={{ mb: 2 }}
            disabled={actionLoading}
          />

          <TextField
            fullWidth
            label="ملاحظات (اختياري)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            multiline
            rows={2}
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <ApproveIcon />}
          >
            {actionLoading ? 'جارِ الموافقة...' : 'موافقة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => !actionLoading && setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <RejectIcon color="error" />
            <span>رفض الطلب #{selectedPreApproval?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            يرجى إدخال سبب واضح للرفض. هذا السبب سيظهر للمستشفى/العيادة.
          </Alert>

          <TextField
            fullWidth
            required
            label="سبب الرفض"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            multiline
            rows={3}
            error={!rejectionReason.trim()}
            helperText="مطلوب - اشرح سبب الرفض بوضوح"
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectionReason.trim() || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <RejectIcon />}
          >
            {actionLoading ? 'جارِ الرفض...' : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PreApprovalsInbox;
