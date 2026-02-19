import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Step,
    StepLabel,
    Stepper,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Grid,
    Divider,
    Autocomplete,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import { CloudUpload, Code, Business, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'utils/axios';
import { useImportProgress } from 'contexts/GlobalImportProgressContext';
import employersService from 'services/api/employers.service';

// Steps - Removed progress step, import runs in background
const steps = ['رفع الملف', 'التحليل والمطابقة'];

const DataImportWizard = ({
    open,
    onClose,
    baseApiUrl = '/api/unified-members/import',
    entityName = 'المستفيدين',
    hideContextSelectors = false,
    onImportStarted = null
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Analysis State
    const [previewData, setPreviewData] = useState(null);
    const [allEmployers, setAllEmployers] = useState([]);
    const [selectedEmployer, setSelectedEmployer] = useState(null); // { id, nameAr }
    const [selectedPolicy, setSelectedPolicy] = useState(null); // { id, policyNumber }
    const [batchId, setBatchId] = useState(null);

    const { startImport, activeImport: contextActiveImport } = useImportProgress();
    // Use contextActiveImport only if it matches our batchId
    const activeImport = (batchId && contextActiveImport?.batchId === batchId) ? contextActiveImport : null;

    // Reset on open
    useEffect(() => {
        if (open) {
            setActiveStep(0);
            setFile(null);
            setPreviewData(null);
            setSelectedEmployer(null);
            setSelectedPolicy(null);
            setBatchId(null);
            setError(null);
            setLoading(false);
            fetchEmployers();
        }
    }, [open]);

    const fetchEmployers = async () => {
        try {
            console.log('[DataImportWizard] Fetching employers...');
            const selectors = await employersService.getEmployerSelectors();
            console.log('[DataImportWizard] Received selectors:', selectors);

            // Map selector labels to nameAr for component compatibility
            const mapped = (selectors || []).map((s, index) => {
                console.log(`[DataImportWizard] Processing selector ${index}:`, s);
                return {
                    id: s?.id || null,
                    nameAr: s?.label || s?.nameAr || '',
                    code: s?.code || ''
                };
            }).filter(item => {
                const hasId = !!item.id;
                if (!hasId) console.warn('[DataImportWizard] Filtered out item without ID:', item);
                return hasId;
            });

            console.log('[DataImportWizard] Mapped employers:', mapped);
            setAllEmployers(mapped);
        } catch (err) {
            console.error('[DataImportWizard] Failed to fetch employers list', err);
            setAllEmployers([]); // Set empty array on error
        }
    };

    // File Drop
    const onDrop = (acceptedFiles) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false
    });

    // Actions
    const handleAnalyze = async () => {
        if (!file) return;
        console.log('[DataImportWizard] Starting analysis for file:', file?.name);
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Using parameterized baseApiUrl
            console.log('[DataImportWizard] Sending preview request to:', `${baseApiUrl}/preview`);
            const response = await axios.post(`${baseApiUrl}/preview`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('[DataImportWizard] Preview response:', response.data);

            // NEW: Extract data from ApiResponse wrapper correctly
            const data = response.data?.data || response.data?.result || response.data;
            console.log('[DataImportWizard] Extracted preview data:', data);
            console.log('[DataImportWizard] Preview rows:', data?.previewRows);

            setPreviewData(data);
            setActiveStep(1);
        } catch (err) {
            console.error('[DataImportWizard] Analysis error:', err);
            setError(err.response?.data?.message || err.message || "فشل تحليل الملف");
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!file || !previewData) return;

        // Smart Context Validation - Skip for pricing imports (hideContextSelectors = true)
        if (!hideContextSelectors) {
            const contextLabel = entityName === 'بنود الأسعار' ? 'مقدم الخدمة' : 'جهة العمل';
            const hasContextColumn =
                (previewData?.columnMappings && Object.values(previewData.columnMappings).includes('employer')) ||
                (previewData?.detectedColumns?.some(c => {
                    if (!c) return false;
                    const normalized = c.toLowerCase()
                        .replace(/[\r\n]+/g, ' ')
                        .replace(/\u00A0/g, ' ')
                        .replace(/\u200B/g, ' ')
                        .replace(/\*/g, '')
                        .trim();
                    const searchTerms = entityName === 'بنود الأسعار'
                        ? ['provider', 'مقدم الخدمة']
                        : ['employer', 'جهة العمل'];
                    return searchTerms.some(term => normalized.includes(term));
                }));
            if (!selectedEmployer && !hasContextColumn) {
                setError(`يرجى اختيار ${contextLabel} (أو التأكد من وجود عمود '${contextLabel}' في الملف)`);
                return;
            }
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (selectedEmployer?.id) formData.append('employerId', selectedEmployer.id);
        if (selectedPolicy?.id) formData.append('benefitPolicyId', selectedPolicy.id);
        if (previewData?.batchId) formData.append('batchId', previewData.batchId);

        // Default Policy
        formData.append('importPolicy', 'UPDATE');

        try {
            const response = await axios.post(`${baseApiUrl}/execute`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const result = response.data?.data || response.data?.result || response.data;

            if (result?.batchId) {
                // Determine correct status URL based on entity
                const statusUrl = entityName === 'بنود الأسعار'
                    ? `provider-contracts/pricing/import/status/${result.batchId}`
                    : `unified-members/import/status/${result.batchId}`;

                // Notify parent component
                if (onImportStarted && typeof onImportStarted === 'function') {
                    onImportStarted(result.batchId);
                }

                // Start Background Monitoring with the specific status endpoint
                startImport(
                    result.batchId,
                    file?.name || 'import.xlsx',
                    statusUrl
                );
                // Close dialog and let background widget handle progress
                if (onClose) onClose();
            } else {
                // For simple imports without batchId
                if (onClose) onClose();
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "فشل بدء الاستيراد");
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            const response = await axios.get(`${baseApiUrl}/template`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${entityName}_Template.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            console.error("Template download failed", err);
        }
    };

    // Render Steps
    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Box
                            {...getRootProps()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                                borderRadius: 2,
                                p: 4,
                                cursor: 'pointer',
                                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                            }}
                        >
                            <input {...getInputProps()} />
                            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="h6" gutterBottom>
                                {isDragActive ? 'افلت الملف هنا' : 'اسحب وافلت ملف Excel هنا'}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                أو اضغط لاختيار ملف (.xlsx, .xls)
                            </Typography>
                            {file && (
                                <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.lighter', borderRadius: 1, display: 'inline-block' }}>
                                    <Typography variant="subtitle2" color="primary.main">
                                        {file.name}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            <Button variant="text" size="small" startIcon={<Code />} onClick={downloadTemplate}>
                                تحميل النموذج القياسي
                            </Button>
                        </Box>
                    </Box>
                );
            case 1:
                const hasEmployerCol =
                    (previewData?.columnMappings && Object.values(previewData.columnMappings).includes('employer')) ||
                    (previewData?.detectedColumns?.some(c => {
                        if (!c) return false;
                        const normalized = c.toLowerCase()
                            .replace(/[\r\n]+/g, ' ')
                            .replace(/\u00A0/g, ' ')
                            .replace(/\u200B/g, ' ')
                            .replace(/\*/g, '')
                            .trim();
                        const searchTerms = entityName === 'بنود الأسعار'
                            ? ['provider', 'مقدم الخدمة']
                            : ['employer', 'جهة العمل'];
                        return searchTerms?.some(term => normalized.includes(term)) || false;
                    })) || false;


                return (
                    <Box sx={{ mt: 2 }}>
                        {/* Smart Analysis Summary */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        تحليل السياق (Smart Context)
                                    </Typography>
                                    {hideContextSelectors ? (
                                        <Alert severity="success" icon={<CheckCircle fontSize="inherit" />}>
                                            جاهز لاستيراد <b>{entityName}</b> بناءً على بيانات الملف.
                                        </Alert>
                                    ) : hasEmployerCol ? (
                                        <Alert severity="info" icon={<CheckCircle fontSize="inherit" />}>
                                            تم اكتشاف عمود <b>{entityName === 'بنود الأسعار' ? 'مقدم الخدمة' : 'جهة العمل'}</b>. سيتم تحديد البيانات لكل صف تلقائياً من الملف.
                                        </Alert>
                                    ) : (
                                        <Alert severity="warning" icon={<Warning fontSize="inherit" />}>
                                            لم يتم العثور على عمود <b>{entityName === 'بنود الأسعار' ? 'مقدم الخدمة' : 'جهة العمل'}</b>. يرجى التحديد للجميع أدناه.
                                        </Alert>
                                    )}
                                </Paper>
                            </Grid>
                            {!hideContextSelectors && (
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                            إعدادات الاستيراد
                                        </Typography>
                                        <Autocomplete
                                            options={allEmployers}
                                            getOptionLabel={(option) => option.nameAr || option.code || ""}
                                            value={selectedEmployer}
                                            onChange={(_, newValue) => setSelectedEmployer(newValue)}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label={entityName === 'بنود الأسعار' ? 'مقدم الخدمة الموحد (اختياري)' : 'جهة العمل الموحدة (اختياري)'}
                                                    size="small"
                                                    fullWidth
                                                    helperText={entityName === 'بنود الأسعار'
                                                        ? "اختر مقدم خدمة فقط إذا كان الملف لا يحتوي على عمود 'مقدم الخدمة'"
                                                        : "اختر جهة فقط إذا كان الملف لا يحتوي على عمود 'جهة العمل'"}
                                                />
                                            )}
                                        />
                                    </Paper>
                                </Grid>
                            )}
                        </Grid>

                        {/* Data Preview */}
                        <Typography variant="subtitle2" gutterBottom>معاينة البيانات ({previewData?.totalRows} صفوف)</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>
                                            {entityName === 'جهات العمل' ? 'الكود' :
                                                entityName === 'بنود الأسعار' ? 'كود الخدمة' : 'الاسم'}
                                        </TableCell>
                                        <TableCell>
                                            {entityName === 'جهات العمل' ? 'الاسم' :
                                                entityName === 'بنود الأسعار' ? 'اسم الخدمة' : 'رقم الهوية'}
                                        </TableCell>
                                        {entityName === 'بنود الأسعار' && <TableCell>السعر</TableCell>}
                                        {!hideContextSelectors && entityName !== 'بنود الأسعار' && <TableCell>جهة العمل</TableCell>}
                                        <TableCell>الحالة</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(() => {
                                        const rows = previewData?.previewRows || [];
                                        console.log('[DataImportWizard] Rendering preview rows. Total:', rows.length);

                                        return rows.map((row, index) => {
                                            console.log(`[DataImportWizard] Rendering row ${index}:`, row);

                                            if (!row) {
                                                console.error(`[DataImportWizard] Row ${index} is null/undefined!`);
                                                return null;
                                            }

                                            return (
                                                <TableRow key={row?.rowNumber || index} hover>
                                                    <TableCell>{row?.rowNumber || index + 1}</TableCell>
                                                    <TableCell>
                                                        {entityName === 'جهات العمل' ? (row?.code || '-') :
                                                            entityName === 'بنود الأسعار' ? (row?.serviceCode || '-') : (row?.fullName || '-')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {entityName === 'جهات العمل' ? (row?.name || '-') :
                                                            entityName === 'بنود الأسعار' ? (row?.serviceName || '-') : (row?.nationalNumber || '-')}
                                                    </TableCell>
                                                    {entityName === 'بنود الأسعار' && <TableCell>{row?.unitPrice || 0}</TableCell>}
                                                    {!hideContextSelectors && entityName !== 'بنود الأسعار' && (
                                                        <TableCell>{row?.employerName || row?.attributes?.employer || '-'}</TableCell>
                                                    )}
                                                    <TableCell>
                                                        <Chip
                                                            label={row?.status === 'NEW' ? 'جديد' : row?.status === 'WARNING' ? 'تنبيه' : row?.status === 'ERROR' ? 'خطأ' : (row?.status || 'غير معروف')}
                                                            size="small"
                                                            color={row?.status === 'ERROR' ? 'error' : row?.status === 'NEW' ? 'success' : 'warning'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        });
                                    })()}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Errors Summary */}
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>استيراد {entityName} (معالج البيانات الذكي)</DialogTitle>
            <DialogContent dividers>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    renderStepContent(activeStep)
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">إلغاء</Button>
                {activeStep === 0 && (
                    <Button onClick={handleAnalyze} variant="contained" disabled={!file}>
                        تحليل الملف
                    </Button>
                )}
                {activeStep === 1 && (
                    <Button
                        onClick={handleExecute}
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {loading ? 'جاري التحضير...' : 'تأكيد وبدء الاستيراد'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default DataImportWizard;
