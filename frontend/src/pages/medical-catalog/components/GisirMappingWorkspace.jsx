import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
    Box,
    Grid,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    Button,
    Stack,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    Autocomplete
} from '@mui/material';
import {
    Search as SearchIcon,
    CloudUpload as UploadIcon,
    Link as LinkIcon,
    ChevronLeft as ChevronLeftIcon,
    Storage as DictionaryIcon,
    Business as ProviderIcon,
    FilterList as FilterIcon,
    Add as AddIcon,
    Info as InfoIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';

// Services
import { medicalCatalogService } from 'services/medicalCatalog.service';
import { providersService } from 'services/api/providers.service';
import employersService from 'services/api/employers.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

// Components
import DictionaryTree from './DictionaryTree';

const GisirMappingWorkspace = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [searchTermRaw, setSearchTermRaw] = useState('');
    const [searchTermDict, setSearchTermDict] = useState('');
    const [selectedRawService, setSelectedRawService] = useState(null);
    const [selectedRawServiceIds, setSelectedRawServiceIds] = useState([]);
    const [selectedMasterService, setSelectedMasterService] = useState(null);
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [selectedEmployerId, setSelectedEmployerId] = useState('');

    // Add Raw Service Dialog State
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newServiceCode, setNewServiceCode] = useState('');
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceDesc, setNewServiceDesc] = useState('');

    const queryClient = useQueryClient();

    // Brand Color: Teal #008080
    const primaryTeal = '#008080';

    // 1. Fetch Providers for the Selector
    const { data: providersData } = useQuery({
        queryKey: ['providers-list'],
        queryFn: () => providersService.getAll({ size: 100 })
    });
    const providers = providersData?.content || [];

    // 1b. Fetch Employers for the Selector
    const { data: employersData } = useQuery({
        queryKey: ['employers-selectors'],
        queryFn: () => employersService.getEmployerSelectors()
    });
    const employers = employersData?.data || [];

    // 2. Fetch Unmapped Services (Filtered by Provider if selected)
    const { data: rawServicesResponse, isLoading: loadingRaw } = useQuery({
        queryKey: ['unmapped-services', selectedProviderId, selectedEmployerId, searchTermRaw],
        queryFn: () => medicalCatalogService.getUnmappedServices({
            providerId: selectedProviderId,
            employerId: selectedEmployerId,
            searchTerm: searchTermRaw,
            page: 0,
            size: 100
        }),
        enabled: !!selectedProviderId
    });

    // 3. Fetch Master Categories
    const { data: categories } = useQuery({
        queryKey: ['medical-categories-all'],
        queryFn: () => getAllMedicalCategories()
    });

    const rawServices = rawServicesResponse?.content || [];

    // --- DnD Logic (Start) ---
    const handleDragStart = (e, service) => {
        e.dataTransfer.setData('serviceId', service.id);
        e.dataTransfer.setData('serviceName', service.serviceName);
        setSelectedRawService(service);
        // If not already in multi-selection, add it
        if (!selectedRawServiceIds.includes(service.id)) {
            setSelectedRawServiceIds(prev => [...prev, service.id]);
        }
        // Visual ghost effect
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleImportExcel = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedProviderId) return;

        try {
            await medicalCatalogService.uploadRawServices(file, selectedProviderId);
            queryClient.invalidateQueries(['unmapped-services']);
        } catch (error) {
            console.error('Import failed', error);
        }
    };

    const handleAddRawService = async () => {
        if (!newServiceCode.trim() || !newServiceName.trim()) return;

        // Create a simple CSV content
        const csvContent = `${newServiceCode},${newServiceName},${newServiceDesc || ''}`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const file = new File([blob], 'manual-entry.csv', { type: 'text/csv' });

        try {
            await medicalCatalogService.uploadRawServices(file, selectedProviderId);
            queryClient.invalidateQueries(['unmapped-services']);
            setAddDialogOpen(false);
            setNewServiceCode('');
            setNewServiceName('');
            setNewServiceDesc('');
        } catch (error) {
            console.error('Failed to add raw service', error);
        }
    };

    const handleImportFromContract = async () => {
        if (!selectedProviderId) return;

        try {
            const result = await medicalCatalogService.importFromContract(selectedProviderId);
            enqueueSnackbar(`تم استيراد ${result.data || 0} خدمة من عقد التأمين`, { variant: 'success' });
            queryClient.invalidateQueries(['unmapped-services']);
        } catch (error) {
            console.error('Failed to import from contract', error);
            enqueueSnackbar('فشل استيراد الخدمات من العقد', { variant: 'error' });
        }
    };

    const handleMap = async (masterService = selectedMasterService) => {
        const ids = selectedRawServiceIds.length > 0
            ? selectedRawServiceIds
            : (selectedRawService ? [selectedRawService.id] : []);

        const targetMaster = masterService;

        if (ids.length === 0 || !targetMaster) return;

        try {
            await medicalCatalogService.mapService({
                rawServiceIds: ids,
                masterServiceId: targetMaster.id,
                confidence: 1.0,
                reasonCode: 'MANUAL_MAPPING'
            });

            enqueueSnackbar(`تم ربط ${ids.length} خدمة بنجاح`, { variant: 'success' });
            setSelectedRawService(null);
            setSelectedRawServiceIds([]);
            setSelectedMasterService(null);
            queryClient.invalidateQueries(['unmapped-services']);
        } catch (error) {
            console.error('Mapping failed', error);
            enqueueSnackbar('فشل عملية الربط', { variant: 'error' });
        }
    };

    const handleToggleSelectRow = (id) => {
        setSelectedRawServiceIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedRawServiceIds.length === rawServices.length) {
            setSelectedRawServiceIds([]);
        } else {
            setSelectedRawServiceIds(rawServices.map(s => s.id));
        }
    };

    return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, px: 3, pb: 3, bgcolor: '#F0F2F5' }}>
            <Grid container spacing={3} sx={{ height: '100%', overflow: 'hidden' }}>

                {/* 1. قائمة خدمات مقدمي الخدمة (الجهة اليمنى) - Draggable Rows */}
                <Grid size={{ xs: 12, md: 7 }} sx={{ height: '100%' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Selector Header */}
                        <Box sx={{ p: 2, bgcolor: primaryTeal, color: 'white' }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <ProviderIcon />
                                <Stack direction="row" spacing={1} flexGrow={1}>
                                    <Autocomplete
                                        size="small"
                                        options={providers}
                                        getOptionLabel={(option) => option.name || ''}
                                        value={providers.find(p => p.id === selectedProviderId) || null}
                                        onChange={(_, newValue) => {
                                            setSelectedProviderId(newValue ? newValue.id : '');
                                            setSelectedRawServiceIds([]);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="مقدم الخدمة"
                                                sx={{
                                                    minWidth: 250,
                                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } },
                                                    '& .MuiInputLabel-root': { color: 'white' }
                                                }}
                                            />
                                        )}
                                    />

                                    <Autocomplete
                                        size="small"
                                        options={employers}
                                        getOptionLabel={(option) => option.name || ''}
                                        value={employers.find(e => e.id === selectedEmployerId) || null}
                                        onChange={(_, newValue) => {
                                            setSelectedEmployerId(newValue ? newValue.id : '');
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="جهة العمل (اختياري)"
                                                sx={{
                                                    width: 250,
                                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } },
                                                    '& .MuiInputLabel-root': { color: 'white' }
                                                }}
                                            />
                                        )}
                                    />
                                </Stack>
                            </Stack>
                        </Box>

                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                            {/* Info Alert */}
                            <Alert
                                severity="info"
                                icon={<InfoIcon />}
                                sx={{ mb: 2, textAlign: 'right', '& .MuiAlert-message': { width: '100%' } }}
                            >
                                <Typography variant="body2" fontWeight={600}>ما هي الخدمات الواردة؟</Typography>
                                <Typography variant="caption" display="block">
                                    الخدمات الواردة هي أكواد خاصة بكل مقدم (مثل &quot;LAB-ABC-123&quot;) تحتاج لربطها بالقاموس الطبي الموحد.
                                    يمكن إضافتها يدوياً أو استيرادها من ملف Excel.
                                </Typography>
                            </Alert>

                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>خدمات مقدم الخدمة المحددة</Typography>
                                    <Typography variant="caption" color="textSecondary">اسحب الخدمة من هنا وأسقطها في القاموس الموحد</Typography>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => setAddDialogOpen(true)}
                                        disabled={!selectedProviderId}
                                        size="small"
                                    >
                                        إضافة يدوية
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DescriptionIcon />}
                                        onClick={handleImportFromContract}
                                        disabled={!selectedProviderId}
                                        size="small"
                                        color="primary"
                                    >
                                        من عقد التأمين
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadIcon />}
                                        component="label"
                                        disabled={!selectedProviderId}
                                        size="small"
                                    >
                                        استيراد ملف (Excel)
                                        <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleImportExcel} />
                                    </Button>
                                </Stack>
                            </Stack>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="بحث في الخدمات الواردة..."
                                value={searchTermRaw}
                                onChange={(e) => setSearchTermRaw(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ bgcolor: '#F8FAFC' }}
                            />
                        </Box>

                        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center" padding="checkbox">
                                            <Checkbox
                                                indeterminate={selectedRawServiceIds.length > 0 && selectedRawServiceIds.length < rawServices.length}
                                                checked={rawServices.length > 0 && selectedRawServiceIds.length === rawServices.length}
                                                onChange={handleSelectAll}
                                                sx={{ color: primaryTeal }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">اسم الخدمة</TableCell>
                                        <TableCell align="right">الكود</TableCell>
                                        <TableCell align="right">تاريخ الورود</TableCell>
                                        <TableCell align="center" sx={{ width: 60 }}>سحب</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {!selectedProviderId ? (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 10 }}>يرجى اختيار مقدم الخدمة أولاً</TableCell></TableRow>
                                    ) : loadingRaw ? (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell></TableRow>
                                    ) : (
                                        rawServices.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                selected={selectedRawServiceIds.includes(row.id)}
                                                sx={{
                                                    cursor: 'grab',
                                                    '&.Mui-selected': { bgcolor: '#E0F2F1 !important' },
                                                    '&:hover': { bgcolor: '#F5F5F5' }
                                                }}
                                            >
                                                <TableCell align="center" padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedRawServiceIds.includes(row.id)}
                                                        onChange={() => handleToggleSelectRow(row.id)}
                                                        sx={{ color: primaryTeal }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, row)}
                                                    onClick={() => handleToggleSelectRow(row.id)}
                                                >
                                                    <Typography variant="body2" fontWeight={600}>{row.serviceName}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip label={row.serviceCode} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                                                </TableCell>
                                                <TableCell align="right">{new Date(row.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: primaryTeal }}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, row)}
                                                    >
                                                        <FilterIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {selectedProviderId && !loadingRaw && rawServices.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                                    <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                                                        لا توجد خدمات واردة لهذا المقدم
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                                        الخدمات الواردة هي أكواد خاصة بالمقدم تحتاج للربط بالقاموس الموحد
                                                    </Typography>
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<AddIcon />}
                                                            onClick={() => setAddDialogOpen(true)}
                                                        >
                                                            إضافة خدمة يدوياً
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<UploadIcon />}
                                                            component="label"
                                                        >
                                                            استيراد من Excel
                                                            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleImportExcel} />
                                                        </Button>
                                                    </Stack>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
                {/* 2. منطقة الجسر (المنتصف) */}
                <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stack spacing={2} alignItems="center">
                        <Tooltip title="ربط عبر الجسر">
                            <Box component="span">
                                <Button
                                    variant="contained"
                                    onClick={() => handleMap()}
                                    disabled={(selectedRawServiceIds.length === 0 && !selectedRawService) || !selectedMasterService}
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        bgcolor: primaryTeal,
                                        '&:hover': { bgcolor: '#006666' },
                                        boxShadow: '0 8px 16px rgba(0,128,128,0.2)'
                                    }}
                                >
                                    <LinkIcon />
                                </Button>
                            </Box>
                        </Tooltip>
                        <Typography variant="caption" fontWeight={700} color={primaryTeal}>جسر (Gisir)</Typography>
                        {(selectedRawService || selectedRawServiceIds.length > 0) && (
                            <ChevronLeftIcon sx={{
                                color: primaryTeal,
                                fontSize: 40,
                                animation: 'slideTransition 1s infinite'
                            }} />
                        )}
                    </Stack>
                </Grid>

                {/* 3. القاموس الطبي الموحد (الجهة اليسرى) */}
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden'
                        }}
                    >
                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <DictionaryIcon sx={{ color: primaryTeal }} />
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>القاموس الطبي الموحد</Typography>
                                    <Typography variant="caption" color="textSecondary">Unified Medical Dictionary</Typography>
                                </Box>
                            </Stack>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="بحث في القاموس..."
                                value={searchTermDict}
                                onChange={(e) => setSearchTermDict(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ bgcolor: '#F8FAFC' }}
                            />
                        </Box>

                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                            <DictionaryTree
                                searchTerm={searchTermDict}
                                categories={categories || []}
                                onSelect={setSelectedMasterService}
                                selectedId={selectedMasterService?.id}
                                onDrop={handleMap}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* CSS Animation */}
            <style>
                {`
                @keyframes slideTransition {
                    0% { transform: translateX(0); opacity: 0; }
                    50% { transform: translateX(-10px); opacity: 1; }
                    100% { transform: translateX(-20px); opacity: 0; }
                }
                `}
            </style>

            {/* Add Raw Service Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ textAlign: 'right' }}>
                    إضافة خدمة واردة يدوياً
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        أدخل كود الخدمة واسمها كما يظهر في نظام المقدم
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            label="كود الخدمة *"
                            value={newServiceCode}
                            onChange={(e) => setNewServiceCode(e.target.value)}
                            fullWidth
                            required
                            placeholder="مثال: LAB-ABC-123"
                        />
                        <TextField
                            label="اسم الخدمة *"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            fullWidth
                            required
                            placeholder="مثال: تحليل دم شامل"
                        />
                        <TextField
                            label="الوصف (اختياري)"
                            value={newServiceDesc}
                            onChange={(e) => setNewServiceDesc(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="وصف إضافي للخدمة..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddRawService}
                        disabled={!newServiceCode.trim() || !newServiceName.trim()}
                        sx={{ bgcolor: primaryTeal, '&:hover': { bgcolor: '#006666' } }}
                    >
                        إضافة الخدمة
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GisirMappingWorkspace;
