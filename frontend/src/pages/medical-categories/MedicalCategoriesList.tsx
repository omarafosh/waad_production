/**
 * Medical Categories List Page
 *
 * Pattern: UnifiedPageHeader → External Filters → MainCard → GenericDataTable
 *
 * Features:
 * - External parent category filter
 * - No column filters (clean table)
 * - Professional Excel export with ALL data
 * - Multi-column sorting
 * - Sticky headers
 * - Pagination
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Chip, IconButton, Stack, Tooltip, Typography, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SubdirectoryArrowLeftIcon from '@mui/icons-material/SubdirectoryArrowLeft';
import LockIcon from '@mui/icons-material/Lock';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';
import useTableState from 'hooks/useTableState';
import { useTableRefresh } from 'contexts/TableRefreshContext';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';
import { exportMedicalCategoriesToExcel } from 'utils/excelExport';
import { openSnackbar } from 'api/snackbar';

// Standardized Hooks
import {
  useMedicalCategoriesList,
  useAllMedicalCategories,
  useDeleteMedicalCategory
} from 'hooks/useMedicalCategories';

const QUERY_KEY = 'medical-categories';

const MedicalCategoriesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshSignal } = useTableRefresh();

  // ========================================
  // LOCAL STATE
  // ========================================

  // Parent category filter
  const [parentFilter, setParentFilter] = useState('');

  // Excel export loading state
  const [isExporting, setIsExporting] = useState(false);

  // ========================================
  // TABLE STATE
  // ========================================

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'id', direction: 'desc' },
    initialFilters: {}
  });

  // ========================================
  // FETCH PARENT CATEGORIES (for filter dropdown)
  // ========================================

  const { data: allCategories = [] } = useAllMedicalCategories();

  // Get only parent categories (those without parentId or root level)
  const parentCategories = useMemo(() => {
    return allCategories.filter((cat) => !cat.parentId);
  }, [allCategories]);

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNavigateAdd = useCallback(() => navigate('/medical-categories/add'), [navigate]);
  const handleNavigateView = useCallback((id) => navigate(`/medical-categories/${id}`), [navigate]);
  const handleNavigateEdit = useCallback((id) => navigate(`/medical-categories/edit/${id}`), [navigate]);

  const { mutateAsync: deleteCategory } = useDeleteMedicalCategory();

  const handleDelete = useCallback(
    async (id, name) => {
      if (!window.confirm(`هل أنت متأكد من حذف التصنيف "${name}"؟`)) return;
      try {
        await deleteCategory(id);
        openSnackbar({ message: 'تم حذف التصنيف بنجاح', variant: 'success' });
      } catch (err) {
        console.error('[MedicalCategories] Delete failed:', err);
        const errorMsg = err?.response?.data?.message || 'فشل حذف التصنيف - قد يكون مرتبطاً بخدمات طبية';
        openSnackbar({ message: errorMsg, variant: 'error' });
      }
    },
    [deleteCategory]
  );

  // Prepare Query Params
  const queryParams = useMemo(() => {
    const params = { page: tableState.page, size: tableState.pageSize };

    // Add sorting
    if (tableState.sorting.length > 0) {
      const sort = tableState.sorting[0];
      params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
    }

    // Add parent filter
    if (parentFilter) {
      params.parentId = parentFilter;
    }
    return params;
  }, [tableState.page, tableState.pageSize, tableState.sorting, parentFilter]);

  const { data, isLoading, refetch } = useMedicalCategoriesList(queryParams);

  // Listen to global refresh signal (optional as mutation invalidates cache automatically)
  useEffect(() => {
    if (refreshSignal) refetch();
  }, [refreshSignal, refetch]);

  // Hierarchical Data Transformation
  const hierarchicalData = useMemo(() => {
    if (!data?.items) return [];

    // If filtering by parent, don't flatten/hierarchy as much or just show results
    if (parentFilter) return data.items;

    const items = [...data.items];
    const tree = [];
    const map = {};

    // First pass: map nodes
    items.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    // Second pass: build tree
    items.forEach(item => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      } else if (!item.parentId) {
        tree.push(map[item.id]);
      }
    });

    // Flatten tree with indentation hint
    const flatTree = [];
    const flatten = (nodes, depth = 0) => {
      nodes.forEach(node => {
        flatTree.push({ ...node, depth });
        if (node.children?.length > 0) {
          flatten(node.children, depth + 1);
        }
      });
    };

    flatten(tree);
    return flatTree.length > 0 ? flatTree : items;
  }, [data, parentFilter]);

  // ========================================
  // EXCEL EXPORT - Export ALL data
  // ========================================

  const { data: allDataForExport } = useAllMedicalCategories({ enabled: isExporting }); // Lazy fetch for export

  const handleExcelExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch ALL categories for export (not just visible page)
      // Note: In real app, we might trigger a specific export endpoint or await the lazy query
      const allCats = await getAllMedicalCategories();
      await exportMedicalCategoriesToExcel(allCats || []);
      openSnackbar({
        message: `تم تصدير ${allCats?.length || 0} تصنيف بنجاح`,
        variant: 'success'
      });
    } catch (error) {
      console.error('[MedicalCategories] Excel export failed:', error);
      openSnackbar({
        message: 'فشل تصدير البيانات. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

  // ========================================
  // COLUMN DEFINITIONS - No filters, just sorting
  // ========================================

  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'الرمز',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight="medium">
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'name',
        header: 'الاسم',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 250,
        align: 'right',
        cell: ({ row }) => {
          const isChild = !!row.original.parentId;
          return (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: isChild ? 4 : 0 }}>
              {isChild ? (
                <SubdirectoryArrowLeftIcon fontSize="small" color="disabled" sx={{ fontSize: '1rem' }} />
              ) : (
                <CategoryIcon fontSize="small" color="primary" sx={{ fontSize: '1.1rem' }} />
              )}
              <Typography variant="body2" fontWeight={!isChild ? 'bold' : 'normal'}>
                {row.original.name || '-'}
              </Typography>
            </Stack>
          );
        }
      },
      {
        accessorKey: 'parentName',
        header: 'التصنيف الأب',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 150,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" color="text.secondary">
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'active',
        header: 'الحالة',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'center',
        cell: ({ row }) => (
          <Chip
            label={row.original?.active ? 'نشط' : 'غير نشط'}
            color={row.original?.active ? 'success' : 'default'}
            size="small"
            variant="light"
          />
        )
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'center',
        cell: ({ row }) => {
          const isRoot = !row.original.parentId;

          if (isRoot) {
            return (
              <Stack direction="row" spacing={0.5} justifyContent="center">
                <Tooltip title="تصنيف نظام ثابت (لا يمكن تعديله)">
                  <IconButton size="small" disabled>
                    <LockIcon fontSize="small" color="disabled" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="عرض">
                  <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original?.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );
          }

          return (
            <Stack direction="row" spacing={0.5} justifyContent="center">
              <Tooltip title="عرض">
                <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original?.id)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="تعديل">
                <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <PermissionGuard requires="medical-categories.delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(row.original?.id, row.original?.name || row.original?.code)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </PermissionGuard>
              </Tooltip>
            </Stack>
          );
        }
      }
    ],
    [handleNavigateView, handleNavigateEdit, handleDelete]
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <Box>
      <PermissionGuard requires="medical-categories.view">
        <UnifiedPageHeader
          title="التصنيفات الطبية"
          subtitle="إدارة التصنيفات الطبية في النظام"
          icon={CategoryIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'التصنيفات الطبية' }]}
          showAddButton={true}
          addButtonLabel="إضافة تصنيف جديد"
          onAddClick={handleNavigateAdd}
          additionalActions={
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Excel Export Button */}
              <Tooltip title="تصدير جميع التصنيفات إلى Excel">
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={isExporting ? null : <FileDownloadIcon />}
                  onClick={handleExcelExport}
                  disabled={isExporting}
                >
                  {isExporting ? 'جاري التصدير...' : 'تصدير Excel'}
                </Button>
              </Tooltip>

              {/* Refresh Button */}
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isLoading}>
                تحديث
              </Button>
            </Stack>
          }
        />
      </PermissionGuard>

      {/* ====== FILTER BAR ====== */}
      <MainCard sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* Parent Category Filter */}
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel id="parent-filter-label">فلترة حسب التصنيف الأب</InputLabel>
            <Select
              labelId="parent-filter-label"
              id="parent-filter"
              value={parentFilter}
              label="فلترة حسب التصنيف الأب"
              onChange={(e) => {
                setParentFilter(e.target.value);
                tableState.setPage(0); // Reset to first page
              }}
            >
              <MenuItem value="">
                <em>الكل</em>
              </MenuItem>
              {parentCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name || cat.code}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Stats Chips */}
          <Stack direction="row" spacing={1}>
            <Chip label={`الإجمالي: ${data?.total || 0}`} size="small" variant="outlined" />
          </Stack>
        </Stack>
      </MainCard>

      {/* ====== MAIN TABLE ====== */}
      <MainCard>
        <TableErrorBoundary>
          <GenericDataTable
            columns={columns}
            data={hierarchicalData}
            totalCount={data?.total || 0}
            isLoading={isLoading}
            tableState={tableState}
            enableFiltering={false}
            enableSorting={true}
            enablePagination={true}
            stickyHeader={true}
            minHeight={400}
            maxHeight="calc(100vh - 400px)"
            onRowClick={(row) => handleNavigateView(row.id)}
            emptyMessage="لا توجد تصنيفات طبية"
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableErrorBoundary>
      </MainCard>
    </Box>
  );
};

export default MedicalCategoriesList;
