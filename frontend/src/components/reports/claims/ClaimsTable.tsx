import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Skeleton,
  TablePagination,
  TableSortLabel
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

import ClaimStatusChip from './ClaimStatusChip';

/**
 * Format currency in LYD
 */
const formatCurrency = (amount) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' د.ل';
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

/**
 * Safe string renderer with fallback
 */
const safeString = (value) => {
  if (value == null || value === '') return '—';
  return String(value);
};

/**
 * Table columns configuration
 * All columns are null-safe with fallback rendering
 */
const COLUMNS = [
  { id: 'id', label: 'رقم المطالبة', minWidth: 100, align: 'center', format: safeString, sortable: true },
  { id: 'memberName', label: 'اسم العضو', minWidth: 150, format: safeString, sortable: true },
  { id: 'employerName', label: 'الشريك', minWidth: 150, format: safeString, sortable: true },
  { id: 'providerName', label: 'مقدم الخدمة', minWidth: 150, format: safeString, sortable: true },
  { id: 'status', label: 'الحالة', minWidth: 120, align: 'center', sortable: true }, // Handled by ClaimStatusChip
  { id: 'requestedAmount', label: 'المبلغ المطلوب', minWidth: 120, align: 'right', format: formatCurrency, sortable: true },
  { id: 'approvedAmount', label: 'المبلغ المعتمد', minWidth: 120, align: 'right', format: formatCurrency, sortable: true },
  { id: 'visitDate', label: 'تاريخ الزيارة', minWidth: 110, align: 'center', format: formatDate, sortable: true },
  { id: 'updatedAt', label: 'آخر تحديث', minWidth: 110, align: 'center', format: formatDate, sortable: true }
];

/**
 * Loading skeleton rows
 */
const SkeletonRows = ({ count = 5 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <TableRow key={index}>
        {COLUMNS.map((column) => (
          <TableCell key={column.id} align={column.align}>
            <Skeleton variant="text" width={column.minWidth - 20} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

/**
 * Empty state component
 */
const EmptyState = () => (
  <TableRow>
    <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 8 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          لا توجد مطالبات
        </Typography>
        <Typography variant="body2" color="text.disabled">
          لم يتم العثور على مطالبات مطابقة للفلاتر المحددة
        </Typography>
      </Box>
    </TableCell>
  </TableRow>
);

/**
 * ClaimsTable Component
 *
 * MUI Table for displaying claims with sticky header
 *
 * @param {Array} claims - Claims data
 * @param {boolean} loading - Loading state
 * @param {number} totalCount - Total filtered count
 * @param {number} page - Current page
 * @param {number} rowsPerPage - Rows per page
 * @param {Function} onPageChange - Page change handler
 * @param {Function} onRowsPerPageChange - Rows per page change handler
 */
const ClaimsTable = ({ claims, loading, totalCount, page, rowsPerPage, onPageChange, onRowsPerPageChange }) => {
  // Sorting state
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('desc');

  /**
   * Handle sort request
   */
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  /**
   * Compare function for sorting
   */
  const getComparator = (orderKey, orderDirection) => {
    return orderDirection === 'desc'
      ? (a, b) => descendingComparator(a, b, orderKey)
      : (a, b) => -descendingComparator(a, b, orderKey);
  };

  const descendingComparator = (a, b, orderKey) => {
    const aVal = a[orderKey];
    const bVal = b[orderKey];
    
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return bVal - aVal;
    }
    
    return String(bVal).localeCompare(String(aVal), 'ar');
  };

  /**
   * Sorted claims
   */
  const sortedClaims = useMemo(() => {
    return [...claims].sort(getComparator(orderBy, order));
  }, [claims, orderBy, order]);

  /**
   * Render cell value based on column type
   */
  const renderCellValue = (claim, column) => {
    const value = claim[column.id];

    // Status column - render chip
    if (column.id === 'status') {
      return <ClaimStatusChip status={value} />;
    }

    // Apply format function if exists
    if (column.format) {
      return column.format(value);
    }

    return value ?? '—';
  };

  // Paginated claims (after sorting)
  const paginatedClaims = sortedClaims.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="claims table" size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sx={{
                    minWidth: column.minWidth,
                    fontWeight: 600,
                    backgroundColor: 'background.paper',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonRows count={rowsPerPage} />
            ) : paginatedClaims.length === 0 ? (
              <EmptyState />
            ) : (
              paginatedClaims.map((claim) => (
                <TableRow
                  hover
                  key={claim.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  {COLUMNS.map((column) => (
                    <TableCell key={column.id} align={column.align}>
                      {renderCellValue(claim, column)}
                    </TableCell>
                  ))}
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
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="صفوف لكل صفحة:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`}
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontWeight: 500
          }
        }}
      />
    </Paper>
  );
};

ClaimsTable.propTypes = {
  claims: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  totalCount: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowsPerPageChange: PropTypes.func.isRequired
};

export default ClaimsTable;
