import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    Stack,
    Typography,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Receipt as ReceiptIcon,
    Payment as PaymentIcon,
    Cancel as CancelIcon,
    CheckCircle as ConfirmIcon,
    Event as DateIcon,
    AttachMoney as MoneyIcon,
    ConfirmationNumber as RefIcon,
    Description as NoteIcon,
    Person as ProviderIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useSnackbar } from 'notistack';

import { ModernPageHeader } from 'components/tba';
import MainCard from 'components/MainCard';
import GenericDataTable from 'components/GenericDataTable';
import useFetch from 'hooks/useFetch';
import useTableState from 'hooks/useTableState';
import { settlementService } from 'services/api';
import { CardStatusBadge } from 'components/insurance';

const SettlementBatchView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    // Dialog States
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Action Form States
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    // Fetch Batch Details
    const { data: batch, loading: isLoading, refetch } = useFetch(
        () => settlementService.getBatchById(id),
        [id]
    );

    // Table State (Client-side pagination for batch items usually, but we'll use standard hook)
    const tableState = useTableState({ initialPageSize: 10 });

    // ----------------------------------------------------------------------
    // Actions
    // ----------------------------------------------------------------------

    const handleConfirmBatch = async () => {
        if (!window.confirm('هل أنت متأكد من تأكيد هذه الدفعة؟ لا يمكن إضافة مطالبات جديدة بعد التأكيد.')) return;

        setActionLoading(true);
        try {
            await settlementService.confirmBatch(id);
            enqueueSnackbar('تم تأكيد الدفعة بنجاح', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar(error.message || 'فشل تأكيد الدفعة', { variant: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayBatch = async () => {
        if (!paymentReference) {
            enqueueSnackbar('يرجى إدخال مرجع الدفع', { variant: 'warning' });
            return;
        }

        setActionLoading(true);
        try {
            await settlementService.payBatch(id, {
                paymentReference,
                notes: paymentNotes
            });
            enqueueSnackbar('تم تسجيل الدفع بنجاح', { variant: 'success' });
            setPayDialogOpen(false);
            refetch();
        } catch (error) {
            enqueueSnackbar(error.message || 'فشل عملية الدفع', { variant: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelBatch = async () => {
        if (!cancelReason) {
            enqueueSnackbar('يرجى كتابة سبب الإلغاء', { variant: 'warning' });
            return;
        }

        setActionLoading(true);
        try {
            await settlementService.cancelBatch(id, cancelReason);
            enqueueSnackbar('تم إلغاء الدفعة', { variant: 'success' });
            setCancelDialogOpen(false);
            refetch();
        } catch (error) {
            enqueueSnackbar(error.message || 'فشل إلغاء الدفعة', { variant: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // ----------------------------------------------------------------------
    // Constants & Columns
    // ----------------------------------------------------------------------

    const columns = useMemo(() => [
        {
            accessorKey: 'claimNumber',
            header: 'رقم المطالبة',
            cell: ({ row }) => (
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight="bold">
                        {row.original.claimNumber || `#${row.original.claimId}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        ({new Date(row.original.serviceDate).toLocaleDateString('ar-SA')})
                    </Typography>
                </Stack>
            )
        },
        {
            accessorKey: 'patientName',
            header: 'المريض',
            cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
        },
        {
            accessorKey: 'netAmount',
            header: 'المبلغ المستحق',
            cell: ({ getValue }) => (
                <Typography color="success.main" fontWeight="bold">
                    {getValue()?.toLocaleString()} د.ل
                </Typography>
            )
        },
        {
            accessorKey: 'patientShare',
            header: 'تحمل المريض',
            cell: ({ getValue }) => (
                <Typography color="text.secondary">
                    {getValue()?.toLocaleString()} د.ل
                </Typography>
            )
        },
    ], []);

    // ----------------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------------

    if (isLoading) {
        return (
            <MainCard>
                <Box display="flex" justifyContent="center" p={5}>
                    <CircularProgress />
                </Box>
            </MainCard>
        );
    }

    if (!batch) {
        return (
            <MainCard>
                <Alert severity="error">الدفعة غير موجودة</Alert>
            </MainCard>
        );
    }

    return (
        <Box>
            {/* Header */}
            <ModernPageHeader
                title={`دفعة تسوية #${batch.id}`}
                subtitle={`تاريخ الإنشاء: ${new Date(batch.createdAt).toLocaleDateString('ar-SA')}`}
                icon={<ReceiptIcon />}
                actions={
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
                            عودة
                        </Button>
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => enqueueSnackbar('تم تحميل ملف التصدير', { variant: 'info' })}>
                            تصدير التفاصيل
                        </Button>
                    </Stack>
                }
            />

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                                    <ProviderIcon color="primary" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">مقدم الخدمة</Typography>
                                    <Typography variant="h6">{batch.providerName}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2 }}>
                                    <MoneyIcon color="success" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">إجمالي المبلغ المستحق</Typography>
                                    <Typography variant="h6" color="success.main">
                                        {batch.totalNetAmount?.toLocaleString()} د.ل
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                                    <RefIcon color="warning" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">حالة الدفعة</Typography>
                                    <Box mt={0.5}>
                                        <CardStatusBadge status={batch.status} label={batch.statusArabic} />
                                    </Box>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content Actions */}
            <MainCard
                title={`المطالبات المشمولة (${batch.claims?.length || 0})`}
                secondary={
                    <Stack direction="row" spacing={1}>
                        {batch.status === 'OPEN' && (
                            <LoadingButton
                                variant="contained"
                                color="success"
                                startIcon={<ConfirmIcon />}
                                onClick={handleConfirmBatch}
                                loading={actionLoading}
                            >
                                تأكيد الدفعة
                            </LoadingButton>
                        )}
                        {batch.status === 'PENDING_PAYMENT' && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<PaymentIcon />}
                                onClick={() => setPayDialogOpen(true)}
                            >
                                تسجيل الدفع
                            </Button>
                        )}
                        {['OPEN', 'PENDING_PAYMENT'].includes(batch.status) && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => setCancelDialogOpen(true)}
                            >
                                إلغاء الدفعة
                            </Button>
                        )}
                    </Stack>
                }
            >
                {/* Claims Table */}
                <GenericDataTable
                    data={batch.claims || []}
                    columns={columns}
                    tableState={tableState}
                    isLoading={isLoading}
                    emptyMessage="لا توجد مطالبات في هذه الدفعة"
                />
            </MainCard>

            {/* Pay Dialog */}
            <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>تسجيل دفع الدفعة</DialogTitle>
                <DialogContent>
                    <Box pt={1} component="form" display="flex" flexDirection="column" gap={2}>
                        <Alert severity="info">
                            سيتم تسجيل الدفعة كمدفوعة بالكامل وإشعار مقدم الخدمة.
                        </Alert>
                        <TextField
                            label="مرجع الدفع (رقم الحوالة / الشيك)"
                            fullWidth
                            required
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                        />
                        <TextField
                            label="ملاحظات"
                            fullWidth
                            multiline
                            rows={3}
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayDialogOpen(false)}>إلغاء</Button>
                    <LoadingButton
                        onClick={handlePayBatch}
                        variant="contained"
                        color="primary"
                        loading={actionLoading}
                    >
                        تأكيد الدفع
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إلغاء الدفعة</DialogTitle>
                <DialogContent>
                    <Box pt={1} component="form" display="flex" flexDirection="column" gap={2}>
                        <Alert severity="warning">
                            عند الإلغاء، ستعود جميع المطالبات المشمولة إلى حالة "جاهزة للتسوية" ويمكن إدراجها في دفعات أخرى.
                        </Alert>
                        <TextField
                            label="سبب الإلغاء"
                            fullWidth
                            required
                            multiline
                            rows={3}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialogOpen(false)}>تراجع</Button>
                    <LoadingButton
                        onClick={handleCancelBatch}
                        variant="contained"
                        color="error"
                        loading={actionLoading}
                    >
                        تأكيد الإلغاء
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SettlementBatchView;
