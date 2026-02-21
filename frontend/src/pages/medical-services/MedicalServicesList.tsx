/**
 * Medical Services List Page - UNIFIED REFERENCE IMPLEMENTATION
 *
 * ⭐ This is the GOLDEN REFERENCE for all List Pages
 *
 * Pattern: UnifiedPageHeader → MainCard → GenericDataTable
 *
 * Architecture Rules:
 * ✅ GenericDataTable = UI-only component
 * ✅ Excel export button for data export
 * ✅ Company branding in Excel (header/footer)
 * ❌ NO PDF export (not working with Arabic)
 * ❌ NO frontend PDF generation
 * ❌ NO html2canvas/jsPDF
 *
 * Features:
 * - Multi-column sorting
 * - Sticky headers
 * - Pagination
 * - Professional Excel export with company branding
 */

import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment
} from '@mui/material';

// MUI Icons - Always as Component, NEVER as JSX
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
// MUI Icons
import {
  MedicalServices as MedicalServicesIcon,
  DeleteSweep as DeleteSweepIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

// Project Components
import MainCard from 'components/MainCard';
import { GenericDataTable, ModernPageHeader, RBACGuard } from 'components/tba';
import ConfirmDialog from 'components/common/ConfirmDialog';
import ExcelImportButton from 'components/tba/ExcelUploadButton';

// Utils
import { headerButtonStyle } from 'utils/styleUtils';

// Custom Hooks
import useTableState from 'hooks/useTableState';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Services
import {
  getMedicalServices,
  deleteMedicalService,
  deleteAllMedicalServices,
  deactivateAllMedicalServices,
  activateAllMedicalServices,
  getMedicalServicesStats,
  updateServiceCategory,
  getAllMedicalServices
} from 'services/api/medical-services.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

// Excel Export
import { exportMedicalServicesToExcel } from 'utils/excelExport';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// Constants & Styles
import { PERMISSIONS } from 'constants/permissions.constants';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'medical-services';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format price with LYD currency
 */
const formatPrice = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(2)} د.ل`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MedicalServicesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ========================================
  // LOCAL STATE
  // ========================================

  // Status filter: null = all, true = active, false = inactive
  const [statusFilter, setStatusFilter] = useState(null);

  // Excel export loading state
  const [isExporting, setIsExporting] = useState(false);

  // Bulk operations dialogs
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deactivateAllDialogOpen, setDeactivateAllDialogOpen] = useState(false);
  const [activateAllDialogOpen, setActivateAllDialogOpen] = useState(false);

  // Generic Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    onConfirm: null,
    confirmText: 'نعم',
    cancelText: 'إلغاء',
    severity: 'warning'
  });

  const closeDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // ========================================
  // CATEGORIES DATA (for inline edit dropdown)
  // ========================================

  const { data: categories = [] } = useQuery({
    queryKey: ['medical-categories-all'],
    queryFn: getAllMedicalCategories,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Quick category update mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ serviceId, categoryId }) => updateServiceCategory(serviceId, categoryId),
    onSuccess: (result, { serviceName }) => {
      openSnackbar({
        message: `تم تحديث تصنيف "${serviceName}" بنجاح`,
        variant: 'success'
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (err, { serviceName }) => {
      console.error('[MedicalServices] Category update failed:', err);
      openSnackbar({
        message: `فشل تحديث تصنيف "${serviceName}": ${err.message || 'خطأ غير معروف'}`,
        variant: 'error'
      });
    }
  });

  // ========================================
  // TABLE REFRESH CONTEXT
  // ========================================

  const { refreshKey, triggerRefresh } = useTableRefresh();

  // ========================================
  // TABLE STATE MANAGEMENT
  // ========================================
  const tableState = useTableState({
    initialPageSize: 10,
    storageKey: 'medical_services_pageSize',
    allowedPageSizes: [10, 25, 50, 100],
    defaultSort: { field: 'id', direction: 'desc' }
  });

  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      tableState.setSearchTerm(localSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchTerm, tableState]);

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNavigateAdd = useCallback(() => {
    navigate('/medical-services/add');
  }, [navigate]);

  const handleNavigateView = useCallback(
    (id) => {
      navigate(`/medical-services/${id}`);
    },
    [navigate]
  );

  const handleNavigateEdit = useCallback(
    (id) => {
      navigate(`/medical-services/edit/${id}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    (id, name) => {
      setConfirmDialog({
        open: true,
        title: 'تأكيد الحذف',
        content: `هل أنت متأكد من حذف الخدمة "${name}"؟`,
        confirmText: 'نعم، احذف',
        severity: 'error',
        onConfirm: async () => {
          try {
            await deleteMedicalService(id);
            openSnackbar({
              message: 'تم حذف الخدمة بنجاح',
              variant: 'success'
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            closeDialog();
          } catch (err) {
            console.error('[MedicalServices] Delete failed:', err);
            openSnackbar({
              message: 'فشل حذف الخدمة. يرجى المحاولة لاحقاً',
              variant: 'error'
            });
            closeDialog();
          }
        }
      });
    },
    [queryClient]
  );

  // ========================================
  // BULK OPERATIONS MUTATIONS
  // ========================================

  // Permanent Delete All
  const deleteAllMutation = useMutation({
    mutationFn: deleteAllMedicalServices,
    onSuccess: (count) => {
      openSnackbar({
        message: `⚠️ تم حذف ${count} خدمة طبية نهائياً`,
        variant: 'success'
      });
      setDeleteAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['medical-services-stats'] });
    },
    onError: (err) => {
      console.error('[MedicalServices] Delete all failed:', err);
      openSnackbar({
        message: 'فشل حذف الخدمات. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    }
  });

  // Deactivate All
  const deactivateAllMutation = useMutation({
    mutationFn: deactivateAllMedicalServices,
    onSuccess: (count) => {
      openSnackbar({
        message: `تم إلغاء تنشيط ${count} خدمة طبية`,
        variant: 'success'
      });
      setDeactivateAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['medical-services-stats'] });
    },
    onError: (err) => {
      console.error('[MedicalServices] Deactivate all failed:', err);
      openSnackbar({
        message: 'فشل إلغاء التنشيط. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    }
  });

  // Activate All
  const activateAllMutation = useMutation({
    mutationFn: activateAllMedicalServices,
    onSuccess: (count) => {
      openSnackbar({
        message: `تم تنشيط ${count} خدمة طبية`,
        variant: 'success'
      });
      setActivateAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['medical-services-stats'] });
    },
    onError: (err) => {
      console.error('[MedicalServices] Activate all failed:', err);
      openSnackbar({
        message: 'فشل التنشيط. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    }
  });

  const handleDeleteAll = useCallback(() => {
    setDeleteAllDialogOpen(true);
  }, []);

  const handleConfirmDeleteAll = useCallback(() => {
    deleteAllMutation.mutate();
  }, [deleteAllMutation]);

  const handleDeactivateAll = useCallback(() => {
    setDeactivateAllDialogOpen(true);
  }, []);

  const handleConfirmDeactivateAll = useCallback(() => {
    deactivateAllMutation.mutate();
  }, [deactivateAllMutation]);

  const handleActivateAll = useCallback(() => {
    setActivateAllDialogOpen(true);
  }, []);

  const handleConfirmActivateAll = useCallback(() => {
    activateAllMutation.mutate();
  }, [activateAllMutation]);

  // ========================================
  // DATA FETCHING WITH REACT QUERY
  // ========================================

  // Fetch stats for status filter badges
  const { data: stats } = useQuery({
    queryKey: ['medical-services-stats', refreshKey],
    queryFn: getMedicalServicesStats,
    staleTime: 30000 // Cache for 30 seconds
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, statusFilter, refreshKey, tableState.searchTerm],
    queryFn: async () => {
      // Build query parameters from table state
      const params = {
        page: tableState.page,
        size: tableState.pageSize
      };

      // Add status filter
      if (statusFilter !== null) {
        params.active = statusFilter;
      }

      // Add sorting - Use sortBy and sortDir for Spring Boot
      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sortBy = sort.id;
        params.sortDir = sort.desc ? 'DESC' : 'ASC';
      }

      // Add filters
      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params[key] = value;
        }
      });

      // Add search term
      if (tableState.searchTerm) {
        params.search = tableState.searchTerm;
      }

      const response = await getMedicalServices(params);
      return response;
    },
    keepPreviousData: true
  });

  const services = data?.items || [];
  const totalCount = data?.total || 0;

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================

  const columns = useMemo(
    () => [
      // Code Column
      {
        accessorKey: 'code',
        header: 'الرمز',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight="medium">
            {getValue() || '-'}
          </Typography>
        )
      },

      // Name Column
      {
        accessorKey: 'name',
        header: 'الاسم',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 200,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
      },

      // Category Column - INLINE EDITABLE
      {
        accessorKey: 'categoryName',
        header: 'التصنيف ✏️',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 200,
        align: 'right',
        cell: ({ row }) => {
          const currentCategoryId = row.original?.categoryId;
          const serviceName = row.original?.name || row.original?.code;
          const serviceId = row.original?.id;

          return (
            <FormControl size="small" fullWidth sx={{ minWidth: 150 }}>
              <Select
                value={currentCategoryId || ''}
                onChange={(e) => {
                  const newCategoryId = e.target.value || null;
                  updateCategoryMutation.mutate({
                    serviceId,
                    categoryId: newCategoryId,
                    serviceName
                  });
                }}
                displayEmpty
                sx={{
                  '& .MuiSelect-select': {
                    py: 0.5,
                    fontSize: '1rem'
                  }
                }}
                disabled={updateCategoryMutation.isPending}
              >
                <MenuItem value="">
                  <em style={{ color: '#999' }}>-- بدون تصنيف --</em>
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
      },

      // Price Column
      {
        accessorKey: 'basePrice',
        header: 'السعر (د.ل)',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'center',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight="medium" color="primary">
            {formatPrice(getValue())}
          </Typography>
        )
      },

      // Status Column
      {
        accessorKey: 'active',
        header: 'الحالة',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'center',
        cell: ({ getValue }) => (
          <Chip label={getValue() ? 'نشط' : 'غير نشط'} color={getValue() ? 'success' : 'default'} size="small" variant="light" />
        )
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

            <Tooltip title="تعديل">
              <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="حذف">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(row.original?.id, row.original?.name || row.original?.code)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit, handleDelete, categories, updateCategoryMutation]
  );

  // ========================================
  // MAIN RENDER
  // ========================================

  // Excel Export Handler - Export ALL data, not just visible
  const handleExcelExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch ALL medical services for export (not just the visible page)
      const allServices = await getAllMedicalServices();
      await exportMedicalServicesToExcel(allServices || []);
      openSnackbar({
        message: `تم تصدير ${allServices?.length || 0} خدمة بنجاح`,
        variant: 'success'
      });
    } catch (error) {
      console.error('[MedicalServices] Excel export failed:', error);
      openSnackbar({
        message: 'فشل تصدير البيانات. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ====== MODERN PAGE HEADER ====== */}
      <ModernPageHeader
        title="الخدمات الطبية"
        subtitle="إدارة الخدمات الطبية وتسعيرها في النظام"
        icon={<MedicalServicesIcon />}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'الخدمات الطبية' }
        ]}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <RBACGuard requiredPermissions={[PERMISSIONS.MEDICAL_SERVICE_CREATE]}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNavigateAdd}
                sx={(theme) => ({
                  ...headerButtonStyle('add', theme),
                  fontWeight: 'bold'
                })}
              >
                إضافة خدمة
              </Button>
            </RBACGuard>

            <RBACGuard requiredPermissions={['SUPER_ADMIN']}>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={handleDeleteAll}
                disabled={!stats?.total || stats.total === 0}
                sx={(theme) => ({
                  ...headerButtonStyle('delete', theme),
                  fontWeight: 'bold'
                })}
              >
                حذف الكل
              </Button>
            </RBACGuard>

            <RBACGuard requiredPermissions={[PERMISSIONS.MEDICAL_SERVICE_UPDATE]}>
              <Button
                variant="contained"
                sx={(theme) => ({
                  ...headerButtonStyle('warning', theme),
                  bgcolor: '#ed6c02',
                  color: '#fff',
                  '&:hover': { bgcolor: '#e65100' },
                  fontWeight: 'bold'
                })}
                startIcon={<ToggleOffIcon />}
                onClick={handleDeactivateAll}
                disabled={!stats?.active || stats.active === 0}
              >
                إلغاء تنشيط
              </Button>
            </RBACGuard>

            <RBACGuard requiredPermissions={[PERMISSIONS.MEDICAL_SERVICE_CREATE]}>
              <ExcelImportButton
                module="medical-services"
                onImportComplete={triggerRefresh}
                variant="outlined"
                color="primary"
                label="استيراد"
                sx={{ fontWeight: 'medium' }}
              />
            </RBACGuard>

            <Button
              variant="outlined"
              color="success"
              startIcon={<RefreshIcon />}
              onClick={triggerRefresh}
              sx={(theme) => headerButtonStyle('excel', theme)}
            >
              تحديث
            </Button>
          </Stack>
        }
      />

      <Stack spacing={1.5} sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Search & Quick Filters */}
        <MainCard sx={{ p: 1.5, flexShrink: 0 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="بحث باسم الخدمة، الرمز، أو النوع..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              sx={{ flexGrow: 1, maxWidth: 500 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: 40, borderRadius: 1.5 }
              }}
            />

            {/* Status Filter Dropdown */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="status-filter-label">الحالة</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={statusFilter === null ? 'all' : statusFilter ? 'active' : 'inactive'}
                label="الحالة"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') setStatusFilter(null);
                  else if (val === 'active') setStatusFilter(true);
                  else setStatusFilter(false);
                  tableState.setPage(0);
                }}
              >
                <MenuItem value="all">الكل {stats?.total ? `(${stats.total})` : ''}</MenuItem>
                <MenuItem value="active">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon fontSize="small" color="success" />
                    <span>نشط {stats?.active ? `(${stats.active})` : ''}</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="inactive">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CancelIcon fontSize="small" color="disabled" />
                    <span>غير نشط {stats?.inactive ? `(${stats.inactive})` : ''}</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />

            {/* Quick Stats Summary */}
            <Stack direction="row" spacing={1}>
              <Chip
                label={`الإجمالي: ${stats?.total || 0}`}
                variant="outlined"
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`نشط: ${stats?.active || 0}`}
                variant="light"
                size="small"
                color="success"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
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
            data={services}
            totalCount={totalCount}
            isLoading={isLoading}
            tableState={tableState}
            onRowClick={(row) => handleNavigateView(row.id)}
            rowsPerPageOptions={[10, 25, 50, 100]}
            stickyHeader
          />
        </MainCard>
      </Stack>

      {/* ====== DIALOGS ====== */}

      {/* Delete All Dialog */}
      <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>🚨 تأكيد الحذف النهائي</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            سيتم حذف ({stats?.total || 0}) خدمة طبية نهائياً من قاعدة البيانات.
          </Alert>
          <DialogContentText>
            هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد تماماً؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)} color="inherit">إلغاء</Button>
          <Button onClick={handleConfirmDeleteAll} color="error" variant="contained" disabled={deleteAllMutation.isPending}>
            {deleteAllMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate All Dialog */}
      <Dialog open={deactivateAllDialogOpen} onClose={() => setDeactivateAllDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد إلغاء التنشيط</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إلغاء تنشيط ({stats?.active || 0}) خدمة طبية نشطة.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateAllDialogOpen(false)} color="inherit">إلغاء</Button>
          <Button onClick={handleConfirmDeactivateAll} color="warning" variant="contained" disabled={deactivateAllMutation.isPending}>
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activate All Dialog */}
      <Dialog open={activateAllDialogOpen} onClose={() => setActivateAllDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد التنشيط</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            سيتم تنشيط ({stats?.inactive || 0}) خدمة طبية غير نشطة.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivateAllDialogOpen(false)} color="inherit">إلغاء</Button>
          <Button onClick={handleConfirmActivateAll} color="success" variant="contained" disabled={activateAllMutation.isPending}>
            تأكيد التنشيط
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeDialog}
        title={confirmDialog.title}
        content={confirmDialog.content}
        onConfirm={confirmDialog.onConfirm}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        severity={confirmDialog.severity}
      />
    </Box>
  );
};

export default MedicalServicesList;
