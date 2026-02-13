import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Tabs,
    Tab,
    Typography,
    Button,
    Stack,
    Grid,
    Alert,
    Drawer
} from '@mui/material';

// Icons
import {
    AutoFixHigh as AutoFixIcon,
    CloudUpload as UploadIcon,
    History as HistoryIcon,
    MedicalServices as MasterIcon,
    PendingActions as PendingIcon,
    FormatListBulleted as ListIcon,
    Insights as InsightsIcon
} from '@mui/icons-material';

// Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/UnifiedPageHeader';
import UnmappedServicesTable from './components/UnmappedServicesTable';
import MappingAuditLogTable from './components/MappingAuditLogTable';
import MasterCatalogTable from './components/MasterCatalogTable';
import ProviderRawServicesTable from './components/ProviderRawServicesTable';
import MappingWizard from './MappingWizard';

// Services
import { medicalCatalogService } from 'services/medicalCatalog.service';
import { useSnackbar } from 'notistack';

const KPICard = ({ title, value, icon: Icon, color }) => (
    <MainCard content={false}>
        <Box sx={{ p: 2.25 }}>
            <Stack spacing={0.5}>
                <Typography variant="h6" color="textSecondary">
                    {title}
                </Typography>
                <Grid container alignItems="center">
                    <Grid item>
                        <Typography variant="h3" color="inherit">
                            {value}
                        </Typography>
                    </Grid>
                    {Icon && (
                        <Grid item sx={{ ml: 'auto' }}>
                            <Icon sx={{ color: `${color}.main`, fontSize: '2rem', opacity: 0.5 }} />
                        </Grid>
                    )}
                </Grid>
            </Stack>
        </Box>
    </MainCard>
);

const MappingCenter = () => {
    const [activeTab, setActiveTab] = useState(2); // Default to Mapping Workspace (Tab 3)
    const [wizardOpen, setWizardOpen] = useState(false);
    const [selectedServiceForMapping, setSelectedServiceForMapping] = useState(null);
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    const handleTabChange = (_, newValue) => setActiveTab(newValue);

    const handleOpenWizard = (service = null) => {
        setSelectedServiceForMapping(service);
        setWizardOpen(true);
    };

    const handleImportExcel = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await medicalCatalogService.uploadRawServices(file, 1); // Default provider for now
            enqueueSnackbar('تم استيراد الخدمات بنجاح', { variant: 'success' });
            queryClient.invalidateQueries(['unmapped-services']);
            queryClient.invalidateQueries(['raw-services']);
            queryClient.invalidateQueries(['catalog-stats']);
        } catch (error) {
            enqueueSnackbar('فشل استيراد الخدمات', { variant: 'error' });
        }
    };

    const { data: unmappedData } = useQuery({
        queryKey: ['unmapped-services', ''],
        queryFn: () => medicalCatalogService.getUnmappedServices({ searchTerm: '', page: 0, size: 1 })
    });

    const { data: statsResponse, isLoading: loadingStats } = useQuery({
        queryKey: ['catalog-stats'],
        queryFn: () => medicalCatalogService.getCatalogStats()
    });

    const pendingCount = unmappedData?.data?.totalElements || 0;
    const stats = statsResponse?.data || { totalMaster: 0, totalRaw: 0, mappedCount: 0, completionRate: 0 };

    return (
        <Box>
            <ModernPageHeader
                title="مركز الربط الطبي الموحد"
                subtitle="إدارة وتبويب الخدمات الطبية المرجعية وربط خدمات المزودين"
                icon={AutoFixIcon}
                breadcrumbs={[
                    { label: 'الرئيسية', path: '/' },
                    { label: 'مركز الربط' }
                ]}
                showAddButton={false}
                additionalActions={
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            component="label"
                        >
                            استيراد من إكسل
                            <input
                                type="file"
                                hidden
                                accept=".csv,.xlsx,.xls"
                                onChange={handleImportExcel}
                            />
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AutoFixIcon />}
                            onClick={() => handleOpenWizard()}
                        >
                            معالج الربط الذكي
                        </Button>
                    </Stack>
                }
            />

            {/* KPI Cards Row */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="إجمالي الفهرس"
                        value={loadingStats ? '...' : (stats.totalMaster || 0).toLocaleString()}
                        icon={MasterIcon}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="خدمات المزودين (Raw)"
                        value={loadingStats ? '...' : (stats.totalRaw || 0).toLocaleString()}
                        icon={ListIcon}
                        color="secondary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="بانتظار الربط"
                        value={unmappedData ? pendingCount.toLocaleString() : '...'}
                        icon={PendingIcon}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="نسبة الإنجاز"
                        value={`${loadingStats ? '...' : (stats.completionRate || 0)}%`}
                        icon={InsightsIcon}
                        color="success"
                    />
                </Grid>
            </Grid>

            <Alert severity="warning" variant="outlined" sx={{ mb: 3, bgcolor: 'warning.lighter' }}>
                توجد <strong>{pendingCount.toLocaleString()}</strong> خدمة غير مربوطة حالياً. يرجى توحيدها مع الفهرس الطبي الموحد لضمان دقة المطالبات.
            </Alert>

            <MainCard content={false}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="medical catalog tabs">
                        <Tab icon={<MasterIcon />} iconPosition="start" label="الفهرس الموحد (Master)" />
                        <Tab icon={<AutoFixIcon />} iconPosition="start" label="مساحة عمل الربط" />
                        <Tab icon={<ListIcon />} iconPosition="start" label="خدمات المزودين (Raw)" />
                        <Tab icon={<HistoryIcon />} iconPosition="start" label="التدقيق والأثر (Audit)" />
                    </Tabs>
                </Box>

                <Box sx={{ p: 3 }}>
                    {activeTab === 0 && (
                        <MasterCatalogTable />
                    )}
                    {activeTab === 1 && (
                        <UnmappedServicesTable onMap={(service) => handleOpenWizard(service)} />
                    )}
                    {activeTab === 2 && (
                        <ProviderRawServicesTable />
                    )}
                    {activeTab === 3 && (
                        <MappingAuditLogTable />
                    )}
                </Box>
            </MainCard>

            {/* Mapping Workspace Side Drawer */}
            <Drawer
                anchor="right"
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 500, md: 600 }, p: 0 }
                }}
            >
                <MappingWizard
                    initialService={selectedServiceForMapping}
                    onClose={() => setWizardOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['unmapped-services']);
                        queryClient.invalidateQueries(['raw-services']);
                        queryClient.invalidateQueries(['catalog-stats']);
                        setWizardOpen(false);
                    }}
                />
            </Drawer>
        </Box>
    );
};

export default MappingCenter;
