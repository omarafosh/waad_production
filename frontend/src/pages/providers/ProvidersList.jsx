/**
 * Providers List Page - ENHANCED IMPLEMENTATION
 * Healthcare Providers (Hospitals, Clinics, Labs, Pharmacies)
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Box, IconButton, Stack, Tooltip, Typography, Chip, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Divider,
  DialogActions, TextField, InputAdornment, Avatar, ListItemAvatar // Added DialogActions, TextField, InputAdornment, Avatar, ListItemAvatar
} from '@mui/material';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RefreshIcon from '@mui/icons-material/Refresh';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SearchIcon from '@mui/icons-material/Search'; // Added SearchIcon
import BusinessIcon from '@mui/icons-material/Business'; // Added BusinessIcon

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import PermissionGuard from 'components/PermissionGuard';
import GenericDataTable from 'components/GenericDataTable';

// Hooks
import useTableState from 'hooks/useTableState';

// Insurance UX Components
import { NetworkBadge, CardStatusBadge } from 'components/insurance';

// Services
import { providersService } from 'services/api';
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'providers';
const MODULE_NAME = 'providers';
const DEFAULT_SORT = { field: 'id', direction: 'desc' };

// Provider Type Labels (Arabic)
const PROVIDER_TYPE_LABELS_AR = {
  HOSPITAL: 'مستشفى',
  CLINIC: 'عيادة',
  LAB: 'مختبر',
  LABORATORY: 'مختبر',
  PHARMACY: 'صيدلية',
  RADIOLOGY: 'مركز أشعة'
};

// Provider Type Colors
const PROVIDER_TYPE_COLORS = {
  HOSPITAL: 'error',
  CLINIC: 'primary',
  LAB: 'warning',
  LABORATORY: 'warning',
  PHARMACY: 'success',
  RADIOLOGY: 'info'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get network tier from provider
 */
const getNetworkTier = (provider) => {
  if (provider?.networkStatus) return provider.networkStatus;
  if (provider?.inNetwork === true) return 'IN_NETWORK';
  if (provider?.inNetwork === false) return 'OUT_OF_NETWORK';
  if (provider?.contracted === true) return 'IN_NETWORK';
  if (provider?.contracted === false) return 'OUT_OF_NETWORK';
  return null;
};

/**
 * Get provider status
 */
const getProviderStatus = (provider) => {
  if (provider?.status) return provider.status;
  if (provider?.active === true) return 'ACTIVE';
  if (provider?.active === false) return 'INACTIVE';
  return 'ACTIVE';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Employers Cell Component
 * Fetches and displays the list of allowed employers for a specific provider
 */
const ProviderEmployersCell = ({ providerId }) => {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['provider-contracts', providerId],
    queryFn: () => providersService.getContracts(providerId),
    staleTime: 60 * 1000, // Cache for 1 minute
    retry: 1
  });

  if (isLoading) {
    return <CircularProgress size={16} color="secondary" />;
  }

  // If no contracts, usually it means Standard Network (Available to all) OR None
  // But based on logic, if array empty -> Standard/All or None. 
  // Let's assume empty means "Default / Global" unless specified otherwise.
  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    return <Typography variant="caption" color="text.secondary">لا يوجد عقود</Typography>;
  }

  // Filter only active contracts
  const activeContracts = contracts.filter(c => c.active !== false && c.status !== 'TERMINATED');

  if (activeContracts.length === 0) {
    return <Typography variant="caption" color="text.secondary">لا يوجد عقود</Typography>;
  }

  const names = activeContracts.map(c => c.employerName || c.employer?.name || 'شركة غير معروفة');
  const displayNames = names.slice(0, 2);
  const remainingCount = names.length - 2;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" gap={0.5}>
      {displayNames.map((name, idx) => (
        <Chip
          key={idx}
          label={name}
          size="small"
          variant="outlined"
          sx={{ maxWidth: 120, fontSize: '1rem' }}
        />
      ))}
      {remainingCount > 0 && (
        <Tooltip title={names.slice(2).join('، ')}>
          <Chip
            label={`+${remainingCount}`}
            size="small"
            color="primary"
            variant="filled"
            sx={{ height: 20, fontSize: '1rem' }}
          />
        </Tooltip>
      )}
    </Stack>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProvidersList() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { refreshKey } = useTableRefresh();

  // ========================================
  // TABLE & POPUP STATE
  // ========================================

  const [employersDialog, setEmployersDialog] = useState({ open: false, names: [], providerName: '' });
  const [dialogSearchTerm, setDialogSearchTerm] = useState(''); // Added Search State

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (!employersDialog.open) {
      setDialogSearchTerm('');
    }
  }, [employersDialog.open]);

  // Filtered Employers for Dialog
  const filteredEmployerNames = useMemo(() => {
    if (!dialogSearchTerm) return employersDialog.names;
    return employersDialog.names.filter(name =>
      name.toLowerCase().includes(dialogSearchTerm.toLowerCase())
    );
  }, [employersDialog.names, dialogSearchTerm]);

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: DEFAULT_SORT
  });

  const { page, pageSize: rowsPerPage, sorting } = tableState;

  const sortColumn = sorting?.[0]?.id;
  const sortDirection = sorting?.[0]?.desc ? 'desc' : 'asc';

  // ========================================
  // AUTO-REFRESH ON NAVIGATION BACK
  // ========================================

  useEffect(() => {
    // Invalidate cache when navigating back to this page
    // This ensures newly created providers appear immediatelyqueryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [location.key, queryClient]);

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNavigateAdd = useCallback(() => {
    navigate('/providers/add');
  }, [navigate]);

  const handleNavigateView = useCallback(
    (id) => {
      navigate(`/providers/${id}`);
    },
    [navigate]
  );

  const handleNavigateEdit = useCallback(
    (id) => {
      navigate(`/providers/edit/${id}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id, name) => {
      const confirmMessage = `هل أنت متأكد من حذف مقدم الخدمة "${name}"؟`;
      if (!window.confirm(confirmMessage)) return;

      try {
        await providersService.remove(id);
        openSnackbar({
          message: 'تم حذف مقدم الخدمة بنجاح',
          variant: 'success'
        });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        console.error('[Providers] Delete failed:', err);
        openSnackbar({
          message: 'فشل حذف مقدم الخدمة. يرجى المحاولة لاحقاً',
          variant: 'error'
        });
      }
    },
    [queryClient]
  );



  // ========================================
  // DATA FETCHING WITH REACT QUERY
  // ========================================

  // ========================================
  // COLUMNS DEFINITION
  // ========================================

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'اسم مقدم الخدمة',
      enableSorting: true,
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={500}>
          {row.original.name || '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'providerType',
      header: 'النوع',
      align: 'center',
      cell: ({ row }) => (
        <Chip
          label={PROVIDER_TYPE_LABELS_AR[row.original.providerType] ?? row.original.providerType ?? '-'}
          color={PROVIDER_TYPE_COLORS[row.original.providerType] || 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      accessorKey: 'id',
      header: 'الرمز',
      align: 'center',
      enableSorting: true,
      cell: ({ row }) => (
        <Typography variant="body2" color="primary" fontWeight={500}>
          {row.original.id || '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'city',
      header: 'المدينة',
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.city ?? row.original.region ?? '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'phone',
      header: 'الهاتف',
      cell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" dir="ltr">
          {row.original.phone ?? row.original.contactPhone ?? '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'network',
      header: 'الشبكة',
      align: 'center',
      cell: ({ row }) => {
        const tier = getNetworkTier(row.original);
        return tier ? (
          <NetworkBadge networkTier={tier} showLabel={true} size="small" language="ar" />
        ) : (
          <Typography variant="body2" color="text.secondary">-</Typography>
        );
      }
    },
    {
      id: 'employers',
      header: 'جهات العمل المسموحة',
      size: 250,
      align: 'center',
      cell: ({ row }) => {
        const names = row.original.contractedEmployerNames || [];
        if (names.length === 0) {
          return <Typography variant="caption" color="text.secondary">-</Typography>;
        }

        const isGlobal = names.some(n => n && n.includes('الشبكة العامة'));
        if (isGlobal) {
          return (
            <Chip
              label="الشبكة العامة"
              color="success"
              size="small"
              variant="outlined"
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
            />
          );
        }

        const displayNames = names.slice(0, 2);
        const remainingCount = names.length - 2;

        return (
          <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ maxWidth: 240, mx: 'auto' }}>
            {displayNames.map((name, idx) => (
              <Chip
                key={idx}
                label={name}
                size="small"
                variant="outlined"
                sx={{ maxWidth: 100, fontSize: '0.75rem' }}
              />
            ))}
            {remainingCount > 0 && (
              <Tooltip title={names.slice(2).join('، ')}>
                <Chip
                  label={`+${remainingCount}`}
                  size="small"
                  color="primary"
                  variant="filled"
                  sx={{ height: 20, fontSize: '0.75rem', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmployersDialog({ open: true, names, providerName: row.original.name });
                  }}
                />
              </Tooltip>
            )}
            {names.length > 0 && names.length <= 2 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setEmployersDialog({ open: true, names, providerName: row.original.name });
                }}
                sx={{ ml: 0.5 }}
              >
                <HandshakeIcon sx={{ fontSize: '14px' }} />
              </IconButton>
            )}
          </Stack>
        );
      }
    },
    {
      id: 'documents',
      header: 'المستندات',
      align: 'center',
      size: 100,
      cell: ({ row }) => {
        const hasDocs = row.original.hasDocuments;
        return (
          <Tooltip title={hasDocs ? "توجد مستندات مرفوعة" : "لا توجد مستندات"}>
            <Box>
              {hasDocs ? (
                <CheckCircleIcon color="success" fontSize="small" />
              ) : (
                <CancelIcon color="error" fontSize="small" sx={{ opacity: 0.5 }} />
              )}
              <DescriptionIcon sx={{ ml: 0.5, verticalAlign: 'middle', color: hasDocs ? 'primary.main' : 'text.disabled' }} fontSize="small" />
            </Box>
          </Tooltip>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      align: 'center',
      cell: ({ row }) => (
        <CardStatusBadge status={getProviderStatus(row.original)} size="small" language="ar" />
      )
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      align: 'center',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="center" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="عرض">
            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleNavigateView(row.original.id); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="تعديل">
            <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); handleNavigateEdit(row.original.id); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <PermissionGuard requires="providers.delete">
            <Tooltip title="حذف">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); handleDelete(row.original.id, row.original.name); }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </PermissionGuard>
        </Stack>
      )
    }
  ], [handleNavigateView, handleNavigateEdit, handleDelete]);

  // ========================================
  // DATA FETCHING WITH REACT QUERY
  // ========================================

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, page, rowsPerPage, sortColumn, sortDirection, refreshKey],
    queryFn: async () => {
      const params = {
        page: page + 1, // Backend uses 1-based pages
        size: rowsPerPage,
        sort: sortColumn ? `${sortColumn},${sortDirection}` : 'id,desc'
      };

      const result = await providersService.getAll(params);
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: 'always' // Always refetch when component mounts
  });

  // Extract data
  const providers = useMemo(() => data?.content || [], [data]);
  const totalCount = data?.totalElements || 0;



  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <Box>
      {/* ====== UNIFIED PAGE HEADER ====== */}
      <PermissionGuard requires="providers.view">
        <UnifiedPageHeader
          title="مقدمي الخدمات الصحية"
          subtitle="إدارة المستشفيات والعيادات والمختبرات والصيدليات"
          icon={LocalHospitalIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'مقدمي الخدمات' }]}
          pdfModule={MODULE_NAME}
          showAddButton={true}
          addButtonLabel="إضافة مقدم خدمة"
          onAddClick={handleNavigateAdd}
          additionalActions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              size="small"
            >
              تحديث
            </Button>
          }
        />
      </PermissionGuard>

      {/* ====== DATA TABLE ====== */}
      <MainCard
        content={false}
        sx={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Error State */}
        {error && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              حدث خطأ في تحميل البيانات
            </Typography>
            <Button variant="outlined" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </Box>
        )}

        {/* Table */}
        {!error && (
          <GenericDataTable
            columns={columns}
            data={providers}
            totalCount={totalCount}
            isLoading={isLoading}
            tableState={tableState}
            emptyMessage="لا يوجد مقدمي خدمات"
            onRowClick={(row) => handleNavigateView(row.id)}
            headerVariant="primary"
            enableFiltering={false}
          />
        )}
      </MainCard>

      {/* ====== EMPLOYERS POPUP DIALOG ====== */}
      <Dialog
        open={employersDialog.open}
        onClose={() => setEmployersDialog({ ...employersDialog, open: false })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, maxHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">الجهات المتعاقدة</Typography>
            <Typography variant="caption" color="text.secondary">{employersDialog.providerName}</Typography>
          </Box>
          <IconButton onClick={() => setEmployersDialog({ ...employersDialog, open: false })} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="بحث عن جهة عمل..."
            value={dialogSearchTerm}
            onChange={(e) => setDialogSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: 'background.paper' }}
          />
        </Box>

        <Divider />

        <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
          <List dense sx={{ py: 0 }}>
            {filteredEmployerNames.length > 0 ? (
              filteredEmployerNames.map((name, index) => (
                <ListItem key={index} divider={index < filteredEmployerNames.length - 1} sx={{ py: 1.5, px: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 32, height: 32 }}>
                      <BusinessIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={name}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  />
                </ListItem>
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  {dialogSearchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد جهات متعاقدة'}
                </Typography>
              </Box>
            )}
          </List>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 1.5, justifyContent: 'center' }}>
          <Button onClick={() => setEmployersDialog({ ...employersDialog, open: false })} color="inherit">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
