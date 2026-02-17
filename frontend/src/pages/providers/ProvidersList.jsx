/**
 * Providers List Page - ENHANCED IMPLEMENTATION (Unified UI + Advanced Features)
 * Healthcare Providers (Hospitals, Clinics, Labs, Pharmacies)
 * Includes: Contract Linking, Document Icons, Unified Filters.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Box, IconButton, Stack, Tooltip, Typography, Chip, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Divider,
  DialogActions, TextField, InputAdornment, Avatar, ListItemAvatar
} from '@mui/material';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';

// Project Components
import MainCard from 'components/MainCard';
import { GenericDataTable, ModernPageHeader, RBACGuard } from 'components/tba';

// Hooks
import useTableState from 'hooks/useTableState';
import { useFormatter } from 'hooks/useFormatter';

// Insurance UX Components
import { NetworkBadge, CardStatusBadge } from 'components/insurance';

// Services
import { providersService } from 'services/api';
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const QUERY_KEY = 'providers';
const DEFAULT_SORT = { field: 'id', direction: 'desc' };

const PROVIDER_TYPE_LABELS_AR = {
  HOSPITAL: 'مستشفى',
  CLINIC: 'عيادة',
  LAB: 'مختبر',
  LABORATORY: 'مختبر',
  PHARMACY: 'صيدلية',
  RADIOLOGY: 'مركز أشعة'
};

const getNetworkTier = (provider) => {
  if (provider?.networkStatus) return provider.networkStatus;
  if (provider?.inNetwork === true) return 'IN_NETWORK';
  if (provider?.contracted === true) return 'IN_NETWORK';
  return 'OUT_OF_NETWORK';
};

const getProviderStatus = (provider) => {
  if (provider?.status) return provider.status;
  return provider?.active === false ? 'INACTIVE' : 'ACTIVE';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProvidersList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshKey } = useTableRefresh();
  const { formatDate } = useFormatter();

  const [employersDialog, setEmployersDialog] = useState({ open: false, names: [], providerName: '' });
  const [dialogSearchTerm, setDialogSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: DEFAULT_SORT
  });

  const { page, pageSize: rowsPerPage, sorting } = tableState;
  const sortColumn = sorting?.[0]?.id || 'id';
  const sortDirection = sorting?.[0]?.desc ? 'desc' : 'asc';

  // Quick search effect delay
  useEffect(() => {
    const timer = setTimeout(() => {
      tableState.setSearchTerm(localSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  const filteredEmployerNames = useMemo(() => {
    if (!dialogSearchTerm) return employersDialog.names;
    return employersDialog.names.filter(name =>
      name.toLowerCase().includes(dialogSearchTerm.toLowerCase())
    );
  }, [employersDialog.names, dialogSearchTerm]);

  const handleNavigateAdd = useCallback(() => navigate('/providers/add'), [navigate]);
  const handleNavigateView = useCallback((id) => navigate(`/providers/${id}`), [navigate]);
  const handleNavigateEdit = useCallback((id) => navigate(`/providers/edit/${id}`), [navigate]);

  const handleDelete = useCallback(
    async (id, name) => {
      if (!window.confirm(`هل أنت متأكد من حذف مقدم الخدمة "${name}"؟`)) return;
      try {
        await providersService.remove(id);
        openSnackbar({ message: 'تم حذف مقدم الخدمة بنجاح', variant: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        openSnackbar({ message: 'فشل حذف مقدم الخدمة', variant: 'error' });
      }
    },
    [queryClient]
  );

  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'الرمز',
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      cell: ({ getValue }) => (
        <Chip
          label={getValue() || '-'}
          variant="outlined"
          size="small"
          color="secondary"
          sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
        />
      )
    },
    {
      accessorKey: 'name',
      header: 'اسم مقدم الخدمة',
      minWidth: 220,
      align: 'right',
      headerAlign: 'center',
      cell: ({ row }) => {
        const type = row.original.providerType;
        const typeLabel = PROVIDER_TYPE_LABELS_AR[type] || type || '-';

        // Define colors for different provider types
        const typeColors = {
          HOSPITAL: { bg: '#e0f2f1', text: '#00695c' },
          CLINIC: { bg: '#e1f5fe', text: '#01579b' },
          LAB: { bg: '#f3e5f5', text: '#4a148c' },
          PHARMACY: { bg: '#fff3e0', text: '#e65100' },
          RADIOLOGY: { bg: '#f1f8e9', text: '#33691e' }
        };
        const config = typeColors[type] || { bg: '#f5f5f5', text: '#616161' };

        return (
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={700}>{row.original.name}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {row.original.city || row.original.region || '-'}
              </Typography>
              <Chip
                label={`نوع: ${typeLabel}`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: config.bg,
                  color: config.text,
                  border: 'none',
                  borderRadius: '4px'
                }}
              />
            </Stack>
          </Stack>
        );
      }
    },
    {
      accessorKey: 'network',
      header: 'الشبكة',
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      cell: ({ row }) => {
        const tier = getNetworkTier(row.original);
        return <NetworkBadge networkTier={tier} showLabel={true} size="small" language="ar" />;
      }
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      cell: ({ row }) => <CardStatusBadge status={getProviderStatus(row.original)} size="small" language="ar" />
    },
    {
      accessorKey: 'documents',
      header: 'المستندات',
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          {row.original.hasCommercialRegister && (
            <Tooltip title="سجل تجاري">
              <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); navigate(`/providers/edit/${row.original.id}?tab=5`); }} />
            </Tooltip>
          )}
          {row.original.hasLicense && (
            <Tooltip title="ترخيص طبي">
              <DescriptionIcon sx={{ fontSize: 18, color: 'success.main', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); navigate(`/providers/edit/${row.original.id}?tab=5`); }} />
            </Tooltip>
          )}
          {!row.original.hasCommercialRegister && !row.original.hasLicense && (
            <Typography variant="caption" color="text.disabled">-</Typography>
          )}
        </Stack>
      )
    },
    {
      id: 'employers',
      header: 'الجهات المتعاقدة',
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      cell: ({ row }) => {
        const names = row.original.contractedEmployerNames || [];
        const isGlobal = row.original.allowAllEmployers;

        if (!isGlobal && names.length === 0) {
          return <Typography variant="caption" color="text.disabled">لا يوجد ارتباطات</Typography>;
        }

        return (
          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
            {isGlobal && (
              <Chip
                label="الشبكة العامة"
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                  color: '#2e7d32',
                  bgcolor: '#f1f8e9',
                  borderColor: '#a5d6a7',
                  '&:hover': { bgcolor: '#e8f5e9' }
                }}
                onClick={(e) => { e.stopPropagation(); setEmployersDialog({ open: true, names: ['الشبكة العامة (جميع الجهات المسموحة)'], providerName: row.original.name }); }}
              />
            )}
            {!isGlobal && names.slice(0, 1).map((name, idx) => (
              <Chip
                key={idx}
                icon={<LinkIcon sx={{ fontSize: '13px !important', color: 'inherit' }} />}
                label={name}
                size="small"
                sx={{
                  maxWidth: 120,
                  fontSize: '0.7rem',
                  height: 22,
                  fontWeight: 500,
                  bgcolor: '#f5f5f5',
                  color: '#424242',
                  border: '1px solid #e0e0e0',
                  '& .MuiChip-icon': { color: '#757575' }
                }}
              />
            ))}
            {names.length > (isGlobal ? 0 : 1) && (
              <Chip
                label={`+${isGlobal ? names.length : names.length - 1}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: '#008e92',
                  color: '#fff',
                  boxShadow: '0 2px 4px rgba(0,142,146,0.2)',
                  '&:hover': { bgcolor: '#007a7e' }
                }}
                onClick={(e) => { e.stopPropagation(); setEmployersDialog({ open: true, names: isGlobal ? ['الشبكة العامة', ...names] : names, providerName: row.original.name }); }}
              />
            )}
          </Stack>
        );
      }
    },
    {
      id: 'actions',
      header: 'إجراءات',
      minWidth: 110,
      align: 'center',
      headerAlign: 'center',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip title="عرض">
            <IconButton size="small" sx={{ color: '#008e92' }} onClick={(e) => { e.stopPropagation(); handleNavigateView(row.original.id); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="تعديل">
            <IconButton size="small" sx={{ color: '#008e92' }} onClick={(e) => { e.stopPropagation(); handleNavigateEdit(row.original.id); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <RBACGuard requiredPermissions={['providers.delete']}>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(row.original.id, row.original.name); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </RBACGuard>
        </Stack>
      )
    }
  ], [handleNavigateView, handleNavigateEdit, handleDelete]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, page, rowsPerPage, sortColumn, sortDirection, refreshKey, tableState.searchTerm],
    queryFn: async () => {
      const params = {
        page: page + 1,
        size: rowsPerPage,
        sort: `${sortColumn},${sortDirection}`,
        q: tableState.searchTerm || undefined
      };
      return await providersService.getAll(params);
    }
  });

  const providers = data?.content || [];
  const totalCount = data?.totalElements || 0;

  const headerButtonStyle = (type) => ({
    minWidth: '150px',
    borderRadius: '8px',
    px: 2,
    py: 0.8,
    fontSize: '0.875rem',
    fontWeight: 600,
    boxShadow: 'none',
    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    ...(type === 'add' && { bgcolor: '#008e92', '&:hover': { bgcolor: '#007a7e' } })
  });

  return (
    <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ModernPageHeader
        title="مقدمي الخدمات الصحية"
        subtitle="إدارة المستشفيات والعيادات والمختبرات والصيدليات"
        icon={<LocalHospitalIcon />}
        breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'مقدمي الخدمات' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} sx={headerButtonStyle('export')}>تصدير</Button>
            <Button variant="outlined" startIcon={<CloudUploadIcon />} sx={headerButtonStyle('import')}>استيراد</Button>
            <RBACGuard requiredPermissions={['providers.create']}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleNavigateAdd} sx={headerButtonStyle('add')}>إضافة مزود</Button>
            </RBACGuard>
          </Stack>
        }
        sx={{ mb: 1 }}
      />

      <Stack spacing={1} sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <MainCard sx={{ p: 1, flexShrink: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="بحث باسم المزود أو الرمز..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              sx={{ flexGrow: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: 36, fontSize: '0.9rem' }
              }}
            />
            <IconButton size="small" onClick={() => refetch()} color="primary"><RefreshIcon fontSize="small" /></IconButton>
          </Stack>
        </MainCard>

        <MainCard content={false} sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <GenericDataTable
            columns={columns}
            data={providers}
            totalCount={totalCount}
            isLoading={isLoading}
            tableState={tableState}
            emptyMessage="لا يوجد مقدمي خدمات"
            onRowClick={(row) => handleNavigateView(row.id)}
            enableFiltering={false}
          />
        </MainCard>
      </Stack>

      <Dialog open={employersDialog.open} onClose={() => setEmployersDialog({ ...employersDialog, open: false })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>الجهات المتعاقدة</Typography>
          <IconButton onClick={() => setEmployersDialog({ ...employersDialog, open: false })} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, pt: 0 }}><TextField fullWidth size="small" placeholder="بحث..." value={dialogSearchTerm} onChange={(e) => setDialogSearchTerm(e.target.value)} /></Box>
          <Divider />
          <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {filteredEmployerNames.map((name, i) => (
              <ListItem key={i} divider><ListItemAvatar><Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.lighter', color: 'secondary.main' }}><BusinessIcon sx={{ fontSize: 16 }} /></Avatar></ListItemAvatar><ListItemText primary={name} /></ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProvidersList;
