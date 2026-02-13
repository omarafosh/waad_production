/**
 * Pre-Approvals List Page - Phase D2.4 (TbaDataTable Pattern)
 * Prior Authorization / Pre-Approval Requests Management
 *
 * ⚠️ Pattern: ModernPageHeader → MainCard → TbaDataTable
 *
 * Rules Applied:
 * 1. icon={Component} - NEVER JSX
 * 2. Arabic only - No English labels
 * 3. Defensive optional chaining
 * 4. TbaDataTable for server-side pagination/sorting/filtering
 * 5. TableRefreshContext for post-create/edit refresh (Phase D2.3)
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// MUI Components
import { Box, Button, IconButton, Stack, Tooltip, Typography, Alert } from '@mui/material';

// MUI Icons - Always as Component, NEVER as JSX
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RefreshIcon from '@mui/icons-material/Refresh';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import TbaDataTable from 'components/tba/TbaDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';

// Insurance UX Components - Phase B2
import { CardStatusBadge, PriorityBadge } from 'components/insurance';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Services
import { preApprovalsService, providersService } from 'services/api';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'pre-approvals';

// Pre-Approval Status Mapping for CardStatusBadge
const PREAPPROVAL_STATUS_MAP = {
  PENDING: 'PENDING',
  REQUESTED: 'PENDING',
  UNDER_REVIEW: 'PENDING',
  PENDING_DOCUMENTS: 'SUSPENDED',
  APPROVED: 'ACTIVE',
  REJECTED: 'BLOCKED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'INACTIVE'
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PreApprovalsList = () => {
  const navigate = useNavigate();
  const [providerOptions, setProviderOptions] = useState([]);

  // ========================================
  // TABLE REFRESH CONTEXT (Phase D2.3)
  // ========================================

  const { refreshKey, triggerRefresh } = useTableRefresh();

  // Load Providers for Filter
  useEffect(() => {
    const loadProviders = async () => {
      // Security Check: Providers cannot access getSelector endpoint
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user?.roles?.includes('PROVIDER')) {
        return; // Skip fetching for providers
      }

      try {
        const data = await providersService.getSelector(); // Uses /api/providers/selector
        // Map to format strings or objects as needed by TbaDataTable/MRT
        // Assuming data is [{id, name}, ...]
        const options = data.map(p => p.name || p.providerName);
        setProviderOptions(options);
      } catch (err) {
        console.error('Failed to load providers for filter', err);
      }
    };
    loadProviders();
  }, []);

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNavigateAdd = useCallback(() => {
    navigate('/pre-approvals/add');
  }, [navigate]);

  const handleNavigateView = useCallback(
    (id) => {
      navigate(`/pre-approvals/${id}`);
    },
    [navigate]
  );

  const handleNavigateEdit = useCallback(
    (id) => {
      navigate(`/pre-approvals/edit/${id}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id) => {
      const confirmMessage = `هل أنت متأكد من حذف هذا الطلب؟`;
      if (!window.confirm(confirmMessage)) return;

      try {
        await preApprovalsService.remove(id);
        // Trigger refresh via context - no page reload needed
        triggerRefresh();
      } catch (err) {
        console.error('[PreApprovals] Delete failed:', err);
        alert('فشل حذف الطلب. يرجى المحاولة لاحقاً');
      }
    },
    [triggerRefresh]
  );

  // ========================================
  // FETCHER FUNCTION
  // ========================================

  const fetcher = useCallback(async (params) => {
    const data = await preApprovalsService.getAll(params);
    // If backend returns array, wrap it for TbaDataTable
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        size: data.length
      };
    }
    // Handle Spring Page format
    if (data?.content) {
      return {
        items: data.content,
        total: data.totalElements || data.content.length,
        page: (data.number || 0) + 1,
        size: data.size || 20
      };
    }
    return data;
  }, []);

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================

  const columns = useMemo(
    () => {
      // Check if user is PROVIDER to conditionally hide Provider Name filter
      // (Providers only see their own data, so filter is redundant/security risk if endpoint blocked)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isProvider = user?.roles?.includes('PROVIDER');

      return [
        // Reference Number Column
        {
          accessorKey: 'referenceNumber',
          header: '#',
          size: 100,
          muiTableHeadCellProps: { align: 'center' },
          muiTableBodyCellProps: { align: 'center' },
          Cell: ({ row }) => <Typography variant="subtitle2">{row.original?.referenceNumber ?? `PA-${row.original?.id}` ?? '-'}</Typography>
        },

        // Member Column
        {
          accessorKey: 'memberName',
          header: 'المؤمَّن عليه',
          size: 180,
          Cell: ({ row }) => {
            const preApproval = row.original;
            return <Typography variant="body2">{preApproval?.memberName ?? preApproval?.memberFullName ?? '-'}</Typography>;
          }
        },

        // Provider Column (Hide filter for providers, but show column)
        {
          accessorKey: 'providerName',
          header: 'مقدم الخدمة',
          size: 150,
          enableColumnFilter: !isProvider, // Disable filter for providers
          filterVariant: !isProvider ? 'select' : undefined,
          filterSelectOptions: !isProvider ? providerOptions : undefined,
          Cell: ({ row }) => <Typography variant="body2">{row.original?.providerName ?? '-'}</Typography>
        },

        // Service Column
        {
          accessorKey: 'serviceName',
          header: 'الخدمة',
          size: 150,
          Cell: ({ row }) => <Typography variant="body2">{row.original?.serviceName ?? row.original?.serviceCode ?? '-'}</Typography>
        },

        // Priority Column
        {
          accessorKey: 'priority',
          header: 'الأولوية',
          size: 100,
          muiTableHeadCellProps: { align: 'center' },
          muiTableBodyCellProps: { align: 'center' },
          enableSorting: false,
          Cell: ({ row }) => <PriorityBadge priority={row.original?.priority ?? 'ROUTINE'} size="small" variant="chip" language="ar" />
        },

        // Contract Price Column
        {
          accessorKey: 'contractPrice',
          header: 'سعر العقد',
          size: 130,
          muiTableHeadCellProps: { align: 'right' },
          muiTableBodyCellProps: { align: 'right' },
          Cell: ({ row }) => (
            <Typography variant="body2" fontWeight={500}>
              {formatCurrency(row.original?.contractPrice ?? row.original?.requestedAmount)}
            </Typography>
          )
        },

        // Approved Amount Column
        {
          accessorKey: 'approvedAmount',
          header: 'المبلغ الموافق عليه',
          size: 140,
          muiTableHeadCellProps: { align: 'right' },
          muiTableBodyCellProps: { align: 'right' },
          Cell: ({ row }) => (
            <Typography variant="body2" fontWeight={500} color="success.main">
              {formatCurrency(row.original?.approvedAmount)}
            </Typography>
          )
        },

        // Status Column
        {
          accessorKey: 'status',
          header: 'الحالة',
          size: 120,
          muiTableHeadCellProps: { align: 'center' },
          muiTableBodyCellProps: { align: 'center' },
          Cell: ({ row }) => {
            const status = row.original?.status;
            const mappedStatus = PREAPPROVAL_STATUS_MAP[status] || status || 'PENDING';
            return <CardStatusBadge status={mappedStatus} size="small" language="ar" />;
          }
        },

        // Actions Column
        {
          id: 'actions',
          header: 'الإجراءات',
          size: 130,
          enableSorting: false,
          enableHiding: false,
          enableColumnFilter: false,
          muiTableHeadCellProps: { align: 'center' },
          muiTableBodyCellProps: { align: 'center' },
          Cell: ({ row }) => (
            <Stack direction="row" spacing={0.5} justifyContent="center">
              <Tooltip title="عرض">
                <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original?.id)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Providers/Admins - conditionally show edit */}
              {/* Note: Edit logic handled inside the page usually, valid here */}
              <Tooltip title="تعديل">
                <span>
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => handleNavigateEdit(row.original?.id)}
                    disabled={row.original?.status !== 'PENDING' && row.original?.status !== 'REQUESTED'}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="حذف">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(row.original?.id)}
                    disabled={row.original?.status !== 'PENDING' && row.original?.status !== 'REQUESTED'}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )
        }
      ];
    },
    [handleNavigateView, handleNavigateEdit, handleDelete, providerOptions]
  );

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <Box>
      {/* ====== PAGE HEADER ====== */}
      <ModernPageHeader
        title="الموافقات المسبقة"
        subtitle="إدارة ومتابعة طلبات الموافقات المسبقة"
        icon={AssignmentTurnedInIcon}
        breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الموافقات المسبقة' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={triggerRefresh}
            >
              تحديث
            </Button>
          </Stack>
        }
      />

      {/* ====== MAIN CARD WITH TABLE ====== */}
      <MainCard
        title="قائمة الموافقات المسبقة"
        secondary={
          <Alert severity="info" variant="outlined" sx={{ py: 0.5, px: 1.5, border: 'none', bgcolor: 'transparent' }} icon={false}>
            💡 لإنشاء موافقة جديدة، استخدم <strong>سجل الزيارات</strong> في بوابة مقدم الخدمة
          </Alert>
        }
      >
        <TableErrorBoundary>
          <TbaDataTable
            columns={columns}
            fetcher={fetcher}
            queryKey={QUERY_KEY}
            refreshKey={refreshKey}
            enableExport={true}
            enablePrint={true}
            enableFilters={true}
            exportFilename="pre_approvals"
            printTitle="تقرير الموافقات المسبقة"
          />
        </TableErrorBoundary>
      </MainCard>
    </Box>
  );
};


export default PreApprovalsList;
