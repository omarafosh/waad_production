/**
 * Unified Members List Page
 * 
 * Displays all members (Principals and Dependents) with pagination, sorting, and filtering.
 * Supports filtering by employer, status, and member type.
 * 
 * @module UnifiedMembersList
 * @since 2026-02-13 (Phase 7 - UI Unification)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  alpha,
  useTheme
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Undo as UndoIcon,
  FileDownload as FileDownloadIcon,
  MedicalServices as MedicalIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import { UnifiedTable, ModernPageHeader, RBACGuard } from 'components/tba';
import DataImportWizard from 'components/ExcelImport/DataImportWizard';
import DataExportWizard from 'components/tba/DataExportWizard';
import {
  getAllMembers,
  searchMembers,
  downloadTemplate,
  deleteMember,
  restoreMember,
  hardDeleteMember,
  updateMember,
  MEMBER_TYPES,
  MEMBER_STATUSES
} from 'services/api/unified-members.service';
import { useAuth } from 'contexts/AuthContext';
import { useTableRefresh } from 'contexts/TableRefreshContext';
import { PERMISSIONS } from 'constants/rbac';
import ActionGuard from 'components/rbac/ActionGuard';

/**
 * Unified Members List Component
 */
const UnifiedMembersList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const { refreshKey, triggerRefresh: triggerGlobalRefresh } = useTableRefresh();

  // Refreshing & Internal Navigation
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerLocalRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Filters State
  const [showDeleted, setShowDeleted] = useState(false);
  const [filters, setFilters] = useState({
    organizationId: '',
    type: '',
    status: ''
  });

  // Supporting Data
  const [employers, setEmployers] = useState([]); // This would be populated by a fetch if needed
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', content: '' });

  // ========================================
  // NEW UNIFIED FETCHER
  // ========================================
  const memberFetcher = useCallback(async (params) => {
    // Map sorting if needed
    const sortMapping = {
      employerName: 'employerOrganizationId',
      type: 'parentId'
    };

    if (params.sortBy && sortMapping[params.sortBy]) {
      params.sortBy = sortMapping[params.sortBy];
    }

    // Merge custom filters
    const finalParams = {
      ...params,
      organizationId: filters.organizationId || undefined,
      status: filters.status === '' ? undefined : filters.status,
      type: filters.type === '' ? undefined : filters.type,
      deleted: showDeleted,
    };

    // Decide between search and getAll
    if (finalParams.search && finalParams.search.trim()) {
      return await searchMembers({
        ...finalParams,
        fullName: finalParams.search.trim(),
        barcode: finalParams.search.trim(),
        cardNumber: finalParams.search.trim()
      });
    }

    return await getAllMembers(finalParams);
  }, [filters, showDeleted]);

  // ========================================
  // ACTIONS HANDLERS
  // ========================================

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    triggerLocalRefresh();
  };

  const handleResetFilters = () => {
    setFilters({ organizationId: '', type: '', status: '' });
    triggerLocalRefresh();
  };

  const closeDialog = () => setConfirmDialog({ ...confirmDialog, open: false });

  const handleConfirmAction = async (action, successMsg, errorMsg) => {
    try {
      await action();
      enqueueSnackbar(successMsg, { variant: 'success' });
      triggerLocalRefresh();
    } catch (error) {
      console.error(errorMsg, error);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      closeDialog();
    }
  };

  const handleDelete = (member) => {
    setConfirmDialog({
      open: true,
      title: showDeleted ? 'حذف نهائي؟' : 'حذف المستفيد؟',
      content: `هل أنت متأكد من ${showDeleted ? 'الحذف النهائي لـ' : 'نقل'} ${member.fullName} ${showDeleted ? '' : 'إلى سلة المهملات'}؟`,
      severity: 'error',
      confirmText: 'نعم، حذف',
      onConfirm: () => handleConfirmAction(
        async () => showDeleted ? await hardDeleteMember(member.id) : await deleteMember(member.id),
        showDeleted ? 'تم الحذف النهائي بنجاح' : 'تم نقل المستفيد للمحذوفات',
        'خطأ في عملية الحذف'
      )
    });
  };

  const handleRestore = (member) => {
    setConfirmDialog({
      open: true,
      title: 'استعادة المستفيد؟',
      content: `هل أنت متأكد من استعادة ${member.fullName} إلى القائمة النشطة؟`,
      severity: 'success',
      confirmText: 'نعم، استعادة',
      onConfirm: () => handleConfirmAction(
        async () => await restoreMember(member.id),
        'تم استعادة المستفيد بنجاح',
        'خطأ في استعادة المستفيد'
      )
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      enqueueSnackbar('خطأ في تحميل القالب', { variant: 'error' });
    }
  };

  const performExport = async (params) => {
    // Logic for actual export would go here
    console.log('Exporting with params:', params);
    enqueueSnackbar('بدء عملية التصدير...', { variant: 'info' });
  };

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================
  const columns = useMemo(() => [
    {
      accessorKey: 'fullName',
      header: 'الاسم الكامل',
      size: 250,
      Cell: ({ row }) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.original.fullName}</Typography>
            <Typography variant="caption" color="textSecondary">{row.original.cardNumber}</Typography>
          </Box>
        </Stack>
      )
    },
    {
      accessorKey: 'employerName',
      header: 'جهة العمل',
      size: 200,
    },
    {
      accessorKey: 'type',
      header: 'النوع',
      size: 100,
      Cell: ({ cell }) => (
        <Chip
          label={cell.getValue() === 'PRINCIPAL' ? 'رئيسي' : 'تابع'}
          size="small"
          variant="light"
          color={cell.getValue() === 'PRINCIPAL' ? 'primary' : 'success'}
        />
      )
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      size: 100,
      Cell: ({ cell }) => {
        const val = cell.getValue();
        const colors = { ACTIVE: 'success', SUSPENDED: 'warning', TERMINATED: 'error' };
        return <Chip label={val} size="small" color={colors[val] || 'default'} />;
      }
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      size: 150,
      Cell: ({ row }) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <IconButton size="small" color="primary" onClick={() => navigate(`/members/${row.original.id}`)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>

          {showDeleted ? (
            <ActionGuard permission={PERMISSIONS.MEMBER_RESTORE}>
              <IconButton size="small" color="success" onClick={() => handleRestore(row.original)}>
                <UndoIcon fontSize="small" />
              </IconButton>
            </ActionGuard>
          ) : (
            <ActionGuard permission={PERMISSIONS.MEMBER_DELETE}>
              <IconButton size="small" color="error" onClick={() => handleDelete(row.original)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ActionGuard>
          )}
        </Stack>
      )
    }
  ], [navigate, showDeleted]);

  // ========================================
  // RENDER
  // ========================================
  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.MEMBER_VIEW]}>
      <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1 }}>
        <ModernPageHeader
          title="إدارة المستفيدين"
          subtitle="قائمة موحدة لجميع المشتركين والتابعين"
          icon={MedicalIcon}
          breadcrumbs={[{ label: 'المستفيدين' }]}
          actions={
            <Stack direction="row" spacing={1}>
              <ActionGuard permission={PERMISSIONS.MEMBER_EXPORT}>
                <Button
                  variant="outlined"
                  onClick={() => setExportWizardOpen(true)}
                  startIcon={<FileDownloadIcon />}
                  sx={{ borderRadius: '8px' }}
                >
                  تصدير
                </Button>
              </ActionGuard>

              <Button
                variant={showDeleted ? "contained" : "outlined"}
                startIcon={showDeleted ? <VisibilityIcon /> : <DeleteIcon />}
                onClick={() => setShowDeleted(!showDeleted)}
                color={showDeleted ? "error" : "inherit"}
                sx={{ borderRadius: '8px' }}
              >
                {showDeleted ? 'عرض المحذوفين' : 'سلة المهملات'}
              </Button>
            </Stack>
          }
        />

        <Stack spacing={1} sx={{ flexGrow: 1, overflow: 'hidden', mt: 1 }}>
          <UnifiedTable
            columns={columns}
            fetcher={memberFetcher}
            queryKey="members-list"
            refreshTrigger={refreshTrigger + refreshKey}
            onAdd={() => navigate('/members/add')}
            addPermission={PERMISSIONS.MEMBER_CREATE}
            onRowClick={(row) => navigate(`/members/${row.id}`)}
            filtersWidget={
              <MainCard sx={{ p: 1.5, mb: 1, bgcolor: alpha(theme.palette.primary.main, 0.01) }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>جهة العمل</InputLabel>
                    <Select
                      value={filters.organizationId}
                      onChange={handleFilterChange('organizationId')}
                      label="جهة العمل"
                    >
                      <MenuItem value=""><em>الكل</em></MenuItem>
                      {Array.isArray(employers) && employers.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id}>{emp.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>النوع</InputLabel>
                    <Select
                      value={filters.type}
                      onChange={handleFilterChange('type')}
                      label="النوع"
                    >
                      <MenuItem value=""><em>الكل</em></MenuItem>
                      <MenuItem value={MEMBER_TYPES.PRINCIPAL}>رئيسي</MenuItem>
                      <MenuItem value={MEMBER_TYPES.DEPENDENT}>تابع</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>الحالة</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={handleFilterChange('status')}
                      label="الحالة"
                    >
                      <MenuItem value=""><em>الكل</em></MenuItem>
                      <MenuItem value={MEMBER_STATUSES.ACTIVE}>نشط</MenuItem>
                      <MenuItem value={MEMBER_STATUSES.SUSPENDED}>معلق</MenuItem>
                      <MenuItem value={MEMBER_STATUSES.TERMINATED}>منتهي</MenuItem>
                    </Select>
                  </FormControl>

                  <Tooltip title="إعادة تعيين">
                    <IconButton onClick={handleResetFilters}>
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="تحديث">
                    <IconButton onClick={triggerLocalRefresh} color="primary">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </MainCard>
            }
          />
        </Stack>

        {/* Dialogs & Wizards */}
        <Dialog open={confirmDialog.open} onClose={closeDialog}>
          <DialogTitle sx={{ fontWeight: 700 }}>{confirmDialog.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirmDialog.content}</DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeDialog} color="inherit">إلغاء</Button>
            <Button
              onClick={confirmDialog.onConfirm}
              variant="contained"
              color={confirmDialog.severity === 'error' ? 'error' : 'primary'}
            >
              موافق
            </Button>
          </DialogActions>
        </Dialog>

        {exportWizardOpen && (
          <DataExportWizard
            open={exportWizardOpen}
            onClose={() => setExportWizardOpen(false)}
            onExport={performExport}
            title="تصدير بيانات المستفيدين"
            fileName="members_export.xlsx"
            params={{
              organizationId: filters.organizationId || undefined,
              status: filters.status || undefined,
              type: filters.type || undefined,
              deleted: showDeleted
            }}
          />
        )}
      </Box>
    </RBACGuard>
  );
};

export default UnifiedMembersList;
