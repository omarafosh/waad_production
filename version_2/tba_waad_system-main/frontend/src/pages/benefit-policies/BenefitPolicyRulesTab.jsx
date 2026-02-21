import { useState, useCallback, useMemo } from 'react';
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
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  MedicalServices as ServiceIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import MedicalServiceSelector from 'components/tba/MedicalServiceSelector';

import {
  getPolicyRules,
  createPolicyRule,
  updatePolicyRule,
  togglePolicyRuleActive,
  deletePolicyRule
} from 'services/api/benefit-policy-rules.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

// ═══════════════════════════════════════════════════════════════════════════
// RULE FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const INITIAL_FORM_STATE = {
  targetType: '', // 'CATEGORY' or 'SERVICE'
  medicalCategoryId: '',
  medicalServiceId: '',
  coveragePercent: '',
  amountLimit: '',
  timesLimit: '',
  waitingPeriodDays: '0',
  requiresPreApproval: false,
  notes: ''
};

/**
 * Rule Form Modal
 */
const RuleFormModal = ({ open, onClose, onSubmit, initialData, isEdit, loading, categories, loadingCategories }) => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useState(() => {
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
          notes: initialData.notes || ''
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

    const payload = {
      medicalCategoryId: formData.targetType === 'CATEGORY' ? Number(formData.medicalCategoryId) : null,
      medicalServiceId: formData.targetType === 'SERVICE' ? Number(formData.medicalServiceId) : null,
      coveragePercent: formData.coveragePercent !== '' ? Number(formData.coveragePercent) : null,
      amountLimit: formData.amountLimit !== '' ? Number(formData.amountLimit) : null,
      timesLimit: formData.timesLimit !== '' ? Number(formData.timesLimit) : null,
      waitingPeriodDays: formData.waitingPeriodDays !== '' ? Number(formData.waitingPeriodDays) : 0,
      requiresPreApproval: formData.requiresPreApproval,
      notes: formData.notes || null
    };

    onSubmit(payload);
  }, [formData, validate, onSubmit]);

  const handleClose = useCallback(() => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'تعديل قاعدة التغطية' : 'إضافة قاعدة تغطية جديدة'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Target Type Selection */}
          <FormControl fullWidth error={!!errors.targetType} disabled={isEdit}>
            <InputLabel>نوع العنصر المغطى *</InputLabel>
            <Select value={formData.targetType} onChange={handleChange('targetType')} label="نوع العنصر المغطى *">
              <MenuItem value="CATEGORY">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CategoryIcon fontSize="small" />
                  <span>تصنيف طبي (يشمل جميع خدماته)</span>
                </Stack>
              </MenuItem>
              <MenuItem value="SERVICE">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ServiceIcon fontSize="small" />
                  <span>خدمة طبية محددة</span>
                </Stack>
              </MenuItem>
            </Select>
            {errors.targetType && <FormHelperText>{errors.targetType}</FormHelperText>}
          </FormControl>

          {/* Category Selector (shown when targetType = CATEGORY) */}
          {formData.targetType === 'CATEGORY' && (
            <FormControl fullWidth error={!!errors.medicalCategoryId} disabled={isEdit}>
              <InputLabel>التصنيف الطبي *</InputLabel>
              <Select
                value={formData.medicalCategoryId}
                onChange={handleChange('medicalCategoryId')}
                label="التصنيف الطبي *"
                disabled={loadingCategories}
              >
                {loadingCategories ? (
                  <MenuItem disabled>جاري التحميل...</MenuItem>
                ) : (
                  categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.medicalCategoryId && <FormHelperText>{errors.medicalCategoryId}</FormHelperText>}
            </FormControl>
          )}

          {/* Service Selector (shown when targetType = SERVICE) */}
          {formData.targetType === 'SERVICE' && (
            <MedicalServiceSelector
              value={formData.medicalServiceId ? { id: formData.medicalServiceId } : null}
              onChange={(service) => {
                setFormData((prev) => ({
                  ...prev,
                  medicalServiceId: service?.id || ''
                }));
                setErrors((prev) => ({ ...prev, medicalServiceId: null }));
              }}
              disabled={isEdit}
              required
              error={!!errors.medicalServiceId}
              helperText={errors.medicalServiceId}
              label="الخدمة الطبية *"
              size="medium"
            />
          )}

          {/* Coverage Percent */}
          <TextField
            label="نسبة التغطية"
            type="number"
            value={formData.coveragePercent}
            onChange={handleChange('coveragePercent')}
            error={!!errors.coveragePercent}
            helperText={errors.coveragePercent || 'اتركه فارغاً لاستخدام النسبة الافتراضية للوثيقة'}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
              inputProps: { min: 0, max: 100 }
            }}
            fullWidth
          />

          {/* Amount Limit */}
          <TextField
            label="الحد الأقصى للمبلغ"
            type="number"
            value={formData.amountLimit}
            onChange={handleChange('amountLimit')}
            error={!!errors.amountLimit}
            helperText={errors.amountLimit}
            InputProps={{
              endAdornment: <InputAdornment position="end">د.ل</InputAdornment>,
              inputProps: { min: 0 }
            }}
            fullWidth
          />

          {/* Times Limit */}
          <TextField
            label="الحد الأقصى للمرات"
            type="number"
            value={formData.timesLimit}
            onChange={handleChange('timesLimit')}
            error={!!errors.timesLimit}
            helperText={errors.timesLimit || 'عدد المرات المسموح بها خلال فترة الوثيقة'}
            InputProps={{
              inputProps: { min: 0, step: 1 }
            }}
            fullWidth
          />

          {/* Waiting Period */}
          <TextField
            label="فترة الانتظار"
            type="number"
            value={formData.waitingPeriodDays}
            onChange={handleChange('waitingPeriodDays')}
            error={!!errors.waitingPeriodDays}
            helperText={errors.waitingPeriodDays || 'عدد الأيام قبل سريان التغطية'}
            InputProps={{
              endAdornment: <InputAdornment position="end">يوم</InputAdornment>,
              inputProps: { min: 0, step: 1 }
            }}
            fullWidth
          />

          {/* Requires Pre-Approval */}
          <FormControlLabel
            control={<Switch checked={formData.requiresPreApproval} onChange={handleChange('requiresPreApproval')} color="primary" />}
            label="تتطلب موافقة مسبقة"
          />

          {/* Notes */}
          <TextField label="ملاحظات" value={formData.notes} onChange={handleChange('notes')} multiline rows={2} fullWidth />
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
  loadingCategories: PropTypes.bool
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE CONFIRMATION DIALOG
// ═══════════════════════════════════════════════════════════════════════════

const DeleteConfirmDialog = ({ open, ruleName, onConfirm, onCancel, loading }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>حذف قاعدة التغطية</DialogTitle>
    <DialogContent>
      <DialogContentText>
        هل أنت متأكد من حذف قاعدة التغطية "{ruleName}"؟
        <br />
        سيتم إلغاء تفعيل هذه القاعدة.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading}>
        إلغاء
      </Button>
      <Button
        onClick={onConfirm}
        color="error"
        variant="contained"
        disabled={loading}
        startIcon={loading && <CircularProgress size={16} color="inherit" />}
      >
        حذف
      </Button>
    </DialogActions>
  </Dialog>
);

DeleteConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  ruleName: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
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
const BenefitPolicyRulesTab = ({ policyId, policyStatus }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Modal states
  const [formModal, setFormModal] = useState({ open: false, data: null, isEdit: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, rule: null });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  // Fetch rules
  const {
    data: rules = [],
    isLoading: loadingRules,
    error: rulesError,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['benefit-policy-rules', policyId],
    queryFn: () => getPolicyRules(policyId),
    enabled: !!policyId
  });

  // Fetch categories for selector
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['medical-categories-all'],
    queryFn: getAllMedicalCategories
  });

  // NOTE: Services are now fetched dynamically by MedicalServiceSelector component

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
    onSuccess: () => {
      enqueueSnackbar('تم تغيير حالة القاعدة', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل تغيير الحالة', { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId) => deletePolicyRule(policyId, ruleId),
    onSuccess: () => {
      enqueueSnackbar('تم حذف القاعدة', { variant: 'success' });
      queryClient.invalidateQueries(['benefit-policy-rules', policyId]);
      setDeleteDialog({ open: false, rule: null });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || 'فشل حذف القاعدة', { variant: 'error' });
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
    setDeleteDialog({ open: true, rule });
  }, []);

  const handleToggleActive = useCallback(
    (rule) => {
      toggleMutation.mutate(rule.id);
    },
    [toggleMutation]
  );

  const handleFormSubmit = useCallback(
    (payload) => {
      if (formModal.isEdit && formModal.data) {
        updateMutation.mutate({ ruleId: formModal.data.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [formModal, createMutation, updateMutation]
  );

  const handleFormClose = useCallback(() => {
    setFormModal({ open: false, data: null, isEdit: false });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDialog.rule) {
      deleteMutation.mutate(deleteDialog.rule.id);
    }
  }, [deleteDialog.rule, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ open: false, rule: null });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  const canEdit = policyStatus !== 'CANCELLED';
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loadingRules) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (rulesError) {
    return <Alert severity="error">فشل تحميل قواعد التغطية: {rulesError.response?.data?.message || rulesError.message}</Alert>;
  }

  return (
    <>
      <MainCard
        title="قواعد التغطية"
        secondary={
          canEdit && (
            
              <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddRule} size="small">
                إضافة قاعدة
              </Button>
              
          )
        }
      >
        {rules.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            لا توجد قواعد تغطية محددة لهذه الوثيقة.
            <br />
            سيتم استخدام نسبة التغطية الافتراضية للوثيقة لجميع الخدمات.
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>العنصر المغطى</TableCell>
                  <TableCell align="center">نسبة التغطية</TableCell>
                  <TableCell align="center">حد المبلغ</TableCell>
                  <TableCell align="center">حد المرات</TableCell>
                  <TableCell align="center">فترة الانتظار</TableCell>
                  <TableCell align="center">موافقة مسبقة</TableCell>
                  <TableCell align="center">نشط</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} hover>
                    {/* Covered Item */}
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {rule.ruleType === 'CATEGORY' ? (
                          <Tooltip title="تصنيف طبي">
                            <CategoryIcon fontSize="small" color="primary" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="خدمة طبية">
                            <ServiceIcon fontSize="small" color="secondary" />
                          </Tooltip>
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {rule.label || (rule.ruleType === 'CATEGORY' ? rule.medicalCategoryName : rule.medicalServiceName)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rule.ruleType === 'CATEGORY' ? rule.medicalCategoryCode : rule.medicalServiceCode}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Coverage % */}
                    <TableCell align="center">
                      <Chip
                        label={`${rule.effectiveCoveragePercent || rule.coveragePercent || 0}%`}
                        size="small"
                        color={rule.coveragePercent !== null ? 'primary' : 'default'}
                        variant={rule.coveragePercent !== null ? 'filled' : 'outlined'}
                      />
                    </TableCell>

                    {/* Amount Limit */}
                    <TableCell align="center">
                      {rule.amountLimit ? `${Number(rule.amountLimit).toLocaleString('en-US')} د.ل` : '-'}
                    </TableCell>

                    {/* Times Limit */}
                    <TableCell align="center">{rule.timesLimit ?? '-'}</TableCell>

                    {/* Waiting Period */}
                    <TableCell align="center">{rule.waitingPeriodDays ? `${rule.waitingPeriodDays} يوم` : '-'}</TableCell>

                    {/* Requires Pre-Approval */}
                    <TableCell align="center">
                      {rule.requiresPreApproval ? (
                        <Chip label="نعم" size="small" color="warning" />
                      ) : (
                        <Chip label="لا" size="small" variant="outlined" />
                      )}
                    </TableCell>

                    {/* Active Toggle */}
                    <TableCell align="center">
                      <Tooltip title={rule.active ? 'تعطيل القاعدة' : 'تفعيل القاعدة'}>
                        <span>
                          <Switch
                            checked={rule.active}
                            onChange={() => handleToggleActive(rule)}
                            size="small"
                            disabled={!canEdit || toggleMutation.isPending}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      {canEdit && (
                        
                          <Stack direction="row" spacing={0} justifyContent="center">
                            <Tooltip title="تعديل">
                              <IconButton size="small" color="primary" onClick={() => handleEditRule(rule)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error" onClick={() => handleDeleteRule(rule)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MainCard>

      {/* Rule Form Modal */}
      <RuleFormModal
        open={formModal.open}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={formModal.data}
        isEdit={formModal.isEdit}
        loading={createMutation.isPending || updateMutation.isPending}
        categories={categories}
        loadingCategories={loadingCategories}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        ruleName={deleteDialog.rule?.label || deleteDialog.rule?.medicalCategoryName || deleteDialog.rule?.medicalServiceName}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteMutation.isPending}
      />
    </>
  );
};

BenefitPolicyRulesTab.propTypes = {
  policyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  policyStatus: PropTypes.string
};

export default BenefitPolicyRulesTab;
