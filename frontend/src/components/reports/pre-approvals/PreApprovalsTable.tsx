import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Skeleton
} from '@mui/material';
import PreAuthStatusChip from './PreAuthStatusChip';
import { formatCurrency } from 'utils/formatters';

/**
 * PreApprovalsTable Component
 *
 * Displays pre-approvals in a paginated table
 * Migrated from @mui/x-data-grid to MUI Table
 */
const PreApprovalsTable = ({
  preApprovals,
  loading,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}) => {

  // Empty state
  if (!loading && preApprovals.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        لا توجد موافقات مسبقة متاحة حاليًا
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.lighter' }}>
              <TableCell><strong>رقم المرجع</strong></TableCell>
              <TableCell><strong>المستفيد</strong></TableCell>
              <TableCell><strong>الشريك</strong></TableCell>
              <TableCell><strong>مقدم الخدمة</strong></TableCell>
              <TableCell><strong>الخدمة الطبية</strong></TableCell>
              <TableCell align="center"><strong>الحالة</strong></TableCell>
              <TableCell align="right"><strong>المبلغ المطلوب</strong></TableCell>
              <TableCell align="right"><strong>المبلغ المعتمد</strong></TableCell>
              <TableCell><strong>تاريخ الطلب</strong></TableCell>
              <TableCell><strong>صالح حتى</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableCell key={i}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              preApprovals.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {row.referenceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.memberName || '—'}</TableCell>
                  <TableCell>{row.employerName || '—'}</TableCell>
                  <TableCell>{row.providerName || '—'}</TableCell>
                  <TableCell>{row.serviceName || '—'}</TableCell>
                  <TableCell align="center">
                    <PreAuthStatusChip status={row.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency(row.requestedAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {row.approvedAmount != null ? formatCurrency(row.approvedAmount) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.requestDate ? (
                      (() => {
                        try {
                          return new Date(row.requestDate).toLocaleDateString('ar-SA');
                        } catch {
                          return row.requestDate;
                        }
                      })()
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {row.validUntil ? (
                      (() => {
                        try {
                          return new Date(row.validUntil).toLocaleDateString('ar-SA');
                        } catch {
                          return row.validUntil;
                        }
                      })()
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(event, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => onRowsPerPageChange(parseInt(event.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="الصفوف لكل صفحة:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`}
      />
    </Box>
  );
};

PreApprovalsTable.propTypes = {
  preApprovals: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  totalCount: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowsPerPageChange: PropTypes.func.isRequired
};

PreApprovalsTable.defaultProps = {
  loading: false
};

export default PreApprovalsTable;
