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
  Typography
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Description as DescriptionIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Undo as UndoIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import { GenericDataTable, ModernPageHeader, RBACGuard } from 'components/tba';
import TableErrorBoundary from 'components/TableErrorBoundary';
import useTableState from 'hooks/useTableState';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import { useTableRefresh } from 'contexts/TableRefreshContext';
import { getProviderContracts, CONTRACT_STATUS, CONTRACT_STATUS_CONFIG, PRICING_MODEL_CONFIG } from 'services/api/provider-contracts.service';
import { debounce } from 'lodash-es';

const QUERY_KEY = 'provider-contracts';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const ProviderContractsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();
  const { refreshKey } = useTableRefresh();

  // Local Filter State
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const tableState = useTableState({
    initialPageSize: 8,
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
    navigate(`/provider-contracts/${id}`); // Edit is inside View
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

  const headerButtonStyle = (type) => {
    const isAdd = type === 'add';
    const brandColor = '#008e92';
    const color = brandColor;

    return {
      minWidth: '155px',
      color: isAdd ? '#fff' : color,
      borderColor: color,
      backgroundColor: isAdd ? brandColor : 'transparent',
      '&:hover': {
        backgroundColor: isAdd ? '#00797c' : `${color}10`,
        borderColor: isAdd ? '#00797c' : color,
      },
      fontWeight: 700,
      height: '40px'
    };
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'contractCode',
        header: 'رمز العقد',
        minWidth: 150,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2" fontWeight={600} color="primary">{getValue() || '-'}</Typography>
      },
      {
        accessorKey: 'provider',
        header: 'مقدم الخدمة',
        minWidth: 200,
        align: 'right',
        cell: ({ row }) => (
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={500}>{row.original?.providerName || row.original?.provider?.name || '-'}</Typography>
            {row.original?.provider?.city && <Typography variant="caption" color="text.secondary">{row.original.provider.city}</Typography>}
          </Stack>
        )
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        minWidth: 120,
        align: 'center',
        cell: ({ getValue }) => {
          const status = getValue();
          const config = CONTRACT_STATUS_CONFIG[status] || { label: status, color: 'default' };
          return <Chip label={config.label} color={config.color} size="small" />;
        }
      },
      {
        accessorKey: 'pricingModel',
        header: 'نموذج التسعير',
        minWidth: 150,
        align: 'right',
        cell: ({ getValue }) => {
          const model = getValue();
          const config = PRICING_MODEL_CONFIG[model] || { label: model };
          return <Typography variant="body2" color="text.secondary">{config.label || '-'}</Typography>;
        }
      },
      {
        accessorKey: 'discountPercent',
        header: 'نسبة الخصم',
        minWidth: 120,
        align: 'center',
        cell: ({ getValue }) => {
          const value = getValue();
          return value !== null && value !== undefined ? <Chip label={`${value}%`} size="small" variant="outlined" color="info" /> : '-';
        }
      },
      {
        accessorKey: 'startDate',
        header: 'تاريخ البدء',
        minWidth: 130,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{formatDate(getValue())}</Typography>
      },
      {
        accessorKey: 'endDate',
        header: 'تاريخ الانتهاء',
        minWidth: 130,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{formatDate(getValue())}</Typography>
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        minWidth: 130,
        align: 'center',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleNavigateView(row.original?.id); }}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <RBACGuard requiredPermissions={['provider_contracts.update']}>
              <Tooltip title="تعديل">
                <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); handleNavigateEdit(row.original?.id); }} disabled={row.original?.status === 'TERMINATED'}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </RBACGuard>
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit]
  );

  return (
    <RBACGuard requiredPermissions={['provider_contracts.view']}>
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
            <Stack direction="row" spacing={1}>
              <RBACGuard requiredPermissions={['provider_contracts.create']}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleNavigateAdd}
                  sx={headerButtonStyle('add')}
                >
                  إنشاء عقد جديد
                </Button>
              </RBACGuard>
            </Stack>
          }
          sx={{ mb: 0.5 }}
        />

        <Stack spacing={0.5} sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {/* Filters Bar */}
          <MainCard sx={{ p: 1, flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                label="بحث سريع"
                placeholder="رمز العقد، اسم مقدم الخدمة..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                sx={{ minWidth: 250, flexGrow: 1 }}
                InputProps={{ sx: { height: 36 } }}
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
          <MainCard content={false} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
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
                  emptyMessage="لا توجد عقود"
                  rowsPerPageOptions={[8, 16, 24, 32]}
                  cellPadding="dense"
                  fontSize={settings.fontSize}
                />
              </TableErrorBoundary>
            </Box>
          </MainCard>
        </Stack>
      </Box>
    </RBACGuard>
  );
};

export default ProviderContractsList;
