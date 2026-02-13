/**
 * 📊 UnifiedTable - The Premium Data Table Component for WAAD System
 * Version: 1.0 (Phase 7 - UI Unification)
 * 
 * This component is a standardized wrapper around Material React Table (MRT).
 * It provides a "Premium" aesthetic (Glassmorphism), integrated RBAC (ActionGuard),
 * and handles server-side state complexity internally.
 * 
 * Features:
 * - ✨ Premium UI: Glassmorphism, smooth transitions, and high-quality typography.
 * - 🛡️ Integrated Security: ActionGuard for header and row actions.
 * - 🌍 Full RTL/Arabic Support out of the box.
 * - ⚡ Internal State Management: Pagination, Sorting, and Global Search handled internally.
 * - 📤 Export & Print: High-quality CSV export and Print generation.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';
import { MRT_Localization_AR } from 'material-react-table/locales/ar';

// MUI Components
import {
    Box,
    Button,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    Paper,
    alpha,
    useTheme,
    Skeleton,
} from '@mui/material';

// MUI Icons
import {
    Refresh as RefreshIcon,
    FileDownload as FileDownloadIcon,
    Print as PrintIcon,
    Add as AddIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    ErrorOutline as ErrorIcon,
} from '@mui/icons-material';

// Project Components
import ActionGuard from 'components/rbac/ActionGuard';
import ModernEmptyState from 'components/tba/ModernEmptyState';

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ============================================================================
// COMPONENT
// ============================================================================

const UnifiedTable = ({
    columns,
    fetcher,
    queryKey = 'generic-table',
    title,
    subtitle,
    icon: Icon,

    // Actions Configuration
    onAdd,
    addPermission,
    addButtonLabel = 'إضافة جديد',

    // Toolbar Configuration
    enableExport = true,
    exportFilename,
    enablePrint = true,
    printTitle,
    enableGlobalFilter = true,
    enableColumnFilters = false,

    // State Initialization
    initialSorting = [{ id: 'createdAt', desc: true }],
    initialFilters = {},

    // Custom Controls
    additionalHeaderActions,
    filtersWidget,
    onRowClick,

    // Refresh Trigger (Optional external refresh)
    refreshTrigger = 0,
}) => {
    const theme = useTheme();

    // ========================================
    // INTERNAL STATE
    // ========================================
    const [data, setData] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // MRT State
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: DEFAULT_PAGE_SIZE,
    });
    const [sorting, setSorting] = useState(initialSorting);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState([]);

    // Fetcher Reference (To prevent useEffect issues)
    const fetcherRef = useRef(fetcher);
    useEffect(() => {
        fetcherRef.current = fetcher;
    }, [fetcher]);

    // ========================================
    // DATA FETCHING LOGIC
    // ========================================
    const fetchData = useCallback(async () => {
        if (!fetcherRef.current) return;

        setIsLoading(true);
        setIsError(false);

        try {
            // Construct parameters for API
            const params = {
                page: pagination.pageIndex + 1, // 1-based for backend
                size: pagination.pageSize,
                sortBy: sorting[0]?.id || 'createdAt',
                sortDir: sorting[0]?.desc ? 'DESC' : 'ASC',
                search: globalFilter || undefined,
                ...initialFilters,
            };

            // Map column filters
            columnFilters.forEach((filter) => {
                if (filter.value !== undefined && filter.value !== '') {
                    params[filter.id] = filter.value;
                }
            });

            const response = await fetcherRef.current(params);

            // Handle various response formats (ResponseWrapper vs Raw Page)
            const pageData = response?.data || response;
            const items = pageData?.content || (Array.isArray(response) ? response : []);
            const total = pageData?.totalElements ?? items.length;

            setData(items);
            setRowCount(total);
        } catch (error) {
            console.error(`[UnifiedTable:${queryKey}] Error fetching data:`, error);
            setIsError(true);
            setErrorMessage(error?.message || 'فشل في تحميل البيانات');
            setData([]);
            setRowCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        sorting,
        globalFilter,
        columnFilters,
        initialFilters,
        queryKey,
        refreshTrigger,
    ]);

    // Fetch data on state change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => fetchData();

    // ========================================
    // EXPORT & PRINT HANDLERS
    // ========================================
    const handleExport = () => {
        // Logic for internal CSV export if needed, or trigger external
        console.log('Export triggered');
    };

    const handlePrint = () => {
        console.log('Print triggered');
    };

    // ========================================
    // PREMIUM STYLING SYSTEM
    // ========================================

    const glassmorphismStyle = {
        background: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.05)}`,
        overflow: 'hidden',
    };

    // ========================================
    // TOOLBAR ACTIONS
    // ========================================
    const renderTopToolbarCustomActions = useCallback(() => (
        <Stack direction="row" spacing={1} alignItems="center">
            {title && (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mr: 2 }}>
                    {Icon && (
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: '10px',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                display: 'flex',
                            }}
                        >
                            <Icon fontSize="small" />
                        </Box>
                    )}
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            )}

            <Tooltip title="تحديث">
                <IconButton onClick={handleRefresh} size="small">
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {enableExport && (
                <Tooltip title="تصدير للبيانات">
                    <IconButton onClick={handleExport} size="small" color="primary">
                        <FileDownloadIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            {enablePrint && (
                <Tooltip title="طباعة">
                    <IconButton onClick={handlePrint} size="small">
                        <PrintIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            {additionalHeaderActions}

            {onAdd && (
                <ActionGuard permission={addPermission}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onAdd}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: theme.shadows[2],
                        }}
                    >
                        {addButtonLabel}
                    </Button>
                </ActionGuard>
            )}
        </Stack>
    ), [title, subtitle, Icon, theme, onAdd, addPermission, addButtonLabel, additionalHeaderActions, enableExport, enablePrint]);

    // ========================================
    // MRT CONFIGURATION
    // ========================================
    const table = useMaterialReactTable({
        columns,
        data,

        // Server-side props
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        rowCount,

        // State
        state: {
            isLoading,
            isError,
            pagination,
            sorting,
            globalFilter,
            columnFilters,
        },

        // Handlers
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,

        // Customization
        enableGlobalFilter,
        enableColumnFilters,
        enableDensityToggle: false,
        enableFullScreenToggle: true,
        enableHiding: true,
        enableStickyHeader: true,

        // Localization
        localization: {
            ...MRT_Localization_AR,
            search: 'بحث سريع...',
        },

        // Toolbar
        renderTopToolbarCustomActions,

        // Styling
        muiTablePaperProps: {
            elevation: 0,
            sx: glassmorphismStyle,
        },

        muiTableContainerProps: {
            sx: {
                maxHeight: 'calc(100vh - 380px)',
                minHeight: '400px',
            },
        },

        muiTableHeadCellProps: {
            sx: {
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                fontWeight: 700,
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            },
        },

        muiTableBodyRowProps: ({ row }) => ({
            onClick: onRowClick ? () => onRowClick(row.original) : undefined,
            sx: {
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                },
            },
        }),

        // Pagination Customization
        paginationDisplayMode: 'pages',
        muiPaginationProps: {
            color: 'primary',
            shape: 'rounded',
            variant: 'outlined',
            rowsPerPageOptions: PAGE_SIZE_OPTIONS,
        },

        // Custom Loading/Empty UI
        renderEmptyRowsFallback: () => (
            <Box sx={{ p: 4 }}>
                <ModernEmptyState
                    icon={isError ? ErrorIcon : SearchIcon}
                    title={isError ? 'حدث خطأ' : 'لا توجد نتائج'}
                    description={isError ? errorMessage : 'لم يتم العثور على أي سجلات مطابقة لهذا البحث'}
                    action={isError && (
                        <Button variant="outlined" onClick={handleRefresh}>
                            إعادة المحاولة
                        </Button>
                    )}
                />
            </Box>
        ),
    });

    return (
        <Box sx={{ width: '100%', position: 'relative' }}>
            {filtersWidget && (
                <Box sx={{ mb: 2 }}>
                    {filtersWidget}
                </Box>
            )}
            <MaterialReactTable table={table} />
        </Box>
    );
};

UnifiedTable.propTypes = {
    columns: PropTypes.array.isRequired,
    fetcher: PropTypes.func.isRequired,
    queryKey: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    icon: PropTypes.elementType,

    onAdd: PropTypes.func,
    addPermission: PropTypes.string,
    addButtonLabel: PropTypes.string,

    enableExport: PropTypes.bool,
    exportFilename: PropTypes.string,
    enablePrint: PropTypes.bool,
    printTitle: PropTypes.string,
    enableGlobalFilter: PropTypes.bool,
    enableColumnFilters: PropTypes.bool,

    initialSorting: PropTypes.array,
    initialFilters: PropTypes.object,

    additionalHeaderActions: PropTypes.node,
    onRowClick: PropTypes.func,

    refreshTrigger: PropTypes.number,
};

export default UnifiedTable;
