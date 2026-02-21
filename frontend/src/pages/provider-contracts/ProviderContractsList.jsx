/**
 * Provider Contracts List Page - UNIFIED IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pattern: ModernPageHeader → FiltersBar → GenericDataTable
 * Refactored: 2026-02-16
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  InputAdornment
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Description as DescriptionIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Undo as UndoIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import { GenericDataTable, ModernPageHeader, RBACGuard } from 'components/tba';
import TableErrorBoundary from 'components/TableErrorBoundary';
import useTableState from 'hooks/useTableState';
import { useSystemSettings } from 'contexts/SystemSettingsContext'; // Changed
import { useTableRefresh } from 'contexts/TableRefreshContext';
import { getProviderContracts, CONTRACT_STATUS, CONTRACT_STATUS_CONFIG, PRICING_MODEL_CONFIG } from 'services/api/provider-contracts.service';
import { debounce } from 'lodash-es';
import useFormatter from 'hooks/useFormatter';

// Constants
import { PERMISSIONS } from 'constants/permissions.constants';

// Style Utils
import { headerButtonStyle } from 'utils/styleUtils';

const QUERY_KEY = 'provider-contracts';


const ProviderContractsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings(); // Changed
  const { formatDate } = useFormatter();
  const { refreshKey } = useTableRefresh();

  // Local Filter State
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const tableState = useTableState({
    initialPageSize: 10,
    allowedPageSizes: [10, 25, 50, 100],
    defaultSort: { field: 'id', direction: 'desc' },
    initialFilters: {},
    storageKey: 'provider_contracts_pageSize'
  });

  // Debounced Search Effect
  useEffect(() => {
    const handler = debounce((val) => {
      tableState.setSearchTerm(val);
      tableState.setPage(0);
    }, 500);

    handler(localSearchTerm);
    return () => handler.cancel();
  }, [localSearchTerm]);

  const handleNavigateAdd = useCallback(() => navigate('/provider-contracts/create'), [navigate]);
  const handleNavigateView = useCallback((id) => {
    if (!id) return;
    navigate(`/provider-contracts/${id}`);
  }, [navigate]);

  const handleNavigateEdit = useCallback((id) => {
    if (!id) return;
    navigate(`/provider-contracts/edit/${id}`);
  }, [navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, tableState.searchTerm, statusFilter, refreshKey],
    queryFn: async () => {
      const params = {
        page: tableState.page,
        size: tableState.pageSize,
        q: tableState.searchTerm || undefined,
        status: statusFilter || undefined
      };

      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
      }

      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) params[key] = value;
      });

      return await getProviderContracts(params);
    },
    keepPreviousData: true
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries([QUERY_KEY]);
    refetch();
  };

  const handleResetFilters = () => {
    setLocalSearchTerm('');
    setStatusFilter('');
    tableState.setSearchTerm('');
    tableState.clearFilters();
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'contractCode',
        header: 'رمز العقد',
        minWidth: 140,
        align: 'center',
        headerAlign: 'center',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        minWidth: 110,
        align: 'center',
        headerAlign: 'center',
        cell: ({ getValue }) => {
          const status = getValue();
          const config = CONTRACT_STATUS_CONFIG[status] || { label: status, color: 'default' };
          const statusLabels = {
            ACTIVE: 'نشط',
            SUSPENDED: 'معلق',
            TERMINATED: 'منتهي',
            DRAFT: 'مسودة',
            EXPIRED: 'منتهي'
          };
          return (
            <Chip
              label={statusLabels[status] || config.label}
              color={config.color}
              size="small"
              variant={status === 'ACTIVE' ? 'filled' : 'outlined'}
            />
          );
        }
      },
      {
        accessorKey: 'pricingModel',
        header: 'الموديل',
        minWidth: 120,
        align: 'center',
        headerAlign: 'center',
        cell: ({ getValue }) => {
          const model = getValue();
          const config = PRICING_MODEL_CONFIG[model] || { label: model };
          return (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {config.label || '-'}
            </Typography>
          );
        }
      },
      {
        accessorKey: 'discountPercent',
        header: 'الخصم',
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
        cell: ({ getValue }) => {
          const value = getValue();
          return value !== null && value !== undefined ? (
            <Chip
              label={`${value}%`}
              size="small"
              variant="outlined"
              color="info"
              sx={{ fontWeight: 600 }}
            />
          ) : '-';
        }
      },
      {
        id: 'dates',
        header: 'تاريخ الصلاحية',
        minWidth: 180,
        align: 'center',
        headerAlign: 'center',
        cell: ({ row }) => (
          <Stack spacing={0} alignItems="center">
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {formatDate(row.original.startDate)}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              إلى: {row.original.endDate ? formatDate(row.original.endDate) : 'مفتوح'}
            </Typography>
          </Stack>
        )
      },
      {
        accessorKey: 'pricingItemsCount',
        header: 'الخدمات',
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        cell: ({ getValue }) => {
          const count = getValue() || 0;
          return (
            <Chip
              label={count}
              size="small"
              variant="outlined"
              sx={{
                minWidth: 28,
                height: 20,
                borderRadius: '6px',
                fontWeight: count > 0 ? 700 : 400,
                bgcolor: count > 0 ? 'secondary.lighter' : 'transparent',
                borderColor: count > 0 ? 'secondary.light' : 'divider',
                color: count > 0 ? 'secondary.main' : 'text.disabled',
              }}
            />
          );
        }
      },
      {
        id: 'actions',
        header: 'إجراءات',
        minWidth: 110,
        align: 'center',
        headerAlign: 'center',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="عرض التفاصيل">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => { e.stopPropagation(); handleNavigateView(row.original?.id); }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <RBACGuard requiredPermissions={[PERMISSIONS.PROVIDER_CONTRACT_EDIT]}>
              <Tooltip title="تعديل">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => { e.stopPropagation(); handleNavigateEdit(row.original?.id); }}
                  disabled={row.original?.status === 'TERMINATED'}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </RBACGuard>
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit, formatDate]
  );

  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.PROVIDER_CONTRACT_VIEW]}>
      <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ModernPageHeader
          title="عقود مقدمي الخدمة"
          subtitle="إدارة عقود التسعير مع مقدمي الخدمات الصحية"
          icon={<DescriptionIcon />}
          breadcrumbs={[
            { label: 'الرئيسية', path: '/' },
            { label: 'عقود مقدمي الخدمة' }
          ]}
          actions={
            <Stack direction="row" spacing={1} sx={{ '& .MuiButton-root': { transition: 'all 0.2s' } }}>
              <RBACGuard requiredPermissions={[PERMISSIONS.PROVIDER_CONTRACT_CREATE]}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleNavigateAdd}
                  sx={(theme) => headerButtonStyle('add', theme)}
                >
                  إنشاء عقد جديد
                </Button>
              </RBACGuard>
            </Stack>
          }
          sx={{ mb: 1.5 }}
        />

        <Stack spacing={1.5} sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {/* Filters Bar */}
          <MainCard sx={{ p: 1.5, flexShrink: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                placeholder="رمز العقد، اسم مقدم الخدمة..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                sx={{ minWidth: 300, flexGrow: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  sx: { height: 40, borderRadius: 1.5 }
                }}
              />

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>حالة العقد</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="حالة العقد"
                  sx={{ height: 36 }}
                >
                  <MenuItem value=""><em>الكل</em></MenuItem>
                  {Object.entries(CONTRACT_STATUS).map(([key, value]) => (
                    <MenuItem key={key} value={value}>
                      {CONTRACT_STATUS_CONFIG[value]?.label || value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="تحديث">
                <IconButton onClick={handleRefresh} size="small" color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="إعادة تعيين">
                <IconButton onClick={handleResetFilters} size="small">
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </MainCard>

          {/* Data Table */}
          <MainCard content={false} sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 2
          }}>
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
              emptyMessage="لا توجد عقود"
              rowsPerPageOptions={[10, 25, 50, 100]}
              cellPadding="dense"
              fontSize={settings.fontSize}
            />
          </MainCard>
        </Stack>
      </Box>
    </RBACGuard>
  );
};

export default ProviderContractsList;
