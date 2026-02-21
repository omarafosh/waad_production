import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText
} from '@mui/material';
import TextField from '@mui/material/TextField';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Layers as LayersIcon,
    Category as CategoryIcon,
    MedicalServices as ServiceIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import MedicalServiceSelector from 'components/tba/MedicalServiceSelector';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';
import {
    getCoverageDistributions,
    addCoverageDistribution,
    deleteCoverageDistribution
} from 'services/api/coverage-distributions.service';

const INITIAL_FORM_STATE = {
    targetType: 'CATEGORY', // 'CATEGORY' or 'SERVICE'
    categoryId: '',
    serviceId: '',
    limitAmount: ''
};

const DistributionFormModal = ({ open, onClose, onSubmit, loading, categories, loadingCategories }) => {
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState({});

    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (formData.targetType === 'CATEGORY' && !formData.categoryId) newErrors.categoryId = 'يجب اختيار التصنيف';
        if (formData.targetType === 'SERVICE' && !formData.serviceId) newErrors.serviceId = 'يجب اختيار الخدمة';
        if (!formData.limitAmount) newErrors.limitAmount = 'المبلغ مطلوب';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSubmit({
            categoryId: formData.targetType === 'CATEGORY' ? Number(formData.categoryId) : null,
            serviceId: formData.targetType === 'SERVICE' ? Number(formData.serviceId) : null,
            limitAmount: Number(formData.limitAmount)
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>إضافة حد مالي منفصل (Segregated Limit)</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>نوع الهدف</InputLabel>
                        <Select value={formData.targetType} onChange={handleChange('targetType')} label="نوع الهدف">
                            <MenuItem value="CATEGORY">تصنيف طبي (Category)</MenuItem>
                            <MenuItem value="SERVICE">خدمة طبية (Service)</MenuItem>
                        </Select>
                    </FormControl>

                    {formData.targetType === 'CATEGORY' && (
                        <FormControl fullWidth error={!!errors.categoryId}>
                            <InputLabel>التصنيف الطبي</InputLabel>
                            <Select
                                value={formData.categoryId}
                                onChange={handleChange('categoryId')}
                                label="التصنيف الطبي"
                                disabled={loadingCategories}
                            >
                                {categories.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        {cat.name} ({cat.code})
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.categoryId && <FormHelperText>{errors.categoryId}</FormHelperText>}
                        </FormControl>
                    )}

                    {formData.targetType === 'SERVICE' && (
                        <MedicalServiceSelector
                            value={formData.serviceId || null}
                            onChange={(s) => setFormData((prev) => ({ ...prev, serviceId: s?.id || '' }))}
                            error={!!errors.serviceId}
                            helperText={errors.serviceId}
                            label="الخدمة الطبية"
                            fullWidth
                        />
                    )}

                    <TextField
                        label="الحد المالي المستقل"
                        type="number"
                        value={formData.limitAmount}
                        onChange={handleChange('limitAmount')}
                        error={!!errors.limitAmount}
                        helperText={errors.limitAmount || 'هذا المبلغ سيكون مخصصاً فقط لهذا الهدف ولن يستهلك من السقف العام'}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">د.ل</InputAdornment>
                        }}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    إضافة الحد
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const BenefitPolicyDistributionsTab = ({ policyId, policyStatus, distributionType }) => {
    const queryClient = useQueryClient();
    const { enqueueSnackbar } = useSnackbar();
    const [openAdd, setOpenAdd] = useState(false);

    const { data: distributions = [], isLoading } = useQuery({
        queryKey: ['policy-distributions', policyId],
        queryFn: () => getCoverageDistributions(policyId),
        enabled: !!policyId
    });

    const { data: categories = [], isLoading: loadingCategories } = useQuery({
        queryKey: ['medical-categories-all'],
        queryFn: getAllMedicalCategories
    });

    const addMutation = useMutation({
        mutationFn: (payload) => addCoverageDistribution(policyId, payload),
        onSuccess: () => {
            enqueueSnackbar('تمت إضافة الحد بنجاح', { variant: 'success' });
            queryClient.invalidateQueries(['policy-distributions', policyId]);
            setOpenAdd(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteCoverageDistribution(policyId, id),
        onSuccess: () => {
            enqueueSnackbar('تم حذف الحد المنفصل', { variant: 'success' });
            queryClient.invalidateQueries(['policy-distributions', policyId]);
        }
    });

    if (distributionType === 'UNIFIED') {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                هذه الوثيقة تستخدم <strong>تغطية موحدة (Unified)</strong>. لا توجد حدود مالية منفصلة.
                <br />
                يتم استهلاك جميع الخدمات من السقف السنوي العام للوثيقة.
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <MainCard
                title="حدود التغطية المنفصلة (Segregated Limits)"
                secondary={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenAdd(true)}
                        disabled={policyStatus === 'CANCELLED'}
                        size="small"
                    >
                        إضافة حد منفصل
                    </Button>
                }
            >
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>الهدف (تصنيف / خدمة)</TableCell>
                                <TableCell align="center">الحد المالي المستقل</TableCell>
                                <TableCell align="center">الحالة</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {distributions.map((dist) => (
                                <TableRow key={dist.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {dist.categoryId ? <CategoryIcon color="primary" fontSize="small" /> : <ServiceIcon color="secondary" fontSize="small" />}
                                            <Box>
                                                <Typography variant="body2">{dist.categoryName || dist.serviceName}</Typography>
                                                <Typography variant="caption" color="textSecondary">{dist.categoryId ? 'تصنيف' : 'خدمة'}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography fontWeight="bold" color="primary">
                                            {dist.limitAmount?.toLocaleString()} د.ل
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <LayersIcon color={dist.active ? 'success' : 'disabled'} fontSize="small" />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="error"
                                            onClick={() => deleteMutation.mutate(dist.id)}
                                            disabled={deleteMutation.isPending}
                                            size="small"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {distributions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                        <Typography color="textSecondary">لا توجد حدود منفصلة مضافة بعد. سيتم الاستهلاك من السقف العام.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </MainCard>

            <DistributionFormModal
                open={openAdd}
                onClose={() => setOpenAdd(false)}
                onSubmit={addMutation.mutate}
                loading={addMutation.isPending}
                categories={categories}
                loadingCategories={loadingCategories}
            />
        </>
    );
};

BenefitPolicyDistributionsTab.propTypes = {
    policyId: PropTypes.number.isRequired,
    policyStatus: PropTypes.string,
    distributionType: PropTypes.string
};

export default BenefitPolicyDistributionsTab;
