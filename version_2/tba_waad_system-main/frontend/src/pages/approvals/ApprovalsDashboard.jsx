import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Assignment as ClaimIcon,
  MedicalServices as PreApprovalIcon,
  Visibility as ViewIcon,
  PlayArrow as StartReviewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { DataGrid } from '@mui/x-data-grid';
import { claimsService, preApprovalsService } from 'services/api';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED APPROVALS DASHBOARD (CANONICAL)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aggregates pending tasks from:
 * 1. Claims (Canonical ClaimService)
 * 2. Pre-Authorizations (Canonical PreAuthorizationService)
 */
const ApprovalsDashboard = () => {
  const navigate = useNavigate();

  // State
  const [claims, setClaims] = useState([]);
  const [preApprovals, setPreApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    pendingClaims: 0,
    pendingPreAuths: 0,
    totalPending: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Pending Claims (SUBMITTED, UNDER_REVIEW)
      // Using Canonical /api/claims/inbox/pending endpoint
      const claimsPromise = claimsService.getPendingClaims({
        page: 1,
        size: 10
      });

      // 2. Fetch Pending Pre-Authorizations (PENDING)
      // Using Canonical /api/pre-authorizations endpoint
      const preAuthPromise = preApprovalsService.getPending({
        page: 1,
        size: 10
      });

      const [claimsRes, preAuthRes] = await Promise.allSettled([claimsPromise, preAuthPromise]);

      const loadedClaims = claimsRes.status === 'fulfilled' ? claimsRes.value.items || claimsRes.value.content || [] : [];
      const loadedPreAuths = preAuthRes.status === 'fulfilled' ? preAuthRes.value.items || preAuthRes.value.content || [] : [];

      setClaims(loadedClaims);
      setPreApprovals(loadedPreAuths);

      setStats({
        pendingClaims: claimsRes.status === 'fulfilled' ? labelsCount(claimsRes.value) : 0,
        pendingPreAuths: preAuthRes.status === 'fulfilled' ? preAuthRes.value.total || preAuthRes.value.totalElements || 0 : 0,
        totalPending:
          (claimsRes.status === 'fulfilled' ? labelsCount(claimsRes.value) : 0) +
          (preAuthRes.status === 'fulfilled' ? preAuthRes.value.total || 0 : 0)
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('فشل في تحميل بيانات لوحة الموافقات');
    } finally {
      setLoading(false);
    }
  }, []);

  const labelsCount = (res) => res.total || res.totalElements || 0;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Columns for Pre-Approvals
  const preAuthColumns = [
    {
      field: 'id',
      headerName: 'رقم الطلب',
      width: 100,
      valueGetter: (value, row) => row?.referenceNumber || `PA-${row?.id}` || row?.id || '-'
    },
    {
      field: 'memberName',
      headerName: 'المؤمن عليه',
      width: 200,
      valueGetter: (value, row) => row?.memberName || row?.member?.name || '-'
    },
    {
      field: 'providerName',
      headerName: 'مقدم الخدمة',
      width: 200,
      valueGetter: (value, row) => row?.providerName || row?.provider?.name || '-'
    },
    {
      field: 'serviceName',
      headerName: 'الخدمة',
      width: 180,
      valueGetter: (value, row) => row?.serviceName || row?.serviceCode || '-'
    },
    {
      field: 'serviceDate',
      headerName: 'تاريخ الخدمة',
      width: 120,
      valueGetter: (value, row) => row?.requestDate || row?.visitDate || row?.serviceDate || '-'
    },
    {
      field: 'status',
      headerName: 'الحالة',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params?.value === 'PENDING' ? 'معلق' : params?.value || '-'}
          color={params?.value === 'PENDING' ? 'warning' : params?.value === 'APPROVED' ? 'success' : 'default'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      width: 150,
      renderCell: (params) =>
        params?.row?.id ? (
          <Tooltip title="المراجعة">
            <IconButton color="primary" onClick={() => navigate(`/pre-approvals/${params.row.id}`)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
        ) : null
    }
  ];

  // Columns for Claims
  const claimColumns = [
    {
      field: 'claimNumber',
      headerName: 'رقم المطالبة',
      width: 150,
      valueGetter: (value, row) => row?.claimNumber || `CLM-${row?.id}` || '-'
    },
    {
      field: 'memberName',
      headerName: 'المؤمن عليه',
      width: 200,
      valueGetter: (value, row) => row?.memberName || row?.memberFullName || '-'
    },
    {
      field: 'providerName',
      headerName: 'مقدم الخدمة',
      width: 200,
      valueGetter: (value, row) => row?.providerName || '-'
    },
    {
      field: 'doctorName',
      headerName: 'الطبيب',
      width: 150,
      valueGetter: (value, row) => row?.doctorName || '-'
    },
    {
      field: 'totalAmount',
      headerName: 'المبلغ',
      width: 120,
      valueGetter: (value, row) => {
        const amount = row?.totalAmount || row?.requestedAmount;
        return amount ? `${Number(amount).toLocaleString()} د.ل` : '-';
      }
    },
    {
      field: 'serviceDate',
      headerName: 'التاريخ',
      width: 120,
      valueGetter: (value, row) => row?.serviceDate || row?.visitDate || '-'
    },
    {
      field: 'status',
      headerName: 'الحالة',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params?.row?.statusLabel || params?.value || '-'}
          color={params?.value === 'SUBMITTED' ? 'info' : params?.value === 'UNDER_REVIEW' ? 'warning' : 'default'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      width: 150,
      renderCell: (params) =>
        params?.row?.id ? (
          <Tooltip title="المراجعة">
            <IconButton color="primary" onClick={() => navigate(`/claims/${params.row.id}`)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
        ) : null
    }
  ];

  return (
    <>
      <ModernPageHeader
        title="لوحة الموافقات الموحدة"
        subtitle="متابعة المطالبات والموافقات المسبقة المعلقة"
        icon={DashboardIcon}
        actions={
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined">
            تحديث
          </Button>
        }
      />

      <MainCard>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* SUMMARY CARDS */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Pre-Approvals Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="warning.dark" gutterBottom>
                    موافقات مسبقة معلقة
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.pendingPreAuths}
                  </Typography>
                  <Button size="small" endIcon={<PreApprovalIcon />} onClick={() => navigate('/pre-approvals/inbox')} sx={{ mt: 1 }}>
                    عرض الصندوق
                  </Button>
                </Box>
                <PreApprovalIcon sx={{ fontSize: 60, color: 'warning.light', opacity: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>

          {/* Claims Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="info.dark" gutterBottom>
                    مطالبات للمراجعة
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.pendingClaims}
                  </Typography>
                  <Button size="small" endIcon={<ClaimIcon />} onClick={() => navigate('/claims')} sx={{ mt: 1 }}>
                    عرض الصندوق
                  </Button>
                </Box>
                <ClaimIcon sx={{ fontSize: 60, color: 'info.light', opacity: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* TABLES */}
        <Stack spacing={4}>
          {/* Section 1: Pre-Approvals */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <PreApprovalIcon color="warning" />
              <Typography variant="h5">آخر طلبات الموافقة المسبقة</Typography>
            </Stack>
            <Box sx={{ height: 350, width: '100%' }}>
              <DataGrid
                rows={preApprovals}
                columns={preAuthColumns}
                loading={loading}
                pageSize={5}
                rowsPerPageOptions={[5]}
                disableSelectionOnClick
                autoHeight={false}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Section 2: Claims */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ClaimIcon color="info" />
              <Typography variant="h5">آخر المطالبات الواردة</Typography>
            </Stack>
            <Box sx={{ height: 350, width: '100%' }}>
              <DataGrid
                rows={claims}
                columns={claimColumns}
                loading={loading}
                pageSize={5}
                rowsPerPageOptions={[5]}
                disableSelectionOnClick
                autoHeight={false}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Box>
          </Box>
        </Stack>
      </MainCard>
    </>
  );
};

export default ApprovalsDashboard;
