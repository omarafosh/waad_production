import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Paper,
  Alert,
  Chip,
  IconButton,
  CircularProgress,
  InputAdornment,
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
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Avatar
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Html5Qrcode } from 'html5-qrcode';

// Icons
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AssignmentIcon from '@mui/icons-material/Assignment';

// Components
import MainCard from '../../components/MainCard';
import { ModernPageHeader } from '../../components/tba';

// Services
import providerApi from '../../services/providerService';

// Visit Types
const VISIT_TYPE_OPTIONS = [
  { value: 'EMERGENCY', label: 'عمليات' },
  { value: 'OUTPATIENT', label: 'عيادات خارجية' },
  { value: 'INPATIENT', label: 'إيواء' },
  { value: 'ROUTINE', label: 'تحاليل طبية' },
  { value: 'FOLLOW_UP', label: 'اسنان وقائي' },
  { value: 'PREVENTIVE', label: 'اسنان تجميلي' },
  { value: 'SPECIALIZED', label: 'اشعة' },
  { value: 'HOME_CARE', label: 'علاج طبيعي' }
];

export default function ProviderEligibilityCheck() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ========================================
  // STATE
  // ========================================

  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedVisitType, setSelectedVisitType] = useState('');
  const [registeringVisit, setRegisteringVisit] = useState(false);

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);
  const scannerInputRef = useRef(null);

  // ========================================
  // HELPERS
  // ========================================

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    // Use Western Arabic numerals with English locale, but add custom Libyan Dinar suffix
    return (
      Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' د.ل'
    );
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  // ========================================
  // ELIGIBILITY CHECK API
  // ========================================

  const checkEligibility = useCallback(async (barcodeOrCardNumber) => {
    // Validate input
    const trimmedValue = barcodeOrCardNumber?.trim();

    if (!trimmedValue) {
      setError('يرجى إدخال رقم البطاقة أو الباركود أو رقم العضو');
      return;
    }

    // Only reject single "0", allow other numbers (including leading zeros like "000001")
    if (trimmedValue === '0') {
      setError('يرجى إدخال رقم صحيح (رقم البطاقة أو الباركود أو رقم العضو)');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedMember(null);
    setSelectedVisitType('');

    try {
      // Send as barcode (API accepts card number, barcode, or member ID in this field)
      const response = await providerApi.checkEligibility({ barcode: trimmedValue });

      // API returns the DTO directly (ProviderEligibilityResponse)
      if (response && (response.eligible !== undefined || response.statusCode)) {
        setResult(response);
        // Auto-select first eligible member
        if (response.familyMembers && response.familyMembers.length > 0) {
          const firstEligible = response.familyMembers.find((m) => m.eligible);
          if (firstEligible) {
            setSelectedMember(firstEligible);
          }
        }
      } else {
        setError(response?.message || 'فشل في التحقق من الأهلية - استجابة غير صالحة');
      }
    } catch (err) {
      console.error('Eligibility check failed:', err);
      setError(err.message || 'فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  const handleInputChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    checkEligibility(searchValue);
  };

  const handleReset = () => {
    setSearchValue('');
    setResult(null);
    setError(null);
    setSelectedMember(null);
    setSelectedVisitType('');
  };

  // ========================================
  // QR SCANNER HANDLERS
  // ========================================

  const startQrScanner = async () => {
    setScannerOpen(true);
    setCameraError(null);
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-provider');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          stopQrScanner();
          setScannerOpen(false);
          setSearchValue(decodedText);
          checkEligibility(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (continuous scanning)
        }
      );
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      setCameraError('فشل في تشغيل الكاميرا. تأكد من منح الإذن للوصول إلى الكاميرا.');
      setScanning(false);
    }
  };

  const stopQrScanner = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      } finally {
        setScanning(false);
      }
    }
  };

  const handleOpenScannerDialog = () => {
    startQrScanner();
  };

  const handleCloseScannerDialog = () => {
    stopQrScanner();
    setScannerOpen(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, []);

  // Hardware Scanner Support (focus on hidden input)
  useEffect(() => {
    let buffer = '';
    let timeout;

    const handleKeyDown = (e) => {
      const target = e.target;
      if (target.id === 'scanner-input-provider' || target.tagName === 'INPUT') {
        clearTimeout(timeout);

        if (e.key === 'Enter' && buffer.trim()) {
          e.preventDefault();
          setSearchValue(buffer.trim());
          checkEligibility(buffer.trim());
          buffer = '';
        } else if (e.key.length === 1) {
          buffer += e.key;

          // Scanner typically sends all characters within 50ms, so 300ms timeout
          // allows distinguishing between scanner and manual typing
          timeout = setTimeout(() => {
            if (buffer.trim() && buffer.trim().length >= 3) {
              setSearchValue(buffer.trim());
              checkEligibility(buffer.trim());
              buffer = '';
            } else {
              // Reset buffer for short inputs (manual typing)
              buffer = '';
            }
          }, 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [checkEligibility]);

  // ========================================
  // VISIT REGISTRATION HANDLER
  // ========================================

  const handleRegisterVisit = async () => {
    if (!selectedVisitType) {
      setError('يجب اختيار نوع الزيارة');
      return;
    }

    setRegisteringVisit(true);
    try {
      const visitResponse = await providerApi.registerVisit({
        memberId: selectedMember.memberId,
        eligibilityCheckId: result.eligibilityCheckId,
        visitType: selectedVisitType
      });

      if (visitResponse.success) {
        navigate('/provider/visits', {
          state: {
            successMessage: `تم تسجيل الزيارة بنجاح للمريض ${selectedMember.fullName}`,
            newVisitId: visitResponse.visitId
          }
        });
      } else {
        setError(visitResponse.message || 'فشل في تسجيل الزيارة');
      }
    } catch (err) {
      console.error('Failed to register visit:', err);
      setError(err.message || 'فشل في تسجيل الزيارة');
    } finally {
      setRegisteringVisit(false);
    }
  };

  // ========================================
  // RENDER: TABLE HEADER COLORS
  // ========================================

  const tableHeaderBg = isDark ? 'rgba(66, 66, 66, 0.5)' : 'grey.100';
  const tableHeaderColor = isDark ? 'rgba(255, 255, 255, 0.87)' : 'text.primary';

  // ========================================
  // RENDER
  // ========================================

  return (
    <Box>
      <ModernPageHeader title="فحص الأهلية" subtitle="التحقق من أهلية المؤمن عليه وتسجيل الزيارة" icon={LocalHospitalIcon} />

      <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 200px)' }}>
        {/* LEFT COLUMN: Member Profile Panel (Fixed Width - Desktop Only) */}
        {selectedMember && (
          <Paper
            elevation={2}
            sx={{
              width: 300,
              flexShrink: 0,
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              height: 'fit-content',
              position: 'sticky',
              top: 80,
              display: { xs: 'none', lg: 'block' }
            }}
          >
            {/* Header */}
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                p: 2,
                textAlign: 'center'
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                ملف المريض
              </Typography>
            </Box>

            <Box sx={{ p: 3 }}>
              <Stack spacing={2} alignItems="center">
                {/* Profile Image */}
                <Avatar
                  src={selectedMember.profileImage || ''}
                  alt={selectedMember.fullName}
                  sx={{
                    width: 120,
                    height: 120,
                    border: 4,
                    borderColor: selectedMember.eligible ? 'success.main' : 'error.main',
                    bgcolor: 'grey.300',
                    fontSize: 48,
                    fontWeight: 600
                  }}
                >
                  {!selectedMember.profileImage && <PersonIcon sx={{ fontSize: 60 }} />}
                </Avatar>

                {/* Member Name */}
                <Box sx={{ textAlign: 'center', width: '100%' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {selectedMember.fullName}
                  </Typography>
                  {selectedMember.isPrincipal && <Chip label="عضو رئيسي" color="primary" size="small" sx={{ mb: 1 }} />}
                </Box>

                <Divider sx={{ width: '100%' }} />

                {/* Member Details */}
                <Stack spacing={1.5} sx={{ width: '100%' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      رقم العضوية
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedMember.memberId}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      رقم البوليصة
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {result?.barcode || 'غير متوفر'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      الصلة
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedMember.relationship || 'SELF'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      العمر
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedMember.age || '-'} سنة
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      حالة الأهلية
                    </Typography>
                    <Chip
                      label={selectedMember.eligible ? 'مؤهل للخدمة' : 'غير مؤهل'}
                      color={selectedMember.eligible ? 'success' : 'error'}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Divider />

                  {/* Coverage Summary */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      الحد السنوي المتبقي
                    </Typography>
                    <Typography variant="h5" color="success.main" fontWeight={600}>
                      {formatCurrency(selectedMember.remainingLimit)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      نسبة الاستخدام
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={selectedMember.usagePercentage || 0}
                        color={getUsageColor(selectedMember.usagePercentage || 0)}
                        sx={{ height: 8, borderRadius: 1, flex: 1 }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {(selectedMember.usagePercentage || 0).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        )}

        {/* RIGHT COLUMN: Search & Results */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={1.5}>
            {/* Compact Search Card */}
            <MainCard contentSX={{ p: 2 }}>
              <Stack spacing={1.5}>
                {/* Horizontal Search Controls */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="flex-end">
                  <TextField
                    fullWidth
                    size="small"
                    label="رقم البطاقة / الباركود / رقم العضو"
                    placeholder="أدخل رقم البطاقة أو الباركود أو رقم العضو"
                    value={searchValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CreditCardIcon color="action" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      direction: 'ltr',
                      bgcolor: 'warning.lighter',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'warning.main' },
                        '&:hover fieldset': { borderColor: 'warning.dark' }
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={handleOpenScannerDialog}
                    disabled={loading}
                    sx={{ minWidth: { md: 100 }, height: 40, whiteSpace: 'nowrap' }}
                  >
                    مسح QR
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSubmit}
                    disabled={loading || !searchValue.trim()}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    sx={{ minWidth: { md: 100 }, height: 40 }}
                  >
                    {loading ? '...' : 'فحص'}
                  </Button>
                </Stack>

                {/* Scanner Input (Hidden, for hardware scanners) */}
                <Box sx={{ height: 0, overflow: 'hidden', opacity: 0 }}>
                  <TextField id="scanner-input-provider" ref={scannerInputRef} fullWidth size="small" />
                </Box>

                {/* Error Display */}
                {error && (
                  <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0 }}>
                    {error}
                  </Alert>
                )}
              </Stack>
            </MainCard>

            {/* Results Section */}
            {result ? (
              <MainCard
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h5">نتيجة الفحص</Typography>
                    <IconButton onClick={handleReset} size="small" title="إعادة ضبط">
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                }
                contentSX={{ p: 2 }}
              >
                <Stack spacing={2}>
                  {/* Eligibility Status */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: result.eligible ? 'success.lighter' : 'error.lighter',
                      border: 1,
                      borderColor: result.eligible ? 'success.main' : 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}
                  >
                    {result.eligible ? (
                      <CheckCircleIcon sx={{ fontSize: 28, color: 'success.main' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 28, color: 'error.main' }} />
                    )}
                    <Box flex={1}>
                      <Typography variant="h6" color={result.eligible ? 'success.dark' : 'error.dark'}>
                        {result.message}
                      </Typography>
                      {result.eligible && (
                        <Typography variant="body2" color="text.secondary">
                          {result.policyNumber && `رقم البوليصة: ${result.policyNumber}`}
                          {result.planName && ` | الخطة: ${result.planName}`}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      {result.barcode && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          #{result.barcode}
                        </Typography>
                      )}
                    </Box>
                  </Paper>

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {result.warnings.map((warning, index) => (
                        <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                          {warning}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* Principal Member Info */}
                  {result.principalMember && (
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <PersonIcon color="primary" />
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {result.principalMember.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            العضو الرئيسي - {result.employerName || 'جهة العمل غير محددة'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  )}

                  {/* Coverage Info */}
                  <Grid container spacing={2}>
                    <Grid xs={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
                        <Typography variant="body2" color="text.secondary">
                          الحد السنوي
                        </Typography>
                        <Typography variant="h6" color="primary.dark">
                          {formatCurrency(result.principalAnnualLimit)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
                        <Typography variant="body2" color="text.secondary">
                          المستخدم
                        </Typography>
                        <Typography variant="h6" color="warning.dark">
                          {formatCurrency(result.principalUsedAmount)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
                        <Typography variant="body2" color="text.secondary">
                          المتبقي
                        </Typography>
                        <Typography variant="h6" color="success.dark">
                          {formatCurrency(result.principalRemainingLimit)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
                        <Typography variant="body2" color="text.secondary">
                          نسبة الاستخدام
                        </Typography>
                        <Typography variant="h6">{(result.principalUsagePercentage || 0).toFixed(1)}%</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Family Members Table */}
                  {result.familyMembers && result.familyMembers.length > 0 && (
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <FamilyRestroomIcon color="primary" />
                        <Typography variant="h6">أفراد العائلة ({result.totalFamilyMembers || result.familyMembers.length})</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        يرجى اختيار المريض من القائمة أدناه للمتابعة
                      </Typography>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: tableHeaderBg }}>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }}>الاسم</TableCell>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }}>الصلة</TableCell>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }}>العمر</TableCell>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }}>الحالة</TableCell>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }}>المتبقي</TableCell>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }}>النسبة</TableCell>
                              <TableCell sx={{ color: tableHeaderColor, fontWeight: 600 }} align="center">
                                اختيار
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result.familyMembers.map((member) => (
                              <TableRow
                                key={member.memberId}
                                selected={selectedMember?.memberId === member.memberId}
                                hover
                                sx={{
                                  cursor: member.eligible ? 'pointer' : 'default',
                                  bgcolor: member.isPrincipal ? (isDark ? 'rgba(13, 71, 161, 0.15)' : 'primary.lighter') : 'inherit',
                                  opacity: member.eligible ? 1 : 0.6
                                }}
                                onClick={() => member.eligible && setSelectedMember(member)}
                              >
                                <TableCell>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <PersonIcon fontSize="small" color={member.isPrincipal ? 'primary' : 'action'} />
                                    <Box>
                                      <Typography variant="body2" fontWeight={member.isPrincipal ? 'bold' : 'normal'}>
                                        {member.fullName}
                                      </Typography>
                                      {member.isPrincipal && (
                                        <Chip label="رئيسي" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                                      )}
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell>{member.relationship || 'SELF'}</TableCell>
                                <TableCell>{member.age || '-'}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={member.eligible ? 'مؤهل' : 'غير مؤهل'}
                                    color={member.eligible ? 'success' : 'error'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>{formatCurrency(member.remainingLimit)}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={member.usagePercentage || 0}
                                      color={getUsageColor(member.usagePercentage || 0)}
                                      sx={{ height: 6, borderRadius: 1, flex: 1, minWidth: 50 }}
                                    />
                                    <Typography variant="caption">{(member.usagePercentage || 0).toFixed(0)}%</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    variant={selectedMember?.memberId === member.memberId ? 'contained' : 'outlined'}
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMember(member);
                                    }}
                                    disabled={!member.eligible}
                                    color={selectedMember?.memberId === member.memberId ? 'primary' : 'inherit'}
                                  >
                                    {selectedMember?.memberId === member.memberId ? 'محدد ✓' : 'اختيار'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Selected Member Action - Register Visit */}
                  {selectedMember && (
                    <Paper elevation={0} sx={{ p: 3, bgcolor: 'info.lighter', border: 1, borderColor: 'info.main' }}>
                      <Stack spacing={2}>
                        {/* Mobile Member Summary (visible on small screens) */}
                        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                            <Avatar
                              src={selectedMember.profileImage || ''}
                              alt={selectedMember.fullName}
                              sx={{
                                width: 60,
                                height: 60,
                                border: 2,
                                borderColor: selectedMember.eligible ? 'success.main' : 'error.main'
                              }}
                            >
                              {!selectedMember.profileImage && <PersonIcon />}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {selectedMember.fullName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                المتبقي: {formatCurrency(selectedMember.remainingLimit)}
                              </Typography>
                            </Box>
                          </Stack>
                          <Divider sx={{ mb: 2 }} />
                        </Box>

                        {/* Visit Type Selection */}
                        <FormControl fullWidth size="medium" required error={!selectedVisitType}>
                          <InputLabel id="visit-type-label">نوع الزيارة *</InputLabel>
                          <Select
                            labelId="visit-type-label"
                            value={selectedVisitType}
                            onChange={(e) => setSelectedVisitType(e.target.value)}
                            label="نوع الزيارة *"
                          >
                            {VISIT_TYPE_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {!selectedVisitType && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                              يجب اختيار نوع الزيارة قبل التسجيل
                            </Typography>
                          )}
                        </FormControl>

                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          fullWidth
                          startIcon={registeringVisit ? <CircularProgress size={20} color="inherit" /> : <AssignmentIcon />}
                          disabled={registeringVisit || !selectedVisitType}
                          onClick={handleRegisterVisit}
                        >
                          {registeringVisit ? 'جاري التسجيل...' : 'تسجيل زيارة'}
                        </Button>
                      </Stack>
                    </Paper>
                  )}

                  {/* Covered Services */}
                  {result.coveredServices && result.coveredServices.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        الخدمات المغطاة:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {result.coveredServices.map((service, index) => (
                          <Chip key={index} label={service} size="small" color="primary" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </MainCard>
            ) : (
              <Paper
                sx={{
                  p: 6,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  border: '1px dashed',
                  borderColor: 'divider',
                  minHeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Box>
                  <LocalHospitalIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    في انتظار الفحص
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    أدخل رقم البطاقة أو استخدم الماسح الضوئي
                  </Typography>
                </Box>
              </Paper>
            )}
          </Stack>
        </Box>
      </Box>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onClose={handleCloseScannerDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          مسح الباركود / QR Code
          <IconButton onClick={handleCloseScannerDialog} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {cameraError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                وجّه الكاميرا نحو الباركود أو QR Code
              </Typography>
              <Box
                id="qr-reader-provider"
                sx={{
                  width: '100%',
                  '& video': {
                    width: '100%',
                    borderRadius: 1
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScannerDialog}>إلغاء</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
