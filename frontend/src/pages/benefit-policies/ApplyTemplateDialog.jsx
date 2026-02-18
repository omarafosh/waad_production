import React, { useState } from 'react';
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
    Divider,
    Box,
    CircularProgress,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    Chip,
    Alert,
    Switch
} from '@mui/material';
import {
    Description as TemplateIcon,
    CheckCircle as SelectedIcon,
    Info as InfoIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRuleTemplates, applyRuleTemplate } from 'services/api/benefit-policies.service';
import { useSnackbar } from 'notistack';

const ApplyTemplateDialog = ({ open, onClose, policyId, onApplied }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [replaceExisting, setReplaceExisting] = useState(false);

    const { data: templates, isLoading } = useQuery({
        queryKey: ['rule-templates'],
        queryFn: getRuleTemplates,
        enabled: open
    });

    const applyMutation = useMutation({
        mutationFn: (templateId) => applyRuleTemplate(templateId, policyId, replaceExisting),
        onSuccess: (data) => {
            enqueueSnackbar('تم تطبيق القالب بنجاح', { variant: 'success' });
            onApplied();
            onClose();
        },
        onError: (error) => {
            enqueueSnackbar(error.message || 'فشل تطبيق القالب', { variant: 'error' });
        }
    });

    const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

    const handleApply = () => {
        if (!selectedTemplateId) return;
        applyMutation.mutate(selectedTemplateId);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TemplateIcon color="primary" />
                تطبيق قالب قواعد التغطية (باقة جاهزة)
            </DialogTitle>

            <DialogContent dividers>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    اختر من الباقات الجاهزة أدناه ليتم تطبيق قواعدها تلقائياً على هذه الوثيقة.
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, mt: 2, height: '400px' }}>
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
                            </List>
                        )}
                    </Box>

                    {/* Template Details / Preview */}
                    <Box sx={{ flex: 1.5, pl: 2, overflowY: 'auto' }}>
                        {selectedTemplate ? (
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    معاينة بنود القالب: {selectedTemplate.name}
                                </Typography>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
                                    {selectedTemplate.items?.map((item, idx) => (
                                        <Chip
                                            key={idx}
                                            label={`${item.encounterType}: ${item.coveragePercent}%`}
                                            color="primary"
                                            variant="outlined"
                                            size="small"
                                            sx={{ borderRadius: 1 }}
                                        />
                                    ))}
                                </Box>

                                <Alert icon={<InfoIcon fontSize="inherit" />} severity="info" sx={{ mt: 2 }}>
                                    سيتم إنشاء {selectedTemplate.items?.length} قاعدة تغطية بشكل تلقائي.
                                </Alert>

                                <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>طريقة التطبيق:</FormLabel>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={replaceExisting}
                                                    onChange={(e) => setReplaceExisting(e.target.checked)}
                                                    color="warning"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="subtitle2">استبدال القواعد الحالية (Replace)</Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        عند التفعيل سيتم حذف كافة القواعد الحالية لهذه الوثيقة قبل تطبيق القالب.
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </FormControl>

                                    {replaceExisting && (
                                        <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1 }}>
                                            تنبيه: هذا الخيار سيؤدي لحذف القواعد المخصصة التي تمت إضافتها مسبقاً.
                                        </Alert>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="textSecondary">اختر باقة من القائمة لمعاينتها</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, px: 3 }}>
                <Button onClick={onClose} color="inherit">
                    إلغاء
                </Button>
                <Button
                    onClick={handleApply}
                    variant="contained"
                    disabled={!selectedTemplateId || applyMutation.isLoading}
                    startIcon={applyMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    تأكيد وتطبيق الباقة
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ApplyTemplateDialog;
