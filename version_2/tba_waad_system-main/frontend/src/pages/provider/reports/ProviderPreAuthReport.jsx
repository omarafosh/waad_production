import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ClearAll as ClearAllIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  VerifiedUser as PreAuthIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import { UnifiedMedicalTable } from 'components/common';
import PermissionGuard from 'components/PermissionGuard';
import axiosClient from 'utils/axios';
import { formatCurrency, formatDate } from 'utils/formatters';

/**
 * تقرير الموافقات المسبقة - بوابة مقدم الخدمة
 */
const ProviderPreAuthReport = () => {
  // ========================================
  // STATE
  // ========================================
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    status: '',
    memberBarcode: ''
  });

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20
  });

  // ========================================
  // DATA FETCHING
  // ========================================
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['provider-preauth-report', filters, paginationModel],
    queryFn: async () => {
      const params = {
        page: paginationModel.page,
        size: paginationModel.pageSize,
        sortBy: 'requestDate',
        sortDir: 'DESC',
        ...filters
      };
      const response = await axiosClient.get('/api/v1/provider/reports/pre-auth', { params });
      return response.data.data;
    }
  });

  const preAuthData = useMemo(() => data?.content || [], [data]);
  const totalElements = data?.totalElements || 0;

  // ========================================
  // HANDLERS
  // ========================================
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({
      fromDate: null,
      toDate: null,
      status: '',
      memberBarcode: ''
    });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const hasActiveFilters = useMemo(() => {
    return filters.fromDate || filters.toDate || filters.status || filters.memberBarcode;
  }, [filters]);

  // ========================================
  // TABLE COLUMNS
  // ========================================
  const columns = useMemo(
    () => [
      {
        id: 'preAuthNumber',
        label: 'رقم الموافقة',
        minWidth: 150,
        sortable: false
      },
      {
        id: 'requestDate',
        label: 'تاريخ الطلب',
        minWidth: 130,
        sortable: false
      },
      {
        id: 'memberName',
        label: 'اسم المريض',
        minWidth: 180,
        sortable: false
      },
      {
        id: 'memberBarcode',
        label: 'الباركود',
        minWidth: 130,
        sortable: false
      },
      {
        id: 'serviceName',
        label: 'الخدمة',
        minWidth: 200,
        sortable: false
      },
      {
        id: 'sessionsRequested',
        label: 'الجلسات المطلوبة',
        minWidth: 130,
        align: 'center',
        sortable: false
      },
      {
        id: 'sessionsApproved',
        label: 'الجلسات الموافقة',
        minWidth: 130,
        align: 'center',
        sortable: false
      },
      {
        id: 'sessionsUsed',
        label: 'المستخدم',
        minWidth: 100,
        align: 'center',
        sortable: false
      },
      {
        id: 'requestedAmount',
        label: 'المبلغ المطلوب',
        minWidth: 130,
        align: 'right',
        sortable: false
      },
      {
        id: 'approvedAmount',
        label: 'المبلغ الموافق',
        minWidth: 130,
        align: 'right',
        sortable: false
      },
      {
        id: 'status',
        label: 'الحالة',
        minWidth: 140,
        align: 'center',
        sortable: false
      }
    ],
    []
  );

  // ========================================
  // CELL RENDERER
  // ========================================
  const getStatusChip = (status, label) => {
    const colors = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
      EXPIRED: 'default',
      CANCELLED: 'default'
    };

    return <Chip label={label} color={colors[status] || 'default'} size="small" sx={{ fontWeight: 600 }} />;
  };

  const renderCell = useCallback((preAuth, column) => {
    if (!preAuth) return null;

    switch (column.id) {
      case 'preAuthNumber':
        return (
          <Typography variant="body2" fontWeight={600}>
            {preAuth.preAuthNumber || '-'}
          </Typography>
        );

      case 'requestDate':
        return formatDate(preAuth.requestDate);

      case 'memberName':
        return preAuth.memberName || '-';

      case 'memberBarcode':
        return preAuth.memberBarcode || '-';

      case 'serviceName':
        return preAuth.serviceName || '-';

      case 'sessionsRequested':
        return preAuth.sessionsRequested || 0;

      case 'sessionsApproved':
        return (
          <Typography variant="body2" color="success.main" fontWeight={600}>
            {preAuth.sessionsApproved || 0}
          </Typography>
        );

      case 'sessionsUsed':
        const used = preAuth.sessionsUsed || 0;
        const approved = preAuth.sessionsApproved || 0;
        const percentage = approved > 0 ? (used / approved) * 100 : 0;

        return (
          <Box sx={{ width: '100%' }}>
            <Typography variant="caption" display="block" align="center">
              {used} / {approved}
            </Typography>
            <LinearProgress variant="determinate" value={percentage} sx={{ height: 4, borderRadius: 2 }} />
          </Box>
        );

      case 'requestedAmount':
        return formatCurrency(preAuth.requestedAmount);

      case 'approvedAmount':
        return (
          <Typography variant="body2" color="success.main" fontWeight={600}>
            {formatCurrency(preAuth.approvedAmount)}
          </Typography>
        );

      case 'status':
        return getStatusChip(preAuth.status, preAuth.statusLabel);

      default:
        return '-';
    }
  }, []);

  // ========================================
  // BREADCRUMBS
  // ========================================
  const breadcrumbs = [
    { label: 'بوابة مقدم الخدمة', path: '/provider' },
    { label: 'التقارير', path: '/provider/reports' },
    { label: 'الموافقات المسبقة' }
  ];

  // ========================================
  // PAGE ACTIONS
  // ========================================
  const pageActions = (
    <Stack direction="row" spacing={1}>
      <Tooltip title="تحديث">
        <IconButton onClick={() => refetch()} color="primary" disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  // ========================================
  // RENDER
  // ========================================
  return (
    <PermissionGuard resource="pre_auth" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="تقرير الموافقات المسبقة"
          subtitle="جميع طلبات الموافقات المسبقة"
          breadcrumbs={breadcrumbs}
          icon={PreAuthIcon}
          actions={pageActions}
        />

        {/* Error Alert */}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.message || 'حدث خطأ أثناء تحميل البيانات'}
          </Alert>
        )}

        {/* Filters */}
        <MainCard sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: showFilters ? 2 : 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterListIcon color="action" />
              <Typography variant="h6">البحث والفلترة</Typography>
            </Stack>
            <IconButton onClick={() => setShowFilters(!showFilters)} size="small">
              {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>

          <Collapse in={showFilters}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="من تاريخ"
                  value={filters.fromDate}
                  onChange={(value) => handleFilterChange('fromDate', value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <DatePicker
                  label="إلى تاريخ"
                  value={filters.toDate}
                  onChange={(value) => handleFilterChange('toDate', value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  select
                  label="الحالة"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="PENDING">قيد الانتظار</MenuItem>
                  <MenuItem value="APPROVED">موافق عليها</MenuItem>
                  <MenuItem value="REJECTED">مرفوضة</MenuItem>
                  <MenuItem value="EXPIRED">منتهية الصلاحية</MenuItem>
                  <MenuItem value="CANCELLED">ملغاة</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="الباركود"
                  value={filters.memberBarcode}
                  onChange={(e) => handleFilterChange('memberBarcode', e.target.value)}
                  size="small"
                  placeholder="اكتب باركود المريض"
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SearchIcon />}
                    onClick={() => refetch()}
                    disabled={isLoading}
                    fullWidth
                  >
                    بحث
                  </Button>
                  <Button variant="outlined" startIcon={<ClearAllIcon />} onClick={handleClearFilters} disabled={!hasActiveFilters}>
                    مسح
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Collapse>
        </MainCard>

        {/* Data Table */}
        <MainCard>
          <UnifiedMedicalTable
            columns={columns}
            data={preAuthData}
            loading={isLoading}
            error={isError ? error : null}
            onErrorClose={() => {}}
            renderCell={renderCell}
            totalItems={totalElements}
            page={paginationModel.page}
            rowsPerPage={paginationModel.pageSize}
            onPageChange={(event, newPage) => setPaginationModel((prev) => ({ ...prev, page: newPage }))}
            onRowsPerPageChange={(event) => setPaginationModel({ page: 0, pageSize: parseInt(event.target.value, 10) })}
            emptyStateConfig={{
              icon: PreAuthIcon,
              title: 'لا توجد موافقات مسبقة',
              description: 'لا توجد طلبات موافقات مسبقة مسجلة حالياً'
            }}
          />
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default ProviderPreAuthReport;
