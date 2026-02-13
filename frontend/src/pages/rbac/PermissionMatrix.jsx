import { useMemo, Fragment, useCallback, useState, useEffect } from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Checkbox,
    Snackbar,
    Tooltip,
    Tabs,
    Tab
} from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';

import useFetch from 'hooks/useFetch';
import { rbacService } from 'services/api';
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';

// Arabic Mapping for Modules
const MODULE_NAMES_AR = {
    SYSTEM: 'النظام',
    USER: 'المستخدمين',
    CLAIM: 'المطالبات',
    SETTLEMENT: 'التسوية',
    REPORT: 'التقارير',
    PROVIDER: 'مقدمي الخدمة',
    MEMBER: 'المعاملات',
    BENEFIT: 'المنافع',
    PLAN: 'الباقات',
    PROVIDER_PORTAL: 'بوابة مقدم الخدمة',
    OTHER: 'أخرى'
};

const PermissionMatrix = ({ isEmbedded = false }) => {
    const fetchMatrix = useCallback(() => rbacService.getPermissionMatrix(), []);
    const { data: remoteMatrix, loading: isLoading, error, refetch } = useFetch(fetchMatrix);

    const [matrixData, setMatrixData] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (remoteMatrix) {
            setMatrixData(remoteMatrix);
        }
    }, [remoteMatrix]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleTogglePermission = async (roleId, permissionId, currentStatus) => {
        if (!matrixData) return;

        // Optimistic Update
        const newRoles = matrixData.roles.map(role => {
            if (role.roleId === roleId) {
                const newMap = { ...role.permissionMap };
                // Find permission name to update map (needed for rendering)
                let permName = null;
                matrixData.categories.forEach(cat => {
                    const p = cat.permissions.find(p => p.id === permissionId);
                    if (p) permName = p.name;
                });

                if (permName) {
                    newMap[permName] = !currentStatus;
                }
                return { ...role, permissionMap: newMap };
            }
            return role;
        });

        setMatrixData({ ...matrixData, roles: newRoles });
        setUpdating(true);

        try {
            if (!currentStatus) {
                // Was false, now true -> Assign
                await rbacService.assignPermissionToRole(roleId, permissionId);
                setFeedback({ open: true, message: 'تم منح الصلاحية بنجاح', severity: 'success' });
            } else {
                // Was true, now false -> Remove
                await rbacService.removePermissionFromRole(roleId, permissionId);
                setFeedback({ open: true, message: 'تم إزالة الصلاحية بنجاح', severity: 'success' });
            }
        } catch (err) {
            console.error('Failed to update permission', err);
            // Revert on error
            setMatrixData(remoteMatrix);
            setFeedback({ open: true, message: 'فشل تحديث الصلاحية', severity: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const handleCloseFeedback = () => setFeedback({ ...feedback, open: false });

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error.message || 'فشل تحميل مصفوفة الصلاحيات'}</Alert>;
    }

    const roles = matrixData?.roles || [];
    const categories = matrixData?.categories || [];
    const activeCategory = categories.length > 0 ? categories[tabValue] : null;

    const content = (
        <Box sx={{ height: isEmbedded ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                >
                    {categories.map((cat, index) => (
                        <Tab
                            key={cat.name}
                            label={MODULE_NAMES_AR[cat.name] || cat.nameAr || cat.name}
                            sx={{ fontWeight: 'medium' }}
                        />
                    ))}
                </Tabs>
            </Box>

            <TableContainer component={Paper}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.lighter', minWidth: 200 }}>
                                الصلاحية / الدور
                            </TableCell>
                            {roles.map((role) => (
                                <TableCell key={role.roleId} align="center" sx={{ fontWeight: 'bold', bgcolor: 'primary.lighter', minWidth: 100 }}>
                                    <Tooltip title={role.roleName}>
                                        <span>{(role.roleNameAr || role.roleName).replace('ROLE_', '')}</span>
                                    </Tooltip>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {activeCategory && activeCategory.permissions.map((perm) => (
                            <TableRow key={perm.id} hover>
                                <TableCell sx={{ pl: 4, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 800 }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {perm.displayNameAr || perm.name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                                            {perm.name}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                {roles.map((role) => {
                                    const isSuperAdmin = role.roleName === 'ROLE_SUPER_ADMIN';
                                    const isChecked = role.permissionMap?.[perm.name] || false;

                                    return (
                                        <TableCell key={role.roleId} align="center" sx={{ p: 0 }}>
                                            <Checkbox
                                                checked={isChecked}
                                                onChange={() => handleTogglePermission(role.roleId, perm.id, isChecked)}
                                                disabled={isSuperAdmin || updating}
                                                color="primary"
                                                size="small"
                                            />
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                        {!activeCategory && (
                            <TableRow>
                                <TableCell colSpan={roles.length + 1} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">لا توجد صلاحيات لعرضها</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar
                open={feedback.open}
                autoHideDuration={4000}
                onClose={handleCloseFeedback}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
                    {feedback.message}
                </Alert>
            </Snackbar>
        </Box>
    );

    if (isEmbedded) {
        return <Box sx={{ height: '100%' }}>{content}</Box>;
    }

    return (
        <Box>
            <UnifiedPageHeader
                title="مصفوفة الصلاحيات"
                subtitle="إدارة جميع صلاحيات النظام وتعيينها للأدوار"
                icon={SecurityIcon}
            />

            <MainCard content={false} sx={{ p: 2 }}>
                {content}
            </MainCard>
        </Box>
    );
};

export default PermissionMatrix;
