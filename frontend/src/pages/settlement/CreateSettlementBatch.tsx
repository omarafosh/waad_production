import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Stack,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { settlementService, providersService } from 'services/api';
import { useSnackbar } from 'notistack';

const CreateSettlementBatch = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    // Form State
    const [providerId, setProviderId] = useState('');
    const [batchName, setBatchName] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedClaims, setSelectedClaims] = useState([]);

    // Data State
    const [providers, setProviders] = useState([]);
    const [availableClaims, setAvailableClaims] = useState([]);

    // Loading State
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Load Providers
    useEffect(() => {
        const fetchProviders = async () => {
            setLoadingProviders(true);
            try {
                // Fetch all providers (might need pagination handling if list is huge)
                const response = await providersService.getAll({ size: 100 });
                setProviders(response.items || []);
            } catch (err) {
                console.error(err);
                enqueueSnackbar('فشل في تحميل قائمة مقدمي الخدمة', { variant: 'error' });
            } finally {
                setLoadingProviders(false);
            }
        };
        fetchProviders();
    }, [enqueueSnackbar]);

    // Load Available Claims when Provider changes
    useEffect(() => {
        if (!providerId) {
            setAvailableClaims([]);
            setSelectedClaims([]);
            return;
        }

        const fetchClaims = async () => {
            setLoadingClaims(true);
            try {
                const claims = await settlementService.getAvailableClaims(providerId);
                setAvailableClaims(claims || []);
            } catch (err) {
                console.error(err);
                enqueueSnackbar('فشل في تحميل المطالبت المستحقة', { variant: 'error' });
            } finally {
                setLoadingClaims(false);
            }
        };
        fetchClaims();
    }, [providerId, enqueueSnackbar]);

    // Handlers
    const handleToggleClaim = (claimId) => {
        if (selectedClaims.includes(claimId)) {
            setSelectedClaims(selectedClaims.filter(id => id !== claimId));
        } else {
            setSelectedClaims([...selectedClaims, claimId]);
        }
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedClaims(availableClaims.map(c => c.id));
        } else {
            setSelectedClaims([]);
        }
    };

    const handleSubmit = async () => {
        if (!providerId || selectedClaims.length === 0) {
            enqueueSnackbar('يرجى اختيار مقدم الخدمة وتحديد مطالبات للدفع', { variant: 'warning' });
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await settlementService.createBatch({
                providerId,
                name: batchName,
                notes,
                claimIds: selectedClaims
            });
            enqueueSnackbar('تم إنشاء دفعة التسوية بنجاح', { variant: 'success' });
            navigate('/settlement/batches');
        } catch (err) {
            console.error(err);
            setError(err.message || 'فشل في إنشاء الدفعة');
        } finally {
            setSaving(false);
        }
    };

    // Calculations
    const totalSelectedAmount = availableClaims
        .filter(c => selectedClaims.includes(c.id))
        .reduce((sum, c) => sum + (c.netProviderAmount || 0), 0);

    return (
        <Box>
            <ModernPageHeader
                title="إنشاء دفعة تسوية جديدة"
                subtitle="تجميع المطالبات المستحقة في دفعة واحدة"
                icon={<SaveIcon />}
                action={
                    <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
                        رجوع
                    </Button>
                }
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Form Section */}
                <Grid item xs={12} md={4}>
                    <MainCard title="بيانات الدفعة">
                        <Stack spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>مقدم الخدمة</InputLabel>
                                <Select
                                    value={providerId}
                                    label="مقدم الخدمة"
                                    onChange={(e) => setProviderId(e.target.value)}
                                    disabled={loadingProviders}
                                >
                                    {providers.map(provider => (
                                        <MenuItem key={provider.id} value={provider.id}>
                                            {provider.nameAr}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="اسم الدفعة (اختياري)"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                size="small"
                            />

                            <TextField
                                fullWidth
                                label="ملاحظات"
                                multiline
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />

                            <Card variant="outlined" sx={{ bgcolor: 'secondary.lighter' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="textSecondary">إجمالي المحدد</Typography>
                                    <Typography variant="h4" color="primary.main">
                                        {totalSelectedAmount.toLocaleString()} د.ل
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        {selectedClaims.length} مطالبة
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                startIcon={<SaveIcon />}
                                onClick={handleSubmit}
                                disabled={saving || selectedClaims.length === 0}
                            >
                                {saving ? 'جارِ الحفظ...' : 'إنشاء الدفعة'}
                            </Button>
                        </Stack>
                    </MainCard>
                </Grid>

                {/* Claims Table Section */}
                <Grid item xs={12} md={8}>
                    <MainCard title="المطالبات المستحقة" content={false}>
                        {loadingClaims ? (
                            <Box sx={{ p: 5, textAlign: 'center' }}>
                                <CircularProgress />
                            </Box>
                        ) : availableClaims.length === 0 ? (
                            <Box sx={{ p: 5, textAlign: 'center' }}>
                                <Typography color="textSecondary">
                                    {providerId ? 'لا توجد مطالبات مستحقة لهذا المقدم' : 'يرجى اختيار مقدم الخدمة لعرض المطالبات'}
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 600 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    indeterminate={selectedClaims.length > 0 && selectedClaims.length < availableClaims.length}
                                                    checked={availableClaims.length > 0 && selectedClaims.length === availableClaims.length}
                                                    onChange={handleSelectAll}
                                                />
                                            </TableCell>
                                            <TableCell>رقم المطالبة</TableCell>
                                            <TableCell>المنتفع</TableCell>
                                            <TableCell>تاريخ الموافقة</TableCell>
                                            <TableCell align="right">المبلغ المستحق</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {availableClaims.map((claim) => (
                                            <TableRow
                                                key={claim.id}
                                                hover
                                                role="checkbox"
                                                selected={selectedClaims.includes(claim.id)}
                                                onClick={() => handleToggleClaim(claim.id)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox checked={selectedClaims.includes(claim.id)} />
                                                </TableCell>
                                                <TableCell>{claim.claimNumber || claim.id}</TableCell>
                                                <TableCell>{claim.memberFullName}</TableCell>
                                                <TableCell>{new Date(claim.approvedAt).toLocaleDateString()}</TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight="bold">
                                                        {claim.netProviderAmount.toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </MainCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CreateSettlementBatch;
