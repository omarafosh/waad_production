import React from 'react';
import { Close, Minimize, ExpandLess, CheckCircle, Error as ErrorIcon, ListAlt } from '@mui/icons-material';
import {
    Box,
    Typography,
    Paper,
    LinearProgress,
    IconButton,
    Collapse,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip
} from '@mui/material';
import { useImportProgress } from 'contexts/GlobalImportProgressContext';

/**
 * GlobalImportWidget
 * 
 * A floating widget that displays the progress of an active import.
 * Extracted from GlobalImportProgressContext to separate UI from state logic.
 */

const CircularLoader: React.FC<{ size: number }> = ({ size }) => (
    <Box sx={{
        animation: 'spin 1s linear infinite',
        display: 'flex',
        '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
        }
    }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
    </Box>
);

const ChipLabel: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="caption" color="textSecondary">{label}:</Typography>
        <Typography variant="caption" fontWeight="bold" sx={{ color: color }}>{count}</Typography>
    </Box>
);

const GlobalImportWidget = () => {
    const {
        activeImport,
        isMinimized,
        setIsMinimized,
        dismissImport,
        viewErrors,
        isErrorModalOpen,
        setIsErrorModalOpen,
        errorDetails
    } = useImportProgress();

    if (!activeImport) return null;

    return (
        <>
            {/* Floating Widget */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    width: 320,
                    transition: 'all 0.3s ease'
                }}
            >
                <Paper
                    elevation={6}
                    sx={{
                        p: 2,
                        borderLeft: '6px solid',
                        borderColor: activeImport.status === 'COMPLETED' ? 'success.main' :
                            activeImport.status === 'FAILED' ? 'error.main' : 'primary.main',
                        overflow: 'hidden'
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMinimized ? 0 : 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            {activeImport.status === 'PROCESSING' && <CircularLoader size={16} />}
                            {activeImport.status === 'COMPLETED' && <CheckCircle color="success" fontSize="small" />}
                            {activeImport.status === 'FAILED' && <ErrorIcon color="error" fontSize="small" />}
                            {activeImport.fileName}
                        </Typography>
                        <Box>
                            <IconButton size="small" onClick={() => setIsMinimized(!isMinimized)}>
                                {isMinimized ? <ExpandLess /> : <Minimize />}
                            </IconButton>
                            {(activeImport.status === 'COMPLETED' || activeImport.status === 'FAILED' || activeImport.status === 'PARTIAL') && (
                                <IconButton size="small" onClick={dismissImport}>
                                    <Close />
                                </IconButton>
                            )}
                        </Box>
                    </Box>

                    <Collapse in={!isMinimized}>
                        <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="textSecondary">
                                    {(() => {
                                        const s = activeImport.status?.toString()?.toUpperCase();
                                        if (s === 'PROCESSING') return 'جاري الاستيراد...';
                                        if (s === 'VALIDATING' || s === 'VALIDATION') return 'جاري فحص الملف...';
                                        if (s === 'COMPLETED') return 'تم الانتهاء بنجاح';
                                        if (s === 'PARTIAL') return 'اكتمل مع وجود أخطاء';
                                        if (s === 'FAILED') return 'فشل الاستيراد';
                                        if (s === 'PENDING') return 'في الانتظار...';
                                        return 'جاري التحضير...';
                                    })()}
                                </Typography>
                                <Typography variant="caption" fontWeight="bold">
                                    {activeImport.processedRows || 0} / {activeImport.total || 0} ({Math.round(activeImport.progress)}%)
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={activeImport.progress}
                                color={
                                    activeImport.status === 'FAILED' ? 'error' :
                                        activeImport.status === 'COMPLETED' ? 'success' :
                                            activeImport.status === 'PARTIAL' ? 'warning' : 'primary'
                                }
                                sx={{ height: 6, borderRadius: 1 }}
                            />

                            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                                <ChipLabel label="جديد" count={activeImport.counts.created} color="success.main" />
                                <ChipLabel label="تحديث" count={activeImport.counts.updated} color="info.main" />
                                <ChipLabel label="أخطاء" count={activeImport.counts.error} color="error.main" />
                            </Box>

                            {(activeImport.status === 'FAILED' || activeImport.errorMessage) && (
                                <Alert severity="error" sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
                                    {activeImport.errorMessage || "فشل الاستيراد: الرجاء التأكد من صحة الملف وصلاحياتك."}
                                </Alert>
                            )}

                            {(activeImport.counts.error > 0) && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ListAlt />}
                                    onClick={() => viewErrors(activeImport.batchId)}
                                    sx={{ mt: 1, fontSize: '0.75rem' }}
                                >
                                    عرض تفاصيل الأخطاء
                                </Button>
                            )}
                        </Box>
                    </Collapse>
                </Paper>
            </Box>

            {/* Error Details Modal */}
            <Dialog open={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    تفاصيل أخطاء الاستيراد
                    <IconButton onClick={() => setIsErrorModalOpen(false)} size="small"><Close /></IconButton>
                </DialogTitle>
                <DialogContent>
                    {errorDetails?.errors?.length > 0 ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>رقم الصف</TableCell>
                                    <TableCell>نوع الخطأ</TableCell>
                                    <TableCell>الوصف</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {errorDetails.errors.map((error: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell>{error.rowNumber}</TableCell>
                                        <TableCell><Chip label={error.errorType} size="small" color="error" variant="outlined" /></TableCell>
                                        <TableCell>{error.messageAr || error.message}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                            <Typography>لا توجد أخطاء مسجلة أو تم تصفير السجل</Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GlobalImportWidget;
