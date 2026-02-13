import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import {
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// project imports
import MainCard from 'components/MainCard';
import EmployerFilterSelector from 'components/tba/EmployerFilterSelector';

// contexts
import { useEmployerFilter } from 'contexts/EmployerFilterContext';

// RBAC
import { useRBAC } from 'api/rbac';
import { PermissionDomain } from 'constants/rbac';

// hooks
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useClaimsList } from 'hooks/useClaims';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE HEALTHCARE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Golden Rule: Every widget must drive a decision.
// This is an EXECUTIVE OPERATIONAL & FINANCIAL CONTROL PANEL.
//
// Sections:
// A) Financial Snapshot (Critical - First Priority)
// B) Claims Operations Overview
// C) Provider & Member Overview
// D) Recent Claims Table (Redesigned)
//
// REMOVED (Low-Value Charts):
// ❌ Monthly trends chart
// ❌ Members growth chart
// ❌ Costs by provider chart
// ❌ Service distribution donut
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card Component - Clean Enterprise Design
// ─────────────────────────────────────────────────────────────────────────────

const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  loading = false,
  trend,
  onClick,
  warning = false
}) => {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    secondary: theme.palette.grey[600]
  };

  const bgColor = colorMap[color] || colorMap.primary;

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        border: warning ? `1px solid ${theme.palette.warning.main}` : '1px solid',
        borderColor: warning ? theme.palette.warning.main : 'divider',
        transition: 'all 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          borderColor: bgColor,
          boxShadow: theme.shadows[2]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          {/* Header with Title and Icon on opposite sides */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {title}
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={80} height={32} />
              ) : (
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{
                    fontFamily: 'Roboto, sans-serif',
                    color: warning ? 'warning.dark' : 'text.primary'
                  }}
                >
                  {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
                </Typography>
              )}
            </Stack>

            <Box
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: alpha(bgColor, 0.1),
                color: bgColor,
                display: 'flex',
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </Box>
          </Stack>

          {/* Footer: Trend or Subtitle */}
          {(subtitle || trend !== undefined) && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              {trend !== undefined && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {trend >= 0 ?
                    <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} /> :
                    <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                  }
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color={trend >= 0 ? 'success.main' : 'error.main'}
                  >
                    {Math.abs(trend)}%
                  </Typography>
                </Stack>
              )}
              {subtitle && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section Header Component
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({ title, icon: Icon, color = 'primary' }) => {
  const theme = useTheme();

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
      <Box
        sx={{
          p: 0.75,
          borderRadius: 1,
          bgcolor: alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.1)
        }}
      >
        <Icon sx={{ fontSize: 20, color: `${color}.main` }} />
      </Box>
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
    </Stack>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const statusConfig = {
    DRAFT: { label: 'مسودة', color: 'default', icon: PendingIcon },
    SUBMITTED: { label: 'مقدمة', color: 'info', icon: PendingIcon },
    UNDER_REVIEW: { label: 'قيد المراجعة', color: 'warning', icon: PendingIcon },
    APPROVED: { label: 'معتمدة', color: 'primary', icon: CheckCircleIcon },
    REJECTED: { label: 'مرفوضة', color: 'error', icon: CancelIcon },
    SETTLED: { label: 'مسددة', color: 'success', icon: CheckCircleIcon },
    RETURNED_FOR_INFO: { label: 'مُرجعة', color: 'warning', icon: WarningAmberIcon }
  };

  const config = statusConfig[status] || statusConfig.DRAFT;
  const IconComponent = config.icon;

  return (
    <Chip
      size="small"
      icon={<IconComponent sx={{ fontSize: 14 }} />}
      label={config.label}
      color={config.color}
      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Recent Claims Table Component (Redesigned)
// ─────────────────────────────────────────────────────────────────────────────

const RecentClaimsTable = ({ claims, loading, onViewClaim }) => {
  const theme = useTheme();

  // Show only 10 most recent
  const recentClaims = useMemo(() => {
    if (!claims || !Array.isArray(claims)) return [];
    return claims.slice(0, 10);
  }, [claims]);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return `${parseFloat(amount).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} د.ل`;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('ar-SA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <MainCard title="آخر المطالبات" sx={{ height: '100%' }}>
        <Stack spacing={2}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} />
          ))}
        </Stack>
      </MainCard>
    );
  }

  return (
    <MainCard
      title="آخر المطالبات"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      contentSX={{ flexGrow: 1, overflow: 'hidden', p: 0, '&:last-child': { pb: 0 } }}
      secondary={
        <Typography variant="caption" color="text.secondary">
          آخر 10 مطالبات
        </Typography>
      }
    >
      <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }}>
                رقم المطالبة
              </TableCell>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }}>
                المؤمَّن عليه
              </TableCell>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }}>
                مقدم الخدمة
              </TableCell>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }}>
                الحالة
              </TableCell>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }} align="right">
                المبلغ المعتمد
              </TableCell>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }}>
                تاريخ التقديم
              </TableCell>
              <TableCell sx={{ color: 'common.white', bgcolor: 'primary.main', fontWeight: 600 }} align="center">
                الإجراء
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentClaims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    لا توجد مطالبات حديثة
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              recentClaims.map((claim) => (
                <TableRow
                  key={claim.id}
                  hover
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                      {claim.claimNumber || `#${claim.id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {claim.memberName || claim.member?.name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {claim.providerName || claim.provider?.name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      fontFamily="monospace"
                      color={claim.approvedAmount ? 'success.main' : 'text.secondary'}
                    >
                      {formatCurrency(claim.approvedAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {formatDate(claim.submissionDate || claim.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onViewClaim(claim.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </MainCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();

  // ─────────────────────────────────────────────────────────────────────────────
  // RBAC - Permission checks
  // ─────────────────────────────────────────────────────────────────────────────

  const { hasAccessToDomain, isSuperAdmin } = useRBAC();

  const canViewClaims = useMemo(
    () => isSuperAdmin || hasAccessToDomain(PermissionDomain.CLAIMS),
    [isSuperAdmin, hasAccessToDomain]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Employer Filter
  // ─────────────────────────────────────────────────────────────────────────────

  const { selectedEmployerId } = useEmployerFilter();

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching - Backend is ONLY source of truth
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    summary,
    loading: summaryLoading,
    refresh: refreshSummary
  } = useDashboardStats();

  const claimsParams = useMemo(() => (
    canViewClaims
      ? {
        page: 0,
        size: 10,
        employerId: selectedEmployerId,
        sortBy: 'createdAt',
        sortDir: 'desc'
      }
      : { skip: true }
  ), [canViewClaims, selectedEmployerId]);

  const {
    data: claimsData,
    loading: claimsLoading,
    refresh: refreshClaims
  } = useClaimsList(claimsParams);

  // ─────────────────────────────────────────────────────────────────────────────
  // Refresh Handler
  // ─────────────────────────────────────────────────────────────────────────────

  const handleRefreshAll = useCallback(() => {
    refreshSummary();
    refreshClaims();
  }, [refreshSummary, refreshClaims]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values (from backend summary - NO client-side calculations)
  // ─────────────────────────────────────────────────────────────────────────────

  const totalClaims = summary?.totalClaims || 0;
  const openClaims = summary?.openClaims || 0;
  const approvedClaims = summary?.approvedClaims || 0;
  const totalMembers = summary?.totalMembers || 0;
  const activeMembers = summary?.activeMembers || 0;
  const totalProviders = summary?.totalProviders || 0;
  const activeProviders = summary?.activeProviders || 0;
  const totalMedicalCost = summary?.totalMedicalCost
    ? parseFloat(summary.totalMedicalCost)
    : 0;
  const monthlyGrowth = summary?.monthlyGrowth
    ? parseFloat(summary.monthlyGrowth)
    : 0;

  // Format currency
  const formatLYD = (amount) => {
    if (!amount) return '0.00 د.ل';
    return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} د.ل`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  const handleViewClaim = (claimId) => {
    navigate(`/claims/${claimId}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  const InfoRow = ({ label, value, icon: Icon, color = 'primary', loading }) => {
    const theme = useTheme();
    const colorValue = theme.palette[color]?.main || theme.palette.primary.main;

    return (
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          py: 0.75, // Reduced padding
          borderBottom: '1px dashed',
          borderColor: 'divider',
          '&:last-child': { borderBottom: 0, pb: 0 },
          '&:first-of-type': { pt: 0 }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{
            display: 'flex',
            p: 0.25,
            borderRadius: 0.75,
            bgcolor: alpha(colorValue, 0.1),
            color: colorValue
          }}>
            <Icon sx={{ fontSize: 16 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
            {label}
          </Typography>
        </Stack>
        {loading ? (
          <Skeleton width={60} height={20} />
        ) : (
          <Typography variant="caption" fontWeight={700} fontFamily="Roboto, sans-serif" sx={{ fontSize: '0.75rem' }}>
            {value}
          </Typography>
        )}
      </Stack>
    );
  };


  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ─────────────────────────────────────────────────────────────────────────
          Compact Header (No Scroll Design)
          ───────────────────────────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1, px: 0.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <DashboardIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            لوحة التحكم
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <EmployerFilterSelector size="small" label="" />
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'hidden' }}>

        {/* ─────────────────────────────────────────────────────────────────────────
            Stats Column (Right Side) - Consolidated Panels
            ───────────────────────────────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 3 }} sx={{ height: '100%' }}>
          <Stack spacing={2} sx={{ height: '100%' }}>

            {/* 1. Financial Panel (Condensed) */}
            <MainCard
              title={<Typography variant="subtitle2" fontWeight={700}>الوضع المالي</Typography>}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              contentSX={{ p: 1.25, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <Stack spacing={0.5} sx={{ width: '100%' }}>
                <InfoRow
                  label="إجمالي التكلفة"
                  value={formatLYD(totalMedicalCost)}
                  icon={AttachMoneyIcon}
                  color="success"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="متوسط المطالبة"
                  value={totalClaims > 0 ? formatLYD(totalMedicalCost / totalClaims) : '0.00 د.ل'}
                  icon={TrendingUpIcon}
                  color="info"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="النمو الشهري"
                  value={`${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}%`}
                  icon={monthlyGrowth >= 0 ? TrendingUpIcon : TrendingDownIcon}
                  color={monthlyGrowth >= 0 ? 'success' : 'error'}
                  loading={summaryLoading}
                />
              </Stack>
            </MainCard>

            {/* 2. Operations Panel (Full Details) */}
            <MainCard
              title={<Typography variant="subtitle2" fontWeight={700}>عمليات المطالبات</Typography>}
              sx={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}
              contentSX={{ p: 1.25, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <Stack spacing={0.5} sx={{ width: '100%' }}>
                <InfoRow
                  label="إجمالي المطالبات"
                  value={totalClaims}
                  icon={ReceiptLongIcon}
                  color="primary"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="معتمدة"
                  value={approvedClaims}
                  icon={CheckCircleIcon}
                  color="success"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="قيد المعالجة"
                  value={openClaims}
                  icon={PendingIcon}
                  color="warning"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="مرفوضة"
                  value="-"
                  icon={CancelIcon}
                  color="error"
                  loading={summaryLoading}
                />
              </Stack>
            </MainCard>

            {/* 3. Network Panel */}
            <MainCard
              title={<Typography variant="subtitle2" fontWeight={700}>الشبكة الطبية</Typography>}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              contentSX={{ p: 1.25, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <Stack spacing={0.5} sx={{ width: '100%' }}>
                <InfoRow
                  label="مقدمي الخدمات"
                  value={activeProviders}
                  icon={LocalHospitalIcon}
                  color="primary"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="العقود السارية"
                  value={summary?.activeContracts || 0}
                  icon={ReceiptLongIcon}
                  color="info"
                  loading={summaryLoading}
                />
                <InfoRow
                  label="المستفيدين"
                  value={activeMembers}
                  icon={PeopleIcon}
                  color="secondary"
                  loading={summaryLoading}
                />
              </Stack>
            </MainCard>

          </Stack>
        </Grid>

        {/* ─────────────────────────────────────────────────────────────────────────
            Content Column (Left Side) - Table (Takes remaining space)
            ───────────────────────────────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 9 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {canViewClaims && (
            <Box sx={{ flexGrow: 1, '& .MuiPaper-root': { height: '100%', display: 'flex', flexDirection: 'column' }, '& .MuiTableContainer-root': { flexGrow: 1 } }}>
              <RecentClaimsTable
                claims={claimsData?.content || []}
                loading={claimsLoading}
                onViewClaim={handleViewClaim}
              />
            </Box>
          )}
        </Grid>

      </Grid>
    </Box>
  );
}
