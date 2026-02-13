import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Chip,
    IconButton,
    Tooltip,
    Stack,
    Card,
    CardContent,
    Typography,
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    Visibility as ViewIcon,
    ReceiptLong as BatchIcon,
    AccountBalanceWallet as PaymentIcon,
    CheckCircle as PaidIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import { settlementService } from 'services/api';
import useFetch from 'hooks/useFetch';

import useAuth from 'hooks/useAuth';

/**
 * Settlement Batches List Page
 * 
 * Displays a list of settlement batches with status filtering and management actions.
 */
const SettlementBatchesList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasPermission = (permission) => user?.permissions?.includes(permission) || user?.role === 'ADMIN';


    // Table State
    const tableState = useTableState({
        initialPageSize: 10,
        defaultSort: { field: 'createdAt', direction: 'desc' }
    });

    // API Hook
    const { data, loading: isLoading, refetch: reload } = useFetch(
        () => settlementService.getBatches({
            page: tableState.page + 1,
            size: tableState.pageSize,
            sortBy: tableState.sorting.length > 0 ? tableState.sorting[0].id : 'createdAt',
            sortDir: tableState.sorting.length > 0 ? (tableState.sorting[0].desc ? 'DESC' : 'ASC') : 'DESC',
            search: ''
        }),
        [tableState.page, tableState.pageSize, tableState.sorting]
    );

    // Columns Configuration
    const columns = useMemo(() => [
        { accessorKey: 'id', header: '#', size: 80 },
        { accessorKey: 'batchNumber', header: 'رقم الدفعة', size: 150 },
        { accessorKey: 'providerName', header: 'مقدم الخدمة', size: 200 },
        {
            accessorKey: 'createdAt',
            header: 'تاريخ الإنشاء',
            size: 150,
            cell: ({ getValue }) => new Date(getValue()).toLocaleDateString('ar-SA')
        },
        {
            accessorKey: 'totalClaimsCount',
            header: 'عدد المطالبات',
            size: 130
        },
        {
            accessorKey: 'totalNetAmount',
            header: 'صافي المبلغ',
            size: 150,
            cell: ({ getValue }) => (
                <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                    {getValue()?.toLocaleString()} د.ل
                </Typography>
            )
        },
        {
            accessorKey: 'status',
            header: 'الحالة',
            size: 120,
            cell: ({ row }) => {
                const status = row.original.status;
                const statusMap = {
                    OPEN: { color: 'default', label: 'مفتوحة', icon: <BatchIcon fontSize="small" /> },
                    PENDING_PAYMENT: { color: 'warning', label: 'بانتظار الدفع', icon: <PaymentIcon fontSize="small" /> },
                    PAID: { color: 'success', label: 'مدفوعة', icon: <PaidIcon fontSize="small" /> },
                    CANCELLED: { color: 'error', label: 'ملغاة', icon: <CancelIcon fontSize="small" /> }
                };
                const config = statusMap[status] || statusMap.OPEN;

                return (
                    <Chip
                        label={config.label}
                        color={config.color}
                        size="small"
                        icon={config.icon}
                        variant="outlined"
                    />
                );
            }
        },
        {
            id: 'actions',
            header: 'الإجراءات',
            size: 120,
            enableSorting: false,
            cell: ({ row }) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="عرض التفاصيل">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/settlement/batches/${row.original.id}`)}
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )
        }
    ], [navigate]);

    return (
        <Box>
            <ModernPageHeader
                title="دفعات التسوية"
                subtitle="إدارة ومتابعة دفعات التسوية المالية لمقدمي الخدمة"
                icon={<BatchIcon />}
                action={
                    hasPermission('CREATE_SETTLEMENT_BATCH') && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/settlement/batches/create')}
                        >
                            إنشاء دفعة جديدة
                        </Button>
                    )
                }
            />

            {/* Summary Cards (Mocked for now, can be connected to stats API later) */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <CardContent>
                            <Typography variant="h6">إجمالي الدفعات</Typography>
                            <Typography variant="h3">{data?.total || 0}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <MainCard content={false}>
                <GenericDataTable
                    data={data?.items || []}
                    columns={columns}
                    totalCount={data?.total || 0}
                    tableState={tableState}
                    isLoading={isLoading}
                    emptyMessage="لا توجد دفعات تسوية حالياً"
                />
            </MainCard>
        </Box>
    );
};

export default SettlementBatchesList;
