import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAppLocale } from 'utils/locale-helper';
import {
    Box,
    Stack,
    Typography,
    Card,
    CardContent,
    TextField,
    Grid,
    Chip,
    IconButton,
    Tooltip,
    Divider,
    CircularProgress,
    Button
} from '@mui/material';
import {
    Timeline,
    Search,
    FilterList,
    Refresh,
    Visibility,
    History,
    Person,
    ConfirmationNumber,
    CompareArrows
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader, ModernEmptyState } from 'components/tba';
import { useEntityHistory } from 'hooks/useEntityHistory';
import JSONView from './JSONView'; // We will create this
import AuditDetailModal from './AuditDetailModal'; // We can reuse or adapt this

const EntityHistoryDashboard = () => {
    const [filters, setFilters] = useState({
        entityType: '',
        entityId: '',
        correlationId: ''
    });

    const {
        data,
        loading,
        error,
        hasMore,
        loadMore,
        refresh
    } = useEntityHistory(filters);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const [selectedAudit, setSelectedAudit] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleViewDetails = (audit) => {
        setSelectedAudit(audit);
        setModalOpen(true);
    };

    return (
        <Box>
            <ModernPageHeader
                title="سجل التغييرات الكامل (Entity History)"
                subtitle="تتبع دقيق لجميع التعديلات على مستوى الكيانات مع معرفات التتبع"
                icon={History}
                breadcrumbs={[{ label: 'التدقيق', path: '/audit' }, { label: 'سجل التغييرات' }]}
                actions={
                    <Button variant="contained" startIcon={<Refresh />} onClick={refresh} disabled={loading}>
                        تحديث البيانات
                    </Button>
                }
            />

            <MainCard sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="نوع الكيان (مثلاً MEMBER, CLAIM)"
                            value={filters.entityType}
                            onChange={(e) => handleFilterChange('entityType', e.target.value.toUpperCase())}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            fullWidth
                            label="معرف الكيان (ID)"
                            value={filters.entityId}
                            onChange={(e) => handleFilterChange('entityId', e.target.value)}
                            size="small"
                            type="number"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="معرف التتبع (Correlation ID)"
                            value={filters.correlationId}
                            onChange={(e) => handleFilterChange('correlationId', e.target.value)}
                            size="small"
                            placeholder="UUID..."
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" fullWidth onClick={() => setFilters({ entityType: '', entityId: '', correlationId: '' })}>
                                مسح الفلاتر
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </MainCard>

            <Stack spacing={2}>
                {loading && data.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : data.length === 0 ? (
                    <ModernEmptyState
                        title="لا توجد سجلات"
                        description="لم يتم العثور على أي سجلات تاريخية للمرشحات المختارة."
                        icon={History}
                    />
                ) : (
                    data.map((item) => (
                        <Card key={item.id} sx={{ '&:hover': { boxShadow: 4, transform: 'scale(1.005)' }, transition: 'all 0.2s' }}>
                            <CardContent>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={2}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="caption" color="text.secondary">نوع الكيان والمُعرِّف</Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip label={item.entityType} size="small" color="primary" variant="outlined" />
                                                <Typography variant="body2" fontWeight="bold">#{item.entityId}</Typography>
                                            </Stack>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="caption" color="text.secondary">الإجراء</Typography>
                                            <Chip
                                                label={item.action}
                                                size="small"
                                                color={item.action === 'CREATE' ? 'success' : item.action === 'DELETE' ? 'error' : 'info'}
                                            />
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="caption" color="text.secondary">بواسطة</Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="body2">{item.performedBy}</Typography>
                                            </Stack>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="caption" color="text.secondary">التوقيت</Typography>
                                            <Typography variant="body2">{new Date(item.createdAt).toLocaleString(getAppLocale())}</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            {item.correlationId && (
                                                <Tooltip title={`Correlation ID: ${item.correlationId}`}>
                                                    <IconButton size="small" onClick={() => handleFilterChange('correlationId', item.correlationId)}>
                                                        <ConfirmationNumber fontSize="small" color="secondary" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<Visibility />}
                                                onClick={() => handleViewDetails(item)}
                                            >
                                                عرض التفاصيل
                                            </Button>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    ))
                )}

                {hasMore && (
                    <Button variant="outlined" onClick={loadMore} disabled={loading} sx={{ mt: 2 }}>
                        {loading ? <CircularProgress size={24} /> : 'تحميل المزيد'}
                    </Button>
                )}
            </Stack>

            {/* Reuse or create a new Detail Modal to show JSON diffs */}
            {selectedAudit && (
                <AuditDetailModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    audit={selectedAudit}
                    type="ENTITY_HISTORY"
                />
            )}
        </Box>
    );
};

export default EntityHistoryDashboard;
