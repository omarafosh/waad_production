import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    CircularProgress,
    Alert,
    Chip,
    Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// Icons
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import CalendarOutlined from '@ant-design/icons/CalendarOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

// Project imports
import MainCard from 'components/MainCard';
import { providersService } from 'services/api';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import api from 'utils/axios';

// ==============================|| PROVIDER REPORTS ||============================== //

/**
 * Provider Reports Page
 * 
 * Generate PDF reports for provider invoices:
 * 1. All Invoices Report
 * 2. Quarterly Report  
 * 3. Rejected Invoices Report
 * 
 * @since 2026-02-04
 */
export default function ProviderReports() {
    const { companyName } = useCompanySettings();

    // Form State
    const [providerId, setProviderId] = useState('');
    const [reportType, setReportType] = useState('all');
    const [fromDate, setFromDate] = useState(dayjs().startOf('month'));
    const [toDate, setToDate] = useState(dayjs());
    const [year, setYear] = useState(dayjs().year());
    const [quarter, setQuarter] = useState(Math.ceil((dayjs().month() + 1) / 3));

    // Loading & Error States
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Fetch Providers
    const { data: providersData, isLoading: loadingProviders } = useQuery({
        queryKey: ['providers-list'],
        queryFn: async () => {
            const response = await providersService.getAll();
            return response.data?.content || response.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const providers = Array.isArray(providersData) ? providersData : [];

    // Generate Report
    const handleGenerateReport = useCallback(async () => {
        if (!providerId) {
            setError('يرجى اختيار مقدم الخدمة');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            let endpoint = '';
            let filename = '';

            switch (reportType) {
                case 'all':
                    endpoint = `/api/reports/provider-invoices/${providerId}/all?fromDate=${fromDate.format('YYYY-MM-DD')}&toDate=${toDate.format('YYYY-MM-DD')}`;
                    filename = `provider_${providerId}_invoices_${fromDate.format('YYYY-MM-DD')}_${toDate.format('YYYY-MM-DD')}.pdf`;
                    break;
                case 'quarterly':
                    endpoint = `/api/reports/provider-invoices/${providerId}/quarterly?year=${year}&quarter=${quarter}`;
                    filename = `provider_${providerId}_Q${quarter}_${year}_report.pdf`;
                    break;
                case 'rejected':
                    endpoint = `/api/reports/provider-invoices/${providerId}/rejected?fromDate=${fromDate.format('YYYY-MM-DD')}&toDate=${toDate.format('YYYY-MM-DD')}`;
                    filename = `provider_${providerId}_rejected_${fromDate.format('YYYY-MM-DD')}_${toDate.format('YYYY-MM-DD')}.pdf`;
                    break;
                default:
                    throw new Error('Invalid report type');
            }

            // Fetch PDF
            const response = await api.get(endpoint, {
                responseType: 'blob',
            });

            // Create download link
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSuccess('تم تنزيل التقرير بنجاح');

        } catch (err) {
            console.error('Error generating report:', err);
            setError(err.response?.data?.message || 'حدث خطأ أثناء إنشاء التقرير');
        } finally {
            setIsGenerating(false);
        }
    }, [providerId, reportType, fromDate, toDate, year, quarter]);

    // Report Type Cards
    const reportTypes = [
        {
            id: 'all',
            title: 'جميع الفواتير',
            description: 'تقرير شامل لجميع فواتير مقدم الخدمة خلال فترة محددة',
            icon: <FileTextOutlined style={{ fontSize: 32, color: '#1976d2' }} />,
            color: '#e3f2fd',
        },
        {
            id: 'quarterly',
            title: 'التقرير الربع سنوي',
            description: 'تقرير ربع سنوي يعرض ملخص الفواتير لـ 3 أشهر',
            icon: <CalendarOutlined style={{ fontSize: 32, color: '#2e7d32' }} />,
            color: '#e8f5e9',
        },
        {
            id: 'rejected',
            title: 'الفواتير المرفوضة',
            description: 'تقرير تفصيلي للفواتير المرفوضة أو المعتمدة جزئياً',
            icon: <CloseCircleOutlined style={{ fontSize: 32, color: '#c62828' }} />,
            color: '#ffebee',
        },
    ];

    return (
        <MainCard title="تقارير مقدمي الخدمة" secondary={<Typography variant="caption" color="text.secondary">{companyName}</Typography>}>
            <Box sx={{ p: 2 }}>
                {/* Alerts */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                        {success}
                    </Alert>
                )}

                {/* Report Type Selection */}
                <Typography variant="h5" sx={{ mb: 2 }}>اختر نوع التقرير</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {reportTypes.map((type) => (
                        <Grid size={{ xs: 12, md: 4 }} key={type.id}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    border: reportType === type.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                    bgcolor: reportType === type.id ? type.color : 'background.paper',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        boxShadow: 3,
                                        borderColor: '#1976d2',
                                    }
                                }}
                                onClick={() => setReportType(type.id)}
                            >
                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                    {type.icon}
                                    <Typography variant="h6" sx={{ mt: 2 }}>{type.title}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        {type.description}
                                    </Typography>
                                    {reportType === type.id && (
                                        <Chip label="محدد" color="primary" size="small" sx={{ mt: 2 }} />
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Filters */}
                <Typography variant="h5" sx={{ mb: 2 }}>إعدادات التقرير</Typography>
                <Grid container spacing={3}>
                    {/* Provider Selection */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel>مقدم الخدمة *</InputLabel>
                            <Select
                                value={providerId}
                                onChange={(e) => setProviderId(e.target.value)}
                                label="مقدم الخدمة *"
                                disabled={loadingProviders}
                            >
                                {providers.map((provider) => (
                                    <MenuItem key={provider.id} value={provider.id}>
                                        {provider.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Quarterly Options */}
                    {reportType === 'quarterly' ? (
                        <>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="السنة"
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    inputProps={{ min: 2020, max: 2030 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <FormControl fullWidth>
                                    <InputLabel>الربع</InputLabel>
                                    <Select
                                        value={quarter}
                                        onChange={(e) => setQuarter(e.target.value)}
                                        label="الربع"
                                    >
                                        <MenuItem value={1}>الربع الأول (يناير - مارس)</MenuItem>
                                        <MenuItem value={2}>الربع الثاني (أبريل - يونيو)</MenuItem>
                                        <MenuItem value={3}>الربع الثالث (يوليو - سبتمبر)</MenuItem>
                                        <MenuItem value={4}>الربع الرابع (أكتوبر - ديسمبر)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </>
                    ) : (
                        <>
                            {/* Date Range */}
                            <Grid size={{ xs: 12, md: 3 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="من تاريخ"
                                        value={fromDate}
                                        onChange={(date) => setFromDate(date)}
                                        slotProps={{
                                            textField: { fullWidth: true }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="إلى تاريخ"
                                        value={toDate}
                                        onChange={(date) => setToDate(date)}
                                        slotProps={{
                                            textField: { fullWidth: true }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </>
                    )}
                </Grid>

                {/* Generate Button */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <DownloadOutlined />}
                        onClick={handleGenerateReport}
                        disabled={isGenerating || !providerId}
                        sx={{
                            minWidth: 200,
                            py: 1.5,
                            fontSize: '1.1rem'
                        }}
                    >
                        {isGenerating ? 'جاري إنشاء التقرير...' : 'تنزيل التقرير PDF'}
                    </Button>
                </Box>

                {/* Info Section */}
                <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        📋 معلومات حول التقارير
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle2" color="primary">تقرير جميع الفواتير</Typography>
                            <Typography variant="body2" color="text.secondary">
                                يعرض جميع الفواتير المقدمة من مقدم الخدمة خلال الفترة المحددة مع المبالغ المطلوبة والمعتمدة.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle2" color="success.main">التقرير الربع سنوي</Typography>
                            <Typography variant="body2" color="text.secondary">
                                ملخص شامل لفترة 3 أشهر يتضمن إحصائيات مالية وتوزيع الحالات.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle2" color="error.main">تقرير الفواتير المرفوضة</Typography>
                            <Typography variant="body2" color="text.secondary">
                                قائمة تفصيلية بالفواتير المرفوضة أو المعتمدة جزئياً مع أسباب الرفض.
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </MainCard>
    );
}
