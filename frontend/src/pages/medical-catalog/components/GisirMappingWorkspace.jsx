import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    InputLabel
} from '@mui/material';
import {
    Search as SearchIcon,
    CloudUpload as UploadIcon,
    Link as LinkIcon,
    ChevronLeft as ChevronLeftIcon,
    Storage as DictionaryIcon,
    Business as ProviderIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';

// Services
import { medicalCatalogService } from 'services/medicalCatalog.service';
import { providersService } from 'services/api/providers.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

// Components
import DictionaryTree from './DictionaryTree';

const GisirMappingWorkspace = () => {
    const [searchTermRaw, setSearchTermRaw] = useState('');
    const [searchTermDict, setSearchTermDict] = useState('');
    const [selectedRawService, setSelectedRawService] = useState(null);
    const [selectedMasterService, setSelectedMasterService] = useState(null);
    const [selectedProviderId, setSelectedProviderId] = useState('');

    const queryClient = useQueryClient();

    // Brand Color: Teal #008080
    const primaryTeal = '#008080';

    // 1. Fetch Providers for the Selector
    const { data: providersData } = useQuery({
        queryKey: ['providers-list'],
        queryFn: () => providersService.getAll({ size: 100 })
    });
    const providers = providersData?.content || [];

    // 2. Fetch Unmapped Services (Filtered by Provider if selected)
    const { data: rawServicesResponse, isLoading: loadingRaw } = useQuery({
        queryKey: ['unmapped-services', selectedProviderId, searchTermRaw],
        queryFn: () => medicalCatalogService.getUnmappedServices({
            providerId: selectedProviderId,
            searchTerm: searchTermRaw,
            page: 0,
            size: 50
        }),
        enabled: true
    });

    // 3. Fetch Master Categories
    const { data: categories } = useQuery({
        queryKey: ['medical-categories-all'],
        queryFn: () => getAllMedicalCategories()
    });

    const rawServices = rawServicesResponse?.data?.content || [];

    // --- DnD Logic (Start) ---
    const handleDragStart = (e, service) => {
        e.dataTransfer.setData('serviceId', service.id);
        e.dataTransfer.setData('serviceName', service.serviceName);
        setSelectedRawService(service);
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

    const handleMap = async (masterService = selectedMasterService) => {
        const targetRaw = selectedRawService;
        const targetMaster = masterService;

        if (!targetRaw || !targetMaster) return;

        try {
            await medicalCatalogService.mapService({
                rawServiceId: targetRaw.id,
                masterServiceId: targetMaster.id,
                confidence: 1.0,
                reasonCode: 'MANUAL_MAPPING'
            });

            setSelectedRawService(null);
            setSelectedMasterService(null);
            queryClient.invalidateQueries(['unmapped-services']);
        } catch (error) {
            console.error('Mapping failed', error);
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: '#F0F2F5' }}>
            <Grid container spacing={3} sx={{ height: '100%', overflow: 'hidden' }}>

                {/* 1. القاموس الطبي الموحد (الجهة اليسرى) - الآن Droppable */}
                <Grid item xs={12} md={4} sx={{ height: '100%' }}>
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

                {/* 2. منطقة الجسر (المنتصف) */}
                <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stack spacing={2} alignItems="center">
                        <Tooltip title="ربط عبر الجسر">
                            <Button
                                variant="contained"
                                onClick={() => handleMap()}
                                disabled={!selectedRawService || !selectedMasterService}
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
                        </Tooltip>
                        <Typography variant="caption" fontWeight={700} color={primaryTeal}>جسر (Gisir)</Typography>
                        {selectedRawService && <ChevronLeftIcon sx={{ color: primaryTeal, fontSize: 40, animation: 'slideRight 1s infinite' }} />}
                    </Stack>
                </Grid>

                {/* 3. قائمة خدمات مقدمي الخدمة (الجهة اليمنى) - Draggable Rows */}
                <Grid item xs={12} md={7} sx={{ height: '100%' }}>
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
                        {/* Provider Context Selector */}
                        <Box sx={{ p: 2, bgcolor: primaryTeal, color: 'white' }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <ProviderIcon />
                                <FormControl fullWidth size="small" sx={{
                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } },
                                    '& .MuiInputLabel-root': { color: 'white' },
                                    width: 300
                                }}>
                                    <InputLabel id="provider-select-label">اختر مقدم الخدمة للبدء...</InputLabel>
                                    <Select
                                        labelId="provider-select-label"
                                        value={selectedProviderId}
                                        label="اختر مقدم الخدمة للبدء..."
                                        onChange={(e) => setSelectedProviderId(e.target.value)}
                                    >
                                        <MenuItem value="">-- الكل --</MenuItem>
                                        {providers.map((p) => (
                                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    حدد مزود الخدمة لعزل التشتت وضمان دقة الربط.
                                </Typography>
                            </Stack>
                        </Box>

                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>خدمات مقدم الخدمة الحالي</Typography>
                                    <Typography variant="caption" color="textSecondary">اسحب الخدمة من هنا وأسقطها في القاموس الموحد</Typography>
                                </Box>
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
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, row)}
                                                onClick={() => setSelectedRawService(row)}
                                                selected={selectedRawService?.id === row.id}
                                                sx={{
                                                    cursor: 'grab',
                                                    '&.Mui-selected': { bgcolor: '#B2DFDB !important' },
                                                    '&:active': { cursor: 'grabbing' }
                                                }}
                                            >
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={600}>{row.serviceName}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip label={row.serviceCode} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                                                </TableCell>
                                                <TableCell align="right">{new Date(row.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" sx={{ color: primaryTeal }}>
                                                        <FilterIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {selectedProviderId && !loadingRaw && rawServices.length === 0 && (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 10 }}>لا توجد خدمات غير مربوطة لهذا المزود</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

            </Grid>

            {/* CSS Animation */}
            <style>
                {`
                @keyframes slideRight {
                    0% { transform: translateX(0); opacity: 0; }
                    50% { transform: translateX(-10px); opacity: 1; }
                    100% { transform: translateX(-20px); opacity: 0; }
                }
                `}
            </style>
        </Box>
    );
};

export default GisirMappingWorkspace;
