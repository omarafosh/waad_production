/**
 * GenericDataTable - Reusable Table Component with TanStack React Table
 * 
 * A fully-featured, customizable data table component built with @tanstack/react-table
 * and Material-UI. Supports:
 * - Column-based filtering (text, number, select)
 * - Multi-column sorting
 * - Pagination
 * - Sticky headers
 * - Responsive design
 * - Row actions
 * - Custom cell renderers
 * 
 * @example
 * <GenericDataTable
 *   columns={columns}
 *   data={data}
 *   totalCount={100}
 *   isLoading={false}
 *   tableState={tableState}
 *   onRowClick={(row) =>}
 * />
 */

import { useMemo, useState, useCallback, useRef, Fragment, memo } from 'react';
import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';

// TanStack React Table
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';

// MUI Components
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import TextField from '@mui/material/TextField';

// MUI Icons
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';   // New Import
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'; // New Import
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Column Filter Component
 */
const ColumnFilter = ({ column, value, onChange }) => {
  const filterType = column.meta?.filterType || 'text';

  if (filterType === 'none' || column.enableColumnFilter === false) {
    return null;
  }

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <TextField
      size="small"
      fullWidth
      placeholder={`بحث ${column.header}...`}
      value={value || ''}
      onChange={handleChange}
      type={filterType === 'number' ? 'number' : 'text'}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'background.paper'
        }
      }}
    />
  );
};

ColumnFilter.propTypes = {
  column: PropTypes.object.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired
};

// ============================================================================
// MAIN COMPONENT WRAPPED IN MEMO FOR PERFORMANCE
// ============================================================================

const GenericDataTable = memo(({
  columns = [],
  data = [],
  totalCount = 0,
  isLoading = false,
  tableState,
  enableFiltering = true,
  enableSorting = true,
  enablePagination = true,
  stickyHeader = true,
  minHeight = 400,
  maxHeight = 'calc(100vh - 300px)',
  onRowClick,
  emptyMessage = 'لا توجد بيانات',
  rowsPerPageOptions = [5, 10, 15, 25, 50, 100],

  // Custom Styles Props
  headerVariant = 'light', // 'light' | 'primary'
  cellPadding = 'normal',   // 'normal' | 'dense'
  fontSize // Optional custom font size (should be rem or theme variant)
}) => {
  // ========================================
  // TABLE CONFIGURATION
  // ========================================

  const tableColumns = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      enableSorting: col.enableSorting !== false && enableSorting,
      enableColumnFilter: col.enableColumnFilter !== false && enableFiltering
    }));
  }, [columns, enableSorting, enableFiltering]);

  // ========================================
  // REACT TABLE INSTANCE
  // ========================================

  const table = useReactTable({
    data,
    columns: tableColumns,
    pageCount: Math.ceil(totalCount / tableState.pageSize),
    state: {
      sorting: tableState.sorting || [],
      columnFilters: Object.entries(tableState.columnFilters || {}).map(([id, value]) => ({
        id,
        value
      })),
      pagination: {
        pageIndex: tableState.page,
        pageSize: tableState.pageSize
      }
    },
    onSortingChange: tableState.setSorting,
    getCoreRowModel: getCoreRowModel(),
    // Since we are doing Server-Side, we DO NOT need client-side sorters affecting the view directly
    // but TanStack table still needs the model to renders headers correctly.
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true
  });

  // ========================================
  // EVENT HANDLERS
  // ========================================

  const handlePageChange = (event, newPage) => {
    tableState.setPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    tableState.setPageSize(parseInt(event.target.value, 10));
  };

  const handleRowClickInternal = (row) => {
    if (onRowClick) {
      onRowClick(row.original);
    }
  };

  // ========================================
  // RENDER HELPERS
  // ========================================

  const renderTableHeader = () => (
    <TableHead
      sx={{
        position: stickyHeader ? 'sticky' : 'static',
        top: 0,
        zIndex: 10,
        backgroundColor: headerVariant === 'primary' ? 'primary.main' : 'background.paper',
        '& .MuiTableCell-head': {
          color: headerVariant === 'primary' ? 'common.white' : 'text.primary',
          backgroundColor: headerVariant === 'primary' ? 'primary.main' : 'primary.lighter',
          fontWeight: 'bold',
          py: headerVariant === 'primary' ? 1.5 : 2
        }
      }}
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <Fragment key={headerGroup.id}>
          {/* Header Row */}
          <TableRow>
            {headerGroup.headers.map((header) => (
              <TableCell
                key={header.id}
                align={header.column.columnDef.headerAlign || header.column.columnDef.align || 'center'}
                sx={{
                  fontWeight: 'bold',
                  minWidth: header.column.columnDef.minWidth || 100,
                  width: header.column.columnDef.width,
                  maxWidth: header.column.columnDef.maxWidth,
                  verticalAlign: 'middle', // User request: Center elements vertically
                  borderBottom: headerVariant === 'primary' ? 'none' : undefined,
                  fontSize: fontSize || 'inherit', // Match parent or custom rem
                  // SORT ICON COLOR OVERRIDE
                  '& .MuiTableSortLabel-icon': {
                    color: headerVariant === 'primary' ? 'common.white !important' : 'inherit',
                    opacity: headerVariant === 'primary' ? 0.7 : 1,
                    fontSize: '1.15rem' // Scalable unit
                  },
                  '& .MuiTableSortLabel-root:hover .MuiTableSortLabel-icon': {
                    opacity: 1
                  },
                  '& .Mui-active .MuiTableSortLabel-icon': {
                    color: headerVariant === 'primary' ? 'common.white !important' : 'inherit',
                    opacity: 1
                  }
                }}
              >
                {header.isPlaceholder ? null : (
                  <Box sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: header.column.columnDef.headerAlign === 'right' ? 'flex-end' :
                      (header.column.columnDef.headerAlign === 'left' ? 'flex-start' : 'center')
                  }}>
                    {header.column.getCanSort() ? (
                      <TableSortLabel
                        active={header.column.getIsSorted() !== false}
                        direction={header.column.getIsSorted() || 'asc'}
                        onClick={header.column.getToggleSortingHandler()}
                        IconComponent={header.column.getIsSorted() === 'desc' ? ArrowDownwardIcon : ArrowUpwardIcon}
                        hideSortIcon={false}
                        sx={{
                          color: 'inherit',
                          '&.Mui-active': {
                            color: 'inherit',
                            '& .MuiTableSortLabel-icon': {
                              color: headerVariant === 'primary' ? 'common.white !important' : 'primary.main',
                              opacity: 1
                            }
                          },
                          flexDirection: 'row',
                          '& .MuiTableSortLabel-icon': {
                            opacity: header.column.getIsSorted() ? 1 : 0, // Only show if sorted
                            transition: 'opacity 0.2s',
                            width: 16, // Reduced size (from 20)
                            height: 16 // Reduced size (from 20)
                          },
                          '&:hover .MuiTableSortLabel-icon': {
                            opacity: 0.5
                          }
                        }}
                      >
                        <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', fontSize: 'inherit' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </Typography>
                      </TableSortLabel>
                    ) : (
                      <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', fontSize: 'inherit' }} color="inherit">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Typography>
                    )}
                  </Box>
                )}
              </TableCell>
            ))}
          </TableRow>

          {/* Filter Row */}
          {enableFiltering && (
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              {headerGroup.headers.map((header) => (
                <TableCell key={`filter-${header.id}`} sx={{ py: 1, px: 2 }}>
                  {header.column.getCanFilter() ? (
                    <ColumnFilter
                      column={header.column.columnDef}
                      value={tableState.columnFilters[header.column.id] || ''}
                      onChange={(value) => tableState.setFilter(header.column.id, value)}
                    />
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          )}
        </Fragment>
      ))}
    </TableHead>
  );

  // ========================================
  // VIRTUALIZATION LOGIC (Manual Windowing)
  // ========================================
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const rowHeight = cellPadding === 'dense' ? 45 : 64; // Approximations

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);


  const virtualRows = useMemo(() => {
    // Only virtualize if data is large enough (> 50 rows)
    if (data.length <= 50) return { rows: table.getRowModel().rows, paddingTop: 0, paddingBottom: 0 };

    const viewportHeight = 500; // Estimated or dynamic
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5); // 5 rows buffer
    const endIndex = Math.min(data.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 5);

    const paddingTop = startIndex * rowHeight;
    const paddingBottom = (data.length - endIndex) * rowHeight;

    return {
      rows: table.getRowModel().rows.slice(startIndex, endIndex),
      paddingTop,
      paddingBottom
    };
  }, [data, table, scrollTop, rowHeight]);

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={tableColumns.length} align="center" sx={{ py: 10 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                جاري التحميل...
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    if (!data || data.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={tableColumns.length} align="center" sx={{ py: 10 }}>
              <Typography variant="h6" color="text.secondary">
                {emptyMessage}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    const { rows, paddingTop, paddingBottom } = virtualRows;

    return (
      <TableBody>
        {paddingTop > 0 && <TableRow style={{ height: `${paddingTop}px` }}><TableCell colSpan={tableColumns.length} sx={{ p: 0, border: 0 }} /></TableRow>}
        {rows.map((row) => (
          <TableRow
            key={row.id}
            hover
            onClick={() => handleRowClickInternal(row)}
            sx={{
              height: rowHeight,
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': {
                backgroundColor: onRowClick ? 'action.hover' : 'inherit'
              }
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                align={cell.column.columnDef.align || 'center'}
                sx={{
                  py: cellPadding === 'dense' ? 1 : 2,
                  verticalAlign: 'middle',
                  fontSize: fontSize || 'inherit'
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {paddingBottom > 0 && <TableRow style={{ height: `${paddingBottom}px` }}><TableCell colSpan={tableColumns.length} sx={{ p: 0, border: 0 }} /></TableRow>}
      </TableBody>
    );
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Active Filters Display */}
      {enableFiltering && tableState.hasActiveFilters && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            الفلاتر النشطة:
          </Typography>
          {Object.entries(tableState.columnFilters).map(([columnId, value]) => {
            const column = columns.find((col) => (col.accessorKey || col.id) === columnId);
            return (
              <Chip
                key={columnId}
                label={`${column?.header || columnId}: ${value}`}
                size="small"
                onDelete={() => tableState.setFilter(columnId, '')}
                color="primary"
                variant="outlined"
              />
            );
          })}
          <Chip
            label="مسح الكل"
            size="small"
            onClick={tableState.clearFilters}
            color="error"
            variant="outlined"
            icon={<ClearIcon />}
          />
        </Stack>
      )}

      {/* Table Container */}
      <TableContainer
        component={Paper}
        elevation={0}
        onScroll={handleScroll}
        ref={containerRef}
        sx={{
          flex: 1, // Auto expand to fill remaining space
          minHeight: 0, // Critical for flexbox scrolling
          overflow: 'auto',
          width: '100%',
          borderRadius: 0,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.300',
            borderRadius: 4
          }
        }}
      >
        <Table
          stickyHeader={stickyHeader}
          size={cellPadding === 'dense' ? 'small' : 'medium'}
          sx={{ minWidth: 650, width: '100%' }}
        >
          {renderTableHeader()}
          {renderTableBody()}
        </Table>
      </TableContainer>

      {/* Pagination */}
      {enablePagination && !isLoading && data.length > 0 && (
        <TablePagination
          component="div"
          count={totalCount}
          page={tableState.page}
          onPageChange={handlePageChange}
          rowsPerPage={tableState.pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => {
            const f = from.toLocaleString('en-US');
            const t = to.toLocaleString('en-US');
            const c = count !== -1 ? count.toLocaleString('en-US') : `أكثر من ${to.toLocaleString('en-US')}`;
            return `${f}–${t} من ${c}`;
          }}
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            overflow: 'visible', // Ensure dropdowns aren't clipped
            '.MuiTablePagination-toolbar': {
              minHeight: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end', // Keep controls to the end (left in LTR, right in RTL)
              gap: 2,
              flexWrap: 'wrap' // Allow wrapping on very small screens
            },
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              mb: 0,
              mt: 0,
              fontSize: '0.875rem' // Ensure consistent font size
            },
            '.MuiTablePagination-select': {
              paddingTop: 0.5,
              paddingBottom: 0.5,
              display: 'flex',
              alignItems: 'center'
            },
            '.MuiTablePagination-actions': {
              marginLeft: 2,
              display: 'flex',
              alignItems: 'center'
            }
          }}
        />
      )}
    </Box>
  );
});

GenericDataTable.displayName = 'GenericDataTable';

// ============================================================================
// PROP TYPES
// ============================================================================

GenericDataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      accessorKey: PropTypes.string,
      id: PropTypes.string,
      header: PropTypes.string.isRequired,
      cell: PropTypes.func,
      enableSorting: PropTypes.bool,
      enableColumnFilter: PropTypes.bool,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      minWidth: PropTypes.number,
      width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      maxWidth: PropTypes.number,
      meta: PropTypes.shape({
        filterType: PropTypes.oneOf(['text', 'number', 'none'])
      })
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  totalCount: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  tableState: PropTypes.shape({
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    sorting: PropTypes.array.isRequired,
    columnFilters: PropTypes.object.isRequired,
    setPage: PropTypes.func.isRequired,
    setPageSize: PropTypes.func.isRequired,
    setSorting: PropTypes.func.isRequired,
    setFilter: PropTypes.func.isRequired,
    clearFilters: PropTypes.func.isRequired,
    hasActiveFilters: PropTypes.bool.isRequired
  }).isRequired,
  enableFiltering: PropTypes.bool,
  enableSorting: PropTypes.bool,
  enablePagination: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  maxHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onRowClick: PropTypes.func,
  emptyMessage: PropTypes.string,
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  fontSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default GenericDataTable;
