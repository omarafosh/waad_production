import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Chip,
  Typography,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Box
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/**
 * Get action color based on type
 */
const getActionColor = (action) => {
  const colors = {
    CREATE: 'success',
    UPDATE: 'info',
    APPROVE: 'success',
    REJECT: 'error',
    CANCEL: 'warning',
    DELETE: 'error',
    STATUS_CHANGE: 'info'
  };
  return colors[action] || 'default';
};

/**
 * Get action label in Arabic
 */
const getActionLabel = (action) => {
  const labels = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    APPROVE: 'موافقة',
    REJECT: 'رفض',
    CANCEL: 'إلغاء',
    DELETE: 'حذف',
    STATUS_CHANGE: 'تغيير الحالة'
  };
  return labels[action] || action;
};

/**
 * Format date to Arabic
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(getAppLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

import PropTypes from 'prop-types';
import { getAppLocale } from 'utils/locale-helper';
import JSONView from './JSONView';

/**
 * Audit Detail Modal Component
 */
const AuditDetailModal = ({ open, onClose, audit, type = 'PREAUTH' }) => {
  const navigate = useNavigate();

  if (!audit) return null;

  const isEntityHistory = type === 'ENTITY_HISTORY';

  const handleNavigateToEntity = () => {
    if (audit.preAuthorizationId) {
      navigate(`/pre-approvals/${audit.preAuthorizationId}`);
    } else if (isEntityHistory && audit.entityType && audit.entityId) {
      // Generic navigation attempt based on type
      const pathMap = {
        'MEMBER': '/members',
        'CLAIM': '/claims',
        'POLICY': '/benefit-policies'
      };
      const base = pathMap[audit.entityType] || '';
      if (base) navigate(`${base}/${audit.entityId}`);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={600}>
            {isEntityHistory ? '📜 سجل تغيير الكيان' : '📋 تفاصيل سجل التدقيق'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* Header Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {isEntityHistory ? 'العملية والمستهدف' : 'الإجراء ورقم المرجع'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={getActionLabel(audit.action)}
                color={getActionColor(audit.action)}
                size="medium"
              />
              <Chip
                label={isEntityHistory ? `${audit.entityType} #${audit.entityId}` : (audit.referenceNumber || `#${audit.preAuthorizationId}`)}
                variant="outlined"
                size="medium"
              />
              {isEntityHistory && audit.correlationId && (
                <Chip label={`تتبع: ${audit.correlationId.substring(0, 8)}...`} variant="outlined" color="secondary" />
              )}
            </Stack>
          </Box>

          <Divider />

          {/* User & Date */}
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ width: '40%', fontWeight: 600 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <span>المستخدم</span>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {isEntityHistory ? audit.performedBy : audit.changedBy}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <span>التاريخ والوقت</span>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(isEntityHistory ? audit.createdAt : audit.changeDate)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Snapshot Views */}
          {isEntityHistory && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                📦 لقطات البيانات (Data Snapshots)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <JSONView data={audit.oldValue} title="الحالة السابقة (Before)" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <JSONView data={audit.newValue} title="الحالة الجديدة (After)" />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Legacy Field Changes */}
          {!isEntityHistory && audit.fieldName && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>📝 التغييرات</Typography>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>الحقل: {audit.fieldName}</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip label={audit.oldValue || 'لا يوجد'} variant="outlined" sx={{ flex: 1 }} />
                <CompareArrows color="primary" />
                <Chip label={audit.newValue || 'لا يوجد'} color="primary" sx={{ flex: 1 }} />
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">إغلاق</Button>
        <Button
          variant="contained"
          startIcon={<OpenIcon />}
          onClick={handleNavigateToEntity}
          disabled={isEntityHistory && !audit.entityType}
        >
          عرض الكيان
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditDetailModal;
