import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Grid, Stack, Alert, Button, Chip, Typography, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton } from '@mui/material';
import { Save as SaveIcon, ArrowBack, AssignmentTurnedIn as PreApprovalIcon, Delete as DeleteIcon, Person as PersonIcon, MedicalServices as MedicalIcon } from '@mui/icons-material';

import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import FormInput from 'components/common/Form/FormInput';
import FormAutocomplete from 'components/common/Form/FormAutocomplete';
import { usePreApprovalFormik } from 'application/hooks/usePreApprovalFormik';
import { PreApprovalService } from 'infrastructure/services/PreApprovalService';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from 'notistack';

const PreApprovalCreateFormik = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

    // تم تقليل الهامش لزيادة الارتفاع (User Request)
    const availableHeight = 'calc(100vh - 210px)';

    const [medicalServices, setMedicalServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);

    // Extract params (simplified for demo)
    const linkedVisitId = Number(location.state?.visitId || searchParams.get('visitId'));
    const linkedMemberId = Number(location.state?.memberId || searchParams.get('memberId'));
    const linkedProviderId = Number(location.state?.providerId || searchParams.get('providerId') || user?.providerId);

    const { formik, addService, removeService, updateQuantity, calculateTotal, isSubmitting } = usePreApprovalFormik({
        onSuccess: (result) => {
            enqueueSnackbar(`تم إنشاء الطلب بنجاح #${result.id}`, { variant: 'success' });
            navigate('/pre-approvals');
        },
        onError: () => enqueueSnackbar('فشل في إنشاء الطلب', { variant: 'error' })
    });

    // Sync route params with form state
    useEffect(() => {
        if (linkedVisitId) formik.setFieldValue('visitId', linkedVisitId);
        if (linkedMemberId) formik.setFieldValue('memberId', linkedMemberId);
        if (linkedProviderId) formik.setFieldValue('providerId', linkedProviderId);
    }, [linkedVisitId, linkedMemberId, linkedProviderId]);

    // Load services
    useEffect(() => {
        const loadServices = async () => {
            if (!linkedMemberId) return;
            try {
                setLoadingServices(true);
                const services = await PreApprovalService.getServicesRequiringPreAuth(linkedMemberId, linkedProviderId, user?.roles?.includes('PROVIDER'));
                setMedicalServices(services);
            } catch (err) {
                enqueueSnackbar('فشل في تحميل الخدمات', { variant: 'error' });
            } finally {
                setLoadingServices(false);
            }
        };
        loadServices();
    }, [linkedMemberId, linkedProviderId]);

    return (
        <>
            <ModernPageHeader
                title="طلب موافقة مسبقة جديد (Formik)"
                icon={PreApprovalIcon}
                actions={
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>رجوع</Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={formik.handleSubmit}
                            disabled={isSubmitting}
                        >
                            حفظ الطلب
                        </Button>
                    </Stack>
                }
            />

            <MainCard
                sx={{
                    height: availableHeight,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden', // منع السكرول الخارجي
                    '& .MuiCardContent-root': {
                        overflowY: 'auto',
                        flexGrow: 1,
                        p: { xs: 2, md: 3 }
                    }
                }}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormInput
                            label="رقم الزيارة"
                            name="visitId"
                            value={formik.values.visitId || ''}
                            disabled
                            icon={PreApprovalIcon}
                        />
                    </Grid>

                    <Grid item xs={12} md={12}>
                        <Typography variant="h6" gutterBottom>الخدمات الطبية</Typography>
                        <FormAutocomplete
                            label="اختر الخدمة"
                            options={medicalServices}
                            loading={loadingServices}
                            onChange={addService}
                            error={!!formik.errors.services}
                            helperText={formik.errors.services}
                            icon={MedicalIcon}
                        />
                    </Grid>

                    {formik.values.services.length > 0 && (
                        <Grid item xs={12}>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell>الخدمة</TableCell>
                                            <TableCell align="center">الكمية</TableCell>
                                            <TableCell align="right">السعر</TableCell>
                                            <TableCell align="right">الإجمالي</TableCell>
                                            <TableCell align="center">إجراء</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formik.values.services.map((s, i) => (
                                            <TableRow key={s.id}>
                                                <TableCell>{s.name}</TableCell>
                                                <TableCell align="center">
                                                    <FormInput
                                                        type="number"
                                                        size="small"
                                                        value={s.quantity}
                                                        onChange={(e) => updateQuantity(i, parseInt(e.target.value))}
                                                        sx={{ width: 80, mx: 'auto' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{s.price} د.ل</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{(s.price * s.quantity).toFixed(2)} د.ل</TableCell>
                                                <TableCell align="center">
                                                    <IconButton color="error" onClick={() => removeService(i)}><DeleteIcon /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                                            <TableCell colSpan={3} sx={{ fontWeight: 'bold' }}>الإجمالي الكلي</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{calculateTotal().toFixed(2)} د.ل</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    )}

                    <Grid item xs={12} md={6}>
                        <FormInput
                            label="كود التشخيص"
                            name="diagnosisCode"
                            value={formik.values.diagnosisCode}
                            onChange={formik.handleChange}
                            error={formik.touched.diagnosisCode && formik.errors.diagnosisCode}
                            helperText={formik.touched.diagnosisCode && formik.errors.diagnosisCode}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormInput
                            label="الملاحظات"
                            name="notes"
                            multiline
                            rows={3}
                            value={formik.values.notes}
                            onChange={formik.handleChange}
                        />
                    </Grid>
                </Grid>
            </MainCard>
        </>
    );
};

export default PreApprovalCreateFormik;
