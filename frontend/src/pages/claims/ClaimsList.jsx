/**
 * Claims List Page - UNIFIED IMPLEMENTATION
 * Insurance Claims Management
 *
 * Pattern: UnifiedPageHeader → MainCard → GenericDataTable
 *
 * Architecture:
 * ✅ GenericDataTable = UI-only
 * ✅ PDF button at page level (backend-driven)
 * ❌ NO Excel export
 * ❌ NO frontend PDF generation
 *
 * CANONICAL 2026-01-26:
 * - Edit/Delete actions hidden for REVIEWER role
 * - Creation only via Provider Portal
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// MUI Components
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';

// MUI Icons - Always as Component, NEVER as JSX
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RefreshIcon from '@mui/icons-material/Refresh';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';
import EmployerFilterSelector from 'components/tba/EmployerFilterSelector';

// Auth Context - for role-based action visibility
import { useAuth } from 'contexts/AuthContext';

// Insurance UX Components
import { CardStatusBadge } from 'components/insurance';

// Custom Hooks
import useTableState from 'hooks/useTableState';

// Contexts
import { useEmployerFilter } from 'contexts/EmployerFilterContext';

// Services
import { claimsService } from 'services/api/claims.service';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'claims';
const MODULE_NAME = 'claims';
// Roles that can edit/delete (NOT reviewers)
const EDIT_ROLES = ['SUPER_ADMIN', 'INSURANCE_ADMIN', 'PROVIDER', 'EMPLOYER'];

// Claim Status Mapping for CardStatusBadge
const CLAIM_STATUS_MAP = {
  PENDING_REVIEW: 'PENDING',
  PREAPPROVED: 'ACTIVE',
  APPROVED: 'ACTIVE',
  PARTIALLY_APPROVED: 'ACTIVE',
  REJECTED: 'BLOCKED',
  RETURNED_FOR_INFO: 'SUSPENDED',
  CANCELLED: 'INACTIVE',
  SETTLED: 'ACTIVE'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency with LYD
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toLocaleString('ar-SA')} د.ل`;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-SA');
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClaimsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ========================================
  // AUTH CONTEXT - for role-based action visibility
  // ========================================

  const { user } = useAuth();

  // Determine if current user can edit/delete (REVIEWER cannot)
  const canEdit = useMemo(() => {
    const role = user?.role || user?.roles?.[0];
    return EDIT_ROLES.includes(role);
  }, [user]);

  // ========================================
  // EMPLOYER FILTER CONTEXT
  // ========================================

  const { selectedEmployerId } = useEmployerFilter();

  // ========================================
  // TABLE STATE MANAGEMENT
  // ========================================

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'id', direction: 'desc' },
    initialFilters: {}
  });

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  // NOTE: handleNavigateAdd REMOVED - Claims must be created via Visit Log (Visit-Centric Architecture)

  const handleNavigateView = useCallback(
    (id) => {
      navigate(`/claims/${id}`);
    },
    [navigate]
  );

  const handleNavigateEdit = useCallback(
    (id) => {
      navigate(`/claims/edit/${id}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id) => {
      const confirmMessage = `هل أنت متأكد من حذف هذه المطالبة؟`;
      if (!window.confirm(confirmMessage)) return;

      try {
        await claimsService.remove(id);
        openSnackbar({
          message: 'تم حذف المطالبة بنجاح',
          variant: 'success'
        });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        console.error('[Claims] Delete failed:', err);
        openSnackbar({
          message: 'فشل حذف المطالبة. يرجى المحاولة لاحقاً',
          variant: 'error'
        });
      }
    },
    [queryClient]
  );

  // ========================================
  // DATA FETCHING WITH REACT QUERY
  // ========================================

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, selectedEmployerId],
    queryFn: async () => {
      const params = {
        page: tableState.page,
        size: tableState.pageSize,
        employerId: selectedEmployerId // SECURITY: Server-side filtering
      };

      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
      }

      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params[key] = value;
        }
      });

      // Service already returns normalized response
      return await claimsService.getAll(params);
    },
    keepPreviousData: true
  });

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================

  const columns = useMemo(
    () => [
      // ID/Claim Number Column
      {
        accessorKey: 'claimNumber',
        header: '#',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 100,
        align: 'center',
        meta: { filterType: 'text' },
        cell: ({ row }) => <Typography variant="subtitle2">{row.original?.claimNumber || `CLM-${row.original?.id}` || '-'}</Typography>
      },

      // Member Column
      {
        accessorKey: 'memberName',
        header: 'المؤمَّن عليه',
        enableSorting: false,
        enableColumnFilter: true,
        minWidth: 180,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ row }) => {
          const claim = row.original;
          return (
            <Box>
              <Typography variant="body2">{claim?.memberName ?? claim?.memberFullName ?? '-'}</Typography>
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {claim?.memberNationalNumber ?? '-'}
              </Typography>
            </Box>
          );
        }
      },

      // Provider Column
      {
        accessorKey: 'providerName',
        header: 'مقدم الخدمة',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 150,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
      },

      // Service Date Column
      {
        accessorKey: 'serviceDate',
        header: 'تاريخ الخدمة',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'right',
        cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.original?.serviceDate || row.original?.visitDate)}
          </Typography>
        )
      },

      // Requested Amount Column
      {
        accessorKey: 'requestedAmount',
        header: 'المبلغ المطلوب',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'right',
        cell: ({ row }) => (
          <Typography variant="body2" fontWeight={500}>
            {formatCurrency(row.original?.totalAmount ?? row.original?.requestedAmount)}
          </Typography>
        )
      },

      // Approved Amount Column
      {
        accessorKey: 'approvedAmount',
        header: 'المبلغ الموافق',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight={500} color="success.main">
            {formatCurrency(getValue())}
          </Typography>
        )
      },

      // Status Column
      {
        accessorKey: 'status',
        header: 'الحالة',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'center',
        cell: ({ row }) => {
          const status = row.original?.status;
          const mappedStatus = CLAIM_STATUS_MAP[status] || status || 'PENDING';
          return <CardStatusBadge status={mappedStatus} size="small" language="ar" />;
        }
      },

      // Actions Column
      {
        id: 'actions',
        header: 'الإجراءات',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'center',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="عرض">
              <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original?.id)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* CANONICAL 2026-01-26: Edit/Delete hidden for REVIEWER role */}
            {canEdit && (
              <>
                <Tooltip title="تعديل">
                  <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="حذف">
                  <PermissionGuard requires="claims.delete">
                    <IconButton size="small" color="error" onClick={() => handleDelete(row.original?.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </PermissionGuard>
                </Tooltip>
              </>
            )}
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit, handleDelete, canEdit]
  );

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <Box>
      {/* ====== UNIFIED PAGE HEADER ====== */}
      <PermissionGuard requires="claims.view">
        <UnifiedPageHeader
          title="المطالبات"
          subtitle="إدارة ومتابعة مطالبات التأمين"
          icon={ReceiptIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'المطالبات' }]}
          showAddButton={false}
          customActions={
            <Stack direction="row" spacing={2}>
              <EmployerFilterSelector />
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
                تحديث
              </Button>
            </Stack>
          }
        />
      </PermissionGuard>

      {/* تنبيه النظام Visit-Centric */}
      <Alert severity="info" sx={{ mb: 3 }}>
        💡 <strong>إنشاء مطالبة جديدة:</strong> يتم إنشاء المطالبات من خلال <strong>سجل الزيارات</strong> في بوابة مقدم الخدمة. كل مطالبة
        يجب أن ترتبط بزيارة مسجلة.
      </Alert>

      {/* ====== UNIFIED DATA TABLE ====== */}
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
            emptyMessage="لا توجد مطالبات"
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
          />
        </TableErrorBoundary>
      </MainCard>
    </Box>
  );
};

export default ClaimsList;
