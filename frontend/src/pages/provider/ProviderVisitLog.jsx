import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

// Material UI
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Stack,
  Alert,
  CircularProgress,
  Collapse
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import EventIcon from '@mui/icons-material/Event';

// Services
import { providerApi } from 'services/providerService';
import { visitsService } from 'services/api/visits.service';

// Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';

// Medical Theme
import { MEDICAL_COLORS, getStatusColor, providerStyles } from 'themes/provider-theme';

// ========================= LABELS (Arabic) =========================
const LABELS = {
  pageTitle: 'سجل الزيارات',
  pageSubtitle: 'إدارة ومتابعة زيارات المرضى',
  visitId: 'رقم الزيارة',
  memberName: 'اسم المستفيد',
  civilId: 'الرقم المدني',
  cardNumber: 'رقم بطاقة المستفيد',
  visitDate: 'تاريخ الزيارة',
  visitType: 'نوع الزيارة',
  status: 'حالة الزيارة',
  employer: 'جهة العمل',
  diagnosis: 'التشخيص',
  actions: 'إجراءات الزيارة',
  createClaim: 'إنشاء مطالبة',
  createPreAuth: 'إنشاء موافقة مسبقة',
  viewDetails: 'عرض التفاصيل',
  viewDocuments: 'عرض المستندات',
  refresh: 'تحديث',
  search: 'بحث...',
  searchByName: 'بحث بالاسم أو الرقم المدني',
  filters: 'فلاتر البحث',
  hideFilters: 'إخفاء الفلاتر',
  showFilters: 'عرض الفلاتر',
  dateFrom: 'من تاريخ',
  dateTo: 'إلى تاريخ',
  allStatuses: 'جميع الحالات',
  allTypes: 'جميع الأنواع',
  noData: 'لا توجد زيارات مسجلة',
  loading: 'جارِ التحميل...',
  error: 'حدث خطأ أثناء جلب البيانات',
  rowsPerPage: 'صفوف لكل صفحة',
  close: 'إغلاق',
  visitSummary: 'ملخص الزيارة',
  memberInfo: 'بيانات المستفيد',
  visitInfo: 'بيانات الزيارة',
  medicalInfo: 'البيانات الطبية',
  linkedRecords: 'السجلات المرتبطة',
  claims: 'المطالبات',
  preAuths: 'الموافقات المسبقة',
  claimStatus: 'حالة المطالبة',
  preAuthStatus: 'حالة الموافقة',
  noClaim: 'لا توجد',
  noPreAuth: 'لا توجد'
};

// ========================= STATUS CONFIGS =========================
const STATUS_COLORS = {
  REGISTERED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
  PENDING: 'default'
};

const STATUS_LABELS = {
  REGISTERED: 'مسجلة',
  IN_PROGRESS: 'قيد المعالجة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  PENDING: 'معلقة'
};

// ========================= CLAIM STATUS CONFIGS =========================
const CLAIM_STATUS_COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  PARTIALLY_APPROVED: 'warning',
  REJECTED: 'error',
  SETTLED: 'success',
  PAID: 'success',
  CANCELLED: 'default'
};

const CLAIM_STATUS_LABELS = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مقدمة',
  UNDER_REVIEW: 'قيد المراجعة',
  APPROVED: 'موافق عليها',
  PARTIALLY_APPROVED: 'موافقة جزئية',
  REJECTED: 'مرفوضة',
  SETTLED: 'مسددة',
  PAID: 'مدفوعة',
  CANCELLED: 'ملغاة'
};

// ========================= PRE-AUTH STATUS CONFIGS =========================
const PREAUTH_STATUS_COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  PARTIALLY_APPROVED: 'warning',
  REJECTED: 'error',
  EXPIRED: 'default',
  CANCELLED: 'default'
};

const PREAUTH_STATUS_LABELS = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مقدمة',
  PENDING: 'معلقة',
  UNDER_REVIEW: 'قيد المراجعة',
  APPROVED: 'موافق عليها',
  PARTIALLY_APPROVED: 'موافقة جزئية',
  REJECTED: 'مرفوضة',
  EXPIRED: 'منتهية',
  CANCELLED: 'ملغاة'
};

const VISIT_TYPE_LABELS = {
  OUTPATIENT: 'عيادة خارجية',
  INPATIENT: 'تنويم',
  EMERGENCY: 'طوارئ',
  DAY_CARE: 'رعاية يومية'
};

// ========================= MAIN COMPONENT =========================
const ProviderVisitLog = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Table header color based on theme
  const tableHeaderBg = isDark ? '#1E3A5F' : MEDICAL_COLORS.primary.main;
  const tableHeaderColor = '#FFFFFF';

  // Data state
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters - Default date to TODAY
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(dayjs()); // TODAY
  const [dateTo, setDateTo] = useState(dayjs()); // TODAY
  const [statusFilter, setStatusFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');

  // Fetch visits
  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ════════════════════════════════════════════════════════════════════════
      // BUILD PARAMS WITH ALL FILTERS
      // Backend automatically handles provider isolation via ProviderContextGuard
      // ════════════════════════════════════════════════════════════════════════
      const params = {
        page: page,
        size: rowsPerPage,
        // Search by member name/card/civilId
        memberName: searchQuery?.trim() || undefined,
        // Status filter
        status: statusFilter || undefined,
        // Date filters
        fromDate: dateFrom ? dateFrom.format('YYYY-MM-DD') : undefined,
        toDate: dateTo ? dateTo.format('YYYY-MM-DD') : undefined,
        // Visit type (optional)
        visitType: visitTypeFilter || undefined
      };

      // Remove undefined values
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      const response = await providerApi.getVisitLog(params);

      setVisits(response.content || response.items || []);
      setTotalCount(response.totalElements || response.totalCount || 0);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setError(LABELS.error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, dateFrom, dateTo, statusFilter, visitTypeFilter]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Handlers
  const handlePageChange = (_, newPage) => setPage(newPage);

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleCreateClaim = (visit) => {
    // Use URL params to preserve data across redirects and page refreshes
    const params = new URLSearchParams({
      fromVisitLog: 'true',
      visitId: visit.visitId,
      memberId: visit.memberId,
      memberName: visit.memberName || '',
      memberCivilId: visit.memberCivilId || '',
      cardNumber: visit.memberCardNumber || '',
      employer: visit.employerName || '',
      phone: visit.memberPhone || '',
      email: visit.memberEmail || '',
      visitDate: visit.visitDate || '',
      visitTime: visit.createdAt?.split('T')[1]?.substring(0, 5) || '',
      visitType: visit.visitType || 'OUTPATIENT',
      providerName: visit.providerName || ''
    });
    navigate(`/provider/claims/submit?${params.toString()}`);
  };

  const handleCreatePreAuth = (visit) => {
    // Use URL params to preserve data across redirects and page refreshes
    const params = new URLSearchParams({
      fromVisitLog: 'true',
      visitId: visit.visitId,
      memberId: visit.memberId,
      memberName: visit.memberName || '',
      memberCivilId: visit.memberCivilId || '',
      cardNumber: visit.memberCardNumber || '',
      employer: visit.employerName || '',
      phone: visit.memberPhone || '',
      email: visit.memberEmail || '',
      visitDate: visit.visitDate || '',
      visitTime: visit.createdAt?.split('T')[1]?.substring(0, 5) || '',
      visitType: visit.visitType || 'OUTPATIENT',
      providerId: visit.providerId || '',
      providerName: visit.providerName || '',
      location: visit.providerLocation || ''
    });
    navigate(`/provider/pre-approvals/submit?${params.toString()}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW DETAILS - CONTEXT-BASED NAVIGATION (Canonical Pattern)
  // Backend decides where to navigate - Frontend follows
  // ═══════════════════════════════════════════════════════════════════════════
  const [viewDetailsLoading, setViewDetailsLoading] = useState(null);

  const handleViewDetails = async (visit) => {
    try {
      setViewDetailsLoading(visit.visitId);

      // Get decision payload from backend
      const context = await visitsService.getContext(visit.visitId);

      // Backend decides - Frontend follows
      if (context.hasClaim) {
        // Navigate to claim view
        navigate(`/claims/${context.claimId}`);
      } else if (context.hasPreAuthorization) {
        // Navigate to pre-auth view
        navigate(`/pre-approvals/${context.preAuthorizationId}`);
      } else if (context.eligibilityOnly) {
        // Navigate to eligibility check with visit data
        const params = new URLSearchParams({
          fromVisit: 'true',
          visitId: visit.visitId?.toString() || '',
          memberId: visit.memberId?.toString() || '',
          memberName: visit.memberName || '',
          visitDate: visit.visitDate || ''
        });
        navigate(`/provider/eligibility-check?${params.toString()}`);
      } else {
        // Fallback - should not happen
        console.warn('[VISIT-LOG] Unexpected context state:', context);
        alert('لا توجد سجلات مرتبطة بهذه الزيارة');
      }
    } catch (error) {
      console.error('[VISIT-LOG] Error getting visit context:', error);
      // Fallback to local decision if backend fails
      if (visit.latestClaimId) {
        navigate(`/claims/${visit.latestClaimId}`);
      } else if (visit.latestPreAuthId) {
        navigate(`/pre-approvals/${visit.latestPreAuthId}`);
      } else {
        alert('فشل في تحميل بيانات الزيارة');
      }
    } finally {
      setViewDetailsLoading(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFrom(dayjs()); // Reset to TODAY
    setDateTo(dayjs()); // Reset to TODAY
    setStatusFilter('');
    setVisitTypeFilter('');
    setPage(0);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ModernPageHeader
        title={LABELS.pageTitle}
        subtitle={LABELS.pageSubtitle}
        icon={LocalHospitalIcon}
        breadcrumbs={[{ label: 'بوابة مقدم الخدمة' }, { label: LABELS.pageTitle }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Tooltip title="مركز المستندات">
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/provider/documents')}
                startIcon={<FolderIcon />}
                color="secondary"
              >
                المستندات
              </Button>
            </Tooltip>
            <Tooltip title={showFilters ? LABELS.hideFilters : LABELS.showFilters}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={showFilters ? <FilterAltOffIcon /> : <FilterAltIcon />}
              >
                {showFilters ? LABELS.hideFilters : LABELS.showFilters}
              </Button>
            </Tooltip>
            <Tooltip title={LABELS.refresh}>
              <span>
                <IconButton onClick={fetchVisits} color="primary" disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      />

      <MainCard>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Quick Search Bar */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder={LABELS.searchByName}
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setPage(0);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper'
              }
            }}
          />
        </Box>

        {/* Advanced Filters */}
        <Collapse in={showFilters}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fafafa' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid xs={12} sm={6} md={3}>
                <DatePicker
                  label={LABELS.dateFrom}
                  value={dateFrom}
                  onChange={setDateFrom}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      InputProps: {
                        startAdornment: <EventIcon sx={{ mr: 1, color: 'action.active' }} />
                      }
                    }
                  }}
                />
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <DatePicker
                  label={LABELS.dateTo}
                  value={dateTo}
                  onChange={setDateTo}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      InputProps: {
                        startAdornment: <EventIcon sx={{ mr: 1, color: 'action.active' }} />
                      }
                    }
                  }}
                />
              </Grid>
              <Grid xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{LABELS.status}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(0);
                    }}
                    label={LABELS.status}
                  >
                    <MenuItem value="">{LABELS.allStatuses}</MenuItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>{LABELS.visitType}</InputLabel>
                  <Select
                    value={visitTypeFilter}
                    onChange={(e) => {
                      setVisitTypeFilter(e.target.value);
                      setPage(0);
                    }}
                    label={LABELS.visitType}
                  >
                    <MenuItem value="">{LABELS.allTypes}</MenuItem>
                    {Object.entries(VISIT_TYPE_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={2}>
                <Button fullWidth variant="outlined" color="secondary" onClick={handleResetFilters} startIcon={<FilterAltOffIcon />}>
                  إعادة ضبط
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Stats Summary */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip icon={<LocalHospitalIcon />} label={`إجمالي: ${totalCount} زيارة`} variant="outlined" color="primary" />
            {searchQuery && <Chip label={`نتائج البحث: "${searchQuery}"`} onDelete={() => setSearchQuery('')} color="info" size="small" />}
            {statusFilter && (
              <Chip label={`الحالة: ${STATUS_LABELS[statusFilter]}`} onDelete={() => setStatusFilter('')} color="warning" size="small" />
            )}
          </Stack>
        </Box>

        {/* Data Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                {/* توحيد ألوان رؤوس الجدول - Medical Theme */}
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 80 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <BadgeIcon fontSize="small" />
                    <span>{LABELS.visitId}</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 160 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PersonIcon fontSize="small" />
                    <span>{LABELS.memberName}</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 110 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CreditCardIcon fontSize="small" />
                    <span>{LABELS.civilId}</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 100 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CreditCardIcon fontSize="small" />
                    <span>{LABELS.cardNumber}</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 100 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <EventIcon fontSize="small" />
                    <span>{LABELS.visitDate}</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 100 }}>
                  {LABELS.visitType}
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 90 }}>
                  {LABELS.status}
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 110 }}>
                  {LABELS.claimStatus}
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 110 }}>
                  {LABELS.preAuthStatus}
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: tableHeaderColor, fontWeight: 600, py: 1.5, minWidth: 140 }}>
                  {LABELS.actions}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {LABELS.loading}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <LocalHospitalIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                    <Typography variant="body1" color="textSecondary">
                      {LABELS.noData}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow
                    key={visit.visitId}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: isDark ? 'rgba(13, 71, 161, 0.08)' : 'rgba(13, 71, 161, 0.04)' },
                      '&:hover': { bgcolor: isDark ? 'rgba(13, 71, 161, 0.15) !important' : 'rgba(13, 71, 161, 0.08) !important' },
                      transition: 'background-color 0.2s',
                      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(224, 224, 224, 0.8)'
                    }}
                  >
                    {/* Visit ID */}
                    <TableCell>
                      <Chip
                        label={`#${visit.visitId}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </TableCell>

                    {/* Member Name */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {visit.memberName || '-'}
                      </Typography>
                      {visit.employerName && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          {visit.employerName}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Civil ID */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {visit.memberCivilId || '-'}
                      </Typography>
                    </TableCell>

                    {/* Card Number */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                        {visit.memberCardNumber || '-'}
                      </Typography>
                    </TableCell>

                    {/* Visit Date */}
                    <TableCell>
                      <Typography variant="body2">{visit.visitDate ? dayjs(visit.visitDate).format('DD/MM/YYYY') : '-'}</Typography>
                    </TableCell>

                    {/* Visit Type */}
                    <TableCell>
                      <Chip
                        label={VISIT_TYPE_LABELS[visit.visitType] || visit.visitTypeLabel || visit.visitType || '-'}
                        size="small"
                        variant="outlined"
                        color="default"
                      />
                    </TableCell>

                    {/* Visit Status */}
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[visit.status] || visit.statusLabel || visit.status || '-'}
                        size="small"
                        color={STATUS_COLORS[visit.status] || 'default'}
                      />
                    </TableCell>

                    {/* Claim Status - NEW COLUMN */}
                    <TableCell>
                      {visit.claimCount > 0 || visit.latestClaimStatus ? (
                        <Stack spacing={0.5}>
                          <Chip
                            label={CLAIM_STATUS_LABELS[visit.latestClaimStatus] || visit.latestClaimStatusLabel || LABELS.noClaim}
                            size="small"
                            color={CLAIM_STATUS_COLORS[visit.latestClaimStatus] || 'default'}
                            variant="outlined"
                          />
                          {visit.claimCount > 1 && (
                            <Typography variant="caption" color="text.secondary">
                              +{visit.claimCount - 1} أخرى
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {LABELS.noClaim}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Pre-Auth Status - NEW COLUMN */}
                    <TableCell>
                      {visit.preAuthCount > 0 || visit.latestPreAuthStatus ? (
                        <Stack spacing={0.5}>
                          <Chip
                            label={PREAUTH_STATUS_LABELS[visit.latestPreAuthStatus] || visit.latestPreAuthStatusLabel || LABELS.noPreAuth}
                            size="small"
                            color={PREAUTH_STATUS_COLORS[visit.latestPreAuthStatus] || 'default'}
                            variant="outlined"
                          />
                          {visit.preAuthCount > 1 && (
                            <Typography variant="caption" color="text.secondary">
                              +{visit.preAuthCount - 1} أخرى
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {LABELS.noPreAuth}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {/* Create Claim */}
                        {visit.canCreateClaim !== false && (
                          <Tooltip title={LABELS.createClaim}>
                            <IconButton size="small" color="success" onClick={() => handleCreateClaim(visit)}>
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Create Pre-Auth */}
                        {visit.canCreatePreAuth !== false && (
                          <Tooltip title={LABELS.createPreAuth}>
                            <IconButton size="small" color="info" onClick={() => handleCreatePreAuth(visit)}>
                              <CheckCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* View Details - Context-based navigation */}
                        <Tooltip
                          title={
                            viewDetailsLoading === visit.visitId
                              ? 'جاري التحميل...'
                              : visit.latestClaimId
                                ? 'عرض المطالبة'
                                : visit.latestPreAuthId
                                  ? 'عرض الموافقة المسبقة'
                                  : 'عرض تفاصيل الأهلية'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color={visit.latestClaimId ? 'success' : visit.latestPreAuthId ? 'info' : 'default'}
                              onClick={() => handleViewDetails(visit)}
                              disabled={viewDetailsLoading === visit.visitId}
                            >
                              {viewDetailsLoading === visit.visitId ? <CircularProgress size={18} /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>

                      {/* Linked counts badges */}
                      {(visit.claimCount > 0 || visit.preAuthCount > 0) && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                          {visit.claimCount > 0 && (
                            <Chip
                              size="small"
                              label={`${visit.claimCount} مطالبة`}
                              sx={{ fontSize: '0.65rem', height: 18 }}
                              color="success"
                              variant="outlined"
                            />
                          )}
                          {visit.preAuthCount > 0 && (
                            <Chip
                              size="small"
                              label={`${visit.preAuthCount} موافقة`}
                              sx={{ fontSize: '0.65rem', height: 18 }}
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage={LABELS.rowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`}
          sx={{ borderTop: '1px solid #e0e0e0' }}
        />
      </MainCard>
    </LocalizationProvider>
  );
};

export default ProviderVisitLog;
