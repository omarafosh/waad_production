import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalHospital as LocalHospitalIcon,
  Refresh as RefreshIcon,
  MedicalServices as MedicalServicesIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import ModernEmptyState from 'components/tba/ModernEmptyState';
import GenericDataTable from 'components/GenericDataTable/GenericDataTable';

import { useVisitsList } from 'hooks/useVisits';
import { useTableState } from 'hooks/useTableState';
import visitsService from 'services/api/visits.service';

// Insurance UX Components - Phase B3
import { NetworkBadge, CardStatusBadge } from 'components/insurance';

// ============ VISIT CONFIGURATION ============
// Visit Type Labels (Arabic) - Synced with Backend VisitType Enum
const VISIT_TYPE_LABELS_AR = {
  EMERGENCY: 'طوارئ',
  OUTPATIENT: 'عيادة خارجية',
  INPATIENT: 'إقامة داخلية',
  ROUTINE: 'روتينية',
  FOLLOW_UP: 'متابعة',
  PREVENTIVE: 'وقائية',
  SPECIALIZED: 'تخصصية',
  HOME_CARE: 'رعاية منزلية',
  TELECONSULTATION: 'استشارة عن بُعد',
  DAY_SURGERY: 'جراحة يومية'
};

// Visit Type Colors
const VISIT_TYPE_COLORS = {
  EMERGENCY: 'error',
  OUTPATIENT: 'primary',
  INPATIENT: 'warning',
  ROUTINE: 'default',
  FOLLOW_UP: 'info',
  PREVENTIVE: 'success',
  SPECIALIZED: 'secondary',
  HOME_CARE: 'default',
  TELECONSULTATION: 'info',
  DAY_SURGERY: 'warning'
};

// Status Labels (Arabic)
const STATUS_LABELS_AR = {
  ACTIVE: 'نشطة',
  INACTIVE: 'غير نشطة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة'
};

// Claim Status Colors and Labels
const CLAIM_STATUS_CONFIG = {
  DRAFT: { color: 'default', label: 'مسودة', bgColor: '#f5f5f5' },
  SUBMITTED: { color: 'info', label: 'مقدمة', bgColor: '#e3f2fd' },
  UNDER_REVIEW: { color: 'warning', label: 'قيد المراجعة', bgColor: '#fff3e0' },
  APPROVED: { color: 'success', label: 'موافق عليها', bgColor: '#e8f5e9' },
  REJECTED: { color: 'error', label: 'مرفوضة', bgColor: '#ffebee' },
  RETURNED_FOR_INFO: { color: 'secondary', label: 'مُعادة للاستفسار', bgColor: '#f3e5f5' },
  SETTLED: { color: 'primary', label: 'مسددة', bgColor: '#e8eaf6' }
};

// Pre-Auth Status Colors and Labels
const PREAUTH_STATUS_CONFIG = {
  PENDING: { color: 'default', label: 'قيد الانتظار', bgColor: '#f5f5f5' },
  UNDER_REVIEW: { color: 'warning', label: 'قيد المراجعة', bgColor: '#fff3e0' },
  APPROVED: { color: 'success', label: 'موافق عليها', bgColor: '#e8f5e9' },
  REJECTED: { color: 'error', label: 'مرفوضة', bgColor: '#ffebee' },
  EXPIRED: { color: 'default', label: 'منتهية', bgColor: '#eeeeee' },
  CANCELLED: { color: 'error', label: 'ملغاة', bgColor: '#ffebee' },
  USED: { color: 'primary', label: 'مستخدمة', bgColor: '#e8eaf6' }
};

const DEFAULT_SORT = { field: 'visitDate', direction: 'desc' };

// Network Status mapping
const getNetworkTier = (provider) => {
  if (!provider) return null;
  if (provider?.networkStatus) return provider.networkStatus;
  if (provider?.inNetwork === true) return 'IN_NETWORK';
  if (provider?.inNetwork === false) return 'OUT_OF_NETWORK';
  if (provider?.contracted === true) return 'IN_NETWORK';
  if (provider?.contracted === false) return 'OUT_OF_NETWORK';
  return null;
};

// Get visit status
const getVisitStatus = (visit) => {
  if (visit?.status) return visit.status;
  if (visit?.active === true) return 'ACTIVE';
  if (visit?.active === false) return 'INACTIVE';
  return 'ACTIVE';
};

// ============ DEFENSIVE DATA EXTRACTION ============
// Handle all possible API response shapes
const extractItems = (data) => {
  if (!data) return [];
  if (data?.data?.items && Array.isArray(data.data.items)) return data.data.items;
  if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.content && Array.isArray(data.content)) return data.content;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

// Extract total count defensively
const extractTotal = (data) => {
  if (!data) return 0;
  if (typeof data?.data?.total === 'number') return data.data.total;
  if (typeof data?.data?.totalElements === 'number') return data.data.totalElements;
  if (typeof data?.total === 'number') return data.total;
  if (typeof data?.totalElements === 'number') return data.totalElements;
  return extractItems(data).length;
};

/**
 * Visits List Page
 * Displays paginated list of visits with search, sort, and CRUD operations
 */
const VisitsList = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [apiError, setApiError] = useState(null);

  // Table State Management
  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: DEFAULT_SORT
  });

  const { page, pageSize, sorting } = tableState;

  const { data, loading, error, params, setParams, refresh } = useVisitsList({
    sortBy: DEFAULT_SORT.field,
    sortDir: DEFAULT_SORT.direction
  });

  // Sync Table State with API Params
  useEffect(() => {
    const sortField = sorting[0]?.id || 'visitDate';
    const sortDir = sorting[0]?.desc ? 'desc' : 'asc';

    setParams(prev => ({
      ...prev,
      page: page + 1, // API is 1-based, Table is 0-based
      size: pageSize,
      sortBy: sortField,
      sortDir: sortDir
    }));
  }, [page, pageSize, sorting, setParams]);

  const handleSearch = useCallback(() => {
    setParams((prev) => ({ ...prev, search: searchInput, page: 1 }));
    tableState.setPage(0); // Reset table page to 0
  }, [searchInput, setParams, tableState]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleView = (id) => {
    navigate(`/visits/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/visits/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الزيارة؟')) {
      try {
        await visitsService.remove(id);
        setApiError(null);
        refresh();
      } catch (err) {
        console.error('Failed to delete visit:', err);
        setApiError(err.message || 'فشل حذف الزيارة');
      }
    }
  };

  const breadcrumbs = [{ title: 'الزيارات' }];

  // ========================================
  // COLUMNS DEFINITION
  // ========================================
  const columns = useMemo(() => [
    {
      accessorKey: 'visitDate',
      header: 'تاريخ الزيارة',
      size: 150,
      cell: ({ row }) => {
        const visit = row.original;
        return (
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight="medium">
              {visit?.visitDate ? new Date(visit.visitDate).toLocaleDateString('ar-SA') : '—'}
            </Typography>
            {visit?.visitType && (
              <Chip
                label={VISIT_TYPE_LABELS_AR[visit.visitType] ?? visit.visitType}
                color={VISIT_TYPE_COLORS[visit.visitType] ?? 'default'}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        );
      }
    },
    {
      id: 'member',
      header: 'المؤمَّن عليه',
      size: 200,
      cell: ({ row }) => {
        const visit = row.original;
        const memberName = visit?.member?.fullName ?? '—';
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{memberName}</Typography>
          </Stack>
        );
      }
    },
    {
      id: 'provider',
      header: 'مقدم الخدمة',
      size: 200,
      cell: ({ row }) => {
        const visit = row.original;
        const providerName = visit?.provider?.name ?? '—';
        const networkTier = getNetworkTier(visit?.provider);
        return (
          <Stack spacing={0.5}>
            <Typography variant="body2">{providerName}</Typography>
            {networkTier && <NetworkBadge networkTier={networkTier} showLabel={true} size="small" language="ar" />}
          </Stack>
        );
      }
    },
    {
      id: 'services',
      header: 'الخدمات المقدمة',
      size: 250,
      enableSorting: false,
      cell: ({ row }) => {
        const visit = row.original;
        const services = Array.isArray(visit?.services) ? visit.services : [];
        if (services.length === 0) {
          return <Typography variant="caption" color="text.secondary">لا توجد خدمات</Typography>;
        }
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {services.slice(0, 3).map((service, idx) => (
              <Tooltip key={service?.id ?? idx} title={service?.name ?? ''}>
                <Chip
                  icon={<MedicalServicesIcon sx={{ fontSize: 14 }} />}
                  label={service?.code ?? service?.name?.substring(0, 10) ?? `خدمة ${idx + 1}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ mb: 0.5 }}
                />
              </Tooltip>
            ))}
            {services.length > 3 && (
              <Chip label={`+${services.length - 3}`} size="small" color="default" sx={{ mb: 0.5 }} />
            )}
          </Stack>
        );
      }
    },
    {
      id: 'claims',
      header: 'حالة المطالبة / الموافقة',
      size: 180,
      align: 'center',
      enableSorting: false,
      cell: ({ row }) => {
        const visit = row.original;
        return (
          <Stack spacing={0.5} alignItems="center">
            {/* Claim Status */}
            {visit?.latestClaimStatus ? (
              <Tooltip title={`مطالبة #${visit.latestClaimId} - ${visit.latestClaimStatusLabel || visit.latestClaimStatus}`}>
                <Chip
                  icon={<ReceiptIcon sx={{ fontSize: 14 }} />}
                  label={visit.latestClaimStatusLabel || CLAIM_STATUS_CONFIG[visit.latestClaimStatus]?.label || visit.latestClaimStatus}
                  color={CLAIM_STATUS_CONFIG[visit.latestClaimStatus]?.color || 'default'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/claims/${visit.latestClaimId}`);
                  }}
                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                />
              </Tooltip>
            ) : (
              null
            )}

            {/* PreAuth Status */}
            {visit?.latestPreAuthStatus ? (
              <Tooltip title={`موافقة مسبقة #${visit.latestPreAuthId} - ${visit.latestPreAuthStatusLabel || visit.latestPreAuthStatus}`}>
                <Chip
                  icon={<AssignmentIcon sx={{ fontSize: 14 }} />}
                  label={visit.latestPreAuthStatusLabel || PREAUTH_STATUS_CONFIG[visit.latestPreAuthStatus]?.label || visit.latestPreAuthStatus}
                  color={PREAUTH_STATUS_CONFIG[visit.latestPreAuthStatus]?.color || 'default'}
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pre-authorizations/${visit.latestPreAuthId}`);
                  }}
                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                />
              </Tooltip>
            ) : (
              null
            )}

            {!visit?.latestClaimStatus && !visit?.latestPreAuthStatus && (
              <Typography variant="caption" color="text.secondary">—</Typography>
            )}

            {/* Show counts if multiple */}
            {(visit?.claimCount > 1 || visit?.preAuthCount > 1) && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                {visit?.claimCount > 1 && `${visit.claimCount} مطالبات`}
                {visit?.claimCount > 1 && visit?.preAuthCount > 1 && ' | '}
                {visit?.preAuthCount > 1 && `${visit.preAuthCount} موافقات`}
              </Typography>
            )}
          </Stack>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      size: 100,
      align: 'center',
      cell: ({ row }) => {
        const visit = row.original;
        const visitStatus = getVisitStatus(visit);
        return (
          <CardStatusBadge
            status={visitStatus}
            customLabel={STATUS_LABELS_AR[visitStatus] ?? 'غير محدد'}
            size="small"
            variant="chip"
          />
        );
      }
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      size: 120,
      align: 'center',
      enableSorting: false,
      cell: ({ row }) => {
        const visit = row.original;
        const visitId = visit?.id;
        return (
          <Stack direction="row" spacing={0.5} justifyContent="center" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" color="info" onClick={() => handleView(visitId)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="تعديل">
              <IconButton size="small" color="primary" onClick={() => handleEdit(visitId)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" onClick={() => handleDelete(visitId)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      }
    }
  ], [navigate]);

  return (
    <>
      <ModernPageHeader
        title="الزيارات"
        subtitle="إدارة زيارات الأعضاء لمقدمي الخدمة"
        icon={LocalHospitalIcon}
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/eligibility')}>
            فحص الأهلية
          </Button>
        }
      />

      <MainCard>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <TextField
            placeholder="بحث..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: { xs: '100%', sm: 300 } }}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch}>
              بحث
            </Button>
            <IconButton onClick={refresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>

        {(error || apiError) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError(null)}>
            {apiError || error?.message || 'حدث خطأ أثناء تحميل البيانات'}
          </Alert>
        )}

        {!loading && extractItems(data).length === 0 && !searchInput ? (
          <ModernEmptyState
            icon={LocalHospitalIcon}
            title="لا توجد زيارات طبية مسجلة حاليًا"
            description="ابدأ بإضافة زيارة طبية جديدة"
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/provider/eligibility-check')}>
                تسجيل زيارة جديدة
              </Button>
            }
          />
        ) : (
          <GenericDataTable
            columns={columns}
            data={extractItems(data)}
            totalCount={extractTotal(data)}
            isLoading={loading}
            tableState={tableState}
            onRowClick={(row) => handleView(row.id)}
            emptyMessage="لا توجد زيارات مطابقة للبحث"
          />
        )}
      </MainCard>
    </>
  );
};

export default VisitsList;
