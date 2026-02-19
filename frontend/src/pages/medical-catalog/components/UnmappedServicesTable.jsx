import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    TextField,
    InputAdornment,
    Typography,
    Box,
    CircularProgress,
    IconButton,
    Stack
} from '@mui/material';
import {
    Search as SearchIcon,
    AutoFixHigh as AutoFixIcon,
    FilterList as FilterIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';

// Services
import { medicalCatalogService } from 'services/api/medical-catalog.service';

const UnmappedServicesTable = ({ onMap }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: response, isLoading } = useQuery({
        queryKey: ['unmapped-services', searchTerm],
        queryFn: () => medicalCatalogService.getUnmappedServices({ searchTerm, page: 0, size: 50 })
    });

    const services = response?.data?.content || [];

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="بحث في اسم الخدمة أو الكود..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ width: 300 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        )
                    }}
                />
                <Button startIcon={<FilterIcon />} color="secondary">
                    تصفية متقدمة
                </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell>مقدم الخدمة</TableCell>
                            <TableCell>كود الخدمة (Raw)</TableCell>
                            <TableCell>اسم الخدمة</TableCell>
                            <TableCell align="center">الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {services.map((service) => (
                            <TableRow key={service.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                        {service.providerName}
                                    </Typography>
                                </TableCell>
                                <TableCell><code>{service.serviceCode}</code></TableCell>
                                <TableCell>{service.serviceName}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label="غير مربوط"
                                        size="small"
                                        sx={{
                                            bgcolor: 'warning.lighter',
                                            color: 'warning.main',
                                            fontWeight: 'bold',
                                            border: '1px solid',
                                            borderColor: 'warning.light'
                                        }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<AutoFixIcon />}
                                            onClick={() => onMap(service)}
                                            sx={{
                                                bgcolor: 'primary.main',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                        >
                                            ربط الآن
                                        </Button>
                                        <IconButton size="small" title="معاينة">
                                            <ViewIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                        {services.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                    <Typography color="textSecondary">لا توجد خدمات غير مربوطة حالياً</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default UnmappedServicesTable;
