/**
 * Provider Contract View Page
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Displays detailed view of a single provider contract including:
 * - Contract summary (code, status, dates)
 * - Provider information
 * - Pricing model and discount settings
 * - Pricing items table with search
 * - Lifecycle actions (activate, suspend, terminate)
 *
 * Uses REAL Backend API via provider-contracts.service.js
 *
 * Route: /provider-contracts/:id
 * @version 2.1.0
 * @lastUpdated 2024-05-22
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Tooltip,
  Typography,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Business as ProviderIcon,
  CalendarToday as CalendarIcon,
  Description as ContractIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  LocalOffer as PriceIcon,
  Notes as NotesIcon,
  Search as SearchIcon,
  CheckCircle as ActivateIcon,
  PauseCircle as SuspendIcon,
  Cancel as TerminateIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';

// API Service
import {
  getProviderContractById,
  getContractPricingItems,
  activateContract,
  suspendContract,
  terminateContract,
  uploadContractPricingExcel,
  downloadPricingTemplate,
  addPricingItem,
  updatePricingItem,
  deletePricingItem,
  CONTRACT_STATUS,
  CONTRACT_STATUS_CONFIG,
  PRICING_MODEL_CONFIG
} from 'services/api/provider-contracts.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';
import MedicalServiceSelector from 'components/tba/MedicalServiceSelector';

// Snackbar
import { useSnackbar } from 'notistack';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format date for display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format currency
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' د.ل';
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Info Row - displays label/value pairs
 */
const InfoRow = ({ label, value, valueColor, icon: Icon }) => (
  <ListItem disablePadding sx={{ py: 1 }}>
    <ListItemText
      primary={
        <Stack direction="row" spacing={1} alignItems="center">
          {Icon && <Icon fontSize="small" color="action" />}
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
      }
      secondary={
        <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }} color={valueColor || 'text.primary'}>
          {value}
        </Typography>
      }
    />
  </ListItem>
);

/**
 * Tab Panel for displaying tab content
 */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`contract-tabpanel-${index}`} aria-labelledby={`contract-tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ProviderContractView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // File input ref for price list import
  const fileInputRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState(0);
  const [pricingSearch, setPricingSearch] = useState('');
  const [pricingPage, setPricingPage] = useState(0);
  const [pricingRowsPerPage, setPricingRowsPerPage] = useState(10);

  // Dialog states
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [terminateReason, setTerminateReason] = useState('');

  // Pricing Dialog States
  const [addPricingDialogOpen, setAddPricingDialogOpen] = useState(false);
  const [editPricingDialogOpen, setEditPricingDialogOpen] = useState(false);
  const [deletePricingDialogOpen, setDeletePricingDialogOpen] = useState(false);
  const [selectedPricingItem, setSelectedPricingItem] = useState(null);
  const [pricingForm, setPricingForm] = useState({
    medicalServiceId: null,
    medicalCategoryId: null,
    basePrice: '',
    contractPrice: '',
    notes: ''
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING (Real API)
  // ─────────────────────────────────────────────────────────────────────────

  // Fetch contract details
  const {
    data: contract,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['provider-contract', id],
    queryFn: () => getProviderContractById(id),
    enabled: !!id,
    retry: 1,
    staleTime: 30000
  });

  // Fetch pricing items
  const { data: pricingItemsData, isLoading: pricingLoading } = useQuery({
    queryKey: ['provider-contract-pricing', id, pricingPage, pricingRowsPerPage, pricingSearch],
    queryFn: () =>
      getContractPricingItems(id, {
        page: pricingPage,
        size: pricingRowsPerPage,
        q: pricingSearch || undefined
      }),
    enabled: !!id,
    keepPreviousData: true
  });

  // NOTE: Medical services are now fetched dynamically by MedicalServiceSelector component

  // Fetch Medical Categories for Dropdown
  const { data: medicalCategories } = useQuery({
    queryKey: ['medical-categories-dropdown'],
    queryFn: getAllMedicalCategories,
    staleTime: 300000 // 5 minutes
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  // Excel Upload Handler
  const handleExcelUpload = useCallback(
    async (file) => {
      try {
        const result = await uploadContractPricingExcel(id, file);

        if (result.success) {
          enqueueSnackbar(
            result.message || `تم استيراد ${result.summary?.inserted + result.summary?.updated || 0} بند تسعير بنجاح`,
            { variant: 'success' }
          );

          if (result.summary?.failed > 0) {
            enqueueSnackbar(
              `تحذير: فشل استيراد ${result.summary.failed} بند`,
              { variant: 'warning' }
            );
          }

          // Refresh pricing items
          queryClient.invalidateQueries(['provider-contract-pricing', id]);
        }
      } catch (error) {
        enqueueSnackbar(
          error?.message || 'فشل رفع الملف',
          { variant: 'error' }
        );
      }
    },
    [id, queryClient, enqueueSnackbar]
  );

  const handleImportPriceList = useCallback(
    async () => {
      try {
        await downloadPricingTemplate(id);
        enqueueSnackbar('تم تحميل القالب بنجاح. يرجى ملء الأعمدة الإلزامية ثم رفع الملف.', { variant: 'success' });

        setTimeout(() => {
          fileInputRef.current?.click();
        }, 500);
      } catch (error) {
        enqueueSnackbar('فشل تحميل القالب', { variant: 'error' });
      }
    },
    [id, enqueueSnackbar]
  );

  const activateMutation = useMutation({
    mutationFn: () => activateContract(id),
    onSuccess: () => {
      enqueueSnackbar('تم تفعيل العقد بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['provider-contract', id]);
      queryClient.invalidateQueries(['provider-contracts']);
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.message || err.message || 'فشل تفعيل العقد';
      if (errorMsg.includes('ACTIVE')) {
        enqueueSnackbar('العقد مُفعّل بالفعل', { variant: 'warning' });
        queryClient.invalidateQueries(['provider-contract', id]);
      } else {
        enqueueSnackbar(errorMsg, { variant: 'error' });
      }
    }
  });

  const suspendMutation = useMutation({
    mutationFn: (reason) => suspendContract(id, reason),
    onSuccess: () => {
      enqueueSnackbar('تم إيقاف العقد بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['provider-contract', id]);
      queryClient.invalidateQueries(['provider-contracts']);
      setSuspendDialogOpen(false);
      setSuspendReason('');
    },
    onError: (err) => {
      enqueueSnackbar(err.message || 'فشل إيقاف العقد', { variant: 'error' });
    }
  });

  const terminateMutation = useMutation({
    mutationFn: (reason) => terminateContract(id, reason),
    onSuccess: () => {
      enqueueSnackbar('تم إلغاء العقد بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['provider-contract', id]);
      queryClient.invalidateQueries(['provider-contracts']);
      setTerminateDialogOpen(false);
      setTerminateReason('');
    },
    onError: (err) => {
      enqueueSnackbar(err.message || 'فشل إلغاء العقد', { variant: 'error' });
    }
  });

  // Pricing CRUD Mutations
  const addPricingMutation = useMutation({
    mutationFn: (data) => addPricingItem(id, data),
    onSuccess: () => {
      enqueueSnackbar('تم إضافة الخدمة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['provider-contract-pricing', id]);
      setAddPricingDialogOpen(false);
      setPricingForm({ medicalServiceId: null, basePrice: '', contractPrice: '', notes: '' });
    },
    onError: (err) => {
      enqueueSnackbar(err.message || 'فشل إضافة الخدمة', { variant: 'error' });
    }
  });

  const updatePricingMutation = useMutation({
    mutationFn: (data) => updatePricingItem(selectedPricingItem.id, data),
    onSuccess: () => {
      enqueueSnackbar('تم تحديث الخدمة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['provider-contract-pricing', id]);
      setEditPricingDialogOpen(false);
      setSelectedPricingItem(null);
    },
    onError: (err) => {
      enqueueSnackbar(err.message || 'فشل تحديث الخدمة', { variant: 'error' });
    }
  });

  const deletePricingMutation = useMutation({
    mutationFn: () => deletePricingItem(selectedPricingItem.id),
    onSuccess: () => {
      enqueueSnackbar('تم حذف الخدمة بنجاح', { variant: 'success' });
      queryClient.invalidateQueries(['provider-contract-pricing', id]);
      setDeletePricingDialogOpen(false);
      setSelectedPricingItem(null);
    },
    onError: (err) => {
      enqueueSnackbar(err.message || 'فشل حذف الخدمة', { variant: 'error' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const statusConfig = useMemo(() => {
    return CONTRACT_STATUS_CONFIG[contract?.status] || { label: contract?.status, color: 'default' };
  }, [contract?.status]);

  const pricingModelConfig = useMemo(() => {
    return PRICING_MODEL_CONFIG[contract?.pricingModel] || { label: contract?.pricingModel };
  }, [contract?.pricingModel]);

  const pricingItems = useMemo(() => {
    return pricingItemsData?.content || contract?.pricingItems || [];
  }, [pricingItemsData, contract?.pricingItems]);

  const totalPricingItems = useMemo(() => {
    return pricingItemsData?.totalElements ?? pricingItems.length;
  }, [pricingItemsData, pricingItems]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    navigate('/provider-contracts');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/provider-contracts/edit/${id}`);
  }, [navigate, id]);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const handlePricingPageChange = useCallback((event, newPage) => {
    setPricingPage(newPage);
  }, []);

  const handlePricingRowsPerPageChange = useCallback((event) => {
    setPricingRowsPerPage(parseInt(event.target.value, 10));
    setPricingPage(0);
  }, []);

  const handleActivate = useCallback(() => {
    activateMutation.mutate();
  }, [activateMutation]);

  const handleSuspendConfirm = useCallback(() => {
    if (suspendReason.trim()) {
      suspendMutation.mutate(suspendReason);
    }
  }, [suspendMutation, suspendReason]);

  const handleTerminateConfirm = useCallback(() => {
    if (terminateReason.trim()) {
      terminateMutation.mutate(terminateReason);
    }
  }, [terminateMutation, terminateReason]);

  // Pricing Handlers
  const handleOpenAddPricing = useCallback(() => {
    setPricingForm({ medicalServiceId: null, medicalCategoryId: null, basePrice: '', contractPrice: '', notes: '' });
    setAddPricingDialogOpen(true);
  }, []);

  const handleAddPricingSubmit = useCallback(() => {
    if (!pricingForm.medicalServiceId || !pricingForm.basePrice || !pricingForm.contractPrice) return;

    addPricingMutation.mutate({
      medicalServiceId: pricingForm.medicalServiceId.id,
      medicalCategoryId: pricingForm.medicalCategoryId?.id || null,
      basePrice: parseFloat(pricingForm.basePrice),
      contractPrice: parseFloat(pricingForm.contractPrice),
      notes: pricingForm.notes
    });
  }, [addPricingMutation, pricingForm]);

  const handleOpenEditPricing = useCallback((item) => {
    setSelectedPricingItem(item);
    setPricingForm({
      medicalServiceId: item.medicalService || null,
      medicalCategoryId: item.medicalCategory || null,
      basePrice: item.basePrice ?? '',
      contractPrice: item.contractPrice ?? '',
      notes: item.notes || ''
    });
    setEditPricingDialogOpen(true);
  }, []);

  const handleEditPricingSubmit = useCallback(() => {
    if (!pricingForm.basePrice || !pricingForm.contractPrice) return;

    updatePricingMutation.mutate({
      medicalCategoryId: pricingForm.medicalCategoryId?.id || null,
      basePrice: parseFloat(pricingForm.basePrice),
      contractPrice: parseFloat(pricingForm.contractPrice),
      notes: pricingForm.notes
    });
  }, [updatePricingMutation, pricingForm]);

  const handleOpenDeletePricing = useCallback((item) => {
    setSelectedPricingItem(item);
    setDeletePricingDialogOpen(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER - LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER - ERROR STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (isError || !contract) {
    return (
      <MainCard>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight={300} sx={{ py: 4 }}>
          <ContractIcon sx={{ fontSize: 64, color: 'error.main', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="error" gutterBottom>
            {isError ? 'خطأ في تحميل العقد' : 'العقد غير موجود'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error?.message || 'لم يتم العثور على العقد المطلوب'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<BackIcon />} onClick={handleBack}>
              العودة للقائمة
            </Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </Stack>
        </Box>
      </MainCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER - CONTRACT VIEW
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <RBACGuard requiredPermissions={['provider_contracts.view']}>
      {/* Page Header */}
      <ModernPageHeader
        title={`عقد: ${contract.contractCode}`}
        subtitle={contract.providerName || contract.provider?.name || 'عقد مقدم خدمة'}
        icon={ContractIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/dashboard' },
          { label: 'عقود مقدمي الخدمة', path: '/provider-contracts' },
          { label: contract.contractCode, path: `/provider-contracts/${id}` }
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="inherit" startIcon={<BackIcon />} onClick={handleBack}>
              رجوع
            </Button>

            {/* Lifecycle Actions */}
            {(contract.status === CONTRACT_STATUS.DRAFT || contract.status === CONTRACT_STATUS.SUSPENDED) && (
              <RBACGuard requiredPermissions={['provider_contracts.activate']}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ActivateIcon />}
                  onClick={handleActivate}
                  disabled={activateMutation.isLoading}
                >
                  تفعيل العقد
                </Button>
              </RBACGuard>
            )}

            {contract.status === CONTRACT_STATUS.ACTIVE && (
              <RBACGuard requiredPermissions={['provider_contracts.suspend']}>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<SuspendIcon />}
                  onClick={() => setSuspendDialogOpen(true)}
                  disabled={suspendMutation.isLoading}
                >
                  إيقاف
                </Button>
              </RBACGuard>
            )}

            {(contract.status === CONTRACT_STATUS.ACTIVE || contract.status === CONTRACT_STATUS.SUSPENDED) && (
              <RBACGuard requiredPermissions={['provider_contracts.terminate']}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<TerminateIcon />}
                  onClick={() => setTerminateDialogOpen(true)}
                  disabled={terminateMutation.isLoading}
                >
                  إلغاء
                </Button>
              </RBACGuard>
            )}

            <RBACGuard requiredPermissions={['provider_contracts.update']}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                disabled={contract.status === CONTRACT_STATUS.TERMINATED}
              >
                تعديل
              </Button>
            </RBACGuard>
          </Stack>
        }
      />

      {/* Contract Summary Card */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <MainCard title="معلومات العقد" secondary={<Chip label={statusConfig.label} color={statusConfig.color} size="small" />}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <List disablePadding>
                  <InfoRow label="رمز العقد" value={contract.contractCode} icon={ContractIcon} />
                  <InfoRow label="نموذج التسعير" value={pricingModelConfig.label} icon={PriceIcon} />
                  <InfoRow label="نسبة الخصم" value={contract.discountPercent ? `${contract.discountPercent}%` : '-'} icon={PriceIcon} />
                </List>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <List disablePadding>
                  <InfoRow label="تاريخ البدء" value={formatDate(contract.startDate)} icon={CalendarIcon} />
                  <InfoRow label="تاريخ الانتهاء" value={formatDate(contract.endDate)} icon={CalendarIcon} />
                  <InfoRow label="عدد بنود التسعير" value={contract.pricingItemsCount || pricingItems.length} icon={InfoIcon} />
                </List>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title="مقدم الخدمة" secondary={<ProviderIcon color="primary" />}>
            <List disablePadding>
              <InfoRow label="الاسم" value={contract.providerName || contract.provider?.name || '-'} />
              <InfoRow label="المدينة" value={contract.provider?.city || '-'} />
              <InfoRow label="رقم الهاتف" value={contract.provider?.phone || '-'} />
            </List>
          </MainCard>
        </Grid>
      </Grid>

      {/* Notes Section */}
      {contract.notes && (
        <MainCard title="ملاحظات" secondary={<NotesIcon color="action" />} sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {contract.notes}
          </Typography>
        </MainCard>
      )}

      {/* Tabs Section */}
      <MainCard>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="contract tabs" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="بنود التسعير" id="contract-tab-0" />
          <Tab label="سجل التغييرات" id="contract-tab-1" disabled />
        </Tabs>

        {/* Pricing Items Tab */}
        <TabPanel value={activeTab} index={0}>
          {/* Search and Excel Upload */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
            <TextField
              placeholder="بحث في بنود التسعير..."
              value={pricingSearch}
              onChange={(e) => {
                setPricingSearch(e.target.value);
                setPricingPage(0);
              }}
              size="small"
              sx={{ flexGrow: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
            />

            {/* Add System Service Button */}
            <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleOpenAddPricing}
                startIcon={<AddIcon />}
                size="medium"
              >
                إضافة خدمة طبية
              </Button>
            </RBACGuard>

            {/* Import Price List Button - Downloads template then allows upload */}
            <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleImportPriceList}
                startIcon={<ContractIcon />}
                size="medium"
              >
                استيراد قائمة الأسعار
              </Button>
            </RBACGuard>

            {/* Hidden file input for uploading filled template */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleExcelUpload(file);
              }}
            />
          </Stack>

          {/* Pricing Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell>رمز الخدمة</TableCell>
                  <TableCell>اسم الخدمة</TableCell>
                  <TableCell>التصنيف</TableCell>
                  <TableCell align="right">السعر الأساسي</TableCell>
                  <TableCell align="right">سعر العقد</TableCell>
                  <TableCell align="right">الخصم %</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pricingLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : pricingItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {pricingSearch ? 'لم يتم العثور على بنود مطابقة' : 'لا توجد بنود تسعير'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pricingItems.map((item, index) => (
                    <TableRow key={item.id || index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} color="primary">
                          {item.medicalService?.code || item.serviceCode || item.service?.code || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0}>
                          <Typography variant="body2">
                            {item.serviceName || item.medicalService?.name || '-'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.effectiveCategory?.name || item.medicalCategory?.name || item.categoryName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.basePrice)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={500} color="primary.main">
                          {formatCurrency(item.contractPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.discountPercent !== null && item.discountPercent !== undefined ? (
                          <Chip label={`${item.discountPercent}%`} size="small" color="success" variant="outlined" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
                            <Tooltip title="تعديل السعر">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditPricing(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </RBACGuard>
                          <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error" onClick={() => handleOpenDeletePricing(item)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </RBACGuard>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPricingItems > 0 && (
            <TablePagination
              component="div"
              count={totalPricingItems}
              page={pricingPage}
              onPageChange={handlePricingPageChange}
              rowsPerPage={pricingRowsPerPage}
              onRowsPerPageChange={handlePricingRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="عدد الصفوف:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`}
            />
          )}
        </TabPanel>

        {/* Change Log Tab (Future) */}
        <TabPanel value={activeTab} index={1}>
          <Typography color="text.secondary">سجل التغييرات قيد التطوير</Typography>
        </TabPanel>
      </MainCard>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إيقاف العقد</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>هل أنت متأكد من إيقاف العقد؟ يرجى إدخال سبب الإيقاف.</DialogContentText>
          <TextField
            autoFocus
            label="سبب الإيقاف"
            fullWidth
            multiline
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleSuspendConfirm}
            color="warning"
            variant="contained"
            disabled={!suspendReason.trim() || suspendMutation.isLoading}
          >
            {suspendMutation.isLoading ? <CircularProgress size={20} /> : 'إيقاف العقد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={terminateDialogOpen} onClose={() => setTerminateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle color="error">إلغاء العقد</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            <strong>تحذير:</strong> إلغاء العقد إجراء نهائي ولا يمكن التراجع عنه. يرجى إدخال سبب الإلغاء.
          </DialogContentText>
          <TextField
            autoFocus
            label="سبب الإلغاء"
            fullWidth
            multiline
            rows={3}
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialogOpen(false)}>تراجع</Button>
          <Button
            onClick={handleTerminateConfirm}
            color="error"
            variant="contained"
            disabled={!terminateReason.trim() || terminateMutation.isLoading}
          >
            {terminateMutation.isLoading ? <CircularProgress size={20} /> : 'إلغاء العقد نهائياً'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Pricing Item Dialog */}
      <Dialog open={addPricingDialogOpen} onClose={() => setAddPricingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة خدمة طبية للتسعير</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            اختر الخدمة الطبية من النظام وأدخل السعر المتفق عليه. يمكنك اختيار تصنيف مختلف اختيارياً.
          </DialogContentText>
          <Stack spacing={3}>
            <MedicalServiceSelector
              value={pricingForm.medicalServiceId}
              onChange={(newValue) => {
                setPricingForm({
                  ...pricingForm,
                  medicalServiceId: newValue,
                  basePrice: newValue ? (newValue.basePrice ?? '') : '',
                  contractPrice: '',
                  medicalCategoryId: null // Reset category when service changes
                });
              }}
              required
              label="الخدمة الطبية *"
              size="medium"
            />

            {/* Category Override (Optional) */}
            <Autocomplete
              options={medicalCategories || []}
              getOptionLabel={(option) => option.nameAr || option.nameEn || option.name || ''}
              groupBy={(option) => option.parentId ? 'تصنيف فرعي' : 'تصنيف رئيسي'}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Stack>
                      <Typography variant="body2" fontWeight={option.parentId ? 400 : 600}>
                        {option.code} - {option.nameAr}
                      </Typography>
                      {option.nameEn && (
                        <Typography variant="caption" color="text.secondary">
                          {option.nameEn}
                        </Typography>
                      )}
                    </Stack>
                  </li>
                );
              }}
              value={pricingForm.medicalCategoryId}
              onChange={(e, newValue) => {
                setPricingForm({
                  ...pricingForm,
                  medicalCategoryId: newValue
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="التصنيف الطبي (اختياري)"
                  helperText="اختر تصنيفاً مختلفاً عن التصنيف الافتراضي للخدمة"
                />
              )}
            />

            <TextField
              label="السعر الأساسي"
              type="number"
              fullWidth
              value={pricingForm.basePrice}
              onChange={(e) => setPricingForm({ ...pricingForm, basePrice: e.target.value })}
              required
              helperText="السعر المرجعي للخدمة"
            />

            <TextField
              label="سعر العقد (المتفق عليه)"
              type="number"
              fullWidth
              value={pricingForm.contractPrice}
              onChange={(e) => setPricingForm({ ...pricingForm, contractPrice: e.target.value })}
              required
              helperText={
                pricingForm.basePrice && pricingForm.contractPrice
                  ? `نسبة الخصم: ${Math.round(((pricingForm.basePrice - pricingForm.contractPrice) / pricingForm.basePrice) * 100)}%`
                  : ''
              }
            />

            <TextField
              label="ملاحظات"
              fullWidth
              multiline
              rows={2}
              value={pricingForm.notes}
              onChange={(e) => setPricingForm({ ...pricingForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPricingDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleAddPricingSubmit}
            variant="contained"
            disabled={!pricingForm.medicalServiceId || !pricingForm.contractPrice || addPricingMutation.isLoading}
          >
            {addPricingMutation.isLoading ? <CircularProgress size={20} /> : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Pricing Item Dialog */}
      <Dialog open={editPricingDialogOpen} onClose={() => setEditPricingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل سعر الخدمة</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {selectedPricingItem ? `تعديل السعر للخدمة: ${selectedPricingItem.serviceName || selectedPricingItem.medicalService?.name}` : 'تعديل السعر'}
          </DialogContentText>
          <Stack spacing={3}>
            <TextField
              label="الخدمة"
              fullWidth
              value={selectedPricingItem ? (selectedPricingItem.serviceName || selectedPricingItem.medicalService?.name) : ''}
              disabled
            />

            {/* Category Override (Optional) */}
            <Autocomplete
              options={medicalCategories || []}
              getOptionLabel={(option) => option.name || ''}
              groupBy={(option) => option.parentId ? 'تصنيف فرعي' : 'تصنيف رئيسي'}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Stack>
                      <Typography variant="body2" fontWeight={option.parentId ? 400 : 600}>
                        {option.code} - {option.name}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              value={pricingForm.medicalCategoryId}
              onChange={(e, newValue) => {
                setPricingForm({
                  ...pricingForm,
                  medicalCategoryId: newValue
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="التصنيف الطبي (اختياري)"
                  helperText="يمكنك تغيير التصنيف لهذه الخدمة"
                />
              )}
            />

            <TextField
              label="السعر الأساسي"
              type="number"
              fullWidth
              value={pricingForm.basePrice}
              onChange={(e) => setPricingForm({ ...pricingForm, basePrice: e.target.value })}
              required
            />

            <TextField
              label="سعر العقد الجديد"
              type="number"
              fullWidth
              value={pricingForm.contractPrice}
              onChange={(e) => setPricingForm({ ...pricingForm, contractPrice: e.target.value })}
              required
              helperText={
                pricingForm.basePrice && pricingForm.contractPrice
                  ? `نسبة الخصم الجديدة: ${Math.round(((pricingForm.basePrice - pricingForm.contractPrice) / pricingForm.basePrice) * 100)}%`
                  : ''
              }
            />

            <TextField
              label="ملاحظات"
              fullWidth
              multiline
              rows={2}
              value={pricingForm.notes}
              onChange={(e) => setPricingForm({ ...pricingForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPricingDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleEditPricingSubmit}
            variant="contained"
            disabled={!pricingForm.contractPrice || updatePricingMutation.isLoading}
          >
            {updatePricingMutation.isLoading ? <CircularProgress size={20} /> : 'حفظ التغييرات'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Pricing Dialog */}
      <Dialog open={deletePricingDialogOpen} onClose={() => setDeletePricingDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle color="error">حذف الخدمة</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف هذه الخدمة من العقد؟
            <br />
            <strong>{selectedPricingItem?.serviceName || selectedPricingItem?.medicalService?.name}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePricingDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={() => deletePricingMutation.mutate()}
            color="error"
            variant="contained"
            disabled={deletePricingMutation.isLoading}
          >
            {deletePricingMutation.isLoading ? <CircularProgress size={20} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </RBACGuard>
  );
};

export default ProviderContractView;
