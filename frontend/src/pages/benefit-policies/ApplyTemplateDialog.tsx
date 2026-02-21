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
    Box,
    CircularProgress,
    FormControlLabel,
    FormControl,
    FormLabel,
    Alert,
    Switch,
    TextField,
    Stack,
    DialogContentText
} from '@mui/material';
import Chip from '@mui/material/Chip';
import {
    Description as TemplateIcon,
    CheckCircle as SelectedIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    PlayCircle as ApplyIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRuleTemplates, deleteAllRules, bulkCreateRules } from 'services/api/benefit-policies.service';
import { useSnackbar } from 'notistack';

const ENCOUNTER_TYPE_AR = {
    'OUTPATIENT': 'عيادات خارجية',
    'INPATIENT': 'تنويم / داخلي',
    'EMERGENCY': 'طوارئ',
    'LABORATORY': 'مختبر / تحاليل',
    'RADIOLOGY': 'أشعة',
    'PHARMACY': 'صيدلية',
    'DENTAL': 'أسنان',
    'PHYSIOTHERAPY': 'علاج طبيعي'
};

const ApplyTemplateDialog = ({ open, onClose, policyId, onApplied }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [editedTemplate, setEditedTemplate] = useState(null);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [showConfirmReplace, setShowConfirmReplace] = useState(false);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const TARGET_PHRASE = 'استبدال';

    const { data: templates, isLoading } = useQuery({
        queryKey: ['rule-templates'],
        queryFn: getRuleTemplates,
        enabled: open
    });

    const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

    // Sync edited template with selection
    useEffect(() => {
        if (selectedTemplate) {
            setEditedTemplate({
                ...selectedTemplate,
                items: selectedTemplate.items.map(item => ({
                    ...item,
                    coveragePercent: Number(item.coveragePercent)
                }))
            });
        } else {
            setEditedTemplate(null);
        }
    }, [selectedTemplate]);

    const applyMutation = useMutation({
        mutationFn: async () => {
            if (!editedTemplate) return;

            if (replaceExisting) {
                await deleteAllRules(policyId);
            }

            const ruleDtos = editedTemplate.items.map(item => {
                // encounterType may arrive as a VisitType enum object (e.g. {name:"OUTPATIENT",...})
                // or as a plain string — normalise to string
                const encounterTypeStr =
                    (typeof item.encounterType === 'object' && item.encounterType !== null)
                        ? (item.encounterType.name || item.encounterType.value || String(item.encounterType))
                        : item.encounterType;

                // waitingPeriodDays: backend ItemDto uses snake_case field, camelCase fallback
                const waitingDays = item.waiting_period_days ?? item.waitingPeriodDays ?? 0;

                return {
                    encounterType: encounterTypeStr,
                    medicalCategory: item.medicalCategoryCode || null,
                    coveragePercent: Number(item.coveragePercent),
                    timesLimit: item.timesLimit || null,
                    waitingPeriodDays: Number(waitingDays),
                    requiresPreApproval: item.requiresPreApproval || false,
                    active: true,
                    notes: item.notes || `من القالب: ${editedTemplate.name}`
                };
            });

            return await bulkCreateRules(policyId, ruleDtos);

        },
        onSuccess: () => {
            enqueueSnackbar('تم تطبيق الباقة وتخصيص القواعد بنجاح', { variant: 'success' });
            onApplied();
            onClose();
        },
        onError: (error) => {
            enqueueSnackbar(error.response?.data?.message || error.message || 'فشل تطبيق الباقة', { variant: 'error' });
        }
    });

    const handleItemChange = (idx, field, value) => {
        const newItems = [...editedTemplate.items];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setEditedTemplate({ ...editedTemplate, items: newItems });
    };

    const handleApply = () => {
        if (!editedTemplate) return;
        applyMutation.mutate();
    };

    const handleReplaceToggle = (e) => {
        const checked = e.target.checked;
        if (checked) {
            setShowConfirmReplace(true);
        } else {
            setReplaceExisting(false);
        }
    };

    const confirmReplaceAction = () => {
        if (confirmPhrase === TARGET_PHRASE) {
            setReplaceExisting(true);
            setShowConfirmReplace(false);
            setConfirmPhrase('');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <Box sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 3, py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
            }}>
                <TemplateIcon />
                <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>تطبيق باقة قواعد جاهزة</Typography>
                {editedTemplate && (
                    <Chip
                        size="small"
                        label={`${editedTemplate.items?.length} قاعدة`}
                        sx={{ bgcolor: 'primary.light', color: 'white', fontWeight: 700 }}
                    />
                )}
            </Box>

            <DialogContent dividers>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    اختر من الباقات الجاهزة أدناه ليتم تطبيق قواعدها تلقائياً على هذه الوثيقة. يمكنك تعديل القيم قبل الحفظ.
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, mt: 2, height: '450px' }}>
                    {/* Templates List */}
                    <Box sx={{ flex: 1, borderRight: '1px solid', borderColor: 'divider', pr: 2, overflowY: 'auto' }}>
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : (
                            <List component="nav">
                                {templates?.map((template) => (
                                    <ListItem
                                        button
                                        key={template.id}
                                        selected={selectedTemplateId === template.id}
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            '&.Mui-selected': {
                                                backgroundColor: 'primary.lighter',
                                                color: 'primary.dark',
                                                '&:hover': { backgroundColor: 'primary.lighter' }
                                            }
                                        }}
                                    >
                                        <ListItemIcon>
                                            {selectedTemplateId === template.id ? <SelectedIcon color="primary" /> : <TemplateIcon />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={template.name}
                                            secondary={template.description}
                                            primaryTypographyProps={{ fontWeight: 'bold' }}
                                        />
                                    </ListItem>
                                ))}
                                {templates?.length === 0 && (
                                    <Typography color="textSecondary" align="center" sx={{ mt: 2 }}>لا توجد قوالب متاحة</Typography>
                                )}
                            </List>
                        )}
                    </Box>

                    {/* Template Details / Preview & Edit */}
                    <Box sx={{ flex: 1.5, pl: 2, overflowY: 'auto' }}>
                        {editedTemplate ? (
                            <Stack spacing={2}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    تخصيص بنود الباقة:
                                </Typography>

                                <TextField
                                    label="اسم الباقة (للمستند الحالي)"
                                    value={editedTemplate.name || ''}
                                    onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                                    fullWidth
                                    size="small"
                                />

                                <Typography variant="overline" color="textSecondary" fontWeight="bold">
                                    تعديل نسب التغطية:
                                </Typography>

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                                    {editedTemplate.items?.map((item, idx) => (
                                        <Box key={idx} sx={{
                                            p: 1.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1
                                        }}>
                                            <Typography variant="caption" fontWeight="bold" color="primary" sx={{ fontSize: '0.85rem' }}>
                                                {ENCOUNTER_TYPE_AR[item.encounterType] || item.encounterType}
                                                {item.medicalCategoryName && ` - ${item.medicalCategoryName}`}
                                            </Typography>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={item.coveragePercent}
                                                onChange={(e) => handleItemChange(idx, 'coveragePercent', parseInt(e.target.value) || 0)}
                                                InputProps={{
                                                    endAdornment: <Typography variant="caption">%</Typography>
                                                }}
                                                inputProps={{ min: 0, max: 100 }}
                                            />
                                        </Box>
                                    ))}
                                </Box>

                                <Alert icon={<InfoIcon fontSize="inherit" />} severity="info">
                                    سيتم إنشاء {editedTemplate.items?.length} قاعدة تغطية مخصصة.
                                </Alert>

                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>طريقة التطبيق:</FormLabel>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={replaceExisting}
                                                    onChange={handleReplaceToggle}
                                                    color="warning"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="subtitle2">استبدال القواعد الحالية (Replace)</Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        عند التفعيل سيتم حذف كافة القواعد الحالية لهذه الوثيقة قبل تطبيق الجديد.
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </FormControl>

                                    {replaceExisting && (
                                        <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1 }}>
                                            تنبيه: سيتم حذف كافة القواعد المضافة يدوياً لهذا المستند.
                                        </Alert>
                                    )}
                                </Box>
                            </Stack>
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                                <TemplateIcon sx={{ fontSize: 48, color: 'divider' }} />
                                <Typography color="textSecondary">اختر باقة من القائمة لتخصيصها ومعاينتها</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={onClose} color="inherit" disabled={applyMutation.isPending}>
                    إلغاء
                </Button>
                <Button
                    onClick={handleApply}
                    variant="contained"
                    color="primary"
                    disabled={!editedTemplate || applyMutation.isPending}
                    startIcon={applyMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <ApplyIcon />}
                    sx={{ minWidth: 160 }}
                >
                    {applyMutation.isPending ? 'جاري التطبيق...' : 'تأكيد وتطبيق الباقة'}
                </Button>
            </DialogActions>

            {/* Dangerous Action Confirmation */}
            <Dialog
                open={showConfirmReplace}
                onClose={() => {
                    setShowConfirmReplace(false);
                    setConfirmPhrase('');
                }}
            >
                <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon /> تأكيد عملية الاستبدال
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        تنبيه: تفعيل خيار الاستبدال سيؤدي لـ <strong>حذف كافة القواعد الحالية</strong> لهذه الوثيقة فور تطبيق الباقة. هذا الإجراء لا يمكن التراجع عنه.
                    </DialogContentText>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        لتأكيد العملية، يرجى كتابة كلمة <strong>{TARGET_PHRASE}</strong> في الصندوق أدناه:
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        value={confirmPhrase}
                        onChange={(e) => setConfirmPhrase(e.target.value)}
                        placeholder={TARGET_PHRASE}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConfirmReplace(false)}>إلغاء</Button>
                    <Button
                        onClick={confirmReplaceAction}
                        color="error"
                        variant="contained"
                        disabled={confirmPhrase !== TARGET_PHRASE}
                    >
                        تأكيد التفعيل
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default ApplyTemplateDialog;
