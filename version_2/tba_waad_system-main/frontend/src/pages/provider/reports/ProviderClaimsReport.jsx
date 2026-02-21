import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, Collapse, Grid, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import {
  ClearAll as ClearAllIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import { UnifiedMedicalTable } from 'components/common';
import PermissionGuard from 'components/PermissionGuard';
import axiosClient from 'utils/axios';
import { formatCurrency, formatDate } from 'utils/formatters';

/**
 * تقرير المطالبات - بوابة مقدم الخدمة
 * عرض جميع المطالبات المقدمة من مقدم الخدمة مع إمكانية الفلترة والبحث
 */
const ProviderClaimsReport = () => {
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
    queryKey: ['provider-claims-report', filters, paginationModel],
    queryFn: async () => {
      const params = {
        page: paginationModel.page,
        size: paginationModel.pageSize,
        sortBy: 'serviceDate',
        sortDir: 'DESC',
        ...filters
      };
      const response = await axiosClient.get('/api/v1/provider/reports/claims', { params });
      return response.data.data;
    }
  });

  const claimsData = useMemo(() => data?.content || [], [data]);
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
        id: 'claimNumber',
        label: 'رقم المطالبة',
        minWidth: 150,
        sortable: false
      },
      {
        id: 'serviceDate',
        label: 'تاريخ الخدمة',
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
        id: 'employerName',
        label: 'الشركة',
        minWidth: 150,
        sortable: false
      },
      {
        id: 'claimedAmount',
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
        id: 'netAmount',
        label: 'الصافي',
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
      },
      {
        id: 'servicesCount',
        label: 'عدد الخدمات',
        minWidth: 110,
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
      DRAFT: 'default',
      SUBMITTED: 'info',
      UNDER_REVIEW: 'warning',
      APPROVAL_IN_PROGRESS: 'warning',
      APPROVED: 'success',
      BATCHED: 'secondary',
      NEEDS_CORRECTION: 'warning',
      REJECTED: 'error',
      PAID: 'success'
    };

    return <Chip label={label} color={colors[status] || 'default'} size="small" sx={{ fontWeight: 600 }} />;
  };

  const renderCell = useCallback((claim, column) => {
    if (!claim) return null;

    switch (column.id) {
      case 'claimNumber':
        return (
          <Typography variant="body2" fontWeight={600}>
            {claim.claimNumber || '-'}
          </Typography>
        );

      case 'serviceDate':
        return formatDate(claim.serviceDate);

      case 'memberName':
        return claim.memberName || '-';

      case 'memberBarcode':
        return claim.memberBarcode || '-';

      case 'employerName':
        return claim.employerName || '-';

      case 'claimedAmount':
        return formatCurrency(claim.claimedAmount);

      case 'approvedAmount':
        return (
          <Typography variant="body2" color="success.main" fontWeight={600}>
            {formatCurrency(claim.approvedAmount)}
          </Typography>
        );

      case 'netAmount':
        return formatCurrency(claim.netAmount);

      case 'status':
        return getStatusChip(claim.status, claim.statusLabel);

      case 'servicesCount':
        return claim.servicesCount || 0;

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
    { label: 'المطالبات' }
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
    <PermissionGuard resource="claims" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="تقرير المطالبات"
          subtitle="جميع المطالبات المقدمة من مقدم الخدمة"
          breadcrumbs={breadcrumbs}
          icon={ReceiptIcon}
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
                  <MenuItem value="SUBMITTED">مقدمة</MenuItem>
                  <MenuItem value="UNDER_REVIEW">قيد المراجعة</MenuItem>
                  <MenuItem value="APPROVAL_IN_PROGRESS">جاري معالجة الموافقة</MenuItem>
                  <MenuItem value="APPROVED">موافق عليها</MenuItem>
                  <MenuItem value="BATCHED">ضمن دفعة تسوية</MenuItem>
                  <MenuItem value="NEEDS_CORRECTION">تحتاج تصحيح</MenuItem>
                  <MenuItem value="REJECTED">مرفوضة</MenuItem>
                  <MenuItem value="PAID">مدفوعة</MenuItem>
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
            data={claimsData}
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
              icon: ReceiptIcon,
              title: 'لا توجد مطالبات',
              description: 'لا توجد مطالبات مسجلة حالياً'
            }}
          />
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default ProviderClaimsReport;
