import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    TextField,
    Alert,
    Stack
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { getLifecyclePreview, executeLifecycleAction } from '../../../services/api/lifecycle.service';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import CancelIcon from '@mui/icons-material/Cancel';
import RestoreIcon from '@mui/icons-material/Restore';

const LifecycleActionModal = ({ open, onClose, entityType, entityId, onSuccess }) => {
    const [loading, setLoading] = useState(true);
    const [previewData, setPreviewData] = useState(null);
    const [selectedAction, setSelectedAction] = useState(null);
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && entityType && entityId) {
            loadPreview();
        } else {
            // Reset state on close
            setPreviewData(null);
            setSelectedAction(null);
            setReason('');
            setNotes('');
            setError(null);
        }
    }, [open, entityType, entityId]);

    const loadPreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getLifecyclePreview(entityType, entityId);
            setPreviewData(data);
        } catch (err) {
            setError('فشل تحميل خيارات الإجراءات.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!selectedAction) return;

        setSubmitting(true);
        setError(null);
        try {
            await executeLifecycleAction(entityType, entityId, {
                action: selectedAction.action,
                reason: reason,
                notes: notes
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'فشل تنفيذ الإجراء.');
        } finally {
            setSubmitting(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CANCEL': return <CancelIcon />;
            case 'TERMINATE': return <WarningIcon />;
            case 'ARCHIVE': return <ArchiveIcon />;
            case 'HARD_DELETE': return <DeleteIcon />;
            case 'RESTORE': return <RestoreIcon />;
            default: return <InfoIcon />;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'DANGER': return 'error';
            case 'WARNING': return 'warning';
            default: return 'primary';
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error && !previewData) {
            return <Alert severity="error">{error}</Alert>;
        }

        if (!selectedAction) {
            // Step 1: Select Action
            return (
                <Stack spacing={2}>
                    <Alert severity="info">
                        الحالة الحالية: <strong>{previewData?.currentStatus}</strong>
                    </Alert>
                    <Typography variant="subtitle1">يرجى اختيار الإجراء المناسب:</Typography>
                    {previewData?.allowedActions?.length === 0 && (
                        <Typography color="text.secondary" align="center">لا توجد إجراءات متاحة حالياً لهذا العنصر.</Typography>
                    )}
                    {previewData?.allowedActions?.map((option) => (
                        <Button
                            key={option.action}
                            variant="outlined"
                            color={getSeverityColor(option.severity)}
                            startIcon={getActionIcon(option.action)}
                            onClick={() => setSelectedAction(option)}
                            sx={{ justifyContent: 'flex-start', p: 1.5, textAlign: 'left' }}
                        >
                            <Box>
                                <Typography variant="subtitle2">{option.label}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {option.impactSummary}
                                </Typography>
                            </Box>
                        </Button>
                    ))}
                </Stack>
            );
        } else {
            // Step 2: Confirm Action
            return (
                <Stack spacing={2}>
                    <Alert severity={getSeverityColor(selectedAction.severity)} icon={getActionIcon(selectedAction.action)}>
                        <Typography variant="subtitle2">أنت بصدد: {selectedAction.label}</Typography>
                        {selectedAction.impactSummary}
                    </Alert>

                    <TextField
                        label="سبب الإجراء"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required={selectedAction.requiresReason}
                        fullWidth
                        select
                        SelectProps={{ native: true }}
                    >
                        <option value="">اختر...</option>
                        {selectedAction.reasonOptions?.map((reasonOption) => (
                            <option key={reasonOption.code} value={reasonOption.code}>
                                {reasonOption.labelAr} ({reasonOption.code})
                            </option>
                        ))}
                    </TextField>

                    <TextField
                        label="ملاحظات إضافية"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="اشرح سبب الإجراء بالتفصيل..."
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            );
        }
    };

    return (
        <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="sm" fullWidth>
            <DialogTitle>
                {selectedAction ? `تأكيد الإجراء: ${selectedAction.label}` : 'إدارة دورة حياة العنصر'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    {renderContent()}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    if (selectedAction) setSelectedAction(null);
                    else onClose();
                }} disabled={submitting}>
                    {selectedAction ? 'رجوع' : 'إغلاق'}
                </Button>

                {selectedAction && (
                    <LoadingButton
                        onClick={handleExecute}
                        loading={submitting}
                        variant="contained"
                        color={getSeverityColor(selectedAction.severity)}
                        disabled={selectedAction.requiresReason && !reason}
                    >
                        تأكيد التنفيذ
                    </LoadingButton>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default LifecycleActionModal;
