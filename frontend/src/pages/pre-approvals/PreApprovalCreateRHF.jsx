import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Grid, Stack, Alert, Button, Typography, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton } from '@mui/material';
import { Save as SaveIcon, ArrowBack, AssignmentTurnedIn as PreApprovalIcon, Delete as DeleteIcon, MedicalServices as MedicalIcon } from '@mui/icons-material';

import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import FormInput from 'components/common/Form/FormInput';
import FormAutocomplete from 'components/common/Form/FormAutocomplete';
import { usePreApprovalRHF } from 'application/hooks/usePreApprovalRHF';
import { PreApprovalService } from 'infrastructure/services/PreApprovalService';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from 'notistack';

const PreApprovalCreateRHF = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

    const [medicalServices, setMedicalServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);

    const linkedVisitId = Number(location.state?.visitId || searchParams.get('visitId'));
    const linkedMemberId = Number(location.state?.memberId || searchParams.get('memberId'));
    const linkedProviderId = Number(location.state?.providerId || searchParams.get('providerId') || user?.providerId);

    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        services,
        addService,
        removeService,
        updateQuantity,
        calculateTotal,
        setValue
    } = usePreApprovalRHF({
        onSuccess: (result) => {
            enqueueSnackbar(`تم إنشاء الطلب بنجاح #${result.id}`, { variant: 'success' });
            navigate('/pre-approvals');
        },
        onError: () => enqueueSnackbar('فشل في إنشاء الطلب', { variant: 'error' })
    });

    useEffect(() => {
        if (linkedVisitId) setValue('visitId', linkedVisitId);
        if (linkedMemberId) setValue('memberId', linkedMemberId);
        if (linkedProviderId) setValue('providerId', linkedProviderId);
    }, [linkedVisitId, linkedMemberId, linkedProviderId, setValue]);

    useEffect(() => {
        const loadServices = async () => {
            if (!linkedMemberId) return;
            try {
                setLoadingServices(true);
                const data = await PreApprovalService.getServicesRequiringPreAuth(linkedMemberId, linkedProviderId, user?.roles?.includes('PROVIDER'));
                setMedicalServices(data);
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
                title="طلب موافقة مسبقة جديد (Hook Form)"
                icon={PreApprovalIcon}
                actions={
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>رجوع</Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSubmit}
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
                    overflow: 'hidden',
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
                            {...register('visitId')}
                            disabled
                            icon={PreApprovalIcon}
                            error={!!errors.visitId}
                            helperText={errors.visitId?.message}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormAutocomplete
                            label="اختر الخدمة"
                            options={medicalServices}
                            loading={loadingServices}
                            onChange={addService}
                            error={!!errors.services}
                            helperText={errors.services?.message}
                            icon={MedicalIcon}
                        />
                    </Grid>

                    {services.length > 0 && (
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
                                        {services.map((s, i) => (
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
                                        <TableRow sx={{ bgcolor: 'success.lighter' }}>
                                            <TableCell colSpan={3} sx={{ fontWeight: 'bold' }}>الإجمالي الكلي</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>{calculateTotal().toFixed(2)} د.ل</TableCell>
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
                            {...register('diagnosisCode')}
                            error={!!errors.diagnosisCode}
                            helperText={errors.diagnosisCode?.message}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormInput
                            label="الملاحظات"
                            multiline
                            rows={3}
                            {...register('notes')}
                            error={!!errors.notes}
                            helperText={errors.notes?.message}
                        />
                    </Grid>
                </Grid>
            </MainCard>
        </>
    );
};

export default PreApprovalCreateRHF;
