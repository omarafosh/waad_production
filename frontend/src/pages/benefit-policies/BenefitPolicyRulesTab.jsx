import { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import TextField from '@mui/material/TextField';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  MedicalServices as ServiceIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  History as HistoryIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import RBACGuard from 'components/tba/RBACGuard';
import MedicalServiceSelector from 'components/tba/MedicalServiceSelector';
import GenericDataTable from 'components/GenericDataTable/GenericDataTable';
import ConfirmDialog from 'components/common/ConfirmDialog';

import {
  getPolicyRulesPaged,
  getDeletedPolicyRulesPaged,
  createPolicyRule,
  createPolicyRulesBulk,
  updatePolicyRule,
  togglePolicyRuleActive,
  deletePolicyRule,
  restorePolicyRule,
  hardDeletePolicyRule,
  getPolicyRulesCount
} from 'services/api/benefit-policy-rules.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';
import { useTheme } from '@mui/material/styles';
import { ListAlt as ListIcon } from '@mui/icons-material';

// ═══════════════════════════════════════════════════════════════════════════
// RULE FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const INITIAL_FORM_STATE = {
  targetType: '', // 'CATEGORY' or 'SERVICE'
  medicalCategoryId: '',
  medicalServiceId: '',
  coveragePercent: '',
  amountLimit: '',
  opdPercent: '',
  erPercent: '',
  ipdPercent: '',
  timesLimit: '',
  waitingPeriodDays: '0',
  requiresPreApproval: false,
  notes: '',
  encounterType: '', // Default: '' means 'All Visit Types' (sends null to backend)
  isMultiContext: false,
  // Context fields for multi-creation
  contextPercents: {} // Will hold { OUTPATIENT: 80, INPATIENT: 100, ... }
};

const STANDARD_CONTEXTS = [
  { code: 'OUTPATIENT', label: 'عيادات خارجية (OPD)' },
  { code: 'INPATIENT', label: 'إيواء (IPD)' },
  { code: 'EMERGENCY', label: 'طوارئ (ER)' },
  { code: 'LABORATORY', label: 'مختبر (Lab)' },
  { code: 'RADIOLOGY', label: 'أشعة (Rad)' },
  { code: 'PHARMACY', label: 'صيدلية (Pharm)' },
  { code: 'DENTAL', label: 'أسنان (Dental)' },
  { code: 'PHYSIOTHERAPY', label: 'علاج طبيعي (Physio)' }
];

/**
 * Rule Form Modal
 */
const RuleFormModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isEdit,
  loading,
  categories,
  loadingCategories,
  distributionType,
  existingRules = []
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        setFormData({
          targetType: initialData.ruleType || '',
          medicalCategoryId: initialData.medicalCategoryId || '',
          medicalServiceId: initialData.medicalServiceId || '',
          coveragePercent: initialData.coveragePercent ?? '',
          amountLimit: initialData.amountLimit ?? '',
          timesLimit: initialData.timesLimit ?? '',
          waitingPeriodDays: initialData.waitingPeriodDays ?? '0',
          requiresPreApproval: initialData.requiresPreApproval || false,
          notes: initialData.notes || '',
          encounterType: initialData.encounterType || '',
          isMultiContext: false,
          contextPercents: {}
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
      setErrors({});
    }
  }, [open, isEdit, initialData]);

  const handleChange = useCallback(
    (field) => (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

      setFormData((prev) => {
        const newData = { ...prev, [field]: value };

        // XOR logic: Clear the other field when targetType changes
        if (field === 'targetType') {
          if (value === 'CATEGORY') {
            newData.medicalServiceId = '';
          } else if (value === 'SERVICE') {
            newData.medicalCategoryId = '';
          }
        }

        return newData;
      });

      // Clear error for this field
      setErrors((prev) => ({ ...prev, [field]: null }));
    },
    []
  );

  // New: Filtered Categories to avoid duplicates
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    if (isEdit) return categories; // Show all when editing

    // Find IDs of categories that already have a rule for this policy
    const existingCategoryIds = existingRules
      .filter(r => r.ruleType === 'CATEGORY')
      .map(r => r.medicalCategoryId);

    return categories.filter(cat => !existingCategoryIds.includes(cat.id));
  }, [categories, existingRules, isEdit]);

  const validate = useCallback(() => {
    const newErrors = {};

    // Target type required
    if (!formData.targetType) {
      newErrors.targetType = 'يجب اختيار نوع العنصر';
    }

    // Category or Service based on type
    if (formData.targetType === 'CATEGORY' && !formData.medicalCategoryId) {
      newErrors.medicalCategoryId = 'يجب اختيار التصنيف الطبي';
    }
    if (formData.targetType === 'SERVICE' && !formData.medicalServiceId) {
      newErrors.medicalServiceId = 'يجب اختيار الخدمة الطبية';
    }

    // Coverage percent validation
    if (formData.coveragePercent !== '' && formData.coveragePercent !== null) {
      const coverage = Number(formData.coveragePercent);
      if (isNaN(coverage) || coverage < 0 || coverage > 100) {
        newErrors.coveragePercent = 'نسبة التغطية يجب أن تكون بين 0 و 100';
      }
    }

    // Amount limit validation
    if (formData.amountLimit !== '' && formData.amountLimit !== null) {
      const amount = Number(formData.amountLimit);
      if (isNaN(amount) || amount < 0) {
        newErrors.amountLimit = 'حد المبلغ يجب أن يكون رقم موجب';
      }
    }

    // Times limit validation
    if (formData.timesLimit !== '' && formData.timesLimit !== null) {
      const times = Number(formData.timesLimit);
      if (isNaN(times) || times < 0 || !Number.isInteger(times)) {
        newErrors.timesLimit = 'حد المرات يجب أن يكون رقم صحيح موجب';
      }
    }

    // Waiting period validation
    if (formData.waitingPeriodDays !== '' && formData.waitingPeriodDays !== null) {
      const days = Number(formData.waitingPeriodDays);
      if (isNaN(days) || days < 0 || !Number.isInteger(days)) {
        newErrors.waitingPeriodDays = 'فترة الانتظار يجب أن تكون رقم صحيح موجب';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    if (formData.isMultiContext) {
      const payloads = [];
      const { contextPercents } = formData;

      STANDARD_CONTEXTS.forEach(ctx => {
        const val = contextPercents[ctx.code];
        if (val !== '' && val !== null && val !== undefined) {
          payloads.push({
            medicalCategoryId: formData.targetType === 'CATEGORY' ? Number(formData.medicalCategoryId) : null,
            medicalServiceId: formData.targetType === 'SERVICE' ? Number(formData.medicalServiceId) : null,
            coveragePercent: Number(val),
            amountLimit: formData.amountLimit !== '' ? Number(formData.amountLimit) : null,
            timesLimit: formData.timesLimit !== '' ? Number(formData.timesLimit) : null,
            waitingPeriodDays: formData.waitingPeriodDays !== '' ? Number(formData.waitingPeriodDays) : 0,
            requiresPreApproval: formData.requiresPreApproval,
            notes: formData.notes || null,
            encounterType: ctx.code
          });
        }
      });

      if (payloads.length === 0) {
        setErrors(prev => ({ ...prev, coveragePercent: 'يجب إدخال نسبة تغطية لواحد على الأقل من أنواع الزيارات' }));
        return;
      }

      onSubmit(payloads);
    } else {
      const payload = {
        medicalCategoryId: formData.targetType === 'CATEGORY' ? Number(formData.medicalCategoryId) : null,
        medicalServiceId: formData.targetType === 'SERVICE' ? Number(formData.medicalServiceId) : null,
        coveragePercent: formData.coveragePercent !== '' ? Number(formData.coveragePercent) : null,
        amountLimit: formData.amountLimit !== '' ? Number(formData.amountLimit) : null,
        timesLimit: formData.timesLimit !== '' ? Number(formData.timesLimit) : null,
        waitingPeriodDays: formData.waitingPeriodDays !== '' ? Number(formData.waitingPeriodDays) : 0,
        requiresPreApproval: formData.requiresPreApproval,
        notes: formData.notes || null,
        encounterType: formData.encounterType || null
      };
      onSubmit(payload);
    }
  }, [formData, validate, onSubmit]);

  const handleClose = useCallback(() => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <Box sx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: '1px solid',
        borderColor: 'primary.dark'
      }}>
        <ListIcon />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEdit ? 'تعديل قاعدة التغطية' : 'إضافة قاعدة تغطية جديدة'}
        </Typography>
      </Box>
      <DialogContent sx={{ p: 2 }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Target Type Selection */}
            <FormControl fullWidth error={!!errors.targetType} disabled={isEdit} size="small">
              <InputLabel>نوع العنصر المغطى *</InputLabel>
              <Select value={formData.targetType} onChange={handleChange('targetType')} label="نوع العنصر المغطى *">
                <MenuItem value="CATEGORY">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CategoryIcon fontSize="small" />
                    <span>تصنيف طبي</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="SERVICE">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ServiceIcon fontSize="small" />
                    <span>خدمة طبية</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Toggle for Multi-Context */}
            {!isEdit && (
              <Box sx={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={formData.isMultiContext}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          isMultiContext: checked,
                          encounterType: ''
                        }));
                      }}
                    />
                  }
                  label={<Typography variant="caption" fontWeight={700}>تقسيم حسب الزيارة</Typography>}
                />
              </Box>
            )}
          </Box>

          {/* Combined Selectors Row */}
          <Box>
            {formData.targetType === 'CATEGORY' && (
              <FormControl fullWidth error={!!errors.medicalCategoryId} disabled={isEdit} size="small">
                <InputLabel>التصنيف الطبي *</InputLabel>
                <Select
                  value={(!loadingCategories && availableCategories.some(c => c.id === formData.medicalCategoryId)) ? formData.medicalCategoryId : ''}
                  onChange={handleChange('medicalCategoryId')}
                  label="التصنيف الطبي *"
                  disabled={loadingCategories}
                >
                  {loadingCategories ? (
                    <MenuItem disabled value="">جاري التحميل...</MenuItem>
                  ) : (
                    availableCategories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </MenuItem>
                    ))
                  )}
                  {availableCategories.length === 0 && !loadingCategories && (
                    <MenuItem disabled value="">لا توجد تصنيفات متبقية (تمت تغطية الجميع)</MenuItem>
                  )}
                </Select>
              </FormControl>
            )}

            {formData.targetType === 'SERVICE' && (
              <MedicalServiceSelector
                value={formData.medicalServiceId || null}
                onChange={(s) => setFormData((prev) => ({ ...prev, medicalServiceId: s?.id || '' }))}
                error={!!errors.medicalServiceId}
                helperText={errors.medicalServiceId}
                label="الخدمة الطبية *"
                fullWidth
                size="small"
              />
            )}
          </Box>

          {/* Custom Multi-Context Section (8 Elements) */}
          {formData.isMultiContext ? (
            <Box sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'primary.lighter',
              border: '1px dashed',
              borderColor: 'primary.main',
              position: 'relative',
              mt: 2
            }}>
              <Typography variant="subtitle2" sx={{
                position: 'absolute',
                top: -12,
                right: 12,
                bgcolor: 'background.paper',
                px: 1,
                color: 'primary.main',
                fontWeight: 700,
                border: '1px solid',
                borderColor: 'primary.light',
                borderRadius: 1
              }}>
                تحديد نسب التغطية حسب التصنيف (8 عناصر)
              </Typography>

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                {STANDARD_CONTEXTS.map((ctx) => (
                  <Grid item xs={6} md={3} key={ctx.code}>
                    <TextField
                      label={ctx.label}
                      type="number"
                      size="small"
                      value={formData.contextPercents[ctx.code] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          contextPercents: {
                            ...prev.contextPercents,
                            [ctx.code]: val
                          }
                        }));
                      }}
                      InputProps={{
                        inputProps: { min: 0, max: 100 },
                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                      }}
                      fullWidth
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="نسبة التغطية الأساسية"
                  type="number"
                  size="small"
                  value={formData.coveragePercent}
                  onChange={handleChange('coveragePercent')}
                  error={!!errors.coveragePercent}
                  helperText={errors.coveragePercent || 'اتركه فارغاً للافتراضي'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 0, max: 100 }
                  }}
                  fullWidth
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>نوع الزيارة</InputLabel>
                  <Select
                    value={formData.encounterType}
                    label="نوع الزيارة"
                    onChange={handleChange('encounterType')}
                  >
                    <MenuItem value="">جميع أنواع الزيارات</MenuItem>
                    <MenuItem value="OUTPATIENT">عيادات خارجية (OPD)</MenuItem>
                    <MenuItem value="EMERGENCY">الطوارئ (ER)</MenuItem>
                    <MenuItem value="INPATIENT">الإيواء (IPD)</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label={distributionType === 'DISTRIBUTED' ? "الحد الأقصى للمطالبة" : "حد الزيارة"}
                  type="number"
                  size="small"
                  value={formData.amountLimit}
                  onChange={handleChange('amountLimit')}
                  error={!!errors.amountLimit}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">د.ل</InputAdornment>,
                    inputProps: { min: 0 }
                  }}
                  fullWidth
                />
              </Box>
            </>
          )}

          {/* Common Limits Row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="حد المرات"
              type="number"
              size="small"
              value={formData.timesLimit}
              onChange={handleChange('timesLimit')}
              error={!!errors.timesLimit}
              helperText={errors.timesLimit || 'عدد المرات المسموح بها خلال فترة الوثيقة'}
              InputProps={{ inputProps: { min: 0, step: 1 } }}
              fullWidth
            />
            <TextField
              label="فترة الانتظار (يوم)"
              type="number"
              size="small"
              value={formData.waitingPeriodDays}
              onChange={handleChange('waitingPeriodDays')}
              error={!!errors.waitingPeriodDays}
              helperText={errors.waitingPeriodDays || 'عدد الأيام قبل سريان التغطية'}
              InputProps={{ inputProps: { min: 0, step: 1 } }}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={formData.requiresPreApproval}
                  onChange={handleChange('requiresPreApproval')}
                />
              }
              label={<Typography variant="body2">تطلب موافقة مسبقة؟</Typography>}
            />
            <TextField
              label="ملاحظات"
              size="small"
              value={formData.notes}
              onChange={handleChange('notes')}
              multiline
              rows={2}
              sx={{ flexGrow: 1, ml: 2 }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !formData.targetType}
          startIcon={loading && <CircularProgress size={16} color="inherit" />}
        >
          {isEdit ? 'حفظ التعديلات' : 'إضافة القاعدة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

RuleFormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEdit: PropTypes.bool,
  loading: PropTypes.bool,
  categories: PropTypes.array,
  loadingCategories: PropTypes.bool,
  existingRules: PropTypes.array
};

// ═══════════════════════════════════════════════════════════════════════════
// QUICK RULES WIZARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const QuickRulesWizard = ({ open, onClose, onSubmit, categories, loading }) => {
  const [wizardData, setWizardData] = useState({});

  // Initialize wizard data with defaults for 8 standard contexts
  useEffect(() => {
    if (open) {
      const initial = {};
      STANDARD_CONTEXTS.forEach(ctx => {
        initial[ctx.code] = {
          enabled: true,
          coveragePercent: 80,
          waitingPeriodDays: 0,
          amountLimit: '',
          timesLimit: ''
        };
      });
      setWizardData(initial);
    }
  }, [open]);

  // Helper to find category CODE for a context
  const getCategoryCodeForContext = useCallback((contextCode) => {
    if (!categories) return null;
    // Mapping contexts to probable category codes (based on V39 migration)
    // Mapping contexts to probable category codes (based on V39 migration & V13 Seed)
    const mapping = {
      'OUTPATIENT': ['CAT-050', 'CAT-OPD', 'CAT-OUT'], // خدمات العيادات الخارجية
      'INPATIENT': ['CAT-040', 'CAT-IPD', 'CAT-IN'],   // خدمات الايواء
      'EMERGENCY': ['CAT-046', 'CAT-ER'],              // خدمات الطوارئ
      'LABORATORY': ['CAT-064', 'CAT-065', 'CAT-LAB'], // معامل / معمل التحاليل
      'RADIOLOGY': ['CAT-010', 'CAT-045', 'CAT-RAD'],  // اشعة / خدمات الصور التشخيصية
      'PHARMACY': ['CAT-PHARM'],                       // صيدلية (Added in V39)
      'DENTAL': ['CAT-037', 'CAT-011', 'CAT-DENT'],    // خدمات الأسنان / الأسنان
      'PHYSIOTHERAPY': ['CAT-048', 'CAT-PHYS'],        // خدمات العلاج الطبيعي
      'OPTICAL': ['CAT-OPT']                           // بصريات (Added in V39)
    };

    const targetCodes = mapping[contextCode] || [];
    const cat = categories.find(c => targetCodes.some(code => c.code.includes(code) || c.code === code));
    return cat ? cat.code : null;
  }, [categories]);

  const handleSubmit = useCallback(() => {
    const payloads = [];

    Object.entries(wizardData).forEach(([contextCode, data]) => {
      if (data.enabled) {
        const catCode = getCategoryCodeForContext(contextCode);

        // Ideally we should have a category, but if not found, we send the context code as a fallback if acceptable,
        // or we relying on the encounterType.
        // However, backend REQUIRES one of category/service/package.
        // If catCode is null, this will FAIL validation unless we provide a fallback string or ensure categories exist.
        // Since we fixed V39 migration, categories SHOULD exist.

        if (catCode) {
          payloads.push({
            medicalCategory: catCode, // Send CODE (String) to match DTO
            medicalServiceId: null,
            coveragePercent: Number(data.coveragePercent),
            waitingPeriodDays: Number(data.waitingPeriodDays),
            amountLimit: data.amountLimit ? Number(data.amountLimit) : null,
            timesLimit: data.timesLimit ? Number(data.timesLimit) : null,
            encounterType: contextCode,
            requiresPreApproval: false,
            notes: 'Auto-generated via Quick Wizard',
            active: true
          });
        } else {
          console.warn(`Skipping rule for ${contextCode} because no matching category found.`);
        }
      }
    });

    if (payloads.length > 0) {
      onSubmit(payloads);
    }
  }, [wizardData, getCategoryCodeForContext, onSubmit]);

  const updateItem = (code, field, value) => {
    setWizardData(prev => ({
      ...prev,
      [code]: { ...prev[code], [field]: value }
    }));
  };

  const toggleItem = (code) => {
    setWizardData(prev => ({
      ...prev,
      [code]: { ...prev[code], enabled: !prev[code].enabled }
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <ListIcon /> معالج الإعداد السريع للقواعد (Quick Setup)
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          قم بضبط التغطية الأساسية للتصنيفات الرئيسية دفعة واحدة. سيتم إنشاء قاعدة منفصلة لكل تصنيف.
        </Alert>

        <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell padding="checkbox">تفعيل</TableCell>
                <TableCell>التصنيف / السياق</TableCell>
                <TableCell width="120px">نسبة التغطية %</TableCell>
                <TableCell width="120px">فترة الانتظار (يوم)</TableCell>
                <TableCell width="140px">الحد الأقصى (د.ل)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {STANDARD_CONTEXTS.map((ctx) => {
                const row = wizardData[ctx.code] || {};
                const catCode = getCategoryCodeForContext(ctx.code);

                return (
                  <TableRow key={ctx.code} hover selected={row.enabled}>
                    <TableCell padding="checkbox">
                      <Switch
                        checked={!!row.enabled}
                        onChange={() => toggleItem(ctx.code)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{ctx.label}</Typography>
                      {!catCode && (
                        <Typography variant="caption" color="error">
                          (غير مرتبط بتصنيف - سيتم استخدام السياق فقط)
                        </Typography>
                      )}
                      {catCode && (
                        <Typography variant="caption" color="textSecondary">
                          {catCode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row.coveragePercent}
                        onChange={(e) => updateItem(ctx.code, 'coveragePercent', e.target.value)}
                        disabled={!row.enabled}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row.waitingPeriodDays}
                        onChange={(e) => updateItem(ctx.code, 'waitingPeriodDays', e.target.value)}
                        disabled={!row.enabled}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row.amountLimit}
                        onChange={(e) => updateItem(ctx.code, 'amountLimit', e.target.value)}
                        disabled={!row.enabled}
                        placeholder="لا يوجد"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary">
          حفظ وإنشاء القواعد
        </Button>
      </DialogActions>
    </Dialog>
  );
};

QuickRulesWizard.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  categories: PropTypes.array,
  loading: PropTypes.bool
};


// ═══════════════════════════════════════════════════════════════════════════
// MAIN RULES TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Benefit Policy Rules Tab
 *
 * Displays and manages coverage rules for a benefit policy
 */
const BenefitPolicyRulesTab = ({ policyId, policyStatus, distributionType }) => {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [showDeleted, setShowDeleted] = useState(false);

  const clearFilters = useCallback(() => setColumnFilters({}), []);
  const hasActiveFilters = useMemo(() => Object.keys(columnFilters).length > 0, [columnFilters]);

  const setFilter = useCallback((columnId, value) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[columnId];
      } else {
        next[columnId] = value;
      }
      return next;
    });
    setPage(0); // Reset to first page on filter change
  }, []);

  const tableState = {
    page,
    pageSize,
    sorting,
    columnFilters,
    setPage,
    setPageSize,
    setSorting,
    setFilter,
    clearFilters,
    hasActiveFilters
  };

  // Modal states
  const [formModal, setFormModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, rule: null, isHard: false });
  const [quickWizardOpen, setQuickWizardOpen] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  // Fetch count stats
  const { data: counts = { total: 0, active: 0, inactive: 0, deleted: 0 } } = useQuery({
    queryKey: ['benefit-policy-rules-count', policyId],
    queryFn: () => getPolicyRulesCount(policyId),
    enabled: !!policyId
  });

  // Fetch rules (paginated)
  const {
    data: rulesData = { content: [], totalElements: 0 },
    isLoading: loadingRules,
    isFetching: fetchingRules,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['benefit-policy-rules', policyId, page, pageSize, showDeleted, sorting, columnFilters],
    queryFn: () => {
      const fetchFn = showDeleted ? getDeletedPolicyRulesPaged : getPolicyRulesPaged;
      return fetchFn(policyId, {
        page,
        size: pageSize,
        // Backend doesn't support nested sorting yet, but we pass it anyway for future
        sort: sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : 'id,desc',
        ...columnFilters
      });
    },
    enabled: !!policyId
  });

  const rules = rulesData.content || [];
  const totalElements = rulesData.totalElements || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMutation = useMutation({
    mutationFn: (payload) => createPolicyRule(policyId, payload),
    onSuccess: () => {
      enqueueSnackbar('تمت إضافة القاعدة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      setFormModal({ open: false, data: null, isEdit: false });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل إضافة القاعدة', { variant: 'error' });
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (rules) => createPolicyRulesBulk(policyId, rules),
    onSuccess: () => {
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      enqueueSnackbar('تمت إضافة القواعد بنجاح', { variant: 'success' });
      setFormModal({ open: false, isEdit: false, data: null });
    },
    onError: (error) => {
      enqueueSnackbar(error.userMessage || 'فشل إضافة القواعد', { variant: 'error' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ ruleId, payload }) => updatePolicyRule(policyId, ruleId, payload),
    onSuccess: () => {
      enqueueSnackbar('تم تحديث القاعدة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      setFormModal({ open: false, data: null, isEdit: false });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل تحديث القاعدة', { variant: 'error' });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (ruleId) => togglePolicyRuleActive(policyId, ruleId),
    onSuccess: (updatedRule) => {
      enqueueSnackbar(`تم ${updatedRule.active ? 'تفعيل' : 'إلغاء تفعيل'} القاعدة بنجاح`, {
        variant: 'success',
        autoHideDuration: 2000
      });
      // Invalidate both count and list to ensure consistency across the UI
      queryClient.invalidateQueries({ queryKey: ['benefit-policy-rules', policyId] });
      queryClient.invalidateQueries({ queryKey: ['benefit-policy-rules-count', policyId] });
    },
    onError: (err, ruleId, context) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل تغيير الحالة', { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId) => deletePolicyRule(policyId, ruleId),
    onSuccess: () => {
      enqueueSnackbar('تم حذف القاعدة (نقل إلى السلة)', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      queryClient.invalidateQueries(['benefit-policy-rules-count', policyId]);
      setDeleteDialog({ open: false, rule: null, isHard: false });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل حذف القاعدة', { variant: 'error' });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (ruleId) => restorePolicyRule(policyId, ruleId),
    onSuccess: () => {
      enqueueSnackbar('تمت استعادة القاعدة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      queryClient.invalidateQueries(['benefit-policy-rules-count', policyId]);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل استعادة القاعدة', { variant: 'error' });
    }
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (ruleId) => hardDeletePolicyRule(policyId, ruleId),
    onSuccess: () => {
      enqueueSnackbar('تم حذف القاعدة نهائياً', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      queryClient.invalidateQueries(['benefit-policy-rules-count', policyId]);
      setDeleteDialog({ open: false, rule: null, isHard: false });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل الحذف النهائي', { variant: 'error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAddRule = useCallback(() => {
    setFormModal({ open: true, data: null, isEdit: false });
  }, []);

  const handleEditRule = useCallback((rule) => {
    setFormModal({ open: true, data: rule, isEdit: true });
  }, []);

  const handleDeleteRule = useCallback((rule) => {
    setDeleteDialog({ open: true, rule, isHard: false });
  }, []);

  const handleRestoreRule = useCallback((rule) => {
    restoreMutation.mutate(rule.id);
  }, [restoreMutation]);

  const handleDeleteForever = useCallback((rule) => {
    setDeleteDialog({ open: true, rule, isHard: true });
  }, []);

  const handleToggleActive = useCallback(
    (rule) => {
      if (import.meta.env.DEV) {
        console.log(`🔘 Toggling Active for Rule ID: ${rule.id}, Label: ${rule.label}`);
      }
      toggleMutation.mutate(rule.id);
    },
    [toggleMutation]
  );

  const handleFormSubmit = useCallback(
    async (payload) => {
      try {
        if (Array.isArray(payload)) {
          // New: Using bulk creation API
          await bulkCreateMutation.mutateAsync(payload);
        } else if (formModal.isEdit) {
          const ruleId = formModal.data?.id;
          if (ruleId) {
            await updateMutation.mutateAsync({ ruleId, payload });
          }
        } else {
          await createMutation.mutateAsync(payload);
        }
      } catch (error) {
        // Error is handled by mutations
        console.error('Submit error:', error);
      }
    },
    [formModal, createMutation, bulkCreateMutation, updateMutation]
  );

  const handleFormClose = useCallback(() => {
    setFormModal({ open: false, data: null, isEdit: false });
  }, []);

  const handleQuickWizardOpen = useCallback(() => {
    setQuickWizardOpen(true);
  }, []);

  const handleQuickWizardClose = useCallback(() => {
    setQuickWizardOpen(false);
  }, []);

  const handleQuickWizardSubmit = useCallback(
    async (payloads) => {
      try {
        await bulkCreateMutation.mutateAsync(payloads);
        setQuickWizardOpen(false);
      } catch (error) {
        console.error('Quick Wizard Submit error:', error);
      }
    },
    [bulkCreateMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDialog.rule) {
      if (deleteDialog.isHard) {
        hardDeleteMutation.mutate(deleteDialog.rule.id);
      } else {
        deleteMutation.mutate(deleteDialog.rule.id);
      }
    }
  }, [deleteDialog, deleteMutation, hardDeleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ open: false, rule: null });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════
  const canEdit = policyStatus !== 'CANCELLED';
  const isLoadingComputed = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMNS DEFINITION
  // ═══════════════════════════════════════════════════════════════════════════
  const columns = useMemo(() => [
    {
      id: 'rowNumber',
      header: '#',
      width: 50,
      enableSorting: false,
      cell: ({ row, table }) => {
        // Calculate row number: (pageIndex * pageSize) + rowIndex + 1
        const { pageIndex, pageSize } = table.getState().pagination;
        return (
          <Typography variant="body2" color="text.secondary">
            {pageIndex * pageSize + row.index + 1}
          </Typography>
        );
      }
    },
    {
      id: 'label',
      header: 'العنصر المغطى',
      accessorKey: 'label',
      flex: 0.5,
      minWidth: 90,
      cell: ({ row }) => {
        const rule = row.original;
        const Icon = rule.ruleType === 'CATEGORY' ? CategoryIcon : ServiceIcon;
        const code = rule.ruleType === 'CATEGORY' ? rule.medicalCategoryCode : rule.medicalServiceCode;

        return (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              p: 0.75,
              borderRadius: 1,
              bgcolor: rule.ruleType === 'CATEGORY' ? 'primary.lighter' : 'secondary.lighter',
              color: rule.ruleType === 'CATEGORY' ? 'primary.main' : 'secondary.main',
              display: 'flex'
            }}>
              <Icon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                {rule.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {rule.ruleType === 'CATEGORY' ? 'تصنيف' : 'خدمة'}
                <Box component="span" sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {code || '-'}
                </Typography>
              </Typography>
            </Box>
          </Stack>
        );
      }
    },
    {
      id: 'encounterType',
      header: 'نوع الزيارة',
      accessorKey: 'encounterType',
      width: 140,
      cell: ({ value }) => {
        const config = {
          'OUTPATIENT': { label: 'عيادات (OPD)', color: 'primary', variant: 'light' },
          'EMERGENCY': { label: 'طوارئ (ER)', color: 'error', variant: 'light' },
          'INPATIENT': { label: 'إيواء (IPD)', color: 'warning', variant: 'light' },
          'ROUTINE': { label: 'روتينية', color: 'success', variant: 'light' },
          'FOLLOW_UP': { label: 'متابعة', color: 'info', variant: 'light' },
          'PREVENTIVE': { label: 'وقائية', color: 'success', variant: 'outlined' },
          'SPECIALIZED': { label: 'تخصصية', color: 'secondary', variant: 'light' },
          'HOME_CARE': { label: 'منزلي', color: 'primary', variant: 'outlined' },
          'TELECONSULTATION': { label: 'عن بُعد', color: 'info', variant: 'outlined' },
          'DAY_SURGERY': { label: 'جراحة يوم', color: 'error', variant: 'outlined' }
        };

        // If value is null/undefined, it applies to ALL types
        if (!value) {
          return (
            <Chip
              size="small"
              label="عام (الكل)"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                bgcolor: 'grey.200',
                color: 'text.secondary',
                borderRadius: 1
              }}
            />
          );
        }

        const item = config[value] || { label: value, color: 'default', variant: 'outlined' };

        return (
          <Chip
            size="small"
            label={item.label}
            color={item.color}
            variant={item.variant || 'filled'}
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 1
            }}
          />
        );
      }
    },
    {
      id: 'coveragePercent',
      header: 'التغطية',
      accessorKey: 'coveragePercent',
      width: 110,
      cell: ({ row }) => {
        const { coveragePercent, effectiveCoveragePercent } = row.original;
        const isInherited = coveragePercent === null || coveragePercent === undefined;

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              label={`${effectiveCoveragePercent}%`}
              size="small"
              sx={{
                bgcolor: 'primary.main',
                color: 'common.white',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                height: 24,
                minWidth: 48,
                borderRadius: 1
              }}
            />
            {isInherited && (
              <Tooltip title="نسبة افتراضية (موروثة من الوثيقة)">
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', cursor: 'help' }}>
                  (افتراضي)
                </Typography>
              </Tooltip>
            )}
          </Stack>
        );
      }
    },
    {
      id: 'status',
      header: 'الحالة',
      accessorKey: 'active',
      width: 80,
      enableSorting: false, // Disable sorting to prevent row jumps on toggle
      cell: ({ row }) => {
        const rule = row.original;
        if (showDeleted) return null;
        return (
          <Switch
            size="small"
            checked={rule.active}
            onChange={() => handleToggleActive(rule)}
            disabled={!canEdit || toggleMutation.isPending}
          />
        );
      }
    },
    {
      id: 'actions',
      header: 'إجراءات',
      width: 110,
      enableSorting: false,
      cell: ({ row }) => {
        const rule = row.original;
        if (showDeleted) {
          return (
            <Stack direction="row" spacing={0.5} justifyContent="center">
              <Tooltip title="استعادة">
                <IconButton size="small" color="success" onClick={() => handleRestoreRule(rule)} disabled={restoreMutation.isPending}>
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف نهائي">
                <IconButton size="small" color="error" onClick={() => handleDeleteForever(rule)}>
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        }
        return (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <IconButton size="small" onClick={() => handleEditRule(rule)} disabled={!canEdit}>
              <EditIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleDeleteRule(rule)} disabled={!canEdit}>
              <DeleteIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Stack>
        );
      }
    }
  ], [showDeleted, canEdit, toggleMutation.isPending, restoreMutation.isPending, handleToggleActive, handleEditRule, handleDeleteRule, handleRestoreRule, handleDeleteForever]);



  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['medical-categories-all'],
    queryFn: getAllMedicalCategories
  });

  // NOTE: Services are now fetched dynamically by MedicalServiceSelector component

  const isLoading = isLoadingComputed;

  return (
    <>
      <MainCard
        title={
          <Stack direction="row" spacing={2} alignItems="center">
            {showDeleted && (
              <IconButton size="small" onClick={() => setShowDeleted(false)}>
                <BackIcon />
              </IconButton>
            )}
            <Typography variant="h6">
              {showDeleted ? 'سلة المهملات (قواعد محذوفة)' : 'قواعد التغطية'}
            </Typography>
            {!showDeleted && (
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`الكل: ${counts.total || 0}`} variant="outlined" />
                <Chip size="small" label={`نشط: ${counts.active || 0}`} color="success" variant="outlined" />
                {counts.deleted > 0 && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<HistoryIcon fontSize="small" />}
                    onClick={() => setShowDeleted(true)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    السلة ({counts.deleted})
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        }
        secondary={
          <Stack direction="row" spacing={2} alignItems="center">
            {!showDeleted && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, ml: 1, color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>تصفية:</Typography>
                <TextField
                  size="small"
                  placeholder="بحث..."
                  value={columnFilters.label || ''}
                  onChange={(e) => setFilter('label', e.target.value)}
                  sx={{ width: { xs: 150, md: 200 }, bgcolor: 'background.paper' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: columnFilters.label ? (
                      <InputAdornment position="end" sx={{ mr: -1 }}>
                        <IconButton size="small" onClick={() => setFilter('label', '')}>
                          <ClearIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null
                  }}
                />

                <FormControl size="small" sx={{ width: { xs: 120, md: 160 }, bgcolor: 'background.paper' }}>
                  <InputLabel>نوع الزيارة</InputLabel>
                  <Select
                    label="نوع الزيارة"
                    value={columnFilters.encounterType || ''}
                    onChange={(e) => setFilter('encounterType', e.target.value)}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="OUTPATIENT">OPD</MenuItem>
                    <MenuItem value="EMERGENCY">ER</MenuItem>
                    <MenuItem value="INPATIENT">IPD</MenuItem>
                  </Select>
                </FormControl>

                {hasActiveFilters && (
                  <Tooltip title="مسح الفلاتر">
                    <IconButton size="small" color="error" onClick={clearFilters}>
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}

            {!showDeleted && canEdit && (
              <RBACGuard requiredPermissions={['benefit_policies.update']}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<ListIcon />}
                    onClick={handleQuickWizardOpen}
                    size="small"
                    sx={{ height: 40 }}
                  >
                    معالج القواعد
                  </Button>
                  <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddRule} size="small" sx={{ height: 40 }}>
                    إضافة قاعدة
                  </Button>
                </Stack>
              </RBACGuard>
            )}
          </Stack>
        }
        contentSX={{ p: 0 }}
      >

        <GenericDataTable
          columns={columns}
          data={rules}
          totalCount={totalElements}
          isLoading={loadingRules || fetchingRules}
          tableState={tableState}
          emptyMessage={showDeleted ? 'سلة المهملات فارغة' : 'لا توجد قواعد تغطية محددة'}
          enableFiltering={false}
          maxHeight="none"
          cellPadding="dense"
        />
      </MainCard>

      {/* Rule Form Modal */}
      <RuleFormModal
        open={formModal.open}
        onClose={handleFormClose}
        isEdit={formModal.isEdit}
        initialData={formModal.data}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        categories={categories}
        loadingCategories={loadingCategories}
        distributionType={distributionType}
        existingRules={rules}
      />

      <QuickRulesWizard
        open={quickWizardOpen}
        onClose={handleQuickWizardClose}
        onSubmit={handleQuickWizardSubmit}
        categories={categories}
        loading={bulkCreateMutation.isPending}
      />

      {/* Unified Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        variant={deleteDialog.isHard ? 'permanent' : 'delete'}
        title={deleteDialog.isHard ? 'حذف نهائي للقاعدة' : 'نقل للسلة'}
        message={
          <>
            هل أنت متأكد من {deleteDialog.isHard ? 'حذف' : 'نقل'} القاعدة "<strong>{deleteDialog.rule?.label || deleteDialog.rule?.medicalCategoryNameAr || deleteDialog.rule?.medicalServiceNameAr}</strong>" {deleteDialog.isHard ? 'نهائياً؟' : 'إلى سلة المهملات؟'}
          </>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteDialog.isHard ? hardDeleteMutation.isPending : deleteMutation.isPending}
      />
    </>
  );
};

BenefitPolicyRulesTab.propTypes = {
  policyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  policyStatus: PropTypes.string
};

export default BenefitPolicyRulesTab;
