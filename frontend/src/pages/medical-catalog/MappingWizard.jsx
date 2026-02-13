import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Box,
    Button,
    Typography,
    Stack,
    Autocomplete,
    CircularProgress,
    Card,
    CardContent,
    TextField,
    MenuItem,
    IconButton,
    Divider,
    Paper,
    Radio,
    RadioGroup,
    FormControlLabel
} from '@mui/material';
import {
    Close,
    Search as SearchIcon,
    CheckCircle,
    InfoOutlined,
    AutoFixHigh as AutoFixIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// Services
import { lookupMedicalServices } from 'services/api/medical-services.service';
import { medicalCatalogService } from 'services/medicalCatalog.service';

const ReasonCodes = [
    { code: 'MSG_ERROR', label: 'خطأ في إدخال المزود (Message Error)' },
    { code: 'TAXONOMY_UPDATE', label: 'تحديث التصنيف الموحد (Taxonomy Update)' },
    { code: 'MANUAL_CORRECTION', label: 'تصحيح يدوي (Manual Correction)' },
    { code: 'NEW_PROVIDER_ONBOARDING', label: 'تهيئة مزود جديد (Onboarding)' }
];

const MappingWizard = ({ initialService, onClose, onSuccess }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMaster, setSelectedMaster] = useState(null);
    const [reasonCode, setReasonCode] = useState('NEW_PROVIDER_ONBOARDING');

    // Load Master Services for search
    const { data: masterServices, isLoading: loadingMaster } = useQuery({
        queryKey: ['master-services-search', searchTerm],
        queryFn: () => medicalCatalogService.searchMasterServices(searchTerm),
        enabled: searchTerm.length > 2
    });

    const saveMutation = useMutation({
        mutationFn: (payload) => medicalCatalogService.mapService(payload),
        onSuccess: () => {
            enqueueSnackbar('تم حفظ الربط بنجاح', { variant: 'success' });
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            enqueueSnackbar(err.response?.data?.message || 'فشل عملية الربط', { variant: 'error' });
        }
    });

    const handleConfirm = () => {
        if (!selectedMaster || !reasonCode) return;
        saveMutation.mutate({
            rawServiceId: initialService.id,
            masterServiceId: selectedMaster.id,
            reasonCode,
            confidence: 1.0
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <AutoFixIcon color="primary" />
                        <Typography variant="h5">ربط بالخدمة الموحدة</Typography>
                    </Stack>
                    <IconButton size="small" onClick={onClose}><Close /></IconButton>
                </Stack>
                {initialService && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        الخدمة لدى المزود: [{initialService.serviceCode}] - {initialService.serviceName}
                    </Typography>
                )}
            </Box>

            {/* Content */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                {/* Search Master Service */}
                <Box sx={{ mb: 4 }}>
                    <TextField
                        fullWidth
                        placeholder="ابحث عن كود أو اسم الخدمة الموحدة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                        }}
                    />
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 2 }}>الخدمة الموحدة المقترحة</Typography>

                {loadingMaster ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={24} /></Box>
                ) : (
                    <Stack spacing={2}>
                        {(masterServices || []).map((service) => (
                            <Paper
                                key={service.id}
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    borderColor: selectedMaster?.id === service.id ? 'primary.main' : 'divider',
                                    bgcolor: selectedMaster?.id === service.id ? 'primary.lighter' : 'background.paper',
                                    '&:hover': { bgcolor: 'grey.50' }
                                }}
                                onClick={() => setSelectedMaster(service)}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Radio checked={selectedMaster?.id === service.id} size="small" />
                                    <Box flexGrow={1}>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            {service.nameAr || service.name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {service.code} | {service.classification}
                                        </Typography>
                                    </Box>
                                    <CheckCircle color="primary" sx={{ opacity: selectedMaster?.id === service.id ? 1 : 0 }} />
                                </Stack>
                            </Paper>
                        ))}
                        {!loadingMaster && searchTerm.length > 2 && masterServices?.length === 0 && (
                            <Typography variant="body2" color="textSecondary" align="center">لا توجد نتائج بحث</Typography>
                        )}
                    </Stack>
                )}

                {/* Reason Code Section */}
                <Divider sx={{ my: 4 }} />
                <Typography variant="subtitle2" sx={{ mb: 2 }}>سبب الربط</Typography>
                <TextField
                    select
                    fullWidth
                    label="الرجاء اختيار سبب الربط"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                >
                    {ReasonCodes.map((rc) => <MenuItem key={rc.code} value={rc.code}>{rc.label}</MenuItem>)}
                </TextField>

                <FormControlLabel
                    control={<Radio checked disabled size="small" />}
                    label={<Typography variant="caption" color="textSecondary">إحالة مزود جديد</Typography>}
                    sx={{ mt: 2 }}
                />
            </Box>

            {/* Footer Actions */}
            <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={!selectedMaster || saveMutation.isLoading}
                    onClick={handleConfirm}
                    sx={{ py: 1.5, fontSize: '1.1rem' }}
                >
                    {saveMutation.isLoading ? <CircularProgress size={24} color="inherit" /> : 'حفظ ونشر الربط'}
                </Button>
            </Box>
        </Box>
    );
};

export default MappingWizard;
