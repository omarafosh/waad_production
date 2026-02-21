/**
 * Medical Catalog List Page
 * 
 * Part of Phase 2: Medical Master Catalog Implementation.
 * This page focuses on "Master Services" - the standardized catalog.
 */

import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    InputAdornment,

} from '@mui/material';
import TextField from '@mui/material/TextField';

// MUI Icons
// MUI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlayForWorkIcon from '@mui/icons-material/PlayForWork';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import UndoIcon from '@mui/icons-material/Undo';

// Project Components
import MainCard from 'components/MainCard';
import { GenericDataTable, ModernPageHeader, RBACGuard } from 'components/tba';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';
import MappingWizard from './MappingWizard';


// Custom Hooks
import useTableState from 'hooks/useTableState';
import { useAllMedicalCategories } from 'hooks/useMedicalCategories';
import { useSystemSettings } from 'contexts/SystemSettingsContext'; // Changed
import SmartClassificationModal from './SmartClassificationModal';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Services
// Services
import {
    getMedicalServices,
    getMedicalServicesStats,
    uploadMedicalServicesExcel,
    downloadMedicalServicesTemplate,
    deleteMedicalService,
    activateAllMedicalServices, // Used for "Restore" logic if needed
} from 'services/api/medical-services.service';
import { debounce } from 'lodash-es';
import { useEffect } from 'react';

import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const QUERY_KEY = 'medical-catalog';

const MedicalCatalogList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const { enqueueSnackbar } = useSnackbar();
    const { refreshKey } = useTableRefresh();
    const { settings } = useSystemSettings(); // Changed

    // ========================================
    // LOCAL STATE
    // ========================================
    const [statusFilter, setStatusFilter] = useState(null); // active/inactive
    const [showDeleted, setShowDeleted] = useState(false);
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [wizardOpen, setWizardOpen] = useState(false);
    const [reclassifyModal, setReclassifyModal] = useState({ open: false, service: null, newCategoryId: null });

    // Fetch categories for inline dropdown
    const { data: categories } = useAllMedicalCategories();

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'نعم، حذف',
        cancelText: 'إلغاء'
    });

    const tableState = useTableState({
        initialPageSize: 8,
        defaultSort: { field: 'code', direction: 'asc' },
        initialFilters: {},
        storageKey: 'medical_catalog_pageSize'
    });

    // ========================================
    // DATA FETCHING
    // ========================================
    const { data: stats } = useQuery({
        queryKey: ['medical-services-stats', refreshKey],
        queryFn: getMedicalServicesStats
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, statusFilter, showDeleted, tableState.searchTerm, refreshKey],
        queryFn: async () => {
            const params = {
                page: tableState.page,
                size: tableState.pageSize,
                isMaster: true,
                searchTerm: tableState.searchTerm
            };

            if (statusFilter !== null) params.active = statusFilter;
            // Note: If backend supports soft delete, we'd pass showDeleted here. 
            // For now, if active filter is not set, we might rely on the backend's default.

            if (tableState.sorting.length > 0) {
                const sort = tableState.sorting[0];
                params.sortBy = sort.id;
                params.sortDir = sort.desc ? 'DESC' : 'ASC';
            }

            Object.entries(tableState.columnFilters).forEach(([key, value]) => {
                if (value) params[key] = value;
            });

            return await getMedicalServices(params);
        },
        keepPreviousData: true
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

    // ========================================
    // NAVIGATION
    // ========================================
    const handleView = (id) => navigate(`/medical-catalog/${id}`);
    const handleEdit = (id) => navigate(`/medical-catalog/edit/${id}`);
    const handleOpenWizard = () => navigate('/medical-catalog/wizard');
    const handleViewMappings = (id) => navigate(`/medical-catalog/mappings/${id}`);

    // ========================================
    // EXCEL ACTIONS
    // ========================================
    const importMutation = useMutation({
        mutationFn: uploadMedicalServicesExcel,
        onSuccess: (data) => {
            if (data.success) {
                enqueueSnackbar(data.message || 'تم الاستيراد بنجاح', { variant: 'success' });
                queryClient.invalidateQueries([QUERY_KEY]);
                queryClient.invalidateQueries(['medical-services-stats']);
            } else {
                enqueueSnackbar(data.message || 'فشل الاستيراد', { variant: 'error' });
            }
        },
        onError: (error) => {
            enqueueSnackbar(error.message || 'حدث خطأ أثناء الرفع', { variant: 'error' });
        }
    });

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            importMutation.mutate(file);
            event.target.value = ''; // Reset for next time
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await downloadMedicalServicesTemplate();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'medical_services_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            enqueueSnackbar('فشل تحميل القالب', { variant: 'error' });
        }
    };

    const handleExport = () => {
        enqueueSnackbar('جاري تجهيز ملف التصدير...', { variant: 'info' });
        // Implementation for full export will follow
    };

    const handleClearFilters = () => {
        tableState.clearFilters();
        setLocalSearchTerm('');
        setStatusFilter(null);
        setShowDeleted(false);
    };

    const deleteMutation = useMutation({
        mutationFn: deleteMedicalService,
        onSuccess: () => {
            enqueueSnackbar('تم حذف الخدمة بنجاح', { variant: 'success' });
            queryClient.invalidateQueries([QUERY_KEY]);
            queryClient.invalidateQueries(['medical-services-stats']);
            setConfirmDialog(prev => ({ ...prev, open: false }));
        },
        onError: (error) => {
            enqueueSnackbar(error.message || 'فشل حذف الخدمة', { variant: 'error' });
        }
    });

    const handleDelete = (id, code) => {
        setConfirmDialog({
            open: true,
            title: 'تأكيد الحذف',
            message: `هل أنت متأكد من حذف الخدمة [${code}]؟ هذا الإجراء سيقوم بتعطيل الخدمة.`,
            confirmText: 'حذف',
            cancelText: 'إلغاء',
            onConfirm: () => deleteMutation.mutate(id)
        });
    };

    // ========================================
    // STYLES
    // ========================================
    const headerButtonStyle = (type, theme) => {
        const isExcel = type === 'excel';
        const isDelete = type === 'delete';
        const isAdd = type === 'add';
        const isWizard = type === 'wizard';
        const color = isExcel ? theme.palette.success.main : (isDelete ? theme.palette.error.main : theme.palette.primary.main);

        return {
            minWidth: '140px',
            color: color,
            borderColor: color,
            '&:hover': {
                backgroundColor: `${color}10`,
                borderColor: color,
                color: isDelete && showDeleted ? '#fff' : color
            },
            '&.MuiButton-contained': {
                color: '#fff',
                backgroundColor: color,
                '&:hover': {
                    backgroundColor: isAdd || isWizard ? theme.palette.primary.dark : theme.palette.success.dark
                }
            },
            fontWeight: theme.typography.button.fontWeight,
            fontSize: theme.typography.button.fontSize,
            whiteSpace: 'nowrap',
            px: 2,
            height: '38px'
        };
    };

    // ========================================
    // COLUMNS
    // ========================================
    const columns = useMemo(
        () => [
            {
                accessorKey: 'code',
                header: 'كود الفهرس',
                cell: ({ getValue }) => <Typography variant="subtitle2" color="primary">{getValue()}</Typography>
            },
            {
                accessorKey: 'name',
                header: 'الاسم (عربي)',
                minWidth: 200
            },
            {
                accessorKey: 'nameEn',
                header: 'Name (English)',
                minWidth: 200
            },
            {
                id: 'categories',
                header: 'التصنيفات والارتباطات',
                minWidth: 250,
                cell: ({ row }) => {
                    const mappings = row.original.categories || [];
                    if (mappings.length === 0) {
                        return <Typography variant="caption" color="error">غير مصنف</Typography>;
                    }
                    return (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {mappings.map((m, idx) => (
                                <Tooltip key={idx} title={`Context: ${m.context}`}>
                                    <Chip
                                        label={m.categoryName}
                                        size="small"
                                        variant={m.primary ? "filled" : "outlined"}
                                        color={m.primary ? "primary" : "secondary"}
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: '20px',
                                            '& .MuiChip-label': { px: 1 }
                                        }}
                                    />
                                </Tooltip>
                            ))}
                        </Stack>
                    );
                }
            },
            {
                accessorKey: 'active',
                header: 'الحالة',
                cell: ({ getValue }) => (
                    <Chip
                        label={getValue() ? 'نشط' : 'غير نشط'}
                        color={getValue() ? 'success' : 'default'}
                        size="small"
                        variant="light"
                    />
                )
            },
            {
                id: 'actions',
                header: 'الإجراءات',
                align: 'center',
                cell: ({ row }) => (
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="عرض التفاصيل">
                            <IconButton size="small" color="primary" onClick={() => handleView(row.original.id)}>
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                            <IconButton size="small" color="info" onClick={() => handleEdit(row.original.id)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="روابط المزودين">
                            <IconButton size="small" color="primary" onClick={() => handleViewMappings(row.original.id)}>
                                <AccountTreeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <PermissionGuard requires="MANAGE_TAXONOMY">
                            <Tooltip title="حذف">
                                <IconButton size="small" color="error" onClick={() => handleDelete(row.original.id, row.original.code)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </PermissionGuard>
                    </Stack>
                )
            }
        ],
        []
    );

    return (
        <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ModernPageHeader
                title="القاموس الطبي الموحد"
                subtitle="المرجع الوطني للترميز الطبي وقواعد تصنيف الخدمات"
                icon={MedicalServicesIcon}
                breadcrumbs={[{ label: 'الفهرس الطبي الموحد' }]}
                actions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <PermissionGuard requires="MANAGE_TAXONOMY">
                            {/* Template & Excel Group */}
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleDownloadTemplate}
                                startIcon={<FileDownloadIcon />}
                                sx={{ borderColor: 'divider', fontWeight: 600 }}
                            >
                                تحميل القالب (.xlsx)
                            </Button>

                            <Tooltip title="استيراد التعديلات من ملف إكسل">
                                <Box component="span">
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<FileUploadIcon />}
                                        onClick={handleImportClick}
                                        disabled={importMutation.isLoading}
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {importMutation.isLoading ? 'جاري الاستيراد...' : 'تحديث من إكسل'}
                                    </Button>
                                </Box>
                            </Tooltip>

                            <Button
                                variant="contained"
                                startIcon={<AutoFixHighIcon />}
                                onClick={handleOpenWizard}
                                sx={(theme) => headerButtonStyle('wizard', theme)}
                            >
                                معالج الربط الذكي
                            </Button>

                            {/* View/Action Group */}
                            <Button
                                variant={showDeleted ? 'contained' : 'outlined'}
                                startIcon={showDeleted ? <VisibilityIcon /> : <DeleteIcon />}
                                onClick={() => setShowDeleted(!showDeleted)}
                                sx={(theme) => ({
                                    ...headerButtonStyle('delete', theme),
                                    backgroundColor: showDeleted ? theme.palette.error.main : 'transparent',
                                    color: showDeleted ? theme.palette.error.contrastText : theme.palette.error.main,
                                    '&:hover': {
                                        backgroundColor: showDeleted ? theme.palette.error.dark : `${theme.palette.error.main}10`,
                                        color: showDeleted ? theme.palette.error.contrastText : theme.palette.error.main,
                                    }
                                })}
                            >
                                {showDeleted ? 'العودة للقائمة النشطة' : 'المحذوفات'}
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/medical-catalog/create')}
                                sx={(theme) => headerButtonStyle('add', theme)}
                            >
                                إضافة خدمة جديدة
                            </Button>
                        </PermissionGuard>
                    </Stack>
                }
                sx={{ mb: 0.5 }}
            />

            <Stack spacing={0.5} sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                <MainCard sx={{ p: 1, flexShrink: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        {/* Search Bar - First Element (Right in RTL) */}
                        <TextField
                            size="small"
                            placeholder="بحث السريع (كود أو اسم)..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            sx={{ minWidth: 200, flexGrow: 1 }}
                            InputProps={{
                                sx: { fontSize: '1rem', height: 36 },
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: localSearchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setLocalSearchTerm('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        {/* Filters */}
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                                value={statusFilter === null ? 'all' : statusFilter ? 'active' : 'inactive'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setStatusFilter(val === 'all' ? null : val === 'active');
                                    tableState.setPage(0);
                                }}
                                displayEmpty
                                sx={{ height: 36, fontSize: '0.9rem' }}
                            >
                                <MenuItem value="all">كل الحالات</MenuItem>
                                <MenuItem value="active">نشط</MenuItem>
                                <MenuItem value="inactive">غير نشط</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Actions: Refresh & Reset */}
                        <Tooltip title="تحديث">
                            <IconButton onClick={() => refetch()} size="small" color="primary">
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="إعادة تعيين">
                            <IconButton onClick={handleClearFilters} size="small">
                                <UndoIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </MainCard>

                <MainCard content={false} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
                        <TableErrorBoundary>
                            <GenericDataTable
                                columns={columns}
                                data={data?.content || data?.items || []}
                                totalCount={data?.totalElements || data?.total || 0}
                                isLoading={isLoading}
                                tableState={tableState}
                                enableFiltering={false}
                                stickyHeader={true}
                                cellPadding="dense"
                                onRowClick={(row) => handleView(row.id)}
                                rowsPerPageOptions={[10, 20, 50, 100]}
                                emptyMessage="لا توجد خدمات مرجعية في الفهرس"
                                fontSize={settings.fontSize}
                            />
                        </TableErrorBoundary>
                    </Box>
                </MainCard>
            </Stack>

            {/* Confirm Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmDialog.message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} color="inherit">
                        إلغاء
                    </Button>
                    <Button
                        onClick={confirmDialog.onConfirm}
                        color="error"
                        variant="contained"
                        disabled={deleteMutation.isLoading}
                    >
                        تأكيد
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mapping Wizard Modal */}
            <Dialog
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ m: 0, p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoFixHighIcon fontSize="small" />
                    معالج الربط الذكي
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <MappingWizard />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWizardOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Smart Reclassification Modal */}
            <SmartClassificationModal
                open={reclassifyModal.open}
                onClose={() => setReclassifyModal({ ...reclassifyModal, open: false })}
                service={reclassifyModal.service}
                categories={categories}
                initialNewCategoryId={reclassifyModal.newCategoryId}
                onSuccess={() => {
                    refetch();
                }}
            />

            {/* Hidden Input for Excel Import */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
                onChange={handleFileChange}
            />
        </Box>
    );
};

export default MedicalCatalogList;
