/**
 * Employers List Page
 * Pattern: Modern unified design matching UnifiedMembersList
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useSnackbar } from 'notistack';

// MUI Components
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Drawer
} from '@mui/material';

// MUI Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PolicyIcon from '@mui/icons-material/Policy';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import UndoIcon from '@mui/icons-material/Undo';
import FilterListIcon from '@mui/icons-material/FilterList';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PeopleIcon from '@mui/icons-material/People';

// Project Components
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import GenericDataTable from 'components/GenericDataTable';
import RBACGuard from 'components/tba/RBACGuard';
import useTableState from 'hooks/useTableState';

// Components
import PolicySelectionModal from './components/PolicySelectionModal';

// Constants
import { PERMISSIONS } from 'constants/permissions.constants';

// Services
// Services
import { getEmployers, createEmployer, updateEmployer, archiveEmployer, restoreEmployer, exportEmployers } from 'services/api/employers.service';
import { useAuth } from 'contexts/AuthContext';
import { useTableRefresh } from 'contexts/TableRefreshContext';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'employers';

const emptyForm = {
  code: '',
  name: '', // Unified name
  active: true
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EmployersList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { refreshKey, triggerRefresh } = useTableRefresh();

  // Local State
  const [formMode, setFormMode] = useState('create');
  const [formData, setFormData] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [policyFilter, setPolicyFilter] = useState('all'); // 'all', 'with_policy', 'without_policy'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Drawer State for Add/Edit Form
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    onConfirm: null,
    confirmText: 'نعم',
    cancelText: 'إلغاء',
    severity: 'warning'
  });

  // Policy Modal State
  const [policyModal, setPolicyModal] = useState({
    open: false,
    employer: null,
    currentPolicyId: null
  });

  // Common Header Button Style matching UnifiedMembersList
  const headerButtonStyle = (type, theme) => {
    const isExcel = type === 'excel';
    const isAdd = type === 'add';
    const color = isExcel ? theme.palette.success.main : theme.palette.primary.main;

    return {
      minWidth: '140px',
      color: color,
      borderColor: color,
      '&:hover': {
        backgroundColor: `${color}10`,
        borderColor: color
      },
      '&.MuiButton-contained': {
        color: '#fff',
        backgroundColor: color,
        '&:hover': {
          backgroundColor: isAdd ? theme.palette.primary.dark : theme.palette.success.dark
        }
      },
      fontWeight: theme.typography.button.fontWeight,
      fontSize: theme.typography.button.fontSize,
      whiteSpace: 'nowrap',
      px: 2,
      height: '38px'
    };
  };

  /**
   * Handle Export to Excel
   */
  const handleExport = async () => {
    try {
      const blob = await exportEmployers();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Employers_List.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('تم تصدير ملف الإكسل بنجاح', { variant: 'success' });
    } catch (error) {
      console.error('Export failed:', error);
      enqueueSnackbar('فشل تصدير الملف', { variant: 'error' });
    }
  };


  // Pagination Settings
  const PAGE_SIZE_OPTIONS = [8, 16, 24, 32];
  const storageKey = 'employers_pageSize';

  // Sync with UnifiedMembersList logic: Validate saved size against options
  const initialSize = useMemo(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? parseInt(saved, 10) : 8;
    return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : 8;
  }, [storageKey]);

  const tableState = useTableState({
    initialPageSize: initialSize,
    storageKey: storageKey,
    allowedPageSizes: PAGE_SIZE_OPTIONS,
    defaultSort: { field: 'id', direction: 'desc' },
    initialFilters: {}
  });

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      if (localSearchTerm !== searchTerm) {
        tableState.setPage(0); // Reset to first page on search
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [localSearchTerm, searchTerm, tableState]);


  // Debounced Search Handler (kept for compatibility)
  const handleSearchChange = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value);
        tableState.setPage(0); // Reset to first page on search
      }, 500),
    [tableState]
  );

  // Clean up debounce
  useEffect(() => {
    return () => {
      handleSearchChange.cancel();
    }
  }, [handleSearchChange]);

  const closeDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // ========================================
  // FORM HANDLERS
  // ========================================

  const handleInputChange = (e) => {
    let { name, value, checked, type } = e.target;

    // 🔠 SPECIFIC LOGIC FOR CODE FIELD: Force English Uppercase
    if (name === 'code' && value) {
      // Remove Arabic characters and any non-alphanumeric (except dash/underscore if desired)
      // and force uppercase
      value = value.replace(/[^\w-]/g, '').toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = useCallback(() => {
    setFormMode('create');
    setFormData(emptyForm);
  }, []);

  const handleOpenForm = useCallback(() => {
    resetForm();
    setDrawerOpen(true);
  }, [resetForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      enqueueSnackbar('اسم جهة العمل مطلوب', { variant: 'warning' });
      return;
    }

    // Check for duplicate code in frontend (UX optimization)
    if (formMode === 'create' && formData.code) {
      const isDuplicate = tableData.some(emp => emp.code?.toLowerCase() === formData.code.toLowerCase());
      if (isDuplicate) {
        enqueueSnackbar('رمز جهة العمل هذا موجود مسبقاً', { variant: 'error' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 🛡️ FRONTEND PRE-VALIDATION: Check for duplicates in currently loaded data
      const normalizedName = formData.name.trim().toLowerCase();
      const normalizedCode = formData.code.trim().toLowerCase();

      const isDuplicate = tableData.some(emp =>
        (emp.name && emp.name.toLowerCase() === normalizedName ||
          emp.code && emp.code.toLowerCase() === normalizedCode) &&
        (formMode === 'create' || emp.id !== formData.id)
      );

      if (isDuplicate) {
        enqueueSnackbar('عذراً، هذا الاسم أو الكود موجود بالفعل في القائمة الحالية.', { variant: 'warning' });
        setIsSubmitting(false);
        return;
      }

      // 🔄 CONFIRMATION MESSAGE
      enqueueSnackbar('جارٍ حفظ البيانات...', { variant: 'info', autoHideDuration: 2000 });

      if (formMode === 'create') {
        await createEmployer(formData);
        enqueueSnackbar('تم إضافة جهة العمل بنجاح', { variant: 'success' });
      } else {
        await updateEmployer(formData.id, formData);
        enqueueSnackbar('تم تحديث بيانات جهة العمل بنجاح', { variant: 'success' });
      }

      // Refresh Data
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      resetForm();
      setDrawerOpen(false); // Close drawer on success

      // Global Refresh for other components
      triggerRefresh();
    } catch (err) {
      console.error('Employer save error:', err);
      // Use the exact message from backend if available (e.g. "Name already exists")
      const errorMessage = err.response?.data?.message || 'فشل حفظ البيانات. قد يكون هناك تكرار في السجلات المنسية.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = useCallback((row) => {
    setFormMode('edit');
    setFormData({
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      active: row.active ?? true
    });
    setDrawerOpen(true);
  }, []);

  // ========================================
  // TABLE ACTIONS
  // ========================================

  const handleDelete = useCallback(
    (id, name) => {
      setConfirmDialog({
        open: true,
        title: 'هل أنت متأكد؟',
        content: `سيتم نقل جهة العمل "${name}" إلى سلة المحذوفات`,
        confirmText: 'نعم، احذفها',
        severity: 'error',
        onConfirm: async () => {
          try {
            await archiveEmployer(id);
            enqueueSnackbar('تم نقل جهة العمل إلى سلة المحذوفات بنجاح.', { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            closeDialog();
            triggerRefresh(); // Sync other tabs
          } catch (err) {
            enqueueSnackbar(err.response?.data?.message || 'فشل حذف جهة العمل', { variant: 'error' });
          }
        }
      });
    },
    [queryClient, enqueueSnackbar]
  );

  const handleRestore = useCallback(
    (id, name) => {
      setConfirmDialog({
        open: true,
        title: 'تأكيد الاستعادة',
        content: `هل تريد استعادة جهة العمل "${name}"؟`,
        confirmText: 'نعم، استعادة',
        severity: 'success',
        onConfirm: async () => {
          try {
            await restoreEmployer(id);
            enqueueSnackbar('تم استعادة جهة العمل بنجاح.', { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            closeDialog();
            triggerRefresh(); // Sync other tabs
          } catch (err) {
            enqueueSnackbar(err.response?.data?.message || 'فشل استعادة جهة العمل', { variant: 'error' });
          }
        }
      });
    },
    [queryClient, enqueueSnackbar]
  );

  const toggleShowArchived = () => {
    setShowArchived(prev => !prev);
    tableState.setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const handleResetFilters = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
    setStatusFilter('all');
    setPolicyFilter('all');
    tableState.setPage(0);
  };

  const openPolicyModal = (employer) => {
    setPolicyModal({
      open: true,
      employer: { id: employer.id, name: employer.name },
      currentPolicyId: employer.activePolicyId
    });
  };

  const handlePolicyLinkSuccess = () => {
    enqueueSnackbar('تم تحديث الوثيقة النشطة بنجاح', { variant: 'success' });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['benefit-policies'] });
    triggerRefresh(); // Sync other tabs
  };

  // ========================================
  // DATA FETCHING
  // ========================================

  const { data, isLoading, isError, error } = useQuery({
    // Add user and refreshKey to dependency key to trigger re-fetch on sync events
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, showArchived, searchTerm, statusFilter, policyFilter, user, refreshKey],
    queryFn: async () => {
      const params = {
        page: tableState.page,
        size: tableState.pageSize,
        deleted: showArchived,
        active: statusFilter === 'all' ? undefined : (statusFilter === 'active'),
        hasPolicy: policyFilter === 'all' ? undefined : (policyFilter === 'with_policy')
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
      } else {
        // Default sort
        params.sort = 'id,desc';
      }

      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      return await getEmployers(params);
    },
    keepPreviousData: true
  });

  // Flatten data for table
  const tableData = useMemo(() => {
    if (!data?.content) return [];
    return data.content;
  }, [data]);

  const totalCount = data?.totalElements || 0;

  // ========================================
  // COLUMNS
  // ========================================

  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'الكود',
      enableSorting: true,
      size: 140, // increased size for column
      cell: ({ getValue }) => (
        <Chip
          label={getValue() || '-'}
          size="small"
          variant="filled"
          sx={{
            borderRadius: '6px',
            bgcolor: '#f5f5f5',
            color: '#616161',
            fontWeight: 'bold',
            border: '1px solid #e0e0e0',
            width: '120px', // Fixed width
            justifyContent: 'center',
            '& .MuiChip-label': { width: '100%', textAlign: 'center' }
          }}
        />
      )
    },
    {
      accessorKey: 'name', // Using unified 'name'
      header: 'الاسم',
      enableSorting: true,
      size: 250,
      muiTableBodyCellProps: {
        align: 'right',
        sx: { textAlign: 'right' }
      },
      muiTableHeadCellProps: {
        align: 'right',
        sx: { textAlign: 'right' }
      },
      cell: ({ getValue }) => (
        <Typography
          variant="body1"
          fontWeight="medium"
          sx={{
            width: '100%',
            textAlign: 'right', // Explicitly right
            display: 'block'
          }}
        >
          {getValue()}
        </Typography>
      )
    },
    {
      accessorKey: 'active',
      header: 'الحالة',
      enableSorting: true,
      size: 100,
      cell: ({ getValue }) => (
        <Chip
          label={getValue() ? 'نشط' : 'غير نشط'}
          color={getValue() ? 'success' : 'error'}
          size="small"
          variant="filled"
          sx={{
            borderRadius: '6px',
            fontWeight: 'bold',
            width: '80px', // Fixed width
            justifyContent: 'center'
          }}
        />
      )
    },
    {
      accessorKey: 'totalMembers',
      header: 'المستفيدين',
      enableSorting: true,
      size: 110,
      cell: ({ row }) => {
        const count = row.original.totalMembers || 0;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              label={count}
              size="small"
              color={count > 0 ? 'primary' : 'default'}
              variant={count > 0 ? 'filled' : 'outlined'}
              sx={{ borderRadius: '6px', fontWeight: 'bold' }}
            />
            {count > 0 && (
              <Tooltip title="عرض المستفيدين">
                <IconButton
                  size="small"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/members?organizationId=${row.original.id}`);
                  }}
                >
                  <PeopleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      }
    },
    {
      id: 'policy',
      header: 'الوثيقة',
      size: 220,
      enableSorting: false,
      cell: ({ row }) => {
        const policyId = row.original.activePolicyId;
        const policyName = row.original.activePolicyName;

        return (
          <Tooltip title={policyName || 'ربط وثيقة تأمين'}>
            <Chip
              label={policyName || 'ربط وثيقة تأمين'}
              color={policyId ? 'success' : 'default'}
              variant="filled"
              size="small"
              icon={policyId ? <PolicyIcon /> : <AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                openPolicyModal(row.original);
              }}
              sx={{
                cursor: 'pointer',
                fontWeight: 'bold',
                borderRadius: '6px',
                bgcolor: policyId ? undefined : '#f5f5f5',
                color: policyId ? undefined : '#616161',
                border: policyId ? undefined : '1px solid #e0e0e0',
                width: '180px', // Fixed width
                justifyContent: 'flex-start',
                '& .MuiChip-label': {
                  width: '100%',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingLeft: '4px',
                  paddingRight: '4px'
                },
                '&:hover': {
                  bgcolor: policyId ? undefined : '#e0e0e0'
                }
              }}
            />
          </Tooltip>
        );
      }
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      enableSorting: false,
      size: 120,
      cell: ({ row }) => {
        const isArchived = !row.original.active && showArchived; // Simplified logic, relies on backend 'deleted' flag mostly

        return (
          <Stack direction="row" spacing={0.5} justifyContent="center" onClick={(e) => e.stopPropagation()}>
            {showArchived ? (
              <RBACGuard requiredPermissions={[PERMISSIONS.EMPLOYER_DELETE]}>
                <Tooltip title="استعادة">
                  <IconButton
                    color="success"
                    size="small"
                    onClick={() => handleRestore(row.original.id, row.original.name)}
                  >
                    <SettingsBackupRestoreIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </RBACGuard>
            ) : (
              <>
                <RBACGuard requiredPermissions={[PERMISSIONS.EMPLOYER_EDIT]}>
                  <Tooltip title="تعديل">
                    <IconButton
                      sx={{ color: '#008e92' }}
                      size="small"
                      onClick={() => handleEditClick(row.original)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </RBACGuard>

                <RBACGuard requiredPermissions={[PERMISSIONS.EMPLOYER_DELETE]}>
                  <Tooltip title="حذف">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(row.original.id, row.original.name)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </RBACGuard>
              </>
            )}
          </Stack>
        );
      }
    }
  ], [handleEditClick, handleDelete, handleRestore, showArchived, navigate]);

  return (
    <Box>
      <ModernPageHeader
        title="إدارة جهات العمل"
        icon={<BusinessCenterIcon />}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'جهات العمل' }
        ]}
        actions={
          <Stack direction="row" spacing={1} sx={{ '& .MuiButton-root': { transition: 'all 0.2s' } }}>

            {/* View/Action Group */}
            <RBACGuard requiredPermissions={[PERMISSIONS.EMPLOYER_DELETE]}>
              <Button
                variant={showArchived ? "contained" : "outlined"}
                startIcon={showArchived ? <VisibilityIcon /> : <DeleteIcon />}
                onClick={toggleShowArchived}
                sx={(theme) => ({
                  ...headerButtonStyle('delete', theme),
                  backgroundColor: showArchived ? theme.palette.error.main : 'transparent',
                  color: showArchived ? theme.palette.error.contrastText : theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: showArchived ? theme.palette.error.dark : `${theme.palette.error.main}10`,
                    color: showArchived ? theme.palette.error.contrastText : theme.palette.error.main,
                  }
                })}
              >
                {showArchived ? 'العودة للقائمة النشطة' : 'المحذوفات'}
              </Button>
            </RBACGuard>

            <RBACGuard requiredPermissions={[PERMISSIONS.EMPLOYER_EXPORT]}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                sx={(theme) => headerButtonStyle('excel', theme)}
              >
                تصدير لإكسل
              </Button>
            </RBACGuard>

            <RBACGuard requiredPermissions={[PERMISSIONS.EMPLOYER_CREATE]}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenForm()}
                sx={(theme) => headerButtonStyle('add', theme)}
              >
                إضافة جهة عمل
              </Button>
            </RBACGuard>
          </Stack>
        }
        sx={{ mb: 0.5 }}
      />

      {/* Main Container with Fixed Height Calculation */}
      <Stack spacing={0.5} sx={{ height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
        {/* Filters - Top Bar */}
        <MainCard sx={{ p: 1, flexShrink: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="البحث"
              placeholder="البحث بالاسم أو الكود..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              sx={{ minWidth: 200, flexGrow: 1 }}
              InputProps={{ sx: { height: 36, fontSize: '1rem' } }}
              InputLabelProps={{ sx: { fontSize: '1rem' } }}
            />

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="status-filter-label" sx={{ fontSize: '1rem' }}>حالة الجهة</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="حالة الجهة"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  tableState.setPage(0);
                }}
                sx={{ height: 36, fontSize: '1rem' }}
              >
                <MenuItem value="all" sx={{ fontSize: '1rem' }}>الكل</MenuItem>
                <MenuItem value="active" sx={{ fontSize: '1rem' }}>نشط فقط</MenuItem>
                <MenuItem value="inactive" sx={{ fontSize: '1rem' }}>غير نشط</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="policy-filter-label" sx={{ fontSize: '1rem' }}>فلتر الوثيقة</InputLabel>
              <Select
                labelId="policy-filter-label"
                value={policyFilter}
                label="فلتر الوثيقة"
                onChange={(e) => {
                  setPolicyFilter(e.target.value);
                  tableState.setPage(0);
                }}
                sx={{ height: 36, fontSize: '1rem' }}
              >
                <MenuItem value="all" sx={{ fontSize: '1rem' }}>الكل</MenuItem>
                <MenuItem value="with_policy" sx={{ fontSize: '1rem' }}>يملك وثيقة</MenuItem>
                <MenuItem value="without_policy" sx={{ fontSize: '1rem' }}>لا يملك وثيقة</MenuItem>
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

        {/* Data Table with Flexible Height */}
        <MainCard content={false} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box
            sx={{
              flexGrow: 1,
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {isError && (
              <Alert severity="error" sx={{ m: 2 }}>
                {error?.response?.data?.message || 'فشل تحميل البيانات'}
              </Alert>
            )}

            <GenericDataTable
              columns={columns}
              data={tableData}
              totalCount={totalCount}
              isLoading={isLoading}
              tableState={tableState}
              cellPadding="dense"
              enableFiltering={false}
              rowsPerPageOptions={[8, 16, 24, 32]}
            />
          </Box>
        </MainCard>
      </Stack>

      {/* Drawer for Add/Edit Form */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        PaperProps={{ sx: { width: 400, p: 3 } }}
      >
        <Stack spacing={3}>
          <Typography variant="h5" fontWeight="bold">
            {formMode === 'create' ? 'إضافة جهة عمل' : 'تعديل جهة عمل'}
          </Typography>
          {/* Form Content - Guarded by RBAC */}
          <RBACGuard requiredPermissions={formMode === 'create' ? [PERMISSIONS.EMPLOYER_CREATE] : [PERMISSIONS.EMPLOYER_EDIT]}>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <Stack spacing={3}>
                <TextField
                  name="code"
                  label="الكود"
                  value={formData.code}
                  onChange={handleInputChange}
                  size="small"
                  fullWidth
                  inputProps={{
                    style: { textTransform: 'uppercase', direction: 'ltr' },
                    inputMode: 'latin',
                    lang: 'en'
                  }}
                  helperText="الأحرف الإنجليزية فقط"
                />

                <TextField
                  name="name"
                  label="الاسم"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  size="small"
                  fullWidth
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      color="primary"
                    />
                  }
                  label="نشط"
                />

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<CancelIcon />}
                    onClick={() => {
                      setDrawerOpen(false);
                      resetForm();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={formMode === 'create' ? <AutoFixHighIcon /> : <SaveIcon />}
                    disabled={isSubmitting}
                  >
                    {formMode === 'create' ? 'إضافة' : 'حفظ'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </RBACGuard>

        </Stack>
      </Drawer>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmDialog.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit">
            {confirmDialog.cancelText}
          </Button>
          <Button onClick={confirmDialog.onConfirm} color={confirmDialog.severity === 'error' ? 'error' : 'primary'} autoFocus>
            {confirmDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Policy Selection Modal */}
      <PolicySelectionModal
        open={policyModal.open}
        onClose={() => setPolicyModal(prev => ({ ...prev, open: false }))}
        employer={policyModal.employer}
        currentPolicyId={policyModal.currentPolicyId}
        onSuccess={handlePolicyLinkSuccess}
      />
    </Box>
  );
};

export default EmployersList;
