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
import { getReclassifyImpact, reclassifyService, addServiceCategory, removeServiceCategory } from 'services/api/medical-services.service';
import { useSnackbar } from 'notistack';
import { Autocomplete } from '@mui/material';

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

    // New Mapping State
    const [selectedCat, setSelectedCat] = useState(null);
    const [context, setContext] = useState('ANY');
    const [isPrimary, setIsPrimary] = useState(false);

    // Impact/Strategy State (Preserving some logic)
    const [strategy, setStrategy] = useState('INHERIT');
    const [reasonCode, setReasonCode] = useState('RECLASSIFY');

    const [loading, setLoading] = useState(false);

    const handleAddMapping = async () => {
        if (!selectedCat) return;
        try {
            setLoading(true);
            await addServiceCategory(service.id, selectedCat.id, isPrimary, context);
            enqueueSnackbar('تم إضافة التصنيف بنجاح', { variant: 'success' });
            setSelectedCat(null);
            onSuccess();
        } catch (error) {
            enqueueSnackbar(error.message || 'فشل إضافة التصنيف', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMapping = async (catId, ctx) => {
        try {
            setLoading(true);
            await removeServiceCategory(service.id, catId, ctx);
            enqueueSnackbar('تم إزالة التصنيف', { variant: 'info' });
            onSuccess();
        } catch (error) {
            enqueueSnackbar(error.message || 'فشل إزالة التصنيف', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!service) return null;

    const currentMappings = service.categories || [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ borderBottom: '1px solid #eee', pb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <MedicalServicesIcon color="primary" />
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                        تصنيفات الخدمة المتعددة: {service.name}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ bgcolor: '#fafafa', py: 3 }}>
                <Grid container spacing={3}>
                    {/* 1. Current Classifications */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                            التصنيفات الحالية المرتبطة
                        </Typography>
                        <Paper sx={{ p: 2, minHeight: 80, border: '1px solid #e0e0e0' }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {currentMappings.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">لا توجد تصنيفات مرتبطة حالياً.</Typography>
                                ) : (
                                    currentMappings.map((m, idx) => (
                                        <Chip
                                            key={idx}
                                            label={`${m.categoryName} (${m.context})`}
                                            onDelete={() => handleRemoveMapping(m.categoryId, m.context)}
                                            color={m.primary ? "primary" : "secondary"}
                                            variant={m.primary ? "filled" : "outlined"}
                                            sx={{ mb: 1 }}
                                        />
                                    ))
                                )}
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* 2. Add New Classification */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
                            إضافة ارتباط تصنيفي جديد
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={5}>
                                    <Autocomplete
                                        options={categories || []}
                                        getOptionLabel={(option) => `[${option.code}] ${option.name}`}
                                        value={selectedCat}
                                        onChange={(e, val) => setSelectedCat(val)}
                                        renderInput={(params) => (
                                            <TextField {...params} label="اختر التصنيف" size="small" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        select
                                        label="سياق التغطية"
                                        fullWidth
                                        size="small"
                                        value={context}
                                        onChange={(e) => setContext(e.target.value)}
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="ANY">عام (ANY)</option>
                                        <option value="OUTPATIENT">عيادات (OUTPATIENT)</option>
                                        <option value="INPATIENT">إيواء (INPATIENT)</option>
                                        <option value="EMERGENCY">طوارئ (EMERGENCY)</option>
                                    </TextField>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <FormControlLabel
                                        control={
                                            <Radio
                                                checked={isPrimary}
                                                onClick={() => setIsPrimary(!isPrimary)}
                                                size="small"
                                            />
                                        }
                                        label="تصنيف أساسي"
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <LoadingButton
                                        variant="contained"
                                        fullWidth
                                        onClick={handleAddMapping}
                                        disabled={!selectedCat}
                                        loading={loading}
                                        startIcon={<AddIcon />}
                                    >
                                        إضافة
                                    </LoadingButton>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* 3. Safety Alert */}
                    <Grid item xs={12}>
                        <Alert severity="info" icon={<WarningAmberIcon />}>
                            تعدد التصنيفات يسمح للخدمة بالخضوع لقواعد تغطية مختلفة بناءً على سياق الزيارة (مثل: الخدمة قد تكون مغطاة بنسبة 100% في الطوارئ و80% في العيادات الخارجية إذا تم ربطها بتصنيفات مختلفة).
                        </Alert>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="outlined" color="inherit">إغلاق</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SmartClassificationModal;
