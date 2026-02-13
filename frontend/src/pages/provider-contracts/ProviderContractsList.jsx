/**
 * Provider Contracts List Page - UNIFIED IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pattern: UnifiedPageHeader → MainCard → GenericDataTable
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import RBACGuard from 'components/tba/RBACGuard';
import useTableState from 'hooks/useTableState';
import { getProviderContracts, CONTRACT_STATUS_CONFIG, PRICING_MODEL_CONFIG } from 'services/api/provider-contracts.service';

const QUERY_KEY = 'provider-contracts';
const MODULE_NAME = 'provider-contracts';

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

  const tableState = useTableState({
    initialPageSize: 20,
    defaultSort: { field: 'id', direction: 'desc' },
    initialFilters: {}
  });

  const handleNavigateAdd = useCallback(() => navigate('/provider-contracts/create'), [navigate]);
  const handleNavigateView = useCallback((id) => {
    if (!id) {
      console.error('[ProviderContracts] View: Missing contract ID');
      return;
    }
    navigate(`/provider-contracts/${id}`);
  }, [navigate]);

  // Note: Edit redirects to View page since there's no dedicated Edit page yet
  const handleNavigateEdit = useCallback((id) => {
    if (!id) {
      console.error('[ProviderContracts] Edit: Missing contract ID');
      return;
    }
    // Redirect to view page - edit functionality may be available there
    navigate(`/provider-contracts/${id}`);
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters],
    queryFn: async () => {
      const params = { page: tableState.page, size: tableState.pageSize };
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

  const columns = useMemo(
    () => [
      {
        accessorKey: 'contractCode',
        header: 'رمز العقد',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 150,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => <Typography variant="body2" fontWeight={600} color="primary">{getValue() || '-'}</Typography>
      },
      {
        accessorKey: 'provider',
        header: 'مقدم الخدمة',
        enableSorting: false,
        enableColumnFilter: true,
        minWidth: 200,
        align: 'right',
        meta: { filterType: 'text' },
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
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 120,
        align: 'center',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => {
          const status = getValue();
          const config = CONTRACT_STATUS_CONFIG[status] || { label: status, color: 'default' };
          return <Chip label={config.label} color={config.color} size="small" />;
        }
      },
      {
        accessorKey: 'pricingModel',
        header: 'نموذج التسعير',
        enableSorting: true,
        enableColumnFilter: false,
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
        enableSorting: true,
        enableColumnFilter: false,
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
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{formatDate(getValue())}</Typography>
      },
      {
        accessorKey: 'endDate',
        header: 'تاريخ الانتهاء',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{formatDate(getValue())}</Typography>
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'center',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original?.id)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <RBACGuard requiredPermissions={['provider_contracts.update']}>
              <Tooltip title="تعديل">
                <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)} disabled={row.original?.status === 'TERMINATED'}>
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
      <Box>
        <UnifiedPageHeader
          title="عقود مقدمي الخدمة"
          subtitle="إدارة عقود التسعير مع مقدمي الخدمات الصحية"
          icon={DescriptionIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/dashboard' }, { label: 'عقود مقدمي الخدمة' }]}
          pdfModule={MODULE_NAME}
          pdfFilters={tableState.columnFilters}
          pdfSorting={tableState.sorting}
          showAddButton={true}
          addButtonLabel="إنشاء عقد جديد"
          onAddClick={handleNavigateAdd}
          requires="provider_contracts.create"
        />
        <MainCard>
          <TableErrorBoundary>
            <GenericDataTable
              columns={columns}
              data={data?.content || []}
              totalCount={data?.totalElements || 0}
              isLoading={isLoading}
              tableState={tableState}
              enableFiltering={true}
              enableSorting={true}
              enablePagination={true}
              stickyHeader={true}
              minHeight={400}
              maxHeight="calc(100vh - 300px)"
              onRowClick={(row) => handleNavigateView(row.id)}
              emptyMessage="لا توجد عقود"
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </TableErrorBoundary>
        </MainCard>
      </Box>
    </RBACGuard>
  );
};

export default ProviderContractsList;
