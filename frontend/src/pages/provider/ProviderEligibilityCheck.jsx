/**
 * Provider Portal - Eligibility Check Page
 *
 * Corrected Professional Architectural Redesign (30/70 RTL Split)
 * Rightmost: 30% Scanner & Search (Unit of Control)
 * Left: 70% Results (Divided into Client Info & stats on right, Table on left)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
  TablePagination
} from '@mui/material';
import {
  QrCodeScanner as QrIcon,
  CreditCard as CardIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  LocalHospital as HospitalIcon,
  AccountBalanceWallet as WalletIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { Html5Qrcode } from 'html5-qrcode';
import MainCard from 'components/MainCard';
import { providerApi } from 'services/providerService';
import useAuth from 'hooks/useAuth';

export default function ProviderEligibilityCheck() {
  const navigate = useNavigate();
  const theme = useTheme();
  // Get user from auth hook
  const { user } = useAuth();

  // ========================================
  // STATE
  // ========================================
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [allowedEmployers, setAllowedEmployers] = useState([]);

  // QR Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  // Visit Registration State
  const [registeringVisit, setRegisteringVisit] = useState(false);
  const [selectedVisitType, setSelectedVisitType] = useState('OUTPATIENT');
  const [visitError, setVisitError] = useState(null);

  // Table Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const VISIT_TYPE_OPTIONS = [
    { value: 'OUTPATIENT', label: 'عيادة خارجية' },
    { value: 'INPATIENT', label: 'تنويم' },
    { value: 'EMERGENCY', label: 'طوارئ' },
    { value: 'DAY_CARE', label: 'رعاية يومية' },
    { value: 'FOLLOW_UP', label: 'متابعة' }
  ];

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return new Intl.NumberFormat('ar-LY', {
      style: 'currency',
      currency: 'LYD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const checkEligibility = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setError('الرجاء إدخال رقم البطاقة أو مسح الباركود');
      return;
    }
    setResult(null);
    setError(null);
    setVisitError(null);
    setSelectedMember(null);
    setLoading(true);
    setPage(0);
    try {
      const cleanQuery = query.trim();
      const response = await providerApi.checkEligibility({
        barcode: cleanQuery,
        encounterType: selectedVisitType
      });
      setResult(response);

      // Smart Auto-Select Logic
      // 1. If exact barcode match found in family members, select them
      const exactMatch = response.familyMembers?.find(m => m.barcode === cleanQuery || m.cardNumber === cleanQuery);

      if (exactMatch && exactMatch.eligible) {
        setSelectedMember(exactMatch);
      } else if (response.familyMembers?.length === 1 && response.familyMembers[0].eligible) {
        // 2. If only one member exists (and no specific barcode match needed/found), select them
        setSelectedMember(response.familyMembers[0]);
      }
    } catch (err) {
      console.error('Check failed:', err);
      setError(err.parsedError?.message || err.message || 'حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  }, [selectedVisitType]); // Added selectedVisitType to dependency

  const handleSubmit = () => checkEligibility(searchValue);
  const handleKeyPress = (e) => e.key === 'Enter' && searchValue.trim() && handleSubmit();
  const handleReset = () => {
    setSearchValue('');
    setResult(null);
    setError(null);
    setVisitError(null);
    setSelectedMember(null);
    setPage(0);
  };

  const startQrScanner = async () => {
    setScannerOpen(true);
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-provider');
      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopQrScanner();
          setScannerOpen(false);
          setSearchValue(decodedText);
          checkEligibility(decodedText);
        },
        () => { }
      );
    } catch (err) {
      setScanning(false);
    }
  };

  const stopQrScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop().catch(() => { });
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const handleCloseScannerDialog = () => {
    stopQrScanner();
    setScannerOpen(false);
  };

  useEffect(() => {
    // Fetch allowed employers
    const fetchEmployers = async () => {
      // Only fetch if user is a provider
      const isProvider = user?.role === 'PROVIDER' || user?.roles?.some(r => r.name === 'PROVIDER');
      if (!isProvider) return;

      try {
        const res = await providerApi.getAllowedEmployers();
        if (res.success) setAllowedEmployers(res.data);
      } catch (err) {
        console.error('Failed to load allowed employers', err);
      }
    };
    fetchEmployers();

    return () => { if (html5QrCodeRef.current) html5QrCodeRef.current.stop().catch(() => { }); };
  }, []);

  return (
    <Box sx={{
      width: '100%',
      // Use flex grow instead of fixed calc height to allow scrolling if needed, but preferably fit
      height: '100%',
      minHeight: 'calc(100vh - 120px)', // Account for Header + ContextBar
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      mx: 'auto',
      mx: 'auto',
      p: 3, // Keep padding
      pt: 1 // Reduce top padding explicitly to move content up
    }}>

      {/* Main Layout Body - Flex Row to ensure full width usage */}
      <Stack direction="row" spacing={3} sx={{ flexGrow: 1, overflow: 'hidden' }}>

        {/* 1. RIGHT COLUMN: Control & Scanner (Fixed Width) */}
        <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            {/* Header for Control Panel */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="h5" fontWeight="700" color="primary">التحقق من الأهلية</Typography>
              <Typography variant="body2" color="text.secondary">قم بمسح البطاقة أو إدخال الرقم</Typography>
            </Box>

            <MainCard
              contentSX={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
              sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: theme.customShadows?.z1 }}
            >
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                {/* QR Section */}
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: '1px dashed', borderColor: 'primary.main', textAlign: 'center' }}>
                  <QrIcon color="primary" sx={{ fontSize: 40, mb: 1, opacity: 0.8 }} />
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={startQrScanner}
                    disabled={loading || scanning}
                    sx={{ py: 1.5, fontWeight: 600 }}
                  >
                    تشغيل الكاميرا
                  </Button>
                </Box>

                <Divider><Typography variant="caption" color="text.secondary">أو البحث اليدوي</Typography></Divider>

                {/* Manual Section */}
                <Box sx={{ flexGrow: 1 }}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="رقم الهوية / البطاقة"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      sx={{ '& input': { textAlign: 'center' } }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleSubmit}
                      disabled={loading || !searchValue.trim()}
                      startIcon={loading && <CircularProgress size={16} color="inherit" />}
                    >
                      {loading ? 'جاري الفحص...' : 'تحقق الآن'}
                    </Button>

                    <Divider sx={{ my: 1 }} />

                    {/* Move Visit Type Selection here for initial context awareness */}
                    <FormControl fullWidth size="small">
                      <InputLabel id="select-visit-type-label">نوع الزيارة (السياق)</InputLabel>
                      <Select
                        labelId="select-visit-type-label"
                        value={selectedVisitType}
                        onChange={(e) => setSelectedVisitType(e.target.value)}
                        label="نوع الزيارة (السياق)"
                      >
                        {VISIT_TYPE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Box>

                {error && (
                  <Alert severity="error" variant="outlined" sx={{ mt: 'auto', fontSize: '0.8rem' }}>
                    {error}
                  </Alert>
                )}

                {result && (
                  <Button
                    color="error"
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={handleReset}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    إنهاء الجلسة / بحث جديد
                  </Button>
                )}
              </Stack>
            </MainCard>
          </Stack>
        </Box>

        {/* 2. LEFT COLUMN: Results - Flex Grow to Fill Rest */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {result ? (
            <Stack spacing={2} sx={{ height: '100%' }}>

              {/* Top Row: Info & Stats */}
              <Box sx={{ flexShrink: 0, display: 'flex', gap: 2 }}>
                {/* Status Card (Matches Table Width) */}
                <Box sx={{ flex: 2, minWidth: 0 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      bgcolor: result.eligible ? alpha(theme.palette.success.light, 0.05) : alpha(theme.palette.error.light, 0.05),
                      borderColor: result.eligible ? 'success.light' : 'error.light',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: theme.customShadows?.z1
                    }}
                  >
                    {/* Decorative Background Icon */}
                    <Box sx={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05, transform: 'rotate(-15deg)' }}>
                      {result.eligible ? <CheckIcon sx={{ fontSize: 180 }} /> : <CancelIcon sx={{ fontSize: 180 }} />}
                    </Box>

                    <Stack spacing={0.5} sx={{ zIndex: 1, minWidth: 0, flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h4" fontWeight="900" color={result.eligible ? 'success.dark' : 'error.dark'}>
                          {result.eligible ? 'مؤهل للخدمة' : 'غير مؤهل'}
                        </Typography>
                        {result.eligible && <Chip label="نشط" color="success" size="small" sx={{ height: 24, fontWeight: 'bold' }} />}
                      </Stack>

                      <Typography variant="h5" fontWeight="700" noWrap sx={{ mt: 1 }}>
                        {result.principalMember?.fullName}
                      </Typography>

                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body1" color="text.primary" fontWeight="600">
                            {result.employerName || 'الشركة المتحدة للتأمين'}
                          </Typography>
                        </Stack>
                        <Chip
                          label={result.barcode || '---'}
                          size="small"
                          variant="outlined"
                          icon={<QrIcon />}
                          sx={{ bgcolor: 'background.paper', fontWeight: 'bold', direction: 'ltr' }}
                        />
                      </Stack>
                    </Stack>

                    <Box sx={{
                      width: 80, height: 80,
                      flexShrink: 0,
                      borderRadius: '50%',
                      bgcolor: result.eligible ? 'success.main' : 'error.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 4,
                      border: '4px solid',
                      borderColor: 'background.paper',
                      zIndex: 2
                    }}>
                      {result.eligible ? <CheckIcon sx={{ fontSize: 48 }} /> : <CancelIcon sx={{ fontSize: 48 }} />}
                    </Box>
                  </Paper>
                </Box>

                {/* Financial Stats (Matches Sidebar Width) */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <MainCard contentSX={{ p: 2, height: '100%', display: 'flex', alignItems: 'center' }} sx={{ height: '100%', boxShadow: theme.customShadows?.z1 }}>
                    <Stack direction="row" sx={{ width: '100%' }} spacing={0} divider={<Divider orientation="vertical" flexItem />}>
                      {[
                        { label: 'الحد السنوي', value: result.principalAnnualLimit, color: 'primary', icon: <WalletIcon /> },
                        { label: 'المستهلك', value: result.principalUsedAmount, color: 'warning', icon: <CardIcon /> },
                        { label: 'المتـبقي', value: result.principalRemainingLimit, color: 'success', icon: <CheckIcon /> }
                      ].map((stat, idx) => (
                        <Box key={idx} sx={{ flex: 1, px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="700" display="block">{stat.label}</Typography>
                            <Typography variant="h6" fontWeight="900" color={`${stat.color}.main`} sx={{ lineHeight: 1 }}>
                              {formatCurrency(stat.value)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </MainCard>
                </Box>
              </Box>

              {/* Bottom Area: Table & Actions */}
              <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: 2 }}>
                {/* Table Section - Takes more space */}
                <MainCard
                  title={
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight="700">قائمة المستفيدين (العائلة)</Typography>
                      <Chip label={`${result.familyMembers.length}`} color="primary" size="small" />
                    </Stack>
                  }
                  contentSX={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                  sx={{ flex: 2, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: theme.customShadows?.z1 }}
                >
                  <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <Table stickyHeader size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell width="40%">الاسم</TableCell>
                          <TableCell width="20%">الصلة</TableCell>
                          <TableCell width="25%">المستهلك</TableCell>
                          <TableCell width="15%" align="center">الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.familyMembers
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((member) => (
                            <TableRow
                              key={member.memberId}
                              hover
                              selected={selectedMember?.memberId === member.memberId}
                              onClick={() => member.eligible && setSelectedMember(member)}
                              sx={{ cursor: member.eligible ? 'pointer' : 'default' }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight="700">{member.fullName}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    member.relationship === 'SELF' ? 'مشترك أساسي' :
                                      member.relationship === 'WIFE' ? 'زوجة' :
                                        member.relationship === 'HUSBAND' ? 'زوج' :
                                          member.relationship === 'SON' ? 'ابن' :
                                            member.relationship === 'DAUGHTER' ? 'ابنة' :
                                              member.relationship || 'مشترك أساسي'
                                  }
                                  size="small"
                                  variant={member.relationship === 'SELF' ? 'filled' : 'outlined'}
                                  color={member.relationship === 'SELF' ? 'primary' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="warning.dark" fontWeight="700">
                                  {formatCurrency(member.usedAmount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box
                                  sx={{
                                    width: 12, height: 12, borderRadius: '50%', mx: 'auto',
                                    bgcolor: member.eligible ? 'success.main' : 'error.main',
                                    boxShadow: 1
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={result.familyMembers.length}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10]}
                    page={page}
                    onPageChange={(e, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="صفوف:"
                  />
                </MainCard>

                {/* Context/Action Side Panel - Matches Stats Width */}
                <Paper
                  variant="outlined"
                  sx={{
                    flex: 1,
                    width: 'auto',
                    minWidth: 0,
                    flexShrink: 0,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: selectedMember ? alpha(theme.palette.primary.main, 0.02) : 'background.default',
                    borderColor: selectedMember ? 'primary.main' : 'divider',
                    borderWidth: selectedMember ? 2 : 1,
                    transition: 'all 0.3s',
                    boxShadow: theme.customShadows?.z1
                  }}
                >
                  {selectedMember ? (
                    <Stack spacing={3} justifyContent="center" sx={{ height: '100%' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        {/* Beneficiary Photo Verification Area */}
                        <Paper elevation={0} variant="outlined" sx={{
                          width: 120,
                          height: 120,
                          borderRadius: '50%', // Circle shape
                          bgcolor: 'grey.50',
                          mx: 'auto',
                          mb: 2,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid',
                          borderColor: 'divider'
                        }}>
                          <Stack alignItems="center" spacing={1} sx={{ color: 'text.disabled' }}>
                            <PersonIcon sx={{ fontSize: 60 }} />
                          </Stack>
                        </Paper>

                        <Typography variant="caption" color="primary" fontWeight="bold">المنتفع المحدد</Typography>
                        <Typography variant="h6" fontWeight="800" gutterBottom sx={{ lineHeight: 1.3 }}>{selectedMember.fullName}</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedMember.nationalId || 'ID: ---'}</Typography>
                      </Box>

                      <Divider flexItem />

                      <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Stack spacing={2}>

                          {visitError && (
                            <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{visitError}</Alert>
                          )}

                          <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={async () => {
                              if (!selectedVisitType) return;

                              // Check for Super Admin
                              if (user?.role === 'SUPER_ADMIN') {
                                setVisitError('عذراً، لا يمكنك تسجيل زيارات بصفتك مدير النظام. يجب الدخول كحساب مزود خدمة.');
                                return;
                              }

                              setRegisteringVisit(true);
                              setVisitError(null);
                              try {
                                const res = await providerApi.registerVisit({ memberId: selectedMember.memberId, eligibilityCheckId: result.eligibilityCheckId, visitType: selectedVisitType });
                                if (res.success) {
                                  navigate('/provider/visits', { state: { successMessage: `تم تأكيد الزيارة لـ ${selectedMember.fullName}` } });
                                } else {
                                  setVisitError(res.message || 'فشل تسجيل الزيارة');
                                }
                              } catch (err) {
                                console.error(err);
                                setVisitError(err.message || 'حدث خطأ غير متوقع');
                              } finally {
                                setRegisteringVisit(false);
                              }
                            }}
                            disabled={!selectedVisitType || registeringVisit}
                            sx={{ height: 48, fontWeight: 700, fontSize: '1rem' }}
                          >
                            {registeringVisit ? <CircularProgress size={24} color="inherit" /> : 'تسجيل زيارة'}
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  ) : (
                    <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', opacity: 0.5 }}>
                      <CardIcon fontSize="large" color="disabled" />
                      <Typography variant="body2" textAlign="center">اختر منتفع من القائمة<br />لتفعيل خيارات تسجيل الزيارة</Typography>
                    </Stack>
                  )}
                </Paper>
              </Box>

            </Stack>
          ) : (
            <Box sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.neutral',
              gap: 2,
              opacity: 0.7
            }}>
              <HospitalIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.2 }} />
              <Typography variant="h4" color="text.secondary" fontWeight="700">بانتظار التحقق</Typography>
              <Typography variant="body1" color="text.secondary">استخدم وحدة التحكم للبدء</Typography>
            </Box>
          )}
        </Box>
      </Stack>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onClose={handleCloseScannerDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>ماسح الباركود الذكي<IconButton onClick={handleCloseScannerDialog} sx={{ position: 'absolute', right: 16, top: 16 }}><CloseIcon /></IconButton></DialogTitle>
        <DialogContent sx={{ p: 1 }}><Box id="qr-reader-provider" sx={{ width: '100%', '& video': { width: '100%', borderRadius: 16 } }} /></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={handleCloseScannerDialog} py={1} px={3} color="inherit">إغلاق</Button></DialogActions>
      </Dialog>
    </Box >
  );
}
