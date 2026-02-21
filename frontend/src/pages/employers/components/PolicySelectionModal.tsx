import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Typography,
    CircularProgress,
    Box,
    Radio,
    Chip,
    Alert,
    Divider,
    Stack,
    Tooltip
} from '@mui/material';
import PolicyIcon from '@mui/icons-material/Policy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Services
import { getBenefitPoliciesByEmployer, activateBenefitPolicy } from 'services/api/benefit-policies.service';

/**
 * PolicySelectionModal - Component to link/activate a benefit policy for an employer
 * 
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close handler
 * @param {Object} employer - Employer object { id, name }
 * @param {number|null} currentPolicyId - Currently active policy ID
 * @param {function} onSuccess - Callback after successful activation
 */
const PolicySelectionModal = ({ open, onClose, employer, currentPolicyId, onSuccess }) => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPolicyId, setSelectedPolicyId] = useState(currentPolicyId);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && employer?.id) {
            fetchPolicies();
        }
    }, [open, employer?.id]);

    const fetchPolicies = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBenefitPoliciesByEmployer(employer.id);
            setPolicies(data || []);
            // If no current policy, but there are policies, default to none selected or first?
            // Better to keep user choice.
        } catch (err) {
            console.error('Error fetching policies:', err);
            setError('فشل تحميل قائمة الوثائق. يرجى المحاولة لاحقاً.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (id) => {
        setSelectedPolicyId(id);
    };

    const handleConfirm = async () => {
        if (!selectedPolicyId || selectedPolicyId === currentPolicyId) {
            onClose();
            return;
        }

        setSubmitting(true);
        try {
            await activateBenefitPolicy(selectedPolicyId);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error activating policy:', err);
            const msg = err.response?.data?.message || 'فشل تفعيل الوثيقة المختارة';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <PolicyIcon />
                    <Typography variant="h6" component="span">ربط وثيقة تأمين: {employer?.name}</Typography>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ mt: 2, minHeight: 300 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                ) : policies.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <ErrorOutlineIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography color="textSecondary" variant="h6">لا توجد وثائق منافع منشأة لهذه الجهة حالياً.</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            يرجى إنشاء وثيقة جديدة أولاً من خلال صفحة "وثائق المنافع".
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            اختر الوثيقة التي ترغب في تفعيلها لهذه الجهة. سيقوم النظام تلقائياً بتحويل أي وثيقة نشطة أخرى إلى مسودة.
                        </Typography>
                        <List sx={{ pt: 0 }}>
                            {policies.map((policy) => {
                                const isDraft = policy.status === 'DRAFT' && policy.id !== currentPolicyId;

                                return (
                                    <Tooltip
                                        key={policy.id}
                                        title={isDraft ? "يجب تفعيل الوثيقة من صفحة 'وثائق المنافع' أولاً لكي تصبح قابلة للربط" : ""}
                                        placement="top"
                                    >
                                        <Box>
                                            <ListItem
                                                button={!isDraft}
                                                disabled={isDraft}
                                                onClick={() => !isDraft && handleSelect(policy.id)}
                                                sx={{
                                                    mb: 1,
                                                    border: '1px solid',
                                                    borderColor: selectedPolicyId === policy.id ? 'primary.main' : 'divider',
                                                    borderRadius: 1,
                                                    bgcolor: selectedPolicyId === policy.id ? 'primary.lighter' : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: isDraft ? 'transparent' : (selectedPolicyId === policy.id ? 'primary.lighter' : 'rgba(0,0,0,0.04)')
                                                    },
                                                    opacity: isDraft ? 0.7 : 1,
                                                    cursor: isDraft ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <Radio
                                                        checked={selectedPolicyId === policy.id}
                                                        onChange={() => !isDraft && handleSelect(policy.id)}
                                                        value={policy.id}
                                                        disabled={isDraft}
                                                        name="policy-radio"
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="subtitle1" fontWeight="bold">
                                                                {policy.name}
                                                            </Typography>
                                                            {policy.id === currentPolicyId && (
                                                                <Chip
                                                                    label="نشطة حالياً"
                                                                    size="small"
                                                                    color="success"
                                                                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                                />
                                                            )}
                                                            {policy.status === 'DRAFT' && policy.id !== currentPolicyId && (
                                                                <Chip
                                                                    label="مسودة"
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="warning"
                                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    }
                                                    secondary={
                                                        <Box sx={{ mt: 0.5 }}>
                                                            <Typography variant="caption" display="block">الرمز: {policy.policyCode || '-'}</Typography>
                                                            <Typography variant="caption" display="block">
                                                                الفترة: {policy.startDate} إلى {policy.endDate}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                        </List>
                    </>
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={submitting}>
                    إلغاء
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!selectedPolicyId || selectedPolicyId === currentPolicyId || submitting || policies.length === 0}
                    startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                >
                    {submitting ? 'جاري الربط...' : 'تأكيد الربط والتفعيل'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PolicySelectionModal;
