import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Drawer,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Description as DocumentIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  AttachFile as AttachFileIcon,
  Receipt as ClaimIcon,
  MedicalServices as PreApprovalIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { orderBy } from 'lodash-es';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS, hasPermission } from 'constants/permissions.constants';
import { claimsService, preApprovalsService } from 'services/api';
import { useAuth } from 'contexts/AuthContext';

/**
 * Documents Library - مكتبة الوثائق
 * 
 * واجهة موحدة لعرض وإدارة جميع المستندات المرفقة مع:
 * - Claims (المطالبات)
 * - Pre-Approvals (الموافقات المسبقة)
 */
const DocumentsLibrary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Documents
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Document drawer
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Table State
  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'uploadedAt', direction: 'desc' }
  });

  // Client-side Sort and Pagination Logic
  const processedData = useMemo(() => {
    let data = [...filteredDocuments];

    // Sorting
    if (tableState.sorting.length > 0) {
      const { id, desc } = tableState.sorting[0];
      data = orderBy(data, [item => {
        const val = item[id];
        return typeof val === 'string' ? val.toLowerCase() : val;
      }], [desc ? 'desc' : 'asc']);
    }

    return data;
  }, [filteredDocuments, tableState.sorting]);

  const paginatedData = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    return processedData.slice(start, start + tableState.pageSize);
  }, [processedData, tableState.page, tableState.pageSize]);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    claims: 0,
    preApprovals: 0,
    fromProvider: 0,
    pdfs: 0,
    images: 0,
    documents: 0
  });

  // Fetch all documents
  useEffect(() => {
    fetchAllDocuments();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, entityTypeFilter, fileTypeFilter, statusFilter]);

  // RBAC checks
  const canViewClaims = () => {
    if (!user) return false;
    if (user.roles?.includes('SUPER_ADMIN')) return true;
    return hasPermission(user, PERMISSIONS.VIEW_CLAIMS);
  };

  const canViewPreApprovals = () => {
    if (!user) return false;
    if (user.roles?.includes('SUPER_ADMIN')) return true;
    return hasPermission(user, PERMISSIONS.VIEW_PRE_APPROVALS);
  };

  const canDeleteDocument = (doc) => {
    if (!user) return false;
    if (user.roles?.includes('SUPER_ADMIN')) return true;

    if (doc.entityType === 'CLAIM') {
      return hasPermission(user, PERMISSIONS.MANAGE_CLAIMS);
    } else {
      return hasPermission(user, PERMISSIONS.MANAGE_PRE_APPROVALS);
    }
  };

  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const allDocs = [];

      // Fetch claims documents
      if (canViewClaims()) {
        try {
          const claimsResponse = await claimsService.getAll({ page: 1, size: 500 });
          const claims = claimsResponse.items || claimsResponse.data?.items || [];

          // parallelize attachment fetching
          const claimDocsPromises = claims.map(async (claim) => {
            try {
              const attachments = await claimsService.getAttachments(claim.id);
              const attachmentsArray = attachments.data || attachments || [];

              return attachmentsArray.map(att => ({
                id: `CLAIM-${claim.id}-${att.id}`,
                originalId: att.id,
                fileName: att.fileName || att.originalFileName || `Document ${att.id}`,
                fileType: att.fileType || att.mimeType || 'Unknown',
                fileSize: att.fileSize || 0,
                uploadedAt: att.uploadedAt || att.createdAt || new Date().toISOString(),
                entityType: 'CLAIM',
                entityId: claim.id,
                entityReference: claim.claimNumber || `CLM-${claim.id}`,
                memberName: claim.memberFullNameArabic || claim.memberName,
                providerName: claim.providerName,
                status: claim.status,
                amount: claim.requestedAmount || claim.approvedAmount
              }));
            } catch (err) {
              console.error(`❌ Error fetching attachments for claim ${claim.id}:`, err);
              return [];
            }
          });

          const claimsDocs = (await Promise.all(claimDocsPromises)).flat();
          allDocs.push(...claimsDocs);
        } catch (err) {
          console.error('❌ Error fetching claims documents:', err);
        }
      }

      // Fetch pre-approvals documents
      if (canViewPreApprovals()) {
        try {
          const preApprovalsResponse = await preApprovalsService.getAll({ page: 1, size: 500 });
          const preApprovals = preApprovalsResponse.items || preApprovalsResponse.data?.items || [];

          // parallelize attachment fetching
          const paDocsPromises = preApprovals.map(async (pa) => {
            try {
              const attachments = await preApprovalsService.getAttachments(pa.id);
              const attachmentsArray = attachments.data || attachments || [];

              return attachmentsArray.map(att => ({
                id: `PREAPPROVAL-${pa.id}-${att.id}`,
                originalId: att.id,
                fileName: att.fileName || att.originalFileName || `Document ${att.id}`,
                fileType: att.fileType || att.mimeType || 'Unknown',
                fileSize: att.fileSize || 0,
                uploadedAt: att.uploadedAt || att.createdAt || new Date().toISOString(),
                entityType: 'PRE_APPROVAL',
                entityId: pa.id,
                entityReference: `PA-${pa.id}`,
                memberName: pa.memberFullNameArabic || pa.memberName,
                providerName: pa.providerName,
                status: pa.status,
                amount: pa.requestedAmount || pa.approvedAmount
              }));
            } catch (err) {
              console.error(`❌ Error fetching attachments for pre-approval ${pa.id}:`, err);
              return [];
            }
          });

          const paDocs = (await Promise.all(paDocsPromises)).flat();
          allDocs.push(...paDocs);
        } catch (err) {
          console.error('❌ Error fetching pre-approvals documents:', err);
        }
      }

      setDocuments(allDocs);
      calculateStats(allDocs);

    } catch (err) {
      console.error('❌ Error fetching documents:', err);
      setError('فشل في تحميل المستندات');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (docs) => {
    const providerDocs = docs.filter(d =>
      d.status === 'SUBMITTED' ||
      d.status === 'REQUESTED' ||
      d.status === 'UNDER_REVIEW'
    );

    const stats = {
      total: docs.length,
      claims: docs.filter(d => d.entityType === 'CLAIM').length,
      preApprovals: docs.filter(d => d.entityType === 'PRE_APPROVAL').length,
      fromProvider: providerDocs.length,
      pdfs: docs.filter(d => d.fileType?.toLowerCase().includes('pdf')).length,
      images: docs.filter(d => d.fileType?.toLowerCase().includes('image') ||
        d.fileType?.toLowerCase().includes('jpeg') ||
        d.fileType?.toLowerCase().includes('jpg') ||
        d.fileType?.toLowerCase().includes('png')).length,
      documents: docs.filter(d => !d.fileType?.toLowerCase().includes('pdf') &&
        !d.fileType?.toLowerCase().includes('image')).length
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...documents];

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.entityReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.memberName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (entityTypeFilter !== 'ALL') {
      filtered = filtered.filter(doc => doc.entityType === entityTypeFilter);
    }

    if (fileTypeFilter !== 'ALL') {
      if (fileTypeFilter === 'PDF') {
        filtered = filtered.filter(doc => doc.fileType?.toLowerCase().includes('pdf'));
      } else if (fileTypeFilter === 'IMAGE') {
        filtered = filtered.filter(doc =>
          doc.fileType?.toLowerCase().includes('image') ||
          doc.fileType?.toLowerCase().includes('jpeg') ||
          doc.fileType?.toLowerCase().includes('jpg') ||
          doc.fileType?.toLowerCase().includes('png')
        );
      } else if (fileTypeFilter === 'DOCUMENT') {
        filtered = filtered.filter(doc =>
          !doc.fileType?.toLowerCase().includes('pdf') &&
          !doc.fileType?.toLowerCase().includes('image')
        );
      }
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    setFilteredDocuments(filtered);
  };

  const handleOpenDrawer = (doc) => {
    setSelectedDocument(doc);
    setDrawerOpen(true);
  };

  const handleDownload = async (doc) => {
    try {
      setError(null);

      let blob;
      if (doc.entityType === 'CLAIM') {
        blob = await claimsService.downloadAttachment(doc.entityId, doc.originalId);
      } else {
        blob = await preApprovalsService.downloadAttachment(doc.entityId, doc.originalId);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `document-${doc.originalId}`;
      a.click();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`تم تحميل ${doc.fileName} بنجاح`);
    } catch (err) {
      console.error('Download error:', err);
      let errorMessage = 'فشل في تحميل المستند';
      if (err.response?.status === 403) errorMessage = '⚠️ ليس لديك صلاحية تحميل هذا المستند';
      else if (err.response?.status === 404) errorMessage = '❌ المستند غير موجود';
      setError(errorMessage);
    }
  };

  const handleOpenDeleteDialog = (doc) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      setDeleteLoading(true);
      setError(null);
      // Mock delete
      setDocuments(prev => prev.filter(d => d.id !== documentToDelete.id));
      setSuccessMessage(`تم حذف ${documentToDelete.fileName} بنجاح`);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      let errorMessage = 'فشل في حذف المستند';
      if (err.response?.status === 403) errorMessage = '⚠️ ليس لديك صلاحية حذف هذا المستند';
      else if (err.response?.status === 404) errorMessage = '❌ المستند غير موجود';
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <DocumentIcon />;
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <PdfIcon />;
    if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')) return <ImageIcon />;
    return <ArticleIcon />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // TanStack Table columns
  const columns = useMemo(() => [
    {
      accessorKey: 'fileName',
      header: 'اسم المستند',
      size: 250,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          {getFileIcon(row.original.fileType)}
          <Typography variant="body2">{row.original.fileName}</Typography>
        </Stack>
      )
    },
    {
      accessorKey: 'entityType',
      header: 'مرتبط بـ',
      size: 140,
      cell: ({ row }) => (
        <Chip
          icon={row.original.entityType === 'CLAIM' ? <ClaimIcon /> : <PreApprovalIcon />}
          label={row.original.entityType === 'CLAIM' ? 'مطالبة' : 'موافقة مسبقة'}
          size="small"
          color={row.original.entityType === 'CLAIM' ? 'primary' : 'secondary'}
        />
      )
    },
    {
      accessorKey: 'entityReference',
      header: 'رقم الطلب',
      size: 130
    },
    {
      accessorKey: 'memberName',
      header: 'اسم المنتفع',
      size: 160
    },
    {
      accessorKey: 'providerName',
      header: 'مقدم الخدمة',
      size: 150,
      cell: ({ row }) => (
        <Typography variant="body2" noWrap>
          {row.original.providerName || '-'}
        </Typography>
      )
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      size: 130,
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status) return null;

        const statusColors = {
          'DRAFT': 'default',
          'SUBMITTED': 'info',
          'UNDER_REVIEW': 'warning',
          'APPROVED': 'success',
          'REJECTED': 'error',
          'SETTLED': 'success',
          'REQUESTED': 'info'
        };

        const statusLabels = {
          'DRAFT': 'مسودة',
          'SUBMITTED': 'مقدمة',
          'UNDER_REVIEW': 'قيد المراجعة',
          'APPROVED': 'موافق عليها',
          'REJECTED': 'مرفوضة',
          'SETTLED': 'مسددة',
          'REQUESTED': 'مطلوبة'
        };

        return (
          <Chip
            label={statusLabels[status] || status}
            size="small"
            color={statusColors[status] || 'default'}
            sx={{ minWidth: 90 }}
          />
        );
      }
    },
    {
      accessorKey: 'fileSize',
      header: 'الحجم',
      size: 100,
      cell: ({ row }) => (
        <Typography variant="body2">{formatFileSize(row.original.fileSize)}</Typography>
      )
    },
    {
      accessorKey: 'uploadedAt',
      header: 'تاريخ الرفع',
      size: 150,
      cell: ({ row }) => {
        const val = row.original.uploadedAt;
        if (!val) return '-';
        return new Date(val).toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      size: 160,
      enableSorting: false,
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="عرض التفاصيل">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenDrawer(row.original)}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="تحميل">
            <IconButton
              size="small"
              color="info"
              onClick={() => handleDownload(row.original)}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canDeleteDocument(row.original) && (
            <Tooltip title="حذف">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleOpenDeleteDialog(row.original)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )
    }
  ], []);

  return (
    <RBACGuard
      permissions={[PERMISSIONS.VIEW_CLAIMS, PERMISSIONS.VIEW_PRE_APPROVALS]}
      requireAll={false}
    >
      <Box>
        <ModernPageHeader
          title="مكتبة الوثائق"
          subtitle="عرض وإدارة جميع المستندات المرفقة"
          icon={DocumentIcon}
        />

        <MainCard>
          <Box sx={{ width: '100%' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
                {successMessage}
              </Alert>
            )}

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: 'primary.lighter' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">إجمالي المستندات</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: 'secondary.lighter' }}>
                  <CardContent>
                    <Typography variant="h4" color="secondary">{stats.claims}</Typography>
                    <Typography variant="body2" color="text.secondary">مطالبات</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: 'info.lighter' }}>
                  <CardContent>
                    <Typography variant="h4" color="info.main">{stats.preApprovals}</Typography>
                    <Typography variant="body2" color="text.secondary">موافقات مسبقة</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: 'warning.lighter' }}>
                  <CardContent>
                    <Typography variant="h4" color="warning.main">{stats.fromProvider}</Typography>
                    <Typography variant="body2" color="text.secondary">من مقدمي الخدمة</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: 'error.lighter' }}>
                  <CardContent>
                    <Typography variant="h4" color="error.main">{stats.pdfs}</Typography>
                    <Typography variant="body2" color="text.secondary">PDF</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: 'success.lighter' }}>
                  <CardContent>
                    <Typography variant="h4" color="success.main">{stats.images}</Typography>
                    <Typography variant="body2" color="text.secondary">صور</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
              <TextField
                placeholder="بحث بالاسم أو الرقم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 250, flex: 1 }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>نوع الطلب</InputLabel>
                <Select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  label="نوع الطلب"
                >
                  <MenuItem value="ALL">الكل</MenuItem>
                  <MenuItem value="CLAIM">مطالبات</MenuItem>
                  <MenuItem value="PRE_APPROVAL">موافقات مسبقة</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="ALL">الكل</MenuItem>
                  <MenuItem value="DRAFT">مسودة</MenuItem>
                  <MenuItem value="SUBMITTED">مقدمة</MenuItem>
                  <MenuItem value="REQUESTED">مطلوبة</MenuItem>
                  <MenuItem value="UNDER_REVIEW">قيد المراجعة</MenuItem>
                  <MenuItem value="APPROVED">موافق عليها</MenuItem>
                  <MenuItem value="REJECTED">مرفوضة</MenuItem>
                  <MenuItem value="SETTLED">مسددة</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>نوع الملف</InputLabel>
                <Select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  label="نوع الملف"
                >
                  <MenuItem value="ALL">الكل</MenuItem>
                  <MenuItem value="PDF">PDF</MenuItem>
                  <MenuItem value="IMAGE">صور</MenuItem>
                  <MenuItem value="DOCUMENT">مستندات</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* GenericDataTable */}
            <Box sx={{ width: '100%', mt: 2 }}>
              <GenericDataTable
                data={paginatedData}
                columns={columns}
                totalCount={processedData.length}
                tableState={tableState}
                isLoading={loading}
                enableFiltering={false}
                emptyMessage={documents.length === 0 ? 'لم يتم رفع أي مستندات بعد' : 'لا توجد نتائج تطابق الفلاتر المحددة'}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          </Box>
        </MainCard>

        {/* Document Details Drawer */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 }, p: 3 }
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" fontWeight={600}>📄 تفاصيل المستند</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
            </Stack>
            <Divider sx={{ mt: 2 }} />
          </Box>

          {selectedDocument && (
            <Box>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>اسم الملف</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getFileIcon(selectedDocument.fileType)}
                    <Typography variant="h6">{selectedDocument.fileName}</Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>مرتبط بـ</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      icon={selectedDocument.entityType === 'CLAIM' ? <ClaimIcon /> : <PreApprovalIcon />}
                      label={selectedDocument.entityType === 'CLAIM' ? 'مطالبة' : 'موافقة مسبقة'}
                      color={selectedDocument.entityType === 'CLAIM' ? 'primary' : 'secondary'}
                    />
                    <Chip label={selectedDocument.entityReference} variant="outlined" />
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>اسم المنتفع</Typography>
                  <Typography variant="body1">{selectedDocument.memberName}</Typography>
                </Box>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>نوع الملف</strong></TableCell>
                      <TableCell>{selectedDocument.fileType}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>الحجم</strong></TableCell>
                      <TableCell>{formatFileSize(selectedDocument.fileSize)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>تاريخ الرفع</strong></TableCell>
                      <TableCell>
                        {new Date(selectedDocument.uploadedAt).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                    {selectedDocument.amount && (
                      <TableRow>
                        <TableCell><strong>المبلغ</strong></TableCell>
                        <TableCell>{selectedDocument.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} د.ل</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(selectedDocument)}
                    fullWidth
                  >
                    تحميل المستند
                  </Button>
                  {canDeleteDocument(selectedDocument) && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        setDrawerOpen(false);
                        handleOpenDeleteDialog(selectedDocument);
                      }}
                      fullWidth
                    >
                      حذف
                    </Button>
                  )}
                </Stack>
                <Button
                  variant="text"
                  onClick={() => {
                    const path = selectedDocument.entityType === 'CLAIM'
                      ? `/claims/${selectedDocument.entityId}`
                      : `/pre-approvals/${selectedDocument.entityId}`;
                    navigate(path);
                  }}
                >
                  عرض {selectedDocument.entityType === 'CLAIM' ? 'المطالبة' : 'الموافقة المسبقة'} الأصلية
                </Button>
              </Stack>
            </Box>
          )}
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>❌ تأكيد حذف المستند</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Alert severity="warning">هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.</Alert>
              {documentToDelete && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>اسم الملف:</strong> {documentToDelete.fileName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>مرتبط بـ:</strong> {documentToDelete.entityReference}
                  </Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>إلغاء</Button>
            <Button
              onClick={handleDelete}
              variant="contained"
              color="error"
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              {deleteLoading ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </RBACGuard>
  );
};

export default DocumentsLibrary;
