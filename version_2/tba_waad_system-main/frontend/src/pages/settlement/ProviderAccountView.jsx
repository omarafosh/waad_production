/**
 * Provider Account View Page - Phase 3B Settlement (FIXED)
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              PROVIDER ACCOUNT VIEW - FIXED VERSION                            ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Shows provider account details with transaction history                       ║
 * ║ Uses MUI DataGrid instead of GenericDataTable to avoid React errors           ║
 * ║                                                                               ║
 * ║ BUG FIXES:                                                                    ║
 * ║ ✅ Fixed: Objects are not valid as React child                                ║
 * ║ ✅ Fixed: All values converted to strings                                     ║
 * ║ ✅ Fixed: Safe optional chaining for all nested properties                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';

// MUI Components
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';

// MUI DataGrid
import { DataGrid } from '@mui/x-data-grid';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PrintIcon from '@mui/icons-material/Print';
import TableChartIcon from '@mui/icons-material/TableChart';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import PermissionGuard from 'components/PermissionGuard';

// Services
import { providerAccountsService } from 'services/api/settlement.service';

// Utils
import { exportToExcel } from 'utils/exportUtils';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Transaction type labels in Arabic
const TRANSACTION_TYPE_LABELS = {
  CREDIT: 'إضافة (دائن)',
  DEBIT: 'خصم (مدين)',
  PAYMENT: 'دفعة',
  ADJUSTMENT: 'تسوية'
};

// Transaction type colors
const TRANSACTION_TYPE_COLORS = {
  CREDIT: 'success',
  DEBIT: 'error',
  PAYMENT: 'primary',
  ADJUSTMENT: 'warning'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency with LYD - ALWAYS returns string
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 د.ل';
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

/**
 * Format datetime for display - ALWAYS returns string
 */
const formatDateTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(date);
  }
};

/**
 * Get balance color based on amount
 */
const getBalanceColor = (balance) => {
  if (balance > 0) return 'error.main';
  if (balance < 0) return 'success.main';
  return 'text.primary';
};

/**
 * Safely get provider name from various data structures
 */
const getProviderName = (account) => {
  if (!account) return 'مقدم الخدمة';
  return (
    account.providerName || account.provider?.name || account.provider?.nameArabic || `مقدم خدمة #${account.providerId || account.id || ''}`
  );
};

// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================

const TabPanel = ({ children, value, index, ...other }) => (
  <Box role="tabpanel" hidden={value !== index} id={`account-tabpanel-${index}`} aria-labelledby={`account-tab-${index}`} {...other}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </Box>
);

// ============================================================================
// ACCOUNT SUMMARY CARD
// ============================================================================

const AccountSummaryCard = ({ account, isLoading }) => {
  if (isLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={40} />
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rectangular" height={100} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        لم يتم العثور على بيانات الحساب
      </Alert>
    );
  }

  const providerName = getProviderName(account);
  const providerId = account?.providerId || account?.id || '';
  const runningBalance = Number(account?.runningBalance) || 0;
  const totalApproved = Number(account?.totalApproved) || 0;
  const totalPaid = Number(account?.totalPaid) || 0;
  const transactionCount = Number(account?.transactionCount) || 0;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Provider Name */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {String(providerName)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`حساب مقدم الخدمة #${String(providerId)}`}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {/* Financial Summary */}
        <Grid container spacing={3}>
          {/* Running Balance */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: runningBalance > 0 ? 'error.lighter' : 'success.lighter',
                borderRadius: 2,
                textAlign: 'center'
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                الرصيد الحالي
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: getBalanceColor(runningBalance) }}>
                {formatCurrency(runningBalance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {runningBalance > 0 ? 'مستحق للمقدم' : runningBalance < 0 ? 'مستحق على المقدم' : 'لا رصيد'}
              </Typography>
            </Paper>
          </Grid>

          {/* Total Approved */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                إجمالي المعتمد
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {formatCurrency(totalApproved)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                مجموع المطالبات المعتمدة
              </Typography>
            </Paper>
          </Grid>

          {/* Total Paid */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                إجمالي المدفوع
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <TrendingDownIcon color="success" />
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {formatCurrency(totalPaid)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                مجموع المدفوعات المحولة
              </Typography>
            </Paper>
          </Grid>

          {/* Transaction Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                عدد الحركات
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <HistoryIcon color="action" />
                <Typography variant="h4" fontWeight={700}>
                  {String(transactionCount)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                إجمالي الحركات المالية
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProviderAccountView = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // ========================================
  // DATA FETCHING
  // ========================================

  // Fetch account summary
  const {
    data: accountData,
    isLoading: isLoadingAccount,
    isError: isAccountError,
    error: accountError,
    refetch: refetchAccount
  } = useQuery({
    queryKey: ['provider-account', providerId],
    queryFn: () => providerAccountsService.getByProviderId(providerId),
    enabled: !!providerId,
    staleTime: 1000 * 60 * 2
  });

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ['provider-account', providerId, 'transactions', paginationModel.page, paginationModel.pageSize],
    queryFn: () =>
      providerAccountsService.getTransactions(providerId, {
        page: paginationModel.page,
        size: paginationModel.pageSize
      }),
    enabled: !!providerId,
    staleTime: 1000 * 60 * 2
  });

  // Fetch recent transactions for quick view
  const { data: recentTransactionsRaw, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['provider-account', providerId, 'recent'],
    queryFn: () => providerAccountsService.getRecentTransactions(providerId),
    enabled: !!providerId,
    staleTime: 1000 * 60 * 2
  });

  // ========================================
  // PROCESS TRANSACTIONS DATA
  // ========================================

  const processTransactions = useCallback((rawData) => {
    if (!rawData) return [];
    const list = Array.isArray(rawData) ? rawData : rawData?.content || [];
    return list.map((tx, index) => ({
      id: tx.id || `tx-${index}`,
      createdAt: tx.createdAt,
      transactionType: tx.transactionType || 'UNKNOWN',
      amount: Number(tx.amount) || 0,
      runningBalanceAfter: Number(tx.runningBalanceAfter) || 0,
      referenceType: tx.referenceType || '-',
      referenceId: tx.referenceId || '',
      description: tx.description || ''
    }));
  }, []);

  const recentTransactions = useMemo(() => processTransactions(recentTransactionsRaw), [recentTransactionsRaw, processTransactions]);

  const allTransactions = useMemo(() => {
    const content = transactionsData?.content || transactionsData;
    return processTransactions(content);
  }, [transactionsData, processTransactions]);

  const totalTransactions = transactionsData?.totalElements || allTransactions.length;

  // ========================================
  // HANDLERS
  // ========================================

  const handleBack = useCallback(() => {
    navigate('/settlement/provider-accounts');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    refetchAccount();
    refetchTransactions();
    openSnackbar({
      message: 'جاري تحديث البيانات...',
      variant: 'info'
    });
  }, [refetchAccount, refetchTransactions]);

  const handleVerifyBalance = useCallback(async () => {
    if (!accountData?.id && !accountData?.providerId) return;

    try {
      const accountId = accountData?.id || accountData?.providerId;
      const result = await providerAccountsService.verifyBalance(accountId);
      setVerificationResult(result);
      openSnackbar({
        message: result?.isValid ? 'الرصيد متطابق ✓' : 'يوجد فرق في الرصيد!',
        variant: result?.isValid ? 'success' : 'warning'
      });
    } catch (error) {
      openSnackbar({
        message: error?.message || 'فشل التحقق من الرصيد',
        variant: 'error'
      });
    }
  }, [accountData]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `حساب_${getProviderName(accountData)}_${new Date().toISOString().split('T')[0]}`
  });

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    const dataToExport = activeTab === 0 ? recentTransactions : allTransactions;
    if (!dataToExport.length) return;

    const exportData = dataToExport.map((tx) => ({
      التاريخ: formatDateTime(tx.createdAt),
      'نوع الحركة': TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType,
      المبلغ: tx.amount,
      'الرصيد بعد الحركة': tx.runningBalanceAfter,
      المرجع: tx.referenceType,
      الوصف: tx.description || '-'
    }));

    const fileName = `حركات_${getProviderName(accountData)}_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(exportData, fileName);
  }, [accountData, activeTab, recentTransactions, allTransactions]);

  // ========================================
  // TABLE COLUMNS (DataGrid format)
  // ========================================

  const transactionColumns = useMemo(
    () => [
      {
        field: 'createdAt',
        headerName: 'التاريخ',
        width: 180,
        renderCell: (params) => <Typography variant="body2">{formatDateTime(params.value)}</Typography>
      },
      {
        field: 'transactionType',
        headerName: 'نوع الحركة',
        width: 130,
        renderCell: (params) => (
          <Chip
            label={TRANSACTION_TYPE_LABELS[params.value] || String(params.value || '-')}
            color={TRANSACTION_TYPE_COLORS[params.value] || 'default'}
            size="small"
            variant="filled"
          />
        )
      },
      {
        field: 'amount',
        headerName: 'المبلغ',
        width: 150,
        renderCell: (params) => {
          const type = params.row?.transactionType;
          const amount = Number(params.value) || 0;
          const isCredit = type === 'CREDIT';
          return (
            <Typography fontWeight={600} color={isCredit ? 'success.main' : 'error.main'}>
              {`${isCredit ? '+' : '-'} ${formatCurrency(amount)}`}
            </Typography>
          );
        }
      },
      {
        field: 'runningBalanceAfter',
        headerName: 'الرصيد بعد الحركة',
        width: 150,
        renderCell: (params) => <Typography fontWeight={500}>{formatCurrency(params.value)}</Typography>
      },
      {
        field: 'referenceType',
        headerName: 'المرجع',
        width: 130,
        renderCell: (params) => (
          <Stack>
            <Typography variant="body2">{String(params.value || '-')}</Typography>
            {params.row?.referenceId && (
              <Typography variant="caption" color="text.secondary">
                {`#${String(params.row.referenceId)}`}
              </Typography>
            )}
          </Stack>
        )
      },
      {
        field: 'description',
        headerName: 'الوصف',
        flex: 1,
        minWidth: 200,
        renderCell: (params) => (
          <Tooltip title={params.value || ''}>
            <Typography
              variant="body2"
              sx={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {String(params.value || '-')}
            </Typography>
          </Tooltip>
        )
      }
    ],
    []
  );

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [
    { label: 'الرئيسية', path: '/' },
    { label: 'التسويات', path: '/settlement' },
    { label: 'حسابات مقدمي الخدمة', path: '/settlement/provider-accounts' },
    { label: getProviderName(accountData) }
  ];

  // ========================================
  // PAGE ACTIONS
  // ========================================

  const pageActions = (
    <Stack direction="row" spacing={1}>
      <Tooltip title="التحقق من الرصيد">
        <Button variant="outlined" color="info" startIcon={<VerifiedIcon />} onClick={handleVerifyBalance} disabled={!accountData}>
          تحقق من الرصيد
        </Button>
      </Tooltip>
      <Tooltip title="تصدير Excel">
        <IconButton onClick={handleExportExcel} color="success">
          <TableChartIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="طباعة">
        <IconButton onClick={handlePrint} color="primary">
          <PrintIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="تحديث">
        <IconButton onClick={handleRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="رجوع">
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  // ========================================
  // RENDER
  // ========================================

  if (isAccountError) {
    return (
      <Box>
        <UnifiedPageHeader
          title="تفاصيل الحساب"
          breadcrumbs={breadcrumbs}
          icon={AccountBalanceWalletIcon}
          actions={
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          }
        />
        <Alert severity="error">{accountError?.message || 'فشل في تحميل بيانات الحساب'}</Alert>
      </Box>
    );
  }

  return (
    <PermissionGuard resource="provider_accounts" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box ref={printRef}>
        {/* Page Header */}
        <UnifiedPageHeader
          title="تفاصيل حساب مقدم الخدمة"
          subtitle={String(getProviderName(accountData))}
          breadcrumbs={breadcrumbs}
          icon={AccountBalanceWalletIcon}
          actions={pageActions}
        />

        {/* Verification Result */}
        {verificationResult && (
          <Alert
            severity={verificationResult.isValid ? 'success' : 'warning'}
            icon={verificationResult.isValid ? <CheckCircleIcon /> : <ErrorIcon />}
            sx={{ mb: 2 }}
            onClose={() => setVerificationResult(null)}
          >
            {verificationResult.isValid ? 'الرصيد متطابق مع مجموع الحركات' : `يوجد فرق: ${formatCurrency(verificationResult.difference)}`}
          </Alert>
        )}

        {/* Account Summary */}
        <AccountSummaryCard account={accountData} isLoading={isLoadingAccount} />

        {/* Tabs */}
        <MainCard>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="آخر الحركات" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="كل الحركات" icon={<AccountBalanceWalletIcon />} iconPosition="start" />
          </Tabs>

          {/* Recent Transactions Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={recentTransactions}
                columns={transactionColumns}
                loading={isLoadingRecent}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                disableRowSelectionOnClick
                getRowId={(row) => row.id}
                localeText={{
                  noRowsLabel: 'لا توجد حركات مالية',
                  MuiTablePagination: {
                    labelRowsPerPage: 'عدد الصفوف:',
                    labelDisplayedRows: ({ from, to, count }) => `${from}-${to} من ${count}`
                  }
                }}
              />
            </Box>
          </TabPanel>

          {/* All Transactions Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={allTransactions}
                columns={transactionColumns}
                loading={isLoadingTransactions}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                rowCount={totalTransactions}
                paginationMode="server"
                disableRowSelectionOnClick
                getRowId={(row) => row.id}
                localeText={{
                  noRowsLabel: 'لا توجد حركات مالية',
                  MuiTablePagination: {
                    labelRowsPerPage: 'عدد الصفوف:',
                    labelDisplayedRows: ({ from, to, count }) => `${from}-${to} من ${count}`
                  }
                }}
              />
            </Box>
          </TabPanel>
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default ProviderAccountView;
