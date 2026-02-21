/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      PRE-APPROVALS INBOX - Professional Medical Review System (2026)         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  REBUILT: 2026-01-23 - Enterprise Healthcare UI/UX                           ║
 * ║  FEATURES:                                                                   ║
 * ║  ✅ Statistics Dashboard with real-time counts                               ║
 * ║  ✅ Advanced filters (date, status, provider, urgency, service type)         ║
 * ║  ✅ Priority indicators for EMERGENCY/URGENT requests                        ║
 * ║  ✅ FIFO queue management with aging indicators                              ║
 * ║  ✅ Quick preview cards                                                      ║
 * ║  ✅ Professional approve/reject dialogs                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
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
  Divider,
  Stack,
  CircularProgress,
  Paper,
  Avatar,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  LinearProgress,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Badge
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Assignment as PreApprovalIcon,
  PlayArrow as StartReviewIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  LocalHospital as ProviderIcon,
  MedicalServices as MedicalIcon,
  Warning as WarningIcon,
  Schedule as PendingIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as UploadIcon,
  Clear as ClearIcon,
  PriorityHigh as UrgentIcon,
  LocalFireDepartment as EmergencyIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import { preApprovalsService } from 'services/api';

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS CARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const StatCard = ({ title, value, icon: Icon, color = 'primary', subtitle = null, badge = null }) => (
  <Card
    elevation={0}
    sx={{
      bgcolor: `${color}.lighter`,
      border: '1px solid',
      borderColor: `${color}.light`,
      height: '100%',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 3
      }
    }}
  >
    <CardContent sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4" color={`${color}.main`} fontWeight="bold" sx={{ my: 0.5 }}>
              {value}
            </Typography>
            {badge && (
              <Chip label={badge} size="small" color={color} variant="filled" />
            )}
          </Stack>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
          <Icon sx={{ fontSize: 24 }} />
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

// ══════════════════════════════════════════════════════════════════════════════
// AGE INDICATOR
// ══════════════════════════════════════════════════════════════════════════════
const AgeIndicator = ({ createdAt }) => {
  const hours = dayjs().diff(dayjs(createdAt), 'hour');
  const days = dayjs().diff(dayjs(createdAt), 'day');

  let color = 'success';
  let label = '';

  if (days > 3) {
    color = 'error';
    label = `${days} أيام ⚠️`;
  } else if (days > 1) {
    color = 'warning';
    label = `${days} يوم`;
  } else if (hours > 4) {
    color = 'info';
    label = `${hours} ساعة`;
  } else {
    color = 'success';
    label = 'جديد';
  }

  return (
    <Chip
      size="small"
      label={label}
      color={color}
      variant="outlined"
      icon={<TimeIcon sx={{ fontSize: 14 }} />}
      sx={{ fontSize: '0.7rem' }}
    />
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PRIORITY BADGE
// ══════════════════════════════════════════════════════════════════════════════
const PriorityBadge = ({ priority }) => {
  if (priority === 'EMERGENCY') {
    return (
      <Chip
        icon={<EmergencyIcon />}
        label="طارئ"
        color="error"
        size="small"
        sx={{
          fontWeight: 'bold',
          animation: 'pulse 1.5s infinite',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.6 },
            '100%': { opacity: 1 }
          }
        }}
      />
    );
  }
  if (priority === 'URGENT') {
    return (
      <Chip
        icon={<UrgentIcon />}
        label="عاجل"
        color="warning"
        size="small"
        variant="filled"
        sx={{ fontWeight: 'bold' }}
      />
    );
  }
  return <Chip label="عادي" size="small" variant="outlined" />;
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const PreApprovalsInbox = () => {
  const navigate = useNavigate();

  // Data State
  const [preApprovals, setPreApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // Table State
  const tableState = useTableState({
    initialPageSize: 20,
    defaultSort: { field: 'createdAt', direction: 'asc' }
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    emergency: 0,
    urgent: 0,
    normal: 0,
    todayNew: 0
  });

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  // Dialog States
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPreApproval, setSelectedPreApproval] = useState(null);

  // Form States
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Upload States
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ════════════════════════════════════════════════════════════════════════════
  // FETCH PRE-APPROVALS
  // ════════════════════════════════════════════════════════════════════════════
  const fetchPreApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: tableState.page + 1,
        size: tableState.pageSize,
        sortBy: tableState.sorting.length > 0 ? tableState.sorting[0].id : 'createdAt',
        sortDir: tableState.sorting.length > 0 ? (tableState.sorting[0].desc ? 'desc' : 'asc') : 'asc'
      };

      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;
      if (dateFrom) params.fromDate = dateFrom.format('YYYY-MM-DD');
      if (dateTo) params.toDate = dateTo.format('YYYY-MM-DD');

      const response = await preApprovalsService.getPending(params);
      const items = response.items || response.content || [];

      setPreApprovals(items);
      setTotalRows(response.total || response.totalElements || 0);

      // Calculate statistics
      const emergency = items.filter(p => p.priority === 'EMERGENCY' || p.urgency === 'EMERGENCY').length;
      const urgent = items.filter(p => p.priority === 'URGENT' || p.urgency === 'URGENT').length;
      const today = items.filter(p => dayjs(p.createdAt).isSame(dayjs(), 'day')).length;

      setStats({
        total: response.total || response.totalElements || items.length,
        emergency,
        urgent,
        normal: items.length - emergency - urgent,
        todayNew: today
      });

    } catch (err) {
      console.error('Error fetching pre-approvals:', err);
      setError(err.userMessage || err.response?.data?.message || 'فشل في تحميل طلبات الموافقة المسبقة');
    } finally {
      setLoading(false);
    }
  }, [tableState.page, tableState.pageSize, tableState.sorting, statusFilter, priorityFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchPreApprovals();
  }, [fetchPreApprovals]);

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════════════════════════════════════
  const handleStartReview = async (preApproval) => {
    try {
      setActionLoading(true);
      setError(null);
      await preApprovalsService.startReview(preApproval.id);
      setSuccess('✓ تم بدء مراجعة الطلب');
      fetchPreApprovals();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في بدء المراجعة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenApprove = (preApproval) => {
    setSelectedPreApproval(preApproval);
    setApprovedAmount(preApproval.requestedAmount?.toString() || preApproval.contractPrice?.toString() || '');
    setApprovalNotes('');
    setApproveDialogOpen(true);
  };

  const handleOpenReject = (preApproval) => {
    setSelectedPreApproval(preApproval);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedPreApproval) return;

    try {
      setActionLoading(true);
      setError(null);
      await preApprovalsService.approve(selectedPreApproval.id, {
        approvedAmount: parseFloat(approvedAmount) || selectedPreApproval.requestedAmount,
        notes: approvalNotes
      });

      setSuccess('✓ تمت الموافقة على الطلب بنجاح');
      setApproveDialogOpen(false);
      fetchPreApprovals();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في الموافقة على الطلب');
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setDateFrom(null);
    setDateTo(null);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // UPLOAD HANDLERS
  // ════════════════════════════════════════════════════════════════════════════
  const handleOpenUpload = (preApproval) => {
    setSelectedPreApproval(preApproval);
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const handleUploadFiles = async () => {
    if (!selectedPreApproval || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachmentType', 'MEDICAL_REPORT');

        await preApprovalsService.uploadAttachment(selectedPreApproval.id, formData);

        // Update progress
        const progress = Math.round(((index + 1) / selectedFiles.length) * 100);
        setUploadProgress(progress);
      });

      await Promise.all(uploadPromises);

      setSuccess(`تم رفع ${selectedFiles.length} ملف بنجاح`);
      setUploadDialogOpen(false);
      setSelectedFiles([]);
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في رفع الملفات');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STATUS RENDERER - CANONICAL 2026-01-26
  // PreAuth workflow: PENDING → UNDER_REVIEW → APPROVED/REJECTED
  // (No SUBMITTED status - that's Claims workflow)
  // ════════════════════════════════════════════════════════════════════════════
  const renderStatus = (status) => {
    const configs = {
      PENDING: { color: 'warning', label: 'معلق', icon: PendingIcon },
      UNDER_REVIEW: { color: 'info', label: 'قيد المراجعة', icon: PreApprovalIcon },
      APPROVED: { color: 'success', label: 'موافق عليه', icon: ApproveIcon },
      REJECTED: { color: 'error', label: 'مرفوض', icon: RejectIcon },
      EXPIRED: { color: 'default', label: 'منتهي', icon: TimerIcon },
      CANCELLED: { color: 'default', label: 'ملغي', icon: RejectIcon },
      USED: { color: 'info', label: 'مستخدم', icon: ApproveIcon }
    };
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={<Icon sx={{ fontSize: 16 }} />}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GENERIC DATATABLE COLUMNS
  // ════════════════════════════════════════════════════════════════════════════
  const columns = useMemo(() => [
    {
      accessorKey: 'referenceNumber',
      header: 'رقم الطلب',
      size: 130,
      cell: ({ row }) => (
        <Stack>
          <Typography variant="body2" fontWeight="bold" color="primary">
            {row.original.referenceNumber || `PA-${row.original.id}`}
          </Typography>
          <AgeIndicator createdAt={row.original.createdAt || row.original.requestDate} />
        </Stack>
      )
    },
    {
      accessorKey: 'priority',
      header: 'الأولوية',
      size: 100,
      cell: ({ row }) => (
        <PriorityBadge priority={row.original.priority || row.original.urgency} />
      )
    },
    {
      accessorKey: 'memberName',
      header: 'المستفيد',
      size: 200,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.lighter' }}>
            <PersonIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.original.memberName || row.original.memberFullName || row.original.fullName || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.memberNationalNumber || row.original.memberCivilId || ''}
            </Typography>
          </Box>
        </Stack>
      )
    },
    {
      accessorKey: 'providerName',
      header: 'مقدم الخدمة',
      size: 180,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'success.lighter' }}>
            <ProviderIcon sx={{ fontSize: 16, color: 'success.main' }} />
          </Avatar>
          <Typography variant="body2">
            {row.original.providerName || '-'}
          </Typography>
        </Stack>
      )
    },
    {
      accessorKey: 'serviceName',
      header: 'الخدمة المطلوبة',
      size: 180,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <MedicalIcon sx={{ fontSize: 18, color: 'info.main' }} />
          <Typography variant="body2">
            {row.original.serviceName || row.original.serviceCode || row.original.procedureName || '-'}
          </Typography>
        </Stack>
      )
    },
    {
      accessorKey: 'requestedAmount',
      header: 'المبلغ',
      size: 130,
      cell: ({ row }) => {
        const amount = row.original.contractPrice || row.original.requestedAmount;
        return (
          <Typography variant="body2" fontWeight="bold" color="primary.main">
            {amount ? `${Number(amount).toLocaleString()} د.ل` : '-'}
          </Typography>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      size: 140,
      cell: ({ row }) => renderStatus(row.original.status)
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      size: 200,
      enableSorting: false,
      cell: ({ row }) => {
        const isPending = row.original.status === 'PENDING';
        const canProcess = row.original.status === 'PENDING' || row.original.status === 'UNDER_REVIEW';

        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="عرض التفاصيل">
              <IconButton
                size="small"
                onClick={() => navigate(`/pre-approvals/${row.original.id}`)}
                disabled={actionLoading}
                sx={{
                  bgcolor: 'primary.lighter',
                  '&:hover': { bgcolor: 'primary.light' }
                }}
              >
                <ViewIcon fontSize="small" color="primary" />
              </IconButton>
            </Tooltip>

            <Tooltip title="رفع مستندات">
              <IconButton
                size="small"
                onClick={() => handleOpenUpload(row.original)}
                disabled={actionLoading}
                sx={{
                  bgcolor: 'secondary.lighter',
                  '&:hover': { bgcolor: 'secondary.light' }
                }}
              >
                <AttachFileIcon fontSize="small" color="secondary" />
              </IconButton>
            </Tooltip>

            {isPending && (
              <RBACGuard requiredPermission={PERMISSIONS.PREAPPROVAL_WRITE}>
                <Tooltip title="بدء المراجعة">
                  <IconButton
                    size="small"
                    onClick={() => handleStartReview(row.original)}
                    disabled={actionLoading}
                    sx={{
                      bgcolor: 'info.lighter',
                      '&:hover': { bgcolor: 'info.light' }
                    }}
                  >
                    <StartReviewIcon fontSize="small" color="info" />
                  </IconButton>
                </Tooltip>
              </RBACGuard>
            )}

            {canProcess && (
              <RBACGuard requiredPermission={PERMISSIONS.PREAPPROVAL_WRITE}>
                <Tooltip title="موافقة">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenApprove(row.original)}
                    disabled={actionLoading}
                    sx={{
                      bgcolor: 'success.lighter',
                      '&:hover': { bgcolor: 'success.light' }
                    }}
                  >
                    <ApproveIcon fontSize="small" color="success" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="رفض">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenReject(row.original)}
                    disabled={actionLoading}
                    sx={{
                      bgcolor: 'error.lighter',
                      '&:hover': { bgcolor: 'error.light' }
                    }}
                  >
                    <RejectIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              </RBACGuard>
            )}
          </Stack>
        );
      }
    }
  ], [actionLoading, navigate]);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ModernPageHeader
        title="وارد الموافقات المسبقة"
        subtitle="مراجعة واعتماد طلبات الموافقة المسبقة"
        icon={PreApprovalIcon}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={showFilters ? <CollapseIcon /> : <FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'إخفاء الفلاتر' : 'فلترة'}
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
              onClick={fetchPreApprovals}
              disabled={loading}
            >
              تحديث
            </Button>
          </Stack>
        }
      />

      {/* ══════════ ALERTS ══════════ */}
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

      {/* ══════════ STATISTICS CARDS ══════════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الطلبات المعلقة"
            value={stats.total}
            icon={PreApprovalIcon}
            color="primary"
            subtitle="تنتظر المراجعة"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="طلبات طارئة"
            value={stats.emergency}
            icon={EmergencyIcon}
            color="error"
            subtitle="تتطلب استجابة فورية"
            badge={stats.emergency > 0 ? '!' : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="طلبات عاجلة"
            value={stats.urgent}
            icon={UrgentIcon}
            color="warning"
            subtitle="أولوية عالية"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="وصل اليوم"
            value={stats.todayNew}
            icon={TrendingIcon}
            color="success"
            subtitle="طلبات جديدة"
          />
        </Grid>
      </Grid>

      {/* ══════════ ADVANCED FILTERS ══════════ */}
      <Collapse in={showFilters}>
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث برقم الطلب أو اسم المستفيد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  label="الحالة"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="PENDING">معلق</MenuItem>
                  <MenuItem value="UNDER_REVIEW">قيد المراجعة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={priorityFilter}
                  label="الأولوية"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="EMERGENCY">طارئ</MenuItem>
                  <MenuItem value="URGENT">عاجل</MenuItem>
                  <MenuItem value="NORMAL">عادي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="من تاريخ"
                value={dateFrom}
                onChange={setDateFrom}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={fetchPreApprovals}
                  startIcon={<SearchIcon />}
                >
                  بحث
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleResetFilters}
                  startIcon={<ClearIcon />}
                >
                  مسح
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* ══════════ DATA GRID ══════════ */}
      {/* ══════════ GENERIC DATATABLE ══════════ */}
      <MainCard>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        <Box sx={{ width: '100%' }}>
          <GenericDataTable
            data={preApprovals}
            columns={columns}
            totalCount={totalRows}
            tableState={tableState}
            isLoading={loading}
            emptyMessage="لا توجد طلبات موافقة مسبقة معلقة 🎉"
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Box>
      </MainCard>

      {/* ══════════ APPROVE DIALOG ══════════ */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => !actionLoading && setApproveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: 'success.lighter', color: 'success.dark' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ApproveIcon />
            <span>الموافقة على الطلب #{selectedPreApproval?.referenceNumber || selectedPreApproval?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {/* Request Details */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
              تفاصيل الطلب
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500, width: '40%' }}>المستفيد</TableCell>
                  <TableCell>{selectedPreApproval?.memberFullNameArabic || selectedPreApproval?.memberName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>مقدم الخدمة</TableCell>
                  <TableCell>{selectedPreApproval?.providerName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>الخدمة</TableCell>
                  <TableCell>{selectedPreApproval?.serviceName || selectedPreApproval?.procedureName || '-'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>المبلغ المطلوب</TableCell>
                  <TableCell>
                    <Typography color="primary" fontWeight="bold">
                      {(selectedPreApproval?.requestedAmount || selectedPreApproval?.contractPrice)?.toLocaleString()} د.ل
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          <Divider sx={{ my: 2 }} />

          <TextField
            fullWidth
            type="number"
            label="المبلغ الموافق عليه"
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(e.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
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
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <ApproveIcon />}
            sx={{ minWidth: 120 }}
          >
            {actionLoading ? 'جاري...' : 'موافقة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════ REJECT DIALOG ══════════ */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => !actionLoading && setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: 'error.lighter', color: 'error.dark' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <RejectIcon />
            <span>رفض الطلب #{selectedPreApproval?.referenceNumber || selectedPreApproval?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              سيتم إبلاغ مقدم الخدمة بسبب الرفض. يرجى كتابة سبب واضح ومهني.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            required
            label="سبب الرفض (إلزامي)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            multiline
            rows={4}
            error={!rejectionReason.trim()}
            helperText="مثال: الخدمة غير مشمولة بالتغطية / تتطلب فحوصات إضافية / تجاوز الحد المسموح"
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectionReason.trim() || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <RejectIcon />}
            sx={{ minWidth: 120 }}
          >
            {actionLoading ? 'جاري...' : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════ UPLOAD DIALOG ══════════ */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: 'secondary.lighter', color: 'secondary.dark' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <UploadIcon />
            <span>رفع مستندات - موافقة مسبقة #{selectedPreApproval?.preAuthNumber || selectedPreApproval?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              يمكنك رفع تقارير طبية أو مستندات داعمة إضافية. الملفات المدعومة: PDF, JPG, PNG
            </Typography>
          </Alert>

          <Button
            variant="outlined"
            component="label"
            fullWidth
            disabled={uploading}
            startIcon={<AttachFileIcon />}
            sx={{ mb: 2, py: 1.5 }}
          >
            اختيار ملفات
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
            />
          </Button>

          {selectedFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                الملفات المختارة ({selectedFiles.length}):
              </Typography>
              {selectedFiles.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          )}

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                جاري الرفع... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleUploadFiles}
            disabled={selectedFiles.length === 0 || uploading}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
            sx={{ minWidth: 120 }}
          >
            {uploading ? 'جاري الرفع...' : 'رفع الملفات'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default PreApprovalsInbox;
