import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
    Box,
    Typography,
    Stack,
    Zoom
} from '@mui/material';
import {
    Delete as DeleteIcon,
    DeleteForever as DeleteForeverIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Help as HelpIcon,
    Error as ErrorIcon
} from '@mui/icons-material';

/**
 * Unified Confirm Dialog Component
 * 
 * A reusable dialog for confirmations (delete, warning, permanent actions).
 * 
 * @param {boolean} open - Dialog state
 * @param {string} title - Dialog title
 * @param {string|node} message - Main prompt message
 * @param {string} variant - 'delete' | 'permanent' | 'warning' | 'info' | 'error' | 'confirm'
 * @param {function} onConfirm - Success callback
 * @param {function} onCancel - Cancel callback
 * @param {string} confirmText - Label for confirm button
 * @param {string} cancelText - Label for cancel button
 * @param {boolean} loading - Loading state for buttons
 */
const ConfirmDialog = ({
    open,
    title,
    message,
    variant = 'delete',
    onConfirm,
    onCancel,
    confirmText,
    cancelText = 'إلغاء',
    loading = false,
    maxWidth = 'xs'
}) => {

    const variantConfig = {
        delete: {
            icon: <DeleteIcon color="error" />,
            color: 'error',
            defaultTitle: 'تأكيد الحذف',
            defaultConfirmText: 'حذف'
        },
        permanent: {
            icon: <DeleteForeverIcon color="error" />,
            color: 'error',
            defaultTitle: 'حذف نهائي',
            defaultConfirmText: 'حذف نهائي'
        },
        warning: {
            icon: <WarningIcon color="warning" />,
            color: 'warning',
            defaultTitle: 'تنبيه',
            defaultConfirmText: 'متابعة'
        },
        error: {
            icon: <ErrorIcon color="error" />,
            color: 'error',
            defaultTitle: 'خطأ',
            defaultConfirmText: 'إغلاق'
        },
        info: {
            icon: <InfoIcon color="info" />,
            color: 'info',
            defaultTitle: 'معلومات',
            defaultConfirmText: 'موافق'
        },
        confirm: {
            icon: <HelpIcon color="primary" />,
            color: 'primary',
            defaultTitle: 'تأكيد الإجراء',
            defaultConfirmText: 'تأكيد'
        }
    };

    const config = variantConfig[variant] || variantConfig.confirm;

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onCancel}
            maxWidth={maxWidth}
            fullWidth
            TransitionComponent={Zoom}
        >
            <DialogTitle sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1.5,
                mb: 1
            }}>
                {config.icon}
                <Typography variant="h6" fontWeight="bold">
                    {title || config.defaultTitle}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ py: 2 }}>
                <DialogContentText component="div">
                    <Typography variant="body1" color="text.primary">
                        {message}
                    </Typography>
                    {variant === 'permanent' && (
                        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold', mt: 1, display: 'block' }}>
                            تحذير: لا يمكن التراجع عن هذا الإجراء مستقبلاً.
                        </Typography>
                    )}
                </DialogContentText>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    variant="text"
                    color="inherit"
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    color={config.color}
                    variant="contained"
                    autoFocus
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ minWidth: 100 }}
                >
                    {confirmText || config.defaultConfirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ConfirmDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    title: PropTypes.string,
    message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
    variant: PropTypes.oneOf(['delete', 'permanent', 'warning', 'info', 'error', 'confirm']),
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    loading: PropTypes.bool,
    maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl'])
};

export default ConfirmDialog;
