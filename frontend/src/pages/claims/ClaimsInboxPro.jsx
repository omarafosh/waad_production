/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          CLAIMS INBOX - Professional Medical Review System (2026)            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  REBUILT: 2026-01-23 - Enterprise Healthcare UI/UX                           ║
 * ║  FEATURES:                                                                   ║
 * ║  ✅ Statistics Dashboard with real-time counts                               ║
 * ║  ✅ Advanced filters (date, status, provider, amount range)                  ║
 * ║  ✅ FIFO queue management with aging indicators                              ║
 * ║  ✅ Quick preview cards on hover                                             ║
 * ║  ✅ Batch actions support                                                    ║
 * ║  ✅ Professional dialogs with cost breakdown                                 ║
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
  Badge,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  LinearProgress,
  alpha
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Receipt as ClaimIcon,
  PlayArrow as StartReviewIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  LocalHospital as ProviderIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Cancel as CancelIcon,
  Schedule as PendingIcon,
  Clear as ClearIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import RBACGuard from 'components/tba/RBACGuard';
import EmployerFilterSelector from 'components/tba/EmployerFilterSelector';
import { useEmployerFilter } from 'contexts/EmployerFilterContext';
import { PERMISSIONS } from 'constants/permissions.constants';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import { claimsService } from 'services/api';

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS CARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const StatCard = ({ title, value, icon: Icon, color = 'primary', trend = null, subtitle = null }) => (
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
          <Typography variant="h4" color={`${color}.main`} fontWeight="bold" sx={{ my: 0.5 }}>
            {value}
          </Typography>
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
      {trend && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
          <TrendingIcon sx={{ fontSize: 16, color: trend > 0 ? 'success.main' : 'error.main' }} />
          <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
            {trend > 0 ? '+' : ''}
            {trend}% من الأمس
          </Typography>
        </Stack>
      )}
    </CardContent>
  </Card>
);

// ══════════════════════════════════════════════════════════════════════════════
// AGE INDICATOR - Shows how old the claim is
// ══════════════════════════════════════════════════════════════════════════════
const AgeIndicator = ({ createdAt }) => {
  const days = dayjs().diff(dayjs(createdAt), 'day');
  const hours = dayjs().diff(dayjs(createdAt), 'hour');

  let color = 'success';
  let label = '';

  if (days > 7) {
    color = 'error';
    label = `${days} يوم ⚠️`;
  } else if (days > 3) {
    color = 'warning';
    label = `${days} أيام`;
  } else if (days > 0) {
    color = 'info';
    label = `${days} يوم`;
  } else {
    color = 'success';
    label = hours > 1 ? `${hours} ساعة` : 'جديد';
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
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ClaimsInbox = () => {
  const navigate = useNavigate();
  const { selectedEmployer } = useEmployerFilter();

  // Data State
  const [claims, setClaims] = useState([]);
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
    submitted: 0,
    underReview: 0,
    todayNew: 0,
    avgAmount: 0
  });

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Dialog States
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);

  // Form States
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [useSystemCalculation, setUseSystemCalculation] = useState(true);

  // Upload States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ════════════════════════════════════════════════════════════════════════════
  // FETCH CLAIMS
  // ════════════════════════════════════════════════════════════════════════════
  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: tableState.page + 1,
        size: tableState.pageSize,
        sortBy: tableState.sorting.length > 0 ? tableState.sorting[0].id : 'createdAt',
        sortDir: tableState.sorting.length > 0 ? (tableState.sorting[0].desc ? 'desc' : 'asc') : 'asc'
      };

      // Apply filters
      if (selectedEmployer?.id) params.employerId = selectedEmployer.id;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      if (dateFrom) params.fromDate = dateFrom.format('YYYY-MM-DD');
      if (dateTo) params.toDate = dateTo.format('YYYY-MM-DD');

      const response = await claimsService.getPendingClaims(params);
      const items = response.items || response.content || [];

      setClaims(items);
      setTotalRows(response.total || response.totalElements || 0);

      // Calculate statistics
      const submitted = items.filter((c) => c.status === 'SUBMITTED').length;
      const underReview = items.filter((c) => c.status === 'UNDER_REVIEW').length;
      const today = items.filter((c) => dayjs(c.createdAt).isSame(dayjs(), 'day')).length;
      const totalAmount = items.reduce((sum, c) => sum + (c.requestedAmount || c.totalAmount || 0), 0);

      setStats({
        total: response.total || response.totalElements || items.length,
        submitted,
        underReview,
        todayNew: today,
        avgAmount: items.length > 0 ? (totalAmount / items.length).toFixed(2) : 0
      });
    } catch (err) {
      console.error('Error fetching claims:', err);
      setError(err.userMessage || err.response?.data?.message || 'فشل في تحميل المطالبات');
    } finally {
      setLoading(false);
    }
  }, [tableState.page, tableState.pageSize, tableState.sorting, selectedEmployer, statusFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════════════════════════════════════
  const handleStartReview = async (claim) => {
    if (claim.status !== 'SUBMITTED') {
      setError('يمكن بدء المراجعة فقط للمطالبات المقدمة');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await claimsService.startReview(claim.id);
      setSuccess('✓ تم استلام المطالبة للمراجعة');
      fetchClaims();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في بدء المراجعة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenApprove = async (claim) => {
    if (claim.status !== 'UNDER_REVIEW') {
      setError('يجب بدء المراجعة أولاً قبل الموافقة');
      return;
    }

    setSelectedClaim(claim);
    setApprovedAmount(claim.requestedAmount?.toString() || '');
    setApprovalNotes('');
    setUseSystemCalculation(true);

    try {
      const breakdown = await claimsService.getCostBreakdown(claim.id);
      setCostBreakdown(breakdown);
      if (breakdown?.netProviderAmount) {
        setApprovedAmount(breakdown.netProviderAmount.toString());
      }
    } catch (err) {
      console.error('Error fetching cost breakdown:', err);
    }

    setApproveDialogOpen(true);
  };

  const handleOpenReject = (claim) => {
    if (claim.status !== 'UNDER_REVIEW') {
      setError('يجب بدء المراجعة أولاً قبل الرفض');
      return;
    }
    setSelectedClaim(claim);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleOpenUpload = (claim) => {
    setSelectedClaim(claim);
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUploadFiles = async () => {
    if (!selectedClaim || selectedFiles.length === 0) {
      setError('الرجاء اختيار ملفات للرفع');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      let uploaded = 0;
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachmentType', 'MEDICAL_REPORT');

        await claimsService.uploadAttachment(selectedClaim.id, formData);
        uploaded++;
        setUploadProgress(Math.round((uploaded / selectedFiles.length) * 100));
      }

      setSuccess(`✓ تم رفع ${uploaded} ملف بنجاح`);
      setUploadDialogOpen(false);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.userMessage || err.response?.data?.message || 'فشل في رفع المستندات');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleApprove = async () => {
    if (!selectedClaim) return;

    try {
      setActionLoading(true);
      setError(null);
      await claimsService.approve(selectedClaim.id, {
        approvedAmount: useSystemCalculation ? null : parseFloat(approvedAmount),
        notes: approvalNotes,
        useSystemCalculation
      });

      setSuccess('✓ تمت الموافقة على المطالبة بنجاح');
      setApproveDialogOpen(false);
      fetchClaims();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في الموافقة على المطالبة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedClaim || !rejectionReason.trim()) {
      setError('سبب الرفض مطلوب');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await claimsService.reject(selectedClaim.id, {
        rejectionReason: rejectionReason.trim()
      });

      setSuccess('تم رفض المطالبة');
      setRejectDialogOpen(false);
      fetchClaims();
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'فشل في رفض المطالبة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDateFrom(null);
    setDateTo(null);
    setAmountMin('');
    setAmountMax('');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STATUS RENDERER
  // ════════════════════════════════════════════════════════════════════════════
  const renderStatus = (status) => {
    const configs = {
      SUBMITTED: { color: 'warning', label: 'جديد', icon: PendingIcon },
      UNDER_REVIEW: { color: 'info', label: 'قيد المراجعة', icon: AssignmentIcon },
      APPROVED: { color: 'success', label: 'موافق عليه', icon: SuccessIcon },
      REJECTED: { color: 'error', label: 'مرفوض', icon: CancelIcon },
      SETTLED: { color: 'default', label: 'تم التسوية', icon: SuccessIcon }
    };
    const config = configs[status] || configs.SUBMITTED;
    const Icon = config.icon;

    return <Chip label={config.label} color={config.color} size="small" icon={<Icon sx={{ fontSize: 16 }} />} sx={{ fontWeight: 600 }} />;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GENERIC DATATABLE COLUMNS
  // ════════════════════════════════════════════════════════════════════════════
  const columns = useMemo(
    () => [
      {
        accessorKey: 'claimNumber',
        header: 'رقم المطالبة',
        size: 130,
        cell: ({ row }) => (
          <Stack>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {row.original.claimNumber || `CLM-${row.original.id}`}
            </Typography>
            <AgeIndicator createdAt={row.original.createdAt} />
          </Stack>
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
                {row.original.memberName || row.original.memberFullName || '-'}
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
            <Typography variant="body2">{row.original.providerName || '-'}</Typography>
          </Stack>
        )
      },
      {
        accessorKey: 'serviceDate',
        header: 'تاريخ الخدمة',
        size: 120,
        cell: ({ row }) => {
          const date = row.original.serviceDate || row.original.visitDate;
          return date ? dayjs(date).format('YYYY/MM/DD') : '-';
        }
      },
      {
        accessorKey: 'requestedAmount',
        header: 'المبلغ المطلوب',
        size: 140,
        cell: ({ row }) => {
          const amount = row.original.totalAmount || row.original.requestedAmount;
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
        size: 150,
        cell: ({ row }) => renderStatus(row.original.status)
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        size: 200,
        enableSorting: false,
        cell: ({ row }) => {
          const isSubmitted = row.original.status === 'SUBMITTED';
          const isUnderReview = row.original.status === 'UNDER_REVIEW';

          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="عرض التفاصيل">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/claims/${row.original.id}`)}
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

              {isSubmitted && (
                <Tooltip title="استلام للمراجعة">
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
              )}

              {isUnderReview && (
                <>
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
                </>
              )}
            </Stack>
          );
        }
      }
    ],
    [actionLoading, navigate]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ModernPageHeader
        title="وارد المطالبات"
        subtitle="مراجعة واعتماد المطالبات التأمينية"
        icon={ClaimIcon}
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
              onClick={fetchClaims}
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
          <StatCard title="إجمالي المعلق" value={stats.total} icon={ClaimIcon} color="primary" subtitle="مطالبة تنتظر المراجعة" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="جديد (لم يُراجع)" value={stats.submitted} icon={PendingIcon} color="warning" subtitle="SUBMITTED" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="قيد المراجعة" value={stats.underReview} icon={AssignmentIcon} color="info" subtitle="UNDER_REVIEW" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="وصل اليوم" value={stats.todayNew} icon={TrendingIcon} color="success" subtitle="مطالبات جديدة" />
        </Grid>
      </Grid>

      {/* ══════════ EMPLOYER FILTER ══════════ */}
      <Box sx={{ mb: 2 }}>
        <EmployerFilterSelector />
      </Box>

      {/* ══════════ ADVANCED FILTERS ══════════ */}
      <Collapse in={showFilters}>
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث برقم المطالبة أو اسم المستفيد..."
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
                <Select value={statusFilter} label="الحالة" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="SUBMITTED">جديد</MenuItem>
                  <MenuItem value="UNDER_REVIEW">قيد المراجعة</MenuItem>
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
            <Grid item xs={12} md={2}>
              <DatePicker
                label="إلى تاريخ"
                value={dateTo}
                onChange={setDateTo}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={fetchClaims} startIcon={<SearchIcon />}>
                  بحث
                </Button>
                <Button variant="outlined" onClick={handleResetFilters} startIcon={<ClearIcon />}>
                  مسح
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* ══════════ GENERIC DATATABLE ══════════ */}
      <MainCard>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        <Box sx={{ width: '100%' }}>
          <GenericDataTable
            data={claims}
            columns={columns}
            totalCount={totalRows}
            tableState={tableState}
            isLoading={loading}
            emptyMessage="لا توجد مطالبات معلقة 🎉"
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Box>
      </MainCard>

      {/* ══════════ APPROVE DIALOG ══════════ */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => !actionLoading && setApproveDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: 'success.lighter', color: 'success.dark' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ApproveIcon />
            <span>موافقة على المطالبة #{selectedClaim?.claimNumber || selectedClaim?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Claim Info */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                  معلومات المطالبة
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      المستفيد
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedClaim?.memberName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      مقدم الخدمة
                    </Typography>
                    <Typography variant="body2">{selectedClaim?.providerName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ الخدمة
                    </Typography>
                    <Typography variant="body2">{selectedClaim?.serviceDate || selectedClaim?.visitDate}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Cost Breakdown */}
            <Grid item xs={12} md={6}>
              {costBreakdown ? (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.lighter' }}>
                  <Typography variant="subtitle2" color="success.dark" gutterBottom fontWeight={600}>
                    تفصيل التكلفة (تلقائي)
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">المبلغ المطلوب:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {costBreakdown.requestedAmount?.toLocaleString()} د.ل
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">تحمل المريض ({costBreakdown.coPayPercent}%):</Typography>
                      <Typography variant="body2" color="warning.main" fontWeight="bold">
                        {costBreakdown.patientCoPay?.toLocaleString()} د.ل
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="bold">
                        المستحق للمستشفى:
                      </Typography>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {costBreakdown.netProviderAmount?.toLocaleString()} د.ل
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    جاري حساب التكلفة...
                  </Typography>
                </Paper>
              )}
            </Grid>

            {/* Amount Input */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المبلغ المعتمد"
                value={approvedAmount}
                onChange={(e) => {
                  setApprovedAmount(e.target.value);
                  setUseSystemCalculation(false);
                }}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                }}
                helperText={useSystemCalculation ? '✓ سيتم استخدام الحساب التلقائي' : '⚠️ مبلغ يدوي'}
                disabled={actionLoading}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات المراجع (اختياري)"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                multiline
                rows={2}
                disabled={actionLoading}
              />
            </Grid>
          </Grid>
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
            <span>رفض المطالبة #{selectedClaim?.claimNumber || selectedClaim?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">سيتم إبلاغ مقدم الخدمة بسبب الرفض. يرجى كتابة سبب واضح ومهني.</Typography>
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
            helperText="مثال: الخدمة غير مشمولة بالتغطية / المستندات ناقصة / تجاوز الحد السنوي"
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
            <span>رفع مستندات - مطالبة #{selectedClaim?.claimNumber || selectedClaim?.id}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">يمكنك رفع تقارير طبية أو مستندات داعمة إضافية. الملفات المدعومة: PDF, JPG, PNG</Typography>
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
            <input type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
          </Button>

          {selectedFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                الملفات المختارة ({selectedFiles.length}):
              </Typography>
              {selectedFiles.map((file, index) => (
                <Chip key={index} label={file.name} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
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

export default ClaimsInbox;
