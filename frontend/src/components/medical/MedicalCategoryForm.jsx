
import { useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Button,
    Grid,
    Paper,
    Stack,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
    Alert,
    MenuItem,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    Select,
    InputAdornment,
    Collapse,
    alpha
} from '@mui/material';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FolderIcon from '@mui/icons-material/Folder';
import SubdirectoryArrowLeftIcon from '@mui/icons-material/SubdirectoryArrowLeft';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CodeIcon from '@mui/icons-material/Code';
import LabelIcon from '@mui/icons-material/Label';
import LockIcon from '@mui/icons-material/Lock';

// Services
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

const CATEGORY_TYPE = {
    MAIN: 'main',
    SUB: 'sub'
};

/**
 * Section Header Helper
 */
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'primary' }) => (
    <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Icon sx={{ color: `${color}.main`, fontSize: 22 }} />
            </Box>
            <Box>
                <Typography variant="h6" fontWeight={600}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </Box>
        </Stack>
    </Box>
);

/**
 * Category Type Card Helper
 */
const CategoryTypeCard = ({ type, selected, onSelect, disabled }) => {
    const isMain = type === CATEGORY_TYPE.MAIN;

    return (
        <Card
            onClick={() => !disabled && onSelect(type)}
            sx={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: 2,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                transition: 'all 0.2s ease',
                opacity: disabled ? 0.6 : 1,
                '&:hover': {
                    borderColor: disabled ? 'divider' : 'primary.main',
                    transform: disabled ? 'none' : 'translateY(-2px)',
                    boxShadow: disabled ? 0 : 2
                }
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: isMain ? 'primary.main' : 'secondary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        {isMain ? (
                            <FolderIcon sx={{ color: 'white', fontSize: 26 }} />
                        ) : (
                            <SubdirectoryArrowLeftIcon sx={{ color: 'white', fontSize: 26 }} />
                        )}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {isMain ? 'تصنيف رئيسي' : 'تصنيف فرعي'}
                            </Typography>
                            {selected && <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 18 }} />}
                        </Stack>

                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {isMain ? 'تصنيف مستقل بدون أب، يظهر في المستوى الأول من الشجرة' : 'تصنيف تابع لتصنيف آخر، يظهر تحت التصنيف الأب'}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

const MedicalCategoryForm = ({ initialValues, onSubmit, onCancel, isEditMode }) => {
    // Form State
    const [form, setForm] = useState({
        code: initialValues?.code || '',
        name: initialValues?.name || '',
        parentId: initialValues?.parentId || '',
        active: initialValues?.active ?? true
    });

    const [categoryType, setCategoryType] = useState(
        initialValues?.parentId ? CATEGORY_TYPE.SUB : CATEGORY_TYPE.MAIN
    );

    const [categories, setCategories] = useState([]); // Parent options
    const [loadingParents, setLoadingParents] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    // Sync form if initialValues change (useful for edit mode when data loads)
    useEffect(() => {
        if (initialValues) {
            setForm({
                code: initialValues.code || '',
                name: initialValues.name || '',
                parentId: initialValues.parentId || '',
                active: initialValues.active ?? true
            });
            setCategoryType(initialValues.parentId ? CATEGORY_TYPE.SUB : CATEGORY_TYPE.MAIN);
        }
    }, [initialValues]);

    // Load parent categories internally to simplify usage
    // We exclude the current category (in edit mode) to prevent circular parenthood
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoadingParents(true);
                const data = await getAllMedicalCategories();
                if (Array.isArray(data)) {
                    // In edit mode, strict filter: cannot be its own parent
                    // We assume 'initialValues.id' might be passed or checked via code/id
                    // Ideally backend shouldn't return itself as parent possibility anyway
                    // Simple filter: active categories only
                    let filtered = data.filter((c) => c.active !== false);

                    // If edit mode and we have an ID, filter it out
                    if (isEditMode && initialValues?.id) {
                        filtered = filtered.filter(c => c.id !== initialValues.id);
                    }
                    setCategories(filtered);
                }
            } catch (error) {
                console.error('Failed to load parent categories', error);
            } finally {
                setLoadingParents(false);
            }
        };
        fetchCategories();
    }, [isEditMode, initialValues?.id]);


    // Derived State
    const organizedCategories = useMemo(() => {
        const mainCats = categories.filter((c) => !c.parentId);
        return mainCats.map((main) => ({
            ...main,
            children: categories.filter((c) => c.parentId === main.id)
        }));
    }, [categories]);

    const selectedParent = useMemo(() => {
        if (!form.parentId) return null;
        return categories.find((c) => c.id === form.parentId);
    }, [form.parentId, categories]);

    // Handlers
    const handleChange = useCallback(
        (field) => (e) => {
            const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            setForm((prev) => ({ ...prev, [field]: value }));
            if (errors[field]) {
                setErrors((prev) => ({ ...prev, [field]: null }));
            }
        },
        [errors]
    );

    const handleCategoryTypeChange = useCallback((type) => {
        setCategoryType(type);
        if (type === CATEGORY_TYPE.MAIN) {
            setForm((prev) => ({ ...prev, parentId: '' }));
        }
    }, []);

    const validate = useCallback(() => {
        const newErrors = {};

        if (!form.code?.trim()) {
            newErrors.code = 'رمز التصنيف مطلوب';
        } else if (!isEditMode && !/^[A-Z0-9_-]+$/i.test(form.code.trim())) {
            newErrors.code = 'الرمز يجب أن يحتوي على حروف إنجليزية وأرقام فقط';
        }

        if (!form.name?.trim()) {
            newErrors.name = 'اسم التصنيف مطلوب';
        }

        if (categoryType === CATEGORY_TYPE.SUB && !form.parentId) {
            newErrors.parentId = 'يجب اختيار التصنيف الأب للتصنيف الفرعي';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, categoryType, isEditMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setApiError(null);

        try {
            const payload = {
                ...form,
                // Ensure code is upper case
                code: form.code?.trim().toUpperCase(),
                name: form.name?.trim(),
                // Parent logic
                parentId: categoryType === CATEGORY_TYPE.SUB ? form.parentId : null,
            };

            await onSubmit(payload);
        } catch (err) {
            console.error('Form Submit failed:', err);
            const errorMsg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء الحفظ';
            setApiError(errorMsg);
            setSubmitting(false); // Only stop submitting on error (on success, redirection usually happens)
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {/* API Error Alert */}
            {apiError && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError(null)}>
                    {apiError}
                </Alert>
            )}

            {/* ========== Section 1: Category Type Selection ========== */}
            <SectionHeader
                icon={AccountTreeIcon}
                title="نوع التصنيف"
                subtitle={isEditMode ? "يمكنك تغيير نوع التصنيف من رئيسي إلى فرعي أو العكس" : "اختر نوع التصنيف الذي تريد إنشاءه"}
                color="primary"
            />

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <CategoryTypeCard
                        type={CATEGORY_TYPE.MAIN}
                        selected={categoryType === CATEGORY_TYPE.MAIN}
                        onSelect={handleCategoryTypeChange}
                        disabled={submitting}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <CategoryTypeCard
                        type={CATEGORY_TYPE.SUB}
                        selected={categoryType === CATEGORY_TYPE.SUB}
                        onSelect={handleCategoryTypeChange}
                        disabled={submitting}
                    />
                </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* ========== Section 2: Parent Category (if sub-category) ========== */}
            <Collapse in={categoryType === CATEGORY_TYPE.SUB}>
                <Box sx={{ mb: 4 }}>
                    <SectionHeader
                        icon={FolderIcon}
                        title="التصنيف الأب"
                        subtitle="اختر التصنيف الرئيسي الذي سيتبعه هذا التصنيف الفرعي"
                        color="secondary"
                    />

                    <FormControl fullWidth error={!!errors.parentId}>
                        <InputLabel>اختر التصنيف الأب *</InputLabel>
                        <Select
                            value={form.parentId}
                            onChange={handleChange('parentId')}
                            label="اختر التصنيف الأب *"
                            disabled={submitting || loadingParents}
                            sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                        >
                            <MenuItem value="" disabled>
                                <Typography color="text.secondary">— اختر التصنيف الأب —</Typography>
                            </MenuItem>

                            {organizedCategories.map((mainCat) => [
                                <MenuItem
                                    key={mainCat.id}
                                    value={mainCat.id}
                                    sx={{ fontWeight: 600, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <FolderIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                        <span>{mainCat.name}</span>
                                        <Chip label={mainCat.code} size="small" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
                                    </Stack>
                                </MenuItem>,
                                ...mainCat.children.map((subCat) => (
                                    <MenuItem key={subCat.id} value={subCat.id} sx={{ pr: 4 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <SubdirectoryArrowLeftIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <span>{subCat.name}</span>
                                            <Chip label={subCat.code} size="small" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                        </Stack>
                                    </MenuItem>
                                ))
                            ])}
                        </Select>
                        {errors.parentId && <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{errors.parentId}</Typography>}
                        {loadingParents && <Typography variant="caption" color="text.secondary">جارِ تحميل التصنيفات...</Typography>}
                    </FormControl>

                    <ParentPreview parent={selectedParent} />
                </Box>

                <Divider sx={{ my: 4 }} />
            </Collapse>

            {/* ========== Section 3: Category Details ========== */}
            <SectionHeader icon={LabelIcon} title="بيانات التصنيف" subtitle="المعلومات الأساسية" color="info" />

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required={!isEditMode}
                        label="رمز التصنيف"
                        placeholder="مثال: CONSULTATION"
                        value={form.code}
                        onChange={handleChange('code')}
                        error={!!errors.code}
                        helperText={errors.code || (isEditMode ? 'لا يمكن تعديل الرمز' : 'رمز فريد (إنجليزي فقط)')}
                        disabled={submitting || isEditMode} // Disabled in edit mode
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    {isEditMode ? <LockIcon sx={{ color: 'text.disabled' }} /> : <CodeIcon sx={{ color: 'text.secondary' }} />}
                                </InputAdornment>
                            ),
                            sx: { fontFamily: 'monospace', letterSpacing: 1, bgcolor: isEditMode ? 'action.hover' : 'inherit' }
                        }}
                        inputProps={{ style: { textTransform: 'uppercase' }, dir: 'ltr' }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="اسم التصنيف"
                        placeholder="أدخل اسم التصنيف بالعربية"
                        value={form.name}
                        onChange={handleChange('name')}
                        error={!!errors.name}
                        helperText={errors.name}
                        disabled={submitting}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LabelIcon sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>

                <Grid size={12}>
                    <Paper
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                                sx={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    bgcolor: form.active ? 'success.light' : 'grey.200',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                            >
                                <CheckCircleIcon sx={{ color: form.active ? 'success.main' : 'grey.400', fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600}>حالة التصنيف</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {form.active ? 'نشط - يظهر في القوائم' : 'غير نشط - مخفي'}
                                </Typography>
                            </Box>
                        </Stack>
                        <FormControlLabel
                            control={<Switch checked={form.active} onChange={handleChange('active')} color="success" disabled={submitting} />}
                            label={form.active ? 'نشط' : 'غير نشط'}
                            labelPlacement="start"
                        />
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* ========== Actions ========== */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={submitting} startIcon={<ArrowBackIcon />}>
                    إلغاء
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    disabled={submitting}
                    sx={{ minWidth: 160 }}
                >
                    {submitting ? 'جارِ الحفظ...' : (isEditMode ? 'حفظ التغييرات' : 'حفظ التصنيف')}
                </Button>
            </Stack>
        </Box>
    );
};

MedicalCategoryForm.propTypes = {
    initialValues: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        code: PropTypes.string,
        name: PropTypes.string,
        parentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        active: PropTypes.bool
    }),
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isEditMode: PropTypes.bool
};

/**
 * Parent Preview (Internal)
 */
const ParentPreview = ({ parent }) => {
    if (!parent) return null;
    return (
        <Paper
            variant="outlined"
            sx={{ mt: 2, p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, 0.04), borderColor: 'info.light', borderRadius: 2 }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <AccountTreeIcon sx={{ color: 'info.main' }} />
                <Box>
                    <Typography variant="caption" color="text.secondary">سيتم إضافته تحت:</Typography>
                    <Typography variant="subtitle2" fontWeight={600}>
                        {parent.name}
                        <Chip label={parent.code} size="small" sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} />
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
};

export default MedicalCategoryForm;
