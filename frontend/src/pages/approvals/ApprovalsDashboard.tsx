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
  Alert,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton
} from '@mui/material';
import {
  Assignment as ClaimIcon,
  MedicalServices as PreApprovalIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { claimsService, preApprovalsService } from 'services/api';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED APPROVALS DASHBOARD (CANONICAL)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Aggregates pending tasks from:
 * 1. Claims (Canonical ClaimService)
 * 2. Pre-Authorizations (Canonical PreAuthorizationService)
 * 
 * Updated: Migrated from @mui/x-data-grid to MUI Table for consistency
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
      // 1. Fetch Pending Claims
      const claimsPromise = claimsService.getPendingClaims({
        page: 1,
        size: 10
      });

      // 2. Fetch Pending Pre-Authorizations
      const preAuthPromise = preApprovalsService.getPending({
        page: 1,
        size: 10
      });

      const [claimsRes, preAuthRes] = await Promise.allSettled([
        claimsPromise,
        preAuthPromise
      ]);

      const loadedClaims = claimsRes.status === 'fulfilled' ? (claimsRes.value.items || claimsRes.value.content || []) : [];
      const loadedPreAuths = preAuthRes.status === 'fulfilled' ? (preAuthRes.value.items || preAuthRes.value.content || []) : [];

      setClaims(loadedClaims);
      setPreApprovals(loadedPreAuths);

      setStats({
        pendingClaims: claimsRes.status === 'fulfilled' ? labelsCount(claimsRes.value) : 0,
        pendingPreAuths: preAuthRes.status === 'fulfilled' ? (preAuthRes.value.total || preAuthRes.value.totalElements || 0) : 0,
        totalPending: (claimsRes.status === 'fulfilled' ? labelsCount(claimsRes.value) : 0) + (preAuthRes.status === 'fulfilled' ? (preAuthRes.value.total || 0) : 0)
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

  // Loading Skeleton
  const TableSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton /></TableCell>
          <TableCell><Skeleton width={60} /></TableCell>
        </TableRow>
      ))}
    </>
  );

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
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* SUMMARY CARDS */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Pre-Approvals Stats */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="warning.dark" gutterBottom>
                    موافقات مسبقة معلقة
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.pendingPreAuths}
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<PreApprovalIcon />}
                    onClick={() => navigate('/pre-approvals/inbox')}
                    sx={{ mt: 1 }}
                  >
                    عرض الصندوق
                  </Button>
                </Box>
                <PreApprovalIcon sx={{ fontSize: 60, color: 'warning.light', opacity: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>

          {/* Claims Stats */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="info.dark" gutterBottom>
                    مطالبات للمراجعة
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.pendingClaims}
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ClaimIcon />}
                    onClick={() => navigate('/claims/inbox')}
                    sx={{ mt: 1 }}
                  >
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
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>رقم الطلب</strong></TableCell>
                    <TableCell><strong>المستفيد</strong></TableCell>
                    <TableCell><strong>مقدم الخدمة</strong></TableCell>
                    <TableCell><strong>الخدمة</strong></TableCell>
                    <TableCell><strong>التاريخ</strong></TableCell>
                    <TableCell align="center"><strong>الحالة</strong></TableCell>
                    <TableCell align="center"><strong>إجراء</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableSkeleton />
                  ) : preApprovals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          لا توجد طلبات موافقة مسبقة معلقة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    preApprovals.slice(0, 5).map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row?.referenceNumber || `PA-${row?.id}` || '-'}</TableCell>
                        <TableCell>{row?.memberName || row?.member?.name || '-'}</TableCell>
                        <TableCell>{row?.providerName || row?.provider?.name || '-'}</TableCell>
                        <TableCell>{row?.serviceName || row?.serviceCode || '-'}</TableCell>
                        <TableCell>{row?.requestDate || row?.visitDate || row?.serviceDate || '-'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row?.status === 'PENDING' ? 'معلق' : row?.status || '-'}
                            color={row?.status === 'PENDING' ? 'warning' : row?.status === 'APPROVED' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="المراجعة">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => navigate(`/pre-approvals/${row.id}`)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          {/* Section 2: Claims */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ClaimIcon color="info" />
              <Typography variant="h5">آخر المطالبات الواردة</Typography>
            </Stack>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>رقم المطالبة</strong></TableCell>
                    <TableCell><strong>المستفيد</strong></TableCell>
                    <TableCell><strong>مقدم الخدمة</strong></TableCell>
                    <TableCell><strong>الطبيب</strong></TableCell>
                    <TableCell><strong>المبلغ</strong></TableCell>
                    <TableCell><strong>التاريخ</strong></TableCell>
                    <TableCell align="center"><strong>الحالة</strong></TableCell>
                    <TableCell align="center"><strong>إجراء</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableSkeleton />
                  ) : claims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          لا توجد مطالبات للمراجعة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    claims.slice(0, 5).map((row) => {
                      const amount = row?.totalAmount || row?.requestedAmount;
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell>{row?.claimNumber || `CLM-${row?.id}` || '-'}</TableCell>
                          <TableCell>{row?.memberName || row?.memberFullName || '-'}</TableCell>
                          <TableCell>{row?.providerName || '-'}</TableCell>
                          <TableCell>{row?.doctorName || '-'}</TableCell>
                          <TableCell>{amount ? `${Number(amount).toLocaleString()} د.ل` : '-'}</TableCell>
                          <TableCell>{row?.serviceDate || row?.visitDate || '-'}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={row?.statusLabel || row?.status || '-'}
                              color={row?.status === 'SUBMITTED' ? 'info' : row?.status === 'UNDER_REVIEW' ? 'warning' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="المراجعة">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => navigate(`/claims/${row.id}`)}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>

      </MainCard>
    </>
  );
};


export default ApprovalsDashboard;
