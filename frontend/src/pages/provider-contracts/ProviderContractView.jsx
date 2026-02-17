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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Tooltip,
  Typography,
  Autocomplete,
  alpha
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
  Add as AddIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import GenericDataTable from 'components/GenericDataTable';
import DataImportWizard from 'components/ExcelImport/DataImportWizard';
import useFormatter from 'hooks/useFormatter';
import { useSystemSettings } from 'contexts/SystemSettingsContext'; // Changed

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


// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Info Row - displays label/value pairs
 */
/**
 * Info Row - displays label/value pairs with fixed height and branding
 */
/**
 * Info Table Row
 */
const InfoTableRow = ({ label, value, valueColor, icon: Icon, iconColor }) => (
  <TableRow sx={{ '& td, & th': { border: 0, py: 1, px: 1 } }}>
    <TableCell component="th" scope="row" align="left" sx={{ width: '40%', verticalAlign: 'middle' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {Icon && <Icon sx={{ fontSize: 18, color: iconColor || 'text.secondary' }} />}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
      </Stack>
    </TableCell>
    <TableCell align="left" sx={{ verticalAlign: 'middle' }}>
      <Typography variant="body2" fontWeight={600} color={valueColor || 'text.primary'} align="left">
        {value}
      </Typography>
    </TableCell>
  </TableRow>
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
  const { formatDate, formatCurrency } = useFormatter();
  const { primaryColor } = useSystemSettings(); // Changed: cardTitleColor was likely an alias for primaryColor or mainColor
  const cardTitleColor = primaryColor; // Mapping for backwards compatibility within this file

  // File input ref for price list import
  const fileInputRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [pricingSearch, setPricingSearch] = useState('');
  const [pricingPage, setPricingPage] = useState(0);
  const [pricingRowsPerPage, setPricingRowsPerPage] = useState(3);
  const [pricingSorting, setPricingSorting] = useState([]);
  const [pricingFilters, setPricingFilters] = useState({});

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
    specialty: '',
    notes: ''
  });

  const [importWizardOpen, setImportWizardOpen] = useState(false);

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
    queryKey: ['provider-contract-pricing', id, pricingPage, pricingRowsPerPage, pricingSearch, pricingSorting, pricingFilters],
    queryFn: () =>
      getContractPricingItems(id, {
        page: pricingPage,
        size: pricingRowsPerPage,
        q: pricingSearch || undefined
        // Filters and sorting could be added here if backend supports it
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

  const handleDownloadTemplate = useCallback(
    async () => {
      try {
        await downloadPricingTemplate(id);
        enqueueSnackbar('تم تحميل القالب بنجاح. يرجى ملء البيانات المطلوبة.', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('فشل تحميل القالب', { variant: 'error' });
      }
    },
    [id, enqueueSnackbar]
  );

  const handleImportPriceList = useCallback(() => {
    setImportWizardOpen(true);
  }, []);

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
      // setAddPricingDialogOpen(false); // Controlled by handleAddPricingSubmit options
      setPricingForm({ medicalServiceId: null, medicalCategoryId: null, basePrice: '', contractPrice: '', notes: '' });
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

  // Table Columns Definition


  // Pricing Handlers
  const handleOpenAddPricing = useCallback(() => {
    setPricingForm({ medicalServiceId: null, medicalCategoryId: null, basePrice: '', contractPrice: '', notes: '' });
    setAddPricingDialogOpen(true);
  }, []);

  const handleAddPricingSubmit = useCallback((stayOpen = false) => {
    // Validation: Require either ID (standard) or Name (custom)
    if ((!pricingForm.medicalServiceId && !pricingForm.serviceName) || !pricingForm.basePrice || !pricingForm.contractPrice) return;

    // For custom services, category is MANDATORY
    if (!pricingForm.medicalServiceId && !pricingForm.medicalCategoryId) {
      enqueueSnackbar('يجب اختيار التصنيف للخدمات المخصصة', { variant: 'warning' });
      return;
    }

    const payload = {
      medicalServiceId: pricingForm.medicalServiceId ? pricingForm.medicalServiceId.id : null,
      serviceName: pricingForm.serviceName || null,
      medicalCategoryId: pricingForm.medicalCategoryId?.id || null,
      categoryName: pricingForm.medicalCategoryId?.name || null,
      basePrice: parseFloat(pricingForm.basePrice),
      contractPrice: parseFloat(pricingForm.contractPrice),
      specialty: pricingForm.specialty || null,
      notes: pricingForm.notes
    };

    addPricingMutation.mutate(payload, {
      onSuccess: () => {
        if (!stayOpen) {
          setAddPricingDialogOpen(false);
        }
      }
    });
  }, [addPricingMutation, pricingForm, enqueueSnackbar]);

  const handleOpenEditPricing = useCallback((item) => {
    setSelectedPricingItem(item);
    setPricingForm({
      medicalServiceId: item.medicalService || null,
      medicalCategoryId: item.medicalCategory || null,
      basePrice: item.basePrice ?? '',
      contractPrice: item.contractPrice ?? '',
      specialty: item.specialty || '',
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
      specialty: pricingForm.specialty || null,
      notes: pricingForm.notes
    });
  }, [updatePricingMutation, pricingForm]);

  const handleOpenDeletePricing = useCallback((item) => {
    setSelectedPricingItem(item);
    setDeletePricingDialogOpen(true);
  }, []);

  // Table Columns Definition
  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'رمز الخدمة',
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={500} color="primary">
          {row.original.medicalService?.code || row.original.serviceCode || row.original.service?.code || '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'name',
      header: 'اسم الخدمة',
      cell: ({ row }) => (
        <Stack spacing={0}>
          <Typography variant="body2">
            {row.original.serviceName || row.original.medicalService?.name || '-'}
          </Typography>
        </Stack>
      )
    },
    {
      accessorKey: 'specialty',
      header: 'التخصص',
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">
          {row.original.specialty || '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'category',
      header: 'التصنيف',
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">
          {row.original.effectiveCategory?.name || row.original.medicalCategory?.name || row.original.categoryName || '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'basePrice',
      header: 'السعر الأساسي',
      align: 'right',
      cell: ({ row }) => formatCurrency(row.original.basePrice)
    },
    {
      accessorKey: 'contractPrice',
      header: 'سعر العقد',
      align: 'right',
      cell: ({ row }) => (
        <Typography fontWeight={500} color="primary.main">
          {formatCurrency(row.original.contractPrice)}
        </Typography>
      )
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      align: 'center',
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
            <Tooltip title="تعديل السعر">
              <IconButton size="small" color="primary" onClick={() => handleOpenEditPricing(row.original)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </RBACGuard>
          <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" onClick={() => handleOpenDeletePricing(row.original)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </RBACGuard>
        </Stack>
      )
    }
  ], [formatCurrency, handleOpenEditPricing, handleOpenDeletePricing]);

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

      {/* Main Content Area - Lifted higher to reduce white space */}
      <Box sx={{ display: 'flex', flexDirection: 'column', mt: -1.5 }}>

        {/* Contract Summary Card - Compact section */}
        <Box sx={{ flex: '0 0 auto', mb: 0.5, overflow: 'hidden' }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 8 }}>
              <MainCard
                title="معلومات العقد"
                secondary={<Chip label={statusConfig.label} color={statusConfig.color} size="small" />}
                sx={{
                  height: '100%',
                  borderColor: alpha(cardTitleColor, 0.3),
                  '& .MuiCardHeader-root': { height: 48, py: 1, borderBottom: `1px solid ${alpha(cardTitleColor, 0.1)}`, bgcolor: alpha(cardTitleColor, 0.04) }
                }}
                titleTypographyProps={{ variant: 'subtitle2', sx: { color: cardTitleColor, fontWeight: 700 } }}
              >
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <InfoTableRow label="رمز العقد" value={contract.contractCode} icon={ContractIcon} iconColor={cardTitleColor} />
                          <InfoTableRow label="نموذج التسعير" value={pricingModelConfig.label} icon={PriceIcon} iconColor={cardTitleColor} />
                          <InfoTableRow label="نسبة الخصم" value={contract.discountPercent ? `${contract.discountPercent}%` : '-'} icon={PriceIcon} iconColor={cardTitleColor} />
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <InfoTableRow label="تاريخ البدء" value={formatDate(contract.startDate)} icon={CalendarIcon} iconColor={cardTitleColor} />
                          <InfoTableRow label="تاريخ الانتهاء" value={formatDate(contract.endDate)} icon={CalendarIcon} iconColor={cardTitleColor} />
                          <InfoTableRow label="عدد بنود التسعير" value={contract.pricingItemsCount || pricingItems.length} icon={InfoIcon} iconColor={cardTitleColor} />
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </MainCard>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <MainCard
                title="مقدم الخدمة"
                secondary={<ProviderIcon sx={{ fontSize: 18, color: cardTitleColor }} />}
                sx={{
                  height: '100%',
                  borderColor: alpha(cardTitleColor, 0.3),
                  '& .MuiCardHeader-root': { height: 48, py: 1, borderBottom: `1px solid ${alpha(cardTitleColor, 0.1)}`, bgcolor: alpha(cardTitleColor, 0.04) }
                }}
                titleTypographyProps={{ variant: 'subtitle2', sx: { color: cardTitleColor, fontWeight: 700 } }}
              >
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <InfoTableRow label="الاسم" value={contract.providerName || contract.provider?.name || '-'} />
                      <InfoTableRow label="المدينة" value={contract.provider?.city || '-'} />
                      <InfoTableRow label="رقم الهاتف" value={contract.provider?.phone || '-'} />
                    </TableBody>
                  </Table>
                </TableContainer>
              </MainCard>
            </Grid>
          </Grid>
        </Box>



        {/* Pricing Actions Card */}
        <MainCard sx={{ mb: 0.5 }} content={false}>
          <Box sx={{ p: 1.5 }}>
            {/* Search and Excel Upload */}
            <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexShrink: 0 }} alignItems="center">
              <TextField
                placeholder="بحث في بنود التسعير..."
                value={pricingSearch}
                onChange={(e) => {
                  setPricingSearch(e.target.value);
                  setPricingPage(0);
                }}
                size="small"
                sx={{ flexGrow: 1, maxWidth: 400, '& .MuiOutlinedInput-root': { height: 40 } }}
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
                  sx={{ height: 40 }}
                >
                  إضافة خدمة طبية
                </Button>
              </RBACGuard>

              {/* Template Preparation Button */}
              <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleDownloadTemplate}
                  startIcon={<RefreshIcon />}
                  sx={{ height: 40 }}
                >
                  تجهيز قالب الاستيراد
                </Button>
              </RBACGuard>

              {/* Import Price List Button - Only opens file picker now */}
              <RBACGuard requiredPermissions={['MANAGE_PROVIDER_CONTRACTS']}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleImportPriceList}
                  startIcon={<ContractIcon />}
                  sx={{ height: 40 }}
                >
                  استيراد القائمة
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
          </Box>
        </MainCard>

        {/* Pricing Table Section - Outside Card */}
        {/* Define columns for GenericDataTable */}
        {/* Assuming GenericDataTable, formatCurrency, RBACGuard, Tooltip, IconButton, EditIcon, DeleteIcon, Typography, Chip, Stack are imported */}
        {/* Also assuming pricingPage, pricingRowsPerPage, setPricingPage, setPricingRowsPerPage, handleOpenEditPricing, handleOpenDeletePricing are defined */}
        <GenericDataTable
          columns={columns}
          data={pricingItems}
          totalCount={totalPricingItems}
          isLoading={pricingLoading}
          tableState={{
            page: pricingPage,
            pageSize: pricingRowsPerPage,
            sorting: pricingSorting,
            columnFilters: pricingFilters,
            setPage: setPricingPage,
            setPageSize: setPricingRowsPerPage,
            setSorting: setPricingSorting,
            setFilter: (id, val) => setPricingFilters(prev => ({ ...prev, [id]: val })),
            clearFilters: () => setPricingFilters({}),
            hasActiveFilters: Object.keys(pricingFilters).length > 0
          }}
          enableFiltering={false}
          minHeight={235}
          maxHeight={235}
          cellPadding="dense"
          rowsPerPageOptions={[3, 6, 9, 12]}
          onRowClick={(row) => handleOpenEditPricing(row)}
          emptyMessage={pricingSearch ? 'لم يتم العثور على بنود مطابقة' : 'لا توجد بنود تسعير'}
        />
      </Box>

      {/* Suspend Dialog */}
      < Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth >
        <DialogTitle sx={{ color: cardTitleColor }}>إيقاف العقد</DialogTitle>
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
      </Dialog >

      {/* Terminate Dialog */}
      < Dialog open={terminateDialogOpen} onClose={() => setTerminateDialogOpen(false)} maxWidth="sm" fullWidth >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>إلغاء العقد</DialogTitle>
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
      </Dialog >

      {/* Add Pricing Item Dialog */}
      < Dialog open={addPricingDialogOpen} onClose={() => setAddPricingDialogOpen(false)} maxWidth="sm" fullWidth >
        <DialogTitle sx={{ color: cardTitleColor }}>إضافة خدمة طبية للتسعير</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            اختر الخدمة الطبية من النظام وأدخل السعر المتفق عليه. يمكنك اختيار تصنيف مختلف اختيارياً.
          </DialogContentText>
          <Stack spacing={3}>
            <MedicalServiceSelector
              value={pricingForm.medicalServiceId}
              onChange={(newValue) => {
                // Handle Custom Entry (New Service)
                if (newValue && (newValue.isCustom || typeof newValue === 'string')) {
                  const customName = newValue.inputValue || newValue;
                  setPricingForm({
                    ...pricingForm,
                    medicalServiceId: null, // No ID for custom
                    serviceName: customName,
                    basePrice: '',
                    contractPrice: '',
                    medicalCategoryId: null
                  });
                } else {
                  // Handle Standard Selection
                  setPricingForm({
                    ...pricingForm,
                    medicalServiceId: newValue,
                    serviceName: null,
                    basePrice: newValue ? (newValue.basePrice ?? '') : '',
                    contractPrice: '',
                    medicalCategoryId: null // Reset category when service changes
                  });
                }
              }}
              required
              label="الخدمة الطبية *"
              size="medium"
            />

            {/* Show Default Category Info */}
            {pricingForm.medicalServiceId?.categoryName && (
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CategoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    التصنيف التلقائي: <strong>{pricingForm.medicalServiceId.categoryName}</strong>
                  </Typography>
                </Stack>
              </Box>
            )}

            {/* Category Override (Optional) */}
            <Autocomplete
              options={medicalCategories || []}
              getOptionLabel={(option) => option.name || option.nameAr || option.nameEn || ''}
              groupBy={(option) => option.parentId ? 'تصنيف فرعي' : 'تصنيف رئيسي'}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Stack>
                      <Typography variant="body2" fontWeight={option.parentId ? 400 : 600}>
                        {option.code} - {option.name || option.nameAr}
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
                  label="تغيير التصنيف (اختياري)"
                  placeholder="اختر تصنيفاً مختلفاً عن التصنيف التلقائي"
                  size="small"
                />
              )}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="السعر الأساسي"
                  type="number"
                  fullWidth
                  value={pricingForm.basePrice}
                  onChange={(e) => setPricingForm({ ...pricingForm, basePrice: e.target.value })}
                  required
                  helperText="السعر المرجعي"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="سعر العقد (المتفق عليه)"
                  type="number"
                  fullWidth
                  value={pricingForm.contractPrice}
                  onChange={(e) => setPricingForm({ ...pricingForm, contractPrice: e.target.value })}
                  required
                  helperText={
                    pricingForm.basePrice && pricingForm.contractPrice
                      ? `خصم: ${Math.round(((pricingForm.basePrice - pricingForm.contractPrice) / pricingForm.basePrice) * 100)}%`
                      : 'أدخل السعر المتفق عليه'
                  }
                />
              </Grid>
            </Grid>

            <TextField
              label="التخصص"
              fullWidth
              value={pricingForm.specialty}
              onChange={(e) => setPricingForm({ ...pricingForm, specialty: e.target.value })}
              placeholder="مثال: باطنية، عظام، جلدية..."
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddPricingDialogOpen(false)} color="inherit">إلغاء</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={() => handleAddPricingSubmit(true)}
            variant="outlined"
            disabled={(!pricingForm.medicalServiceId && !pricingForm.serviceName) || !pricingForm.contractPrice || addPricingMutation.isLoading}
          >
            حفظ وإضافة آخر
          </Button>
          <Button
            onClick={() => handleAddPricingSubmit(false)}
            variant="contained"
            disabled={(!pricingForm.medicalServiceId && !pricingForm.serviceName) || !pricingForm.contractPrice || addPricingMutation.isLoading}
          >
            {addPricingMutation.isLoading ? <CircularProgress size={20} /> : 'إضافة وإغلاق'}
          </Button>
        </DialogActions>
      </Dialog >

      {/* Edit Pricing Item Dialog */}
      < Dialog open={editPricingDialogOpen} onClose={() => setEditPricingDialogOpen(false)} maxWidth="sm" fullWidth >
        <DialogTitle sx={{ color: cardTitleColor }}>تعديل سعر الخدمة</DialogTitle>
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
              label="التخصص"
              fullWidth
              value={pricingForm.specialty}
              onChange={(e) => setPricingForm({ ...pricingForm, specialty: e.target.value })}
              placeholder="مثال: باطنية، عظام، جلدية..."
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
      </Dialog >

      {/* Delete Pricing Dialog */}
      < Dialog open={deletePricingDialogOpen} onClose={() => setDeletePricingDialogOpen(false)} maxWidth="xs" fullWidth >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>حذف الخدمة</DialogTitle>
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
      </Dialog >
      {/* Import Wizard */}
      <DataImportWizard
        open={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        baseApiUrl={`/api/provider-contracts/${id}/pricing/import`}
        entityName="بنود الأسعار"
        hideContextSelectors={true}
      />
    </RBACGuard>
  );
};

export default ProviderContractView;
