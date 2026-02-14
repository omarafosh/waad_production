import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    Chip,
    Breadcrumbs as MuiBreadcrumbs,
    Link,
    TextField,
    InputAdornment
} from '@mui/material';

// Icons
import {
    Add as AddIcon,
    FileDownload as ExportIcon,
    FileUpload as ImportIcon,
    Delete as DeleteIcon,
    Description as TemplateIcon,
    Refresh as RefreshIcon,
    Home as HomeIcon,
    Search as SearchIcon,
    LocalHospital as ProviderIcon,
    Visibility as ViewIcon,
    Edit as EditIcon
} from '@mui/icons-material';

// Components
import { UnifiedTableLayout, GenericDataTable, RBACGuard } from 'components/tba';
import { useTableState } from 'hooks/useTableState';
import { CardStatusBadge, NetworkBadge } from 'components/insurance';

// Services
import { providersService } from 'services/api';
import { openSnackbar } from 'api/snackbar';

const QUERY_KEY = 'providers';

// --- Helper Functions ---
const getNetworkTier = (provider) => {
    if (provider?.networkStatus) return provider.networkStatus;
    if (provider?.inNetwork === true) return 'IN_NETWORK';
    if (provider?.contracted === true) return 'IN_NETWORK';
    return 'STANDARD';
};

const getProviderStatus = (provider) => {
    if (provider?.status) return provider.status;
    if (provider?.active === true) return 'ACTIVE';
    return 'INACTIVE';
};

const ProvidersListUnified = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Table State
    const tableState = useTableState({
        initialPageSize: 10,
        defaultSort: { field: 'id', direction: 'desc' }
    });

    const { page, pageSize, sorting } = tableState;
    const sortColumn = sorting?.[0]?.id || 'id';
    const sortDirection = sorting?.[0]?.desc ? 'desc' : 'asc';

    // Data Fetching
    const { data, isLoading, refetch } = useQuery({
        queryKey: [QUERY_KEY, page, pageSize, sortColumn, sortDirection],
        queryFn: async () => {
            const params = {
                page: page + 1,
                size: pageSize,
                sort: `${sortColumn},${sortDirection}`
            };
            return await providersService.getAll(params);
        }
    });

    const providers = data?.content || [];
    const totalCount = data?.totalElements || 0;

    // Handlers
    const handleNavigateAdd = () => navigate('/providers/add');
    const handleNavigateView = (id) => navigate(`/providers/${id}`);
    const handleNavigateEdit = (id) => navigate(`/providers/edit/${id}`);

    // Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'name',
            header: 'اسم مقدم الخدمة',
            size: 250,
            cell: ({ row }) => <Typography variant="body2" fontWeight={600}>{row.original.name}</Typography>
        },
        {
            accessorKey: 'id',
            header: 'كود المزود',
            size: 100,
        },
        {
            accessorKey: 'city',
            header: 'المدينة',
            size: 120
        },
        {
            id: 'network',
            header: 'الشبكة',
            size: 120,
            cell: ({ row }) => (
                <NetworkBadge
                    networkTier={getNetworkTier(row.original)}
                    showLabel={true}
                    size="small"
                    language="ar"
                />
            )
        },
        {
            id: 'status',
            header: 'الحالة',
            size: 100,
            cell: ({ row }) => (
                <CardStatusBadge
                    status={getProviderStatus(row.original)}
                    language="ar"
                    size="small"
                />
            )
        },
        {
            id: 'actions',
            header: 'الإجراءات',
            size: 120,
            cell: ({ row }) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original.id)}>
                        <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original.id)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Stack>
            )
        }
    ], []);

    // --- Layout Elements ---

    const breadcrumbs = (
        <MuiBreadcrumbs aria-label="breadcrumb">
            <Link underline="hover" color="inherit" onClick={() => navigate('/')} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                الرئيسية
            </Link>
            <Typography color="text.primary">مقدمي الخدمة</Typography>
        </MuiBreadcrumbs>
    );

    const actions = (
        <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<TemplateIcon />} color="secondary">
                تحميل قالب
            </Button>
            <Button variant="outlined" size="small" startIcon={<ImportIcon />} color="info">
                استيراد اكسل
            </Button>
            <Button variant="outlined" size="small" startIcon={<ExportIcon />} color="success">
                تصدير اكسل
            </Button>
            <Button variant="outlined" size="small" startIcon={<DeleteIcon />} color="error">
                المحذوفات
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleNavigateAdd}>
                إضافة مزود
            </Button>
        </Stack>
    );

    const filters = (
        <Stack direction="row" spacing={2} alignItems="center">
            <TextField
                size="small"
                placeholder="بحث باسم المزود أو الكود..."
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    )
                }}
                sx={{ width: 300 }}
            />
            <TextField select size="small" label="التصنيف" sx={{ width: 150 }} SelectProps={{ native: true }}>
                <option value="">الكل</option>
                <option value="HOSPITAL">مستشفى</option>
                <option value="CLINIC">عيادة</option>
            </TextField>
            <IconButton onClick={() => refetch()} size="small" color="primary">
                <RefreshIcon />
            </IconButton>
        </Stack>
    );

    return (
        <UnifiedTableLayout
            breadcrumbs={breadcrumbs}
            actions={actions}
            filters={filters}
        >
            <GenericDataTable
                columns={columns}
                data={providers}
                totalCount={totalCount}
                isLoading={isLoading}
                tableState={tableState}
                emptyMessage="لا يوجد مقدمي خدمات"
                stickyHeader
            />
        </UnifiedTableLayout>
    );
};

export default ProvidersListUnified;
