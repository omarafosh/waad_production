import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import GenericDataTable from '../../components/GenericDataTable';
import useTableState from '../../hooks/useTableState';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  CheckCircle as ActivateIcon,
  Cancel as CancelIcon,
  Pause as SuspendIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import MainCard from '../../components/MainCard';
import ModernPageHeader from '../../components/tba/ModernPageHeader';
import ContractStatusChip from '../../components/employers/ContractStatusChip';
import ContractFormDialog from '../../components/employers/ContractFormDialog';
import benefitPolicyService from '../../services/benefitPolicyService';
import { getEmployers } from '../../services/api/employers.service';
import { exportToExcel } from '../../utils/exportToExcel';
import { exportToPDF } from '../../utils/exportToPDF';

/**
 * Employer Contracts Page
 * 
 * Main page for managing benefit policies (employer contracts).
 * Features:
 * - List all contracts with pagination
 * - Advanced filtering (status, employer, date range)
 * - CRUD operations
 * - Status management (activate, suspend, cancel)
 * - Export to Excel/PDF
 */
const EmployerContracts = () => {
  const navigate = useNavigate();

  // State
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // Table State
  const tableState = useTableState({
    initialPageSize: 20,
    defaultSort: { field: 'createdAt', direction: 'desc' }
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    employerId: '',
    startDate: null,
    endDate: null
  });
  const [employers, setEmployers] = useState([]);

  // Dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedContract, setSelectedContract] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Actions Menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuContract, setMenuContract] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load employers for filter
  useEffect(() => {
    const loadEmployers = async () => {
      try {
        const response = await getEmployers();
        setEmployers(response?.content || response?.data?.content || (Array.isArray(response) ? response : []));
      } catch (error) {
        console.error('Error loading employers:', error);
      }
    };
    loadEmployers();
  }, []);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: tableState.page,
        size: tableState.pageSize,
        sortBy: tableState.sorting.length > 0 ? tableState.sorting[0].id : 'createdAt',
        sortDir: tableState.sorting.length > 0 ? (tableState.sorting[0].desc ? 'DESC' : 'ASC') : 'DESC'
      };

      // Add filters
      if (filters.employerId) {
        params.employerId = filters.employerId;
      }

      const response = await benefitPolicyService.list(params);

      let data = response.data?.content || [];

      // Client-side filtering for status and dates
      if (filters.status) {
        data = data.filter(c => c.status === filters.status);
      }
      if (filters.startDate) {
        data = data.filter(c => dayjs(c.startDate).isAfter(filters.startDate) || dayjs(c.startDate).isSame(filters.startDate));
      }
      if (filters.endDate) {
        data = data.filter(c => dayjs(c.endDate).isBefore(filters.endDate) || dayjs(c.endDate).isSame(filters.endDate));
      }

      setContracts(data);
      setTotalElements(response.data?.totalElements || data.length);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      showSnackbar('حدث خطأ أثناء تحميل العقود', 'error');
    } finally {
      setLoading(false);
    }
  }, [tableState.page, tableState.pageSize, tableState.sorting, filters]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Snackbar helper
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Actions Menu
  const handleOpenMenu = (event, contract) => {
    setAnchorEl(event.currentTarget);
    setMenuContract(contract);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuContract(null);
  };

  // CRUD Operations
  const handleCreate = () => {
    setFormMode('create');
    setSelectedContract(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (contract) => {
    setFormMode('edit');
    setSelectedContract(contract);
    setFormDialogOpen(true);
    handleCloseMenu();
  };

  const handleView = (contract) => {
    navigate(`/employers/contracts/${contract.id}`);
    handleCloseMenu();
  };

  const handleFormSuccess = (data) => {
    showSnackbar(
      formMode === 'create' ? 'تم إنشاء العقد بنجاح' : 'تم تحديث العقد بنجاح',
      'success'
    );
    fetchContracts();
  };

  // Status Actions
  const handleActivate = (contract) => {
    setSelectedContract(contract);
    setConfirmAction('activate');
    setConfirmDialogOpen(true);
    handleCloseMenu();
  };

  const handleSuspend = (contract) => {
    setSelectedContract(contract);
    setConfirmAction('suspend');
    setConfirmDialogOpen(true);
    handleCloseMenu();
  };

  const handleCancel = (contract) => {
    setSelectedContract(contract);
    setConfirmAction('cancel');
    setConfirmDialogOpen(true);
    handleCloseMenu();
  };

  const handleDelete = (contract) => {
    setSelectedContract(contract);
    setConfirmAction('delete');
    setConfirmDialogOpen(true);
    handleCloseMenu();
  };

  const executeAction = async () => {
    if (!selectedContract || !confirmAction) return;

    try {
      switch (confirmAction) {
        case 'activate':
          await benefitPolicyService.activate(selectedContract.id);
          showSnackbar('تم تفعيل العقد بنجاح', 'success');
          break;
        case 'suspend':
          await benefitPolicyService.suspend(selectedContract.id);
          showSnackbar('تم تعليق العقد بنجاح', 'success');
          break;
        case 'cancel':
          await benefitPolicyService.cancel(selectedContract.id);
          showSnackbar('تم إلغاء العقد بنجاح', 'success');
          break;
        case 'delete':
          await benefitPolicyService.delete(selectedContract.id);
          showSnackbar('تم حذف العقد بنجاح', 'success');
          break;
        default:
          break;
      }
      fetchContracts();
    } catch (error) {
      console.error(`Error executing ${confirmAction}:`, error);
      showSnackbar(error.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية', 'error');
    } finally {
      setConfirmDialogOpen(false);
      setSelectedContract(null);
      setConfirmAction(null);
    }
  };

  // Export
  const handleExportExcel = () => {
    const exportData = contracts.map(contract => ({
      'رقم العقد': contract.policyCode || '-',
      'اسم العقد': contract.name,
      'الشريك': contract.employerName || '-',
      'تاريخ البدء': dayjs(contract.startDate).format('YYYY-MM-DD'),
      'تاريخ الانتهاء': dayjs(contract.endDate).format('YYYY-MM-DD'),
      'الحد السنوي': contract.annualLimit?.toLocaleString('ar-SA') || '-',
      'نسبة التغطية': `${contract.defaultCoveragePercent}%`,
      'عدد المنتفعين': contract.coveredMembersCount || 0,
      'الحالة': getStatusLabel(contract.status)
    }));

    exportToExcel(exportData, `employer-contracts-${dayjs().format('YYYY-MM-DD')}`);
    showSnackbar('تم تصدير البيانات بنجاح', 'success');
  };

  const handleExportPDF = () => {
    const columns = ['رقم العقد', 'اسم العقد', 'الشريك', 'الفترة', 'الحد السنوي', 'الحالة'];
    const rows = contracts.map(contract => [
      contract.policyCode || '-',
      contract.name,
      contract.employerName || '-',
      `${dayjs(contract.startDate).format('YYYY-MM-DD')} - ${dayjs(contract.endDate).format('YYYY-MM-DD')}`,
      contract.annualLimit?.toLocaleString('ar-SA') || '-',
      getStatusLabel(contract.status)
    ]);

    exportToPDF(
      columns,
      rows,
      'عقود الشركاء',
      `employer-contracts-${dayjs().format('YYYY-MM-DD')}`
    );
    showSnackbar('تم تصدير البيانات بنجاح', 'success');
  };

  // Helper
  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'مسودة',
      ACTIVE: 'ساري',
      EXPIRED: 'منتهي',
      SUSPENDED: 'معلق',
      CANCELLED: 'ملغي'
    };
    return labels[status] || status;
  };

  const getConfirmMessage = () => {
    const messages = {
      activate: 'هل أنت متأكد من تفعيل هذا العقد؟',
      suspend: 'هل أنت متأكد من تعليق هذا العقد؟',
      cancel: 'هل أنت متأكد من إلغاء هذا العقد؟ هذا الإجراء لا يمكن التراجع عنه.',
      delete: 'هل أنت متأكد من حذف هذا العقد؟'
    };
    return messages[confirmAction] || '';
  };

  // GenericDataTable Columns
  const columns = useMemo(() => [
    {
      accessorKey: 'policyCode',
      header: 'رقم العقد',
      size: 150,
      cell: ({ row }) => row.original.policyCode || '-'
    },
    {
      accessorKey: 'name',
      header: 'اسم العقد',
      size: 200
    },
    {
      accessorKey: 'employerName',
      header: 'الشريك',
      size: 180,
      cell: ({ row }) => row.original.employerName || '-'
    },
    {
      accessorKey: 'startDate',
      header: 'تاريخ البدء',
      size: 130,
      cell: ({ row }) => dayjs(row.original.startDate).format('YYYY-MM-DD')
    },
    {
      accessorKey: 'endDate',
      header: 'تاريخ الانتهاء',
      size: 130,
      cell: ({ row }) => dayjs(row.original.endDate).format('YYYY-MM-DD')
    },
    {
      accessorKey: 'annualLimit',
      header: 'الحد السنوي',
      size: 150,
      cell: ({ row }) => row.original.annualLimit ? `${row.original.annualLimit.toLocaleString('ar-SA')} ر.س` : '-'
    },
    {
      accessorKey: 'defaultCoveragePercent',
      header: 'التغطية',
      size: 100,
      cell: ({ row }) => `${row.original.defaultCoveragePercent}%`
    },
    {
      accessorKey: 'coveredMembersCount',
      header: 'المنتفعين',
      size: 100,
      cell: ({ row }) => row.original.coveredMembersCount || 0
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      size: 120,
      cell: ({ row }) => <ContractStatusChip status={row.original.status} />
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <IconButton
          size="small"
          onClick={(e) => handleOpenMenu(e, row.original)}
        >
          <MoreVertIcon />
        </IconButton>
      )
    }
  ], []);

  return (
    <Box>
      <ModernPageHeader
        title="عقود جهات العمل"
        subtitle="إدارة عقود التأمين الطبي لجهات العمل"
        icon={<AddIcon />}
        actionButton={{
          label: 'إنشاء عقد جديد',
          onClick: handleCreate,
          icon: <AddIcon />
        }}
      />

      <MainCard sx={{ mt: 2 }}>
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                label="الحالة"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="DRAFT">مسودة</MenuItem>
                <MenuItem value="ACTIVE">ساري</MenuItem>
                <MenuItem value="EXPIRED">منتهي</MenuItem>
                <MenuItem value="SUSPENDED">معلق</MenuItem>
                <MenuItem value="CANCELLED">ملغي</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الشريك</InputLabel>
              <Select
                label="الشريك"
                value={filters.employerId}
                onChange={(e) => setFilters({ ...filters, employerId: e.target.value })}
              >
                <MenuItem value="">الكل</MenuItem>
                {(Array.isArray(employers) ? employers : []).map((employer) => (
                  <MenuItem key={employer.id} value={employer.id}>
                    {employer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="من تاريخ"
                value={filters.startDate}
                onChange={(value) => setFilters({ ...filters, startDate: value })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="إلى تاريخ"
                value={filters.endDate}
                onChange={(value) => setFilters({ ...filters, endDate: value })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        {/* Export Buttons */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExportIcon />}
            onClick={handleExportExcel}
            disabled={contracts.length === 0}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExportIcon />}
            onClick={handleExportPDF}
            disabled={contracts.length === 0}
          >
            PDF
          </Button>
        </Box>

        {/* DataGrid */}
        {/* GenericDataTable */}
        <GenericDataTable
          data={contracts}
          columns={columns}
          totalCount={totalElements}
          tableState={tableState}
          isLoading={loading}
          emptyMessage="لا توجد عقود"
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </MainCard>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => handleView(menuContract)}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={() => handleEdit(menuContract)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        {menuContract?.status === 'DRAFT' && (
          <MenuItem onClick={() => handleActivate(menuContract)}>
            <ActivateIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
            تفعيل
          </MenuItem>
        )}
        {menuContract?.status === 'ACTIVE' && (
          <MenuItem onClick={() => handleSuspend(menuContract)}>
            <SuspendIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
            تعليق
          </MenuItem>
        )}
        {(menuContract?.status === 'ACTIVE' || menuContract?.status === 'DRAFT') && (
          <MenuItem onClick={() => handleCancel(menuContract)}>
            <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
            إلغاء
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDelete(menuContract)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Form Dialog */}
      <ContractFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSuccess={handleFormSuccess}
        contract={selectedContract}
        mode={formMode}
      />

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>تأكيد العملية</DialogTitle>
        <DialogContent>
          <DialogContentText>{getConfirmMessage()}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>إلغاء</Button>
          <Button onClick={executeAction} variant="contained" color="primary">
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployerContracts;
