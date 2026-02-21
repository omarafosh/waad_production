import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

// MUI Components
import {
    Box,
    Button,
    Grid,
    TextField,
    MenuItem,
    Typography,
    Paper,
    Alert,
    Divider,
    Chip,
    Autocomplete,
    InputAdornment,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    FormHelperText,
    Stack
} from '@mui/material';
import {
    ArrowBack,
    Save,
    Description,
    Business,
    DateRange,
    AttachMoney,
    Info,
    Refresh,
    Edit as EditIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';

// Services
import {
    getProviderContractById,
    updateProviderContract
} from 'services/api/provider-contracts.service';
import { getProviderSelector } from 'services/api/providers.service';

const PRICING_MODELS = [
    { value: 'DISCOUNT', label: 'نسبة خصم', description: 'خصم نسبة مئوية من السعر الأصلي', icon: '💰' },
    { value: 'FIXED', label: 'سعر ثابت', description: 'أسعار محددة لكل خدمة', icon: '📌' },
    { value: 'TIERED', label: 'تسعير متدرج', description: 'أسعار متدرجة حسب الكمية', icon: '📊' },
    { value: 'NEGOTIATED', label: 'سعر تفاوضي', description: 'أسعار حسب الاتفاق المسبق', icon: '🤝' }
];

/**
 * Provider Contract Edit Page
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Loads existing contract data
 * ✅ Validates changes in real-time
 * ✅ Unified UI with Create page
 * 
 * @version 1.0.0
 */
const ProviderContractEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    // ──────────────────────────────────────────────────────────────────────
    // STATE
    // ──────────────────────────────────────────────────────────────────────

    const [formData, setFormData] = useState({
        providerId: '',
        contractCode: '',
        startDate: null,
        endDate: null,
        pricingModel: 'DISCOUNT',
        discountRate: 0,
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [selectedProvider, setSelectedProvider] = useState(null);

    // ──────────────────────────────────────────────────────────────────────
    // DATA FETCHING
    // ──────────────────────────────────────────────────────────────────────

    // Fetch contract details
    const { data: contract, isLoading: contractLoading, isError: contractError } = useQuery({
        queryKey: ['provider-contract', id],
        queryFn: () => getProviderContractById(id),
        enabled: !!id,
        onSuccess: (data) => {
            setFormData({
                providerId: data.providerId || data.provider?.id || '',
                contractCode: data.contractCode || '',
                startDate: data.startDate ? dayjs(data.startDate) : null,
                endDate: data.endDate ? dayjs(data.endDate) : null,
                pricingModel: data.pricingModel || 'DISCOUNT',
                discountRate: data.discountPercent || data.discountRate || 0,
                notes: data.notes || ''
            });
        }
    });

    // Fetch providers for selector
    const {
        data: providersResponse,
        isLoading: providersLoading
    } = useQuery({
        queryKey: ['providers', 'selector'],
        queryFn: getProviderSelector,
        staleTime: 5 * 60 * 1000
    });

    const providers = Array.isArray(providersResponse)
        ? providersResponse
        : providersResponse?.data || [];

    // Update effect to sync selected provider when both data sources are ready
    useEffect(() => {
        if (contract && providers.length > 0) {
            const pId = contract.providerId || contract.provider?.id;
            const found = providers.find(p => p.id === pId);
            if (found) setSelectedProvider(found);
        }
    }, [contract, providers]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (payload) => updateProviderContract(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
            queryClient.invalidateQueries({ queryKey: ['provider-contract', id] });
            enqueueSnackbar('تم تحديث العقد بنجاح', { variant: 'success' });
            navigate(`/provider-contracts/${id}`);
        },
        onError: (error) => {
            enqueueSnackbar(error.message || 'فشل تحديث العقد', { variant: 'error' });
        }
    });

    // ──────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────────────────────────────────────

    const handleInputChange = (field) => (event) => {
        setFormData({ ...formData, [field]: event.target.value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const handleDateChange = (field) => (newDate) => {
        setFormData({ ...formData, [field]: newDate });
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.startDate) newErrors.startDate = 'تاريخ البداية مطلوب';
        if (!formData.endDate) newErrors.endDate = 'تاريخ النهاية مطلوب';
        if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
            newErrors.endDate = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية';
        }
        if (formData.pricingModel === 'DISCOUNT') {
            if (formData.discountRate === '' || formData.discountRate < 0 || formData.discountRate > 100) {
                newErrors.discountRate = 'نسبة الخصم يجب أن تكون بين 0 و 100';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            enqueueSnackbar('يرجى تصحيح الأخطاء قبل الحفظ', { variant: 'error' });
            return;
        }

        const payload = {
            startDate: formData.startDate ? formData.startDate.format('YYYY-MM-DD') : null,
            endDate: formData.endDate ? formData.endDate.format('YYYY-MM-DD') : null,
            pricingModel: formData.pricingModel,
            discountPercent: formData.pricingModel === 'DISCOUNT' ? parseFloat(formData.discountRate) : null,
            notes: formData.notes || null
        };

        updateMutation.mutate(payload);
    };

    // ──────────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────────

    if (contractLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
            </Box>
        );
    }

    if (contractError) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                حدث خطأ أثناء تحميل بيانات العقد.
            </Alert>
        );
    }

    return (
        <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_PROVIDER_CONTRACTS]}>
            <ModernPageHeader
                title={`تعديل العقد: ${formData.contractCode}`}
                subtitle={selectedProvider?.name || 'تعديل بيانات العقد'}
                icon={EditIcon}
                breadcrumbs={[
                    { label: 'العقود', path: '/provider-contracts' },
                    { label: formData.contractCode, path: `/provider-contracts/${id}` },
                    { label: 'تعديل' }
                ]}
                actions={
                    <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
                        عودة
                    </Button>
                }
            />

            <MainCard>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={4}>
                        {/* Provider Info (Read-Only in Edit) */}
                        <Grid item xs={12}>
                            <Paper elevation={0} sx={{ p: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Business color="primary" />
                                    <Typography variant="h5">بيانات مقدم الخدمة</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={600}>{selectedProvider?.name || '---'}</Typography>
                                <Typography variant="caption" color="text.secondary">لا يمكن تغيير مقدم الخدمة بعد إنشاء العقد</Typography>
                            </Paper>
                        </Grid>

                        {/* Contract Details */}
                        <Grid item xs={12}>
                            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                    <DateRange color="primary" />
                                    <Typography variant="h5">تفاصيل العقد</Typography>
                                </Box>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                label="تاريخ بداية العقد *"
                                                value={formData.startDate}
                                                onChange={handleDateChange('startDate')}
                                                slotProps={{ textField: { fullWidth: true, error: !!errors.startDate, helperText: errors.startDate } }}
                                            />
                                        </LocalizationProvider>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                label="تاريخ انتهاء العقد *"
                                                value={formData.endDate}
                                                onChange={handleDateChange('endDate')}
                                                minDate={formData.startDate}
                                                slotProps={{ textField: { fullWidth: true, error: !!errors.endDate, helperText: errors.endDate } }}
                                            />
                                        </LocalizationProvider>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Pricing Model */}
                        <Grid item xs={12}>
                            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                    <AttachMoney color="primary" />
                                    <Typography variant="h5">نموذج التسعير</Typography>
                                </Box>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={formData.pricingModel === 'DISCOUNT' ? 6 : 12}>
                                        <FormControl fullWidth>
                                            <InputLabel>نموذج التسعير *</InputLabel>
                                            <Select
                                                value={formData.pricingModel}
                                                onChange={handleInputChange('pricingModel')}
                                                label="نموذج التسعير *"
                                            >
                                                {PRICING_MODELS.map((model) => (
                                                    <MenuItem key={model.value} value={model.value}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <span>{model.icon}</span>
                                                            <Typography variant="body2">{model.label}</Typography>
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {formData.pricingModel === 'DISCOUNT' && (
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="نسبة الخصم % *"
                                                value={formData.discountRate}
                                                onChange={handleInputChange('discountRate')}
                                                error={!!errors.discountRate}
                                                helperText={errors.discountRate}
                                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                            />
                                        </Grid>
                                    )}

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            label="ملاحظات العقد"
                                            value={formData.notes}
                                            onChange={handleInputChange('notes')}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Actions */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate(-1)}>إلغاء</Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={updateMutation.isLoading ? <CircularProgress size={20} /> : <Save />}
                                    disabled={updateMutation.isLoading}
                                >
                                    حفظ التعديلات
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </MainCard>
        </RBACGuard>
    );
};

export default ProviderContractEdit;
