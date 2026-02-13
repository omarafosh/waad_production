import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  TablePagination,
  Tooltip,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Visibility as ViewIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Description as DocumentIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import axiosClient from 'utils/axios';
import MainCard from 'components/MainCard';
import { MEDICAL_COLORS } from 'themes/provider-theme';
import { DocumentPreviewDrawer } from 'components/tba/documents';

// ==================== CONSTANTS ====================

const REFERENCE_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'VISIT', label: 'زيارة' },
  { value: 'PRE_AUTH', label: 'موافقة مسبقة' },
  { value: 'CLAIM', label: 'مطالبة' }
];

const STATUSES = [
  { value: '', label: 'الكل', color: 'default' },
  { value: 'REQUIRED', label: 'مطلوب', color: 'warning' },
  { value: 'UPLOADED', label: 'مرفوع', color: 'info' },
  { value: 'APPROVED', label: 'مقبول', color: 'success' },
  { value: 'REJECTED', label: 'مرفوض', color: 'error' }
];

// ==================== STATUS CHIP COMPONENT ====================

const StatusChip = ({ status }) => {
  const statusConfig = STATUSES.find((s) => s.value === status) || { label: status, color: 'default' };
  return <Chip label={statusConfig.label} color={statusConfig.color} size="small" sx={{ minWidth: 70, fontWeight: 500 }} />;
};

// ==================== REFERENCE TYPE CHIP ====================

const ReferenceTypeChip = ({ type }) => {
  const typeConfig = REFERENCE_TYPES.find((t) => t.value === type) || { label: type };
  const colors = {
    VISIT: 'primary',
    PRE_AUTH: 'secondary',
    CLAIM: 'warning'
  };
  return <Chip label={typeConfig.label || type} color={colors[type] || 'default'} size="small" variant="outlined" sx={{ minWidth: 80 }} />;
};

// ==================== MAIN COMPONENT ====================

const ProviderDocuments = () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // THEME (MEDICAL THEME)
  // ═══════════════════════════════════════════════════════════════════════════
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tableHeaderBg = isDark ? '#1E3A5F' : MEDICAL_COLORS.primary.main;
  const tableHeaderColor = '#FFFFFF';

  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Preview Drawer State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [referenceType, setReferenceType] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // ==================== DATA FETCHING ====================

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('size', rowsPerPage);

      if (referenceType) params.append('referenceType', referenceType);
      if (status) params.append('status', status);
      if (fromDate) params.append('fromDate', dayjs(fromDate).format('YYYY-MM-DD'));
      if (toDate) params.append('toDate', dayjs(toDate).format('YYYY-MM-DD'));

      const response = await axiosClient.get(`/api/provider/documents?${params.toString()}`);

      if (response.data?.success) {
        const data = response.data.data;
        setDocuments(data.content || []);
        setTotalCount(data.totalElements || 0);
      } else {
        setError(response.data?.message || 'فشل في جلب المستندات');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء جلب المستندات');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, referenceType, status, fromDate, toDate]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axiosClient.get('/api/provider/documents/stats');
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  // ==================== HANDLERS ====================

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    fetchDocuments();
    fetchStats();
  };

  const handleClearFilters = () => {
    setReferenceType('');
    setStatus('');
    setFromDate(null);
    setToDate(null);
    setPage(0);
  };

  const handleDownload = async (document) => {
    try {
      const response = await axiosClient.get(document.downloadUrl, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.fileName || 'document');
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('فشل تحميل الملف');
    }
  };

  const handleView = (document) => {
    // Open side preview drawer instead of new tab
    setPreviewDocument(document);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewDocument(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
  };

  // ==================== RENDER ====================

  return (
    <MainCard
      title={
        <Stack direction="row" alignItems="center" spacing={1}>
          <FolderIcon color="primary" />
          <Typography variant="h5">مستندات مقدم الخدمة</Typography>
        </Stack>
      }
      secondary={
        <Button startIcon={<RefreshIcon />} onClick={handleRefresh} variant="outlined" size="small">
          تحديث
        </Button>
      }
    >
      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary">
                  {stats.totalDocuments}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  إجمالي المستندات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main">
                  {stats.visitDocuments}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  مستندات الزيارات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="secondary.main">
                  {stats.preAuthDocuments}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  مستندات الموافقات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main">
                  {stats.claimDocuments}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  مستندات المطالبات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FilterIcon color="action" />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>نوع المرجع</InputLabel>
            <Select
              value={referenceType}
              label="نوع المرجع"
              onChange={(e) => {
                setReferenceType(e.target.value);
                setPage(0);
              }}
            >
              {REFERENCE_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={status}
              label="الحالة"
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="من تاريخ"
              value={fromDate}
              onChange={(newValue) => {
                setFromDate(newValue);
                setPage(0);
              }}
              slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
            />

            <DatePicker
              label="إلى تاريخ"
              value={toDate}
              onChange={(newValue) => {
                setToDate(newValue);
                setPage(0);
              }}
              slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
            />
          </LocalizationProvider>

          <Button variant="text" onClick={handleClearFilters} sx={{ whiteSpace: 'nowrap' }}>
            مسح الفلاتر
          </Button>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Documents Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: tableHeaderBg }}>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>نوع المرجع</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>رقم المرجع</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>نوع المستند</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>تاريخ الرفع</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>سبب الرفض</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tableHeaderColor }}>إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    جاري التحميل...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <DocumentIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
                  <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                    لا توجد مستندات
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={`${doc.referenceType}-${doc.id}`} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <ReferenceTypeChip type={doc.referenceType} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {doc.referenceNumber}
                    </Typography>
                    {doc.memberName && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {doc.memberName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <DocumentIcon fontSize="small" color="action" />
                      <Typography variant="body2">{doc.documentTypeLabel || doc.documentType}</Typography>
                    </Stack>
                    {doc.fileName && (
                      <Typography variant="caption" color="textSecondary" display="block" noWrap sx={{ maxWidth: 150 }}>
                        {doc.fileName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={doc.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(doc.uploadedAt)}</Typography>
                    {doc.fileSize && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {formatFileSize(doc.fileSize)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {doc.rejectionReason ? (
                      <Tooltip title={doc.rejectionReason}>
                        <Typography
                          variant="body2"
                          color="error"
                          sx={{
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {doc.rejectionReason}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {doc.status === 'UPLOADED' || doc.status === 'APPROVED' ? (
                        <>
                          <Tooltip title="عرض">
                            <IconButton size="small" color="primary" onClick={() => handleView(doc)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تحميل">
                            <IconButton size="small" color="info" onClick={() => handleDownload(doc)}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : doc.status === 'REQUIRED' || doc.status === 'REJECTED' ? (
                        <Tooltip title="رفع مستند">
                          <Button size="small" variant="contained" color="primary" startIcon={<UploadIcon />} sx={{ whiteSpace: 'nowrap' }}>
                            رفع
                          </Button>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 20, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* Document Preview Drawer */}
      <DocumentPreviewDrawer
        open={previewOpen}
        onClose={handleClosePreview}
        documentUrl={previewDocument ? `/api${previewDocument.downloadUrl}` : null}
        fileName={previewDocument?.fileName}
        mimeType={previewDocument?.fileType}
        fileSize={previewDocument?.fileSize}
        documentTitle={previewDocument?.documentTypeLabel || previewDocument?.documentType}
        onDownload={() => previewDocument && handleDownload(previewDocument)}
        showDownload={true}
      />
    </MainCard>
  );
};

export default ProviderDocuments;
