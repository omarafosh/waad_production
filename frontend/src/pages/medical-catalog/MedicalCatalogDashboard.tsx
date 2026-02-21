import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Grid,
    Stack,
    Typography,
    Button,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Category as CategoryIcon,
    MedicalServices as ServiceIcon,
    LinkOff as UnmappedIcon,
    AutoFixHigh as WizardIcon,
    ListAlt as ListIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import { getMedicalServices } from 'services/api/medical-services.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <Card sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { boxShadow: 4 } : {} }} onClick={onClick}>
        <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: `${color}.lighter`,
                    color: `${color}.main`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon />
                </Box>
                <Box>
                    <Typography variant="h4" fontWeight="bold">{value}</Typography>
                    <Typography variant="body2" color="text.secondary">{title}</Typography>
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

const MedicalCatalogDashboard = () => {
    const navigate = useNavigate();

    // Fetch summary stats
    const { data: servicesData, isLoading: loadingServices } = useQuery({
        queryKey: ['medical-services-stats'],
        queryFn: () => getMedicalServices({ size: 1 })
    });

    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['medical-categories-all'],
        queryFn: getAllMedicalCategories
    });

    const stats = useMemo(() => ([
        {
            title: 'إجمالي الخدمات الطبية',
            value: servicesData?.totalElements || 0,
            icon: ServiceIcon,
            color: 'primary',
            path: '/medical-services'
        },
        {
            title: 'التصنيفات الطبية',
            value: categories?.length || 0,
            icon: CategoryIcon,
            color: 'info',
            path: '/medical-categories'
        },
        {
            title: 'خدمات غير مربوطة',
            value: 'قيد الحساب', // Backend logic needed for exact count
            icon: UnmappedIcon,
            color: 'warning',
            path: '/medical-catalog/unmapped'
        }
    ]), [servicesData, categories]);

    if (loadingServices || loadingCategories) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <UnifiedPageHeader
                title="لوحة تحكم الفهرس الطبي"
                subtitle="نظرة شاملة على استقرار ودقة البيانات الطبية في النظام"
                icon={DashboardIcon}
                breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الفهرس الطبي' }]}
            />

            <Grid container spacing={3}>
                {/* Stats Section */}
                {stats.map((stat, idx) => (
                    <Grid item xs={12} sm={4} key={idx}>
                        <StatCard
                            {...stat}
                            onClick={() => navigate(stat.path)}
                        />
                    </Grid>
                ))}

                {/* Quick Actions Section */}
                <Grid item xs={12} md={8}>
                    <MainCard title="إجراءات سريعة">
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    startIcon={<WizardIcon />}
                                    onClick={() => navigate('/medical-catalog/wizard')}
                                    sx={{ py: 2, height: '100%', borderColor: 'primary.main', borderWidth: 2 }}
                                >
                                    بدء معالج الربط الذكي
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    startIcon={<ListIcon />}
                                    onClick={() => navigate('/medical-services')}
                                    sx={{ py: 2, height: '100%' }}
                                >
                                    استعراض الفهرس الموحد الكامل
                                </Button>
                            </Grid>
                        </Grid>
                    </MainCard>
                </Grid>

                {/* Info Card */}
                <Grid item xs={12} md={4}>
                    <MainCard title="دليل الربط" sx={{ height: '100%' }}>
                        <Typography variant="body2" paragraph>
                            يضمن الربط الصحيح للأكواد الطبية دقة العمليات التالية:
                        </Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2">• حساب التغطية التأمينية آلياً</Typography>
                            <Typography variant="body2">• تقليل الأخطاء في المطالبات المالية</Typography>
                            <Typography variant="body2">• استخراج تقارير إحصائية دقيقة لمعدلات الاستهلاك</Typography>
                        </Stack>
                    </MainCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MedicalCatalogDashboard;
