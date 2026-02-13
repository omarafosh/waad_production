import { useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Stack,
    Chip,
    Avatar,
    Divider
} from '@mui/material';
import {
    AccountBalanceWallet as WalletIcon,
    MonetizationOn as MoneyIcon,
    TrendingUp as TrendIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import { settlementService } from 'services/api';
import useFetch from 'hooks/useFetch';

// ==============================|| PROVIDER ACCOUNTS - UNIFIED DASHBOARD ||============================== //

const ProviderAccountsList = () => {
    // 1. Table State (Default sort by Balance DESC for logical order)
    const tableState = useTableState({
        initialPageSize: 10,
        defaultSort: { field: 'balance', direction: 'desc' }
    });

    // 2. Data Fetching
    const { data, loading: isLoading } = useFetch(
        () => settlementService.getProviderAccounts({
            page: tableState.page + 1,
            size: tableState.pageSize,
            search: tableState.search || '',
            sortBy: tableState.sorting.length > 0 ? tableState.sorting[0].id : 'balance',
            sortDir: tableState.sorting.length > 0 ? (tableState.sorting[0].desc ? 'DESC' : 'ASC') : 'DESC'
        }),
        [tableState.page, tableState.pageSize, tableState.sorting, tableState.search]
    );

    // 3. Columns Definition
    const columns = useMemo(() => [
        {
            accessorKey: 'providerName',
            header: 'مقدم الخدمة',
            size: 220,
            cell: ({ getValue }) => (
                <Typography variant="subtitle2" fontWeight="bold">
                    {getValue()}
                </Typography>
            )
        },
        {
            accessorKey: 'balance',
            header: 'الرصيد المستحق',
            size: 160,
            enableSorting: true,
            cell: ({ getValue }) => {
                const amount = getValue() || 0;
                return (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold" color={amount > 0 ? 'error.main' : 'success.main'}>
                            {amount.toLocaleString()} د.ل
                        </Typography>
                        {amount > 50000 && (
                            <Chip label="مرتفع" color="error" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                    </Stack>
                );
            }
        },
        {
            accessorKey: 'totalPaid',
            header: 'إجمالي المدفوعات',
            size: 160,
            enableSorting: true,
            cell: ({ getValue }) => (
                <Typography color="text.secondary">
                    {getValue()?.toLocaleString()} د.ل
                </Typography>
            )
        },
        {
            accessorKey: 'lastTransactionDate',
            header: 'آخر حركة مالية',
            size: 150,
            enableSorting: true,
            cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString('ar-LY') : '-'
        },
        {
            accessorKey: 'status',
            header: 'الحالة',
            size: 100,
            cell: ({ row }) => {
                const balance = row.original.balance || 0;
                return (
                    <Chip
                        label={balance > 0 ? 'مدين' : 'خالص'}
                        color={balance > 0 ? 'warning' : 'success'}
                        size="small"
                        variant="soft"
                    />
                );
            }
        }
    ], []);

    // 4. Calculate Summary Metrics (Client-side estimation from current page for demo, ideally backend)
    const totalBalance = data?.items?.reduce((sum, item) => sum + (item.balance || 0), 0) || 0;
    const totalPaid = data?.items?.reduce((sum, item) => sum + (item.totalPaid || 0), 0) || 0;

    return (
        <Grid container spacing={3}>
            {/* Unified View: Summary Cards specific to this context */}
            <Grid item xs={12}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6} lg={4}>
                        <Card sx={{ bgcolor: 'secondary.lighter', border: '1px solid', borderColor: 'secondary.200' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack spacing={1}>
                                        <Typography variant="h5" color="text.secondary">إجمالي الديون المستحقة</Typography>
                                        <Typography variant="h3" fontWeight="bold">
                                            {totalBalance.toLocaleString()} <Typography component="span" variant="h5" color="text.secondary">د.ل</Typography>
                                        </Typography>
                                    </Stack>
                                    <Avatar sx={{ bgcolor: 'error.lighter', color: 'error.main', width: 56, height: 56 }}>
                                        <WalletIcon fontSize="large" />
                                    </Avatar>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <Card sx={{ bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.200' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack spacing={1}>
                                        <Typography variant="h5" color="text.secondary">إجمالي المدفوعات (للصفحة)</Typography>
                                        <Typography variant="h3" fontWeight="bold">
                                            {totalPaid.toLocaleString()} <Typography component="span" variant="h5" color="text.secondary">د.ل</Typography>
                                        </Typography>
                                    </Stack>
                                    <Avatar sx={{ bgcolor: 'primary.main', color: 'white', width: 56, height: 56 }}>
                                        <MoneyIcon fontSize="large" />
                                    </Avatar>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={12} lg={4}>
                        <Card sx={{ bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.200' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack spacing={1}>
                                        <Typography variant="h5" color="text.secondary">عدد مقدمي الخدمة</Typography>
                                        <Typography variant="h3" fontWeight="bold">
                                            {data?.total || 0} <Typography component="span" variant="h5" color="text.secondary">مؤسسة</Typography>
                                        </Typography>
                                    </Stack>
                                    <Avatar sx={{ bgcolor: 'success.dark', color: 'white', width: 56, height: 56 }}>
                                        <TrendIcon fontSize="large" />
                                    </Avatar>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Grid>

            {/* Main Table Section */}
            <Grid item xs={12}>
                <MainCard
                    title={
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <ReceiptIcon color="primary" />
                            <Typography variant="h4">سجل الحسابات المالية</Typography>
                            {isLoading && <Chip label="جاري التحديث..." color="primary" size="small" variant="outlined" />}
                        </Stack>
                    }
                    content={false}
                >
                    <GenericDataTable
                        data={data?.items || []}
                        columns={columns}
                        totalCount={data?.total || 0}
                        tableState={tableState}
                        isLoading={isLoading}
                        emptyMessage="لا توجد بيانات مالية لعرضها حالياً"
                    />
                </MainCard>
            </Grid>
        </Grid>
    );
};

export default ProviderAccountsList;
