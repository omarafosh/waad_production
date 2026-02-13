import { useState, useMemo } from 'react';
import {
    Box,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    Tabs,
    Tab
} from '@mui/material';
import { Search as SearchIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import useFetch from 'hooks/useFetch';
// Use rbacService to get permissions. 
// Assuming rbacService.getPermissions() or similar exists or we use getPermissionMatrix and extract unique permissions.
// If getPermissions doesn't exist, we can use getPermissionMatrix temporarily.
import { rbacService } from 'services/api';

const PermissionsList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    // Fetch all permissions directly
    const { data: permissions, loading, error } = useFetch(() => rbacService.getPermissions());

    const filteredPermissions = useMemo(() => {
        if (!permissions) return [];

        // 1. Filter by Search Term
        let result = permissions.filter(p =>
            (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // 2. Filter by Category (Tab)
        const categories = ['GENERAL', 'PORTAL', 'REPORTS'];
        const selectedCategory = categories[activeTab];

        if (selectedCategory) {
            result = result.filter(p => p.category === selectedCategory);
        }

        return result;
    }, [permissions, searchTerm, activeTab]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <ModernPageHeader
                title="قائمة الصلاحيات"
                subtitle="عرض جميع الصلاحيات المعرفة في النظام"
                icon={<VpnKeyIcon fontSize="large" color="primary" />}
            />

            <Card sx={{ p: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="permission categories">
                        <Tab label="عام (General)" />
                        <Tab label="بوابة المستفيدين (Portal)" />
                        <Tab label="التقارير (Reports)" />
                    </Tabs>
                </Box>

                <Box sx={{ mb: 3, maxWidth: 500 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="بحث عن صلاحية..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>الصلاحية</TableCell>
                                <TableCell>الرمز (Code)</TableCell>
                                <TableCell>التصنيف</TableCell>
                                <TableCell>الوصف</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPermissions.length > 0 ? (
                                filteredPermissions.map((perm) => (
                                    <TableRow key={perm.id || perm.name}>
                                        <TableCell>
                                            <Typography variant="subtitle2">{perm.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {/* Using name as code if code field is missing in DTO, but usually code is the name in programming terms */}
                                            <Chip label={perm.name} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={perm.category}
                                                size="small"
                                                color={
                                                    perm.category === 'PORTAL' ? 'secondary' :
                                                        perm.category === 'REPORTS' ? 'warning' : 'primary'
                                                }
                                                variant="filled"
                                                sx={{ borderRadius: 1 }}
                                            />
                                        </TableCell>
                                        <TableCell color="text.secondary">
                                            {perm.description || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        <Typography sx={{ py: 3, color: 'text.secondary' }}>
                                            {loading ? 'جاري التحميل...' : 'لا توجد صلاحيات لعرضها في هذا التصنيف'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default PermissionsList;
