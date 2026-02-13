import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Typography,
    Box,
    RadioGroup,
    FormControlLabel,
    Radio,
    Paper,
    Divider,
    Alert,
    CircularProgress,
    Stack,
    Chip,
    InputAdornment
} from '@mui/material';
import TextField from '@mui/material/TextField';
import { LoadingButton } from '@mui/lab';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CategoryIcon from '@mui/icons-material/Category';
import RuleIcon from '@mui/icons-material/Rule';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getReclassifyImpact, reclassifyService } from 'services/api/medical-services.service';
import { useSnackbar } from 'notistack';

const STRATEGIES = [
    {
        value: 'INHERIT',
        label: 'وراثة قواعد التصنيف الجديد',
        description: 'ستتبنى الخدمة قواعد التغطية الخاصة بالتصنيف الجديد. سيتم حذف أي استثناءات خاصة بهذه الخدمة.'
    },
    {
        value: 'KEEP_OVERRIDE',
        label: 'الاحتفاظ بالتغطية الحالية (استثناء)',
        description: 'ستحافظ الخدمة على قيم التغطية الحالية كقاعدة خاصة، بغض النظر عن افتراضات التصنيف الجديد.'
    },
    {
        value: 'CUSTOM',
        label: 'تحديد تغطية مخصصة',
        description: 'تحديد قواعد تغطية خاصة لهذه الخدمة (إنشاء استثناء خاص).'
    }
];

const SmartClassificationModal = ({ open, onClose, service, categories, initialNewCategoryId, onSuccess }) => {
    const { enqueueSnackbar } = useSnackbar();

    const [newCategoryId, setNewCategoryId] = useState(initialNewCategoryId || '');
    const [strategy, setStrategy] = useState('INHERIT');
    const [reasonCode, setReasonCode] = useState('');

    // Custom Coverage State
    const [customCoverage, setCustomCoverage] = useState({
        coveragePercentage: 80,
        maxAmount: '',
        maxVisits: '',
        annualLimit: ''
    });

    // Impact Analysis State
    const [impact, setImpact] = useState(null);
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initial Sync
    useEffect(() => {
        if (open && initialNewCategoryId) {
            setNewCategoryId(initialNewCategoryId);
        }
    }, [open, initialNewCategoryId]);

    // Fetch Impact when Category Changes
    useEffect(() => {
        if (open && service?.id && newCategoryId && newCategoryId !== service.categoryId) {
            fetchImpact();
        } else {
            setImpact(null);
        }
    }, [open, service, newCategoryId]);

    const fetchImpact = async () => {
        try {
            setLoadingImpact(true);
            const data = await getReclassifyImpact(service.id, newCategoryId);
            setImpact(data);
        } catch (error) {
            console.error('Failed to fetch impact', error);
        } finally {
            setLoadingImpact(false);
        }
    };

    const handleSubmit = async () => {
        if (!reasonCode) {
            enqueueSnackbar('يرجى تقديم كود السبب.', { variant: 'warning' });
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                newClassificationId: newCategoryId,
                strategy,
                reasonCode,
                customCoverage: strategy === 'CUSTOM' ? {
                    ...customCoverage,
                    maxAmount: customCoverage.maxAmount || null,
                    maxVisits: customCoverage.maxVisits || null,
                    annualLimit: customCoverage.annualLimit || null
                } : null
            };

            await reclassifyService(service.id, payload);

            enqueueSnackbar('تم تحديث التصنيف بنجاح', { variant: 'success' });
            onSuccess(); // Refresh table
            onClose();
        } catch (error) {
            enqueueSnackbar(error.message || 'فشل تحديث التصنيف', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const getNewCategoryName = () => {
        return categories?.find(c => c.id === newCategoryId)?.name || 'غير معروف';
    };

    const handleCustomChange = (prop) => (event) => {
        setCustomCoverage({ ...customCoverage, [prop]: event.target.value });
    };

    if (!service) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: 'white', borderBottom: '1px solid #eee', pb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <MedicalServicesIcon color="primary" />
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                        تغيير التصنيف: {service.name}
                    </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
                    كود الخدمة: {service.code}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ bgcolor: '#fafafa', py: 3 }}>
                <Grid container spacing={3}>
                    {/* 1. Transformation Visualization */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, border: '1px dashed #ccc' }}>
                            <Chip
                                icon={<CategoryIcon />}
                                label={service.categoryName || 'لا يوجد تصنيف'}
                                color="default"
                                variant="outlined"
                            />
                            <Typography variant="h5" color="text.secondary">→</Typography>
                            <Chip
                                icon={<VerifiedUserIcon />}
                                label={getNewCategoryName()}
                                color="primary"
                                sx={{ fontWeight: 'bold' }}
                            />
                        </Paper>
                    </Grid>

                    {/* 2. Strategy Selection */}
                    <Grid item xs={12} md={7}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>استراتيجية التغطية</Typography>
                        <RadioGroup value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                            <Stack spacing={2}>
                                {STRATEGIES.map((opt) => (
                                    <Paper
                                        key={opt.value}
                                        onClick={() => setStrategy(opt.value)}
                                        sx={{
                                            p: 2,
                                            cursor: 'pointer',
                                            border: strategy === opt.value ? '2px solid #008e92' : '1px solid #e0e0e0',
                                            bgcolor: strategy === opt.value ? '#e0f2f1' : 'white',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <FormControlLabel
                                            value={opt.value}
                                            control={<Radio size="small" />}
                                            label={<Typography fontWeight={600}>{opt.label}</Typography>}
                                            sx={{ m: 0 }}
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
                                            {opt.description}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Stack>
                        </RadioGroup>

                        {/* Custom Coverage Inputs */}
                        {strategy === 'CUSTOM' && (
                            <Paper sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="نسبة التغطية"
                                            type="number"
                                            fullWidth size="small"
                                            value={customCoverage.coveragePercentage}
                                            onChange={handleCustomChange('coveragePercentage')}
                                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="الحد الأقصى للزيارات"
                                            type="number"
                                            fullWidth size="small"
                                            value={customCoverage.maxVisits}
                                            onChange={handleCustomChange('maxVisits')}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            label="الحد الأقصى للمبلغ"
                                            type="number"
                                            fullWidth size="small"
                                            value={customCoverage.maxAmount}
                                            onChange={handleCustomChange('maxAmount')}
                                            InputProps={{ endAdornment: <InputAdornment position="end">د.ل</InputAdornment> }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}
                    </Grid>

                    {/* 3. Impact & Reason */}
                    <Grid item xs={12} md={5}>
                        <Stack spacing={3}>
                            {/* Impact Analysis */}
                            <Paper sx={{ p: 2, bgcolor: 'white' }}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                    <RuleIcon color="warning" fontSize="small" />
                                    <Typography variant="subtitle2">معاينة التأثير</Typography>
                                </Stack>
                                <Divider sx={{ mb: 2 }} />

                                {loadingImpact ? (
                                    <Stack alignItems="center" py={2}>
                                        <CircularProgress size={24} />
                                        <Typography variant="caption" sx={{ mt: 1 }}>جاري تحليل الوثائق...</Typography>
                                    </Stack>
                                ) : impact ? (
                                    <Box>
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            {impact.activePolicies} وثائق نشطة متأثرة
                                        </Alert>
                                        <Typography variant="body2" gutterBottom>
                                            الاستثناءات الموجودة: <strong>{impact.existingOverrides}</strong>
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {strategy === 'INHERIT' && "سيتم إزالة الاستثناءات."}
                                            {strategy === 'KEEP_OVERRIDE' && "سيتم إنشاء قواعد جديدة."}
                                            {strategy === 'CUSTOM' && "سيتم تطبيق قواعد مخصصة."}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">اختر تصنيفاً جديداً لمعاينة التأثير.</Typography>
                                )}
                            </Paper>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <RuleIcon color="warning" fontSize="small" />
                                <Typography variant="subtitle2">معاينة التأثير</Typography>
                            </Stack>

                            {/* Reason Code */}
                            <TextField
                                label="كود السبب / المبرر"
                                placeholder="مثال: REQ-2026-001، تصحيح خطأ..."
                                fullWidth
                                multiline
                                rows={3}
                                required
                                value={reasonCode}
                                onChange={(e) => setReasonCode(e.target.value)}
                                helperText="مطلوب لسجل التدقيق"
                                sx={{ bgcolor: 'white' }}
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
                <Button onClick={onClose} color="inherit">إلغاء</Button>
                <LoadingButton
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!reasonCode || loadingImpact}
                    startIcon={<VerifiedUserIcon />}
                >
                    تأكيد وحفظ
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};

export default SmartClassificationModal;
