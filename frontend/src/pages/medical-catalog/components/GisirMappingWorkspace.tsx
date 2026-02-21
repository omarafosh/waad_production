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
    Description as DescriptionIcon,
    LinkOff as UnlinkIcon
} from '@mui/icons-material';

// Services
import { medicalCatalogService } from 'services/api/medical-catalog.service';
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
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'mapped', 'unmapped'
    const [isMapping, setIsMapping] = useState(false);

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

    // 2. Fetch Raw Services (Filtered by Provider and Status)
    const { data: rawServicesResponse, isLoading: loadingRaw } = useQuery({
        queryKey: ['raw-services', selectedProviderId, statusFilter, searchTermRaw],
        queryFn: () => medicalCatalogService.getFilteredServices({
            providerId: selectedProviderId,
            mapped: statusFilter === 'all' ? null : (statusFilter === 'mapped'),
            searchTerm: searchTermRaw,
            page: 0,
            size: 200
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


    const handleMap = async (masterService = selectedMasterService) => {
        const ids = selectedRawServiceIds.length > 0
            ? selectedRawServiceIds
            : (selectedRawService ? [selectedRawService.id] : []);

        const targetMaster = masterService;

        if (ids.length === 0 || !targetMaster || isMapping) return;

        setIsMapping(true);
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
            queryClient.invalidateQueries(['raw-services']);
        } catch (error) {
            console.error('Mapping failed', error);
            enqueueSnackbar('فشل عملية الربط', { variant: 'error' });
        } finally {
            setIsMapping(false);
        }
    };

    const handleUnlink = async (ids) => {
        if (!ids || ids.length === 0 || isMapping) return;

        setIsMapping(true);
        try {
            await medicalCatalogService.unmapServices(ids);
            enqueueSnackbar('تم فك الربط بنجاح', { variant: 'success' });
            setSelectedRawServiceIds([]);
            queryClient.invalidateQueries(['raw-services']);
        } catch (error) {
            console.error('Unlink failed', error);
            enqueueSnackbar('فشل فك الربط', { variant: 'error' });
        } finally {
            setIsMapping(false);
        }
    };

    const handleToggleSelectRow = (id) => {
        setSelectedRawServiceIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const unmappedServices = rawServices.filter(s => !s.mapped);
        if (selectedRawServiceIds.length === unmappedServices.length) {
            setSelectedRawServiceIds([]);
        } else {
            setSelectedRawServiceIds(unmappedServices.map(s => s.id));
        }
    };

    return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, px: 2, pb: 2, bgcolor: '#F0F2F5' }}>
            <Grid container spacing={1} sx={{ height: '100%', overflow: 'hidden' }}>

                {/* 1. قائمة خدمات مقدمي الخدمة (الجهة اليمنى) - Draggable Rows */}
                <Grid size={{ xs: 12, md: 7 }} sx={{ height: '100%' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 0, // Sharp corners
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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
                                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                                        renderOption={(props, option) => {
                                            const { key, ...optionProps } = props;
                                            return (
                                                <li key={option.id} {...optionProps}>
                                                    {option.name}
                                                </li>
                                            );
                                        }}
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

                                    {/* Status Filters moved to Header */}
                                    <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                                        <Button
                                            variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                                            onClick={() => setStatusFilter('all')}
                                            size="small"
                                            sx={{
                                                bgcolor: statusFilter === 'all' ? 'white' : 'rgba(255,255,255,0.1)',
                                                color: statusFilter === 'all' ? primaryTeal : 'white',
                                                borderColor: 'rgba(255,255,255,0.5)',
                                                '&:hover': { bgcolor: statusFilter === 'all' ? '#f5f5f5' : 'rgba(255,255,255,0.2)' }
                                            }}
                                        >
                                            الكل
                                        </Button>
                                        <Button
                                            variant={statusFilter === 'unmapped' ? 'contained' : 'outlined'}
                                            onClick={() => setStatusFilter('unmapped')}
                                            size="small"
                                            sx={{
                                                bgcolor: statusFilter === 'unmapped' ? '#ffcdd2' : 'rgba(255,255,255,0.1)',
                                                color: statusFilter === 'unmapped' ? '#d32f2f' : 'white',
                                                borderColor: 'rgba(255,255,255,0.5)',
                                                '&:hover': { bgcolor: statusFilter === 'unmapped' ? '#ef9a9a' : 'rgba(255,255,255,0.2)' }
                                            }}
                                        >
                                            غير مربوط
                                        </Button>
                                        <Button
                                            variant={statusFilter === 'mapped' ? 'contained' : 'outlined'}
                                            onClick={() => setStatusFilter('mapped')}
                                            size="small"
                                            sx={{
                                                bgcolor: statusFilter === 'mapped' ? '#c8e6c9' : 'rgba(255,255,255,0.1)',
                                                color: statusFilter === 'mapped' ? '#388e3c' : 'white',
                                                borderColor: 'rgba(255,255,255,0.5)',
                                                '&:hover': { bgcolor: statusFilter === 'mapped' ? '#a5d6a7' : 'rgba(255,255,255,0.2)' }
                                            }}
                                        >
                                            مربوط
                                        </Button>
                                    </Stack>
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
                                    <Typography variant="h6" fontWeight={700}>خدمات مقدم الخدمة </Typography>
                                    <Typography variant="caption" color="textSecondary">اسحب الخدمة من هنا وأسقطها في القاموس الموحد</Typography>
                                </Box>
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
                                        <TableCell align="right">التصنيف</TableCell>
                                        <TableCell align="right">التخصص</TableCell>
                                        <TableCell align="center">الحالة</TableCell>
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
                                                draggable={!row.mapped}
                                                onDragStart={(e) => !row.mapped && handleDragStart(e, row)}
                                                sx={{
                                                    cursor: row.mapped ? 'default' : 'grab',
                                                    '&.Mui-selected': { bgcolor: 'rgba(0, 128, 128, 0.08) !important' },
                                                    '&:active': { cursor: row.mapped ? 'default' : 'grabbing' },
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                <TableCell align="center" padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedRawServiceIds.includes(row.id)}
                                                        onChange={() => handleToggleSelectRow(row.id)}
                                                        disabled={row.mapped}
                                                        sx={{ color: primaryTeal }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right"
                                                    onClick={() => !row.mapped && handleToggleSelectRow(row.id)}
                                                >
                                                    <Typography variant="body2" fontWeight={700}>{row.serviceName}</Typography>
                                                    {row.mapped && row.medicalServiceCode && (
                                                        <Typography variant="caption" color="success.main" display="block" sx={{ fontWeight: 600 }}>
                                                            مربوط بـ: {row.medicalServiceCode}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={row.serviceCode}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 0, fontWeight: 600, bgcolor: 'rgba(0,0,0,0.02)' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="caption" fontWeight={500}>{row.category || '-'}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="caption" fontWeight={500}>{row.specialty || '-'}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={row.mapped ? 'مربوط' : 'غير مربوط'}
                                                        size="small"
                                                        color={row.mapped ? 'success' : 'error'}
                                                        variant={row.mapped ? 'filled' : 'outlined'}
                                                        sx={{ borderRadius: 0, minWidth: 70 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    {row.mapped ? (
                                                        <Tooltip title="فك الربط">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleUnlink([row.id])}
                                                                sx={{ color: '#d32f2f', '&:hover': { bgcolor: '#ffebee' } }}
                                                            >
                                                                <UnlinkIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : (
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: primaryTeal, cursor: 'grab' }}
                                                        >
                                                            <FilterIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
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
                                                        سيتم جلب الخدمات آلياً من العقود النشطة لهذا المقدم
                                                    </Typography>
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
                        <Tooltip title={isMapping ? "جاري المعالجة..." : "ربط عبر الجسر"}>
                            <Box component="span">
                                <Button
                                    variant="contained"
                                    onClick={() => handleMap()}
                                    disabled={isMapping || (selectedRawServiceIds.length === 0 && !selectedRawService) || !selectedMasterService}
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        bgcolor: primaryTeal,
                                        '&:hover': { bgcolor: '#006666' },
                                        boxShadow: '0 8px 16px rgba(0,128,128,0.2)'
                                    }}
                                >
                                    {isMapping ? <CircularProgress size={24} color="inherit" /> : <LinkIcon />}
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
                            borderRadius: 0, // Sharp corners
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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

        </Box>
    );
};

export default GisirMappingWorkspace;
