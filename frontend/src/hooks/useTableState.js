/**
 * useTableState - Custom Hook for Generic Table State Management
 * 
 * Manages all table state including:
 * - Pagination (page, pageSize)
 * - Sorting (orderBy, orderDirection)
 * - Filtering (column filters)
 * - Row selection (optional)
 * 
 * Can be used with any table component for consistent state management.
 * 
 * @example
 * const tableState = useTableState({
 *   initialPageSize: 10,
 *   defaultSort: { field: 'createdAt', direction: 'desc' }
 * });
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * @typedef {Object} TableStateConfig
 * @property {number} [initialPageSize=10] - Default page size
 * @property {Object} [defaultSort] - Default sorting configuration
 * @property {string} defaultSort.field - Field to sort by
 * @property {'asc'|'desc'} defaultSort.direction - Sort direction
 * @property {Object} [initialFilters={}] - Initial column filters
 */

/**
 * @param {TableStateConfig} config
 * @returns {Object} Table state and control functions
 */
export const useTableState = (config = {}) => {
  const {
    initialPageSize = 10,
    defaultSort = null,
    initialFilters = {},
    storageKey = 'table_page_size', // Default generic key, but can be overridden
    allowedPageSizes = [5, 10, 15, 25, 50, 100] // Default MUI options
  } = config;

  const [searchParams, setSearchParams] = useSearchParams();

  // ========================================
  // PAGINATION STATE (Synced with URL)
  // ========================================

  const page = parseInt(searchParams.get('page') || '0', 10);
  const searchTerm = searchParams.get('search') || '';

  // Size Priority: URL -> localStorage -> Config
  const allowedPageSizesStr = JSON.stringify(allowedPageSizes);
  const pageSize = useMemo(() => {
    const sizes = JSON.parse(allowedPageSizesStr);
    const fromUrl = searchParams.get('size');
    if (fromUrl) {
      const parsed = parseInt(fromUrl, 10);
      if (sizes.includes(parsed)) return parsed;
    }

    // Only verify localStorage if storageKey is provided
    const fromStorage = localStorage.getItem(storageKey);
    if (fromStorage) {
      const parsed = parseInt(fromStorage, 10);
      if (sizes.includes(parsed)) return parsed;
    }

    return initialPageSize;
  }, [searchParams, initialPageSize, storageKey, allowedPageSizesStr]);

  const setPage = useCallback((newPage) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newPage > 0) {
        newParams.set('page', newPage.toString());
      } else {
        newParams.delete('page');
      }
      return newParams;
    });
  }, [setSearchParams]);

  const setSearchTerm = useCallback((newTerm) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newTerm) {
        newParams.set('search', newTerm);
      } else {
        newParams.delete('search');
      }
      newParams.delete('page'); // Reset to first page on search
      return newParams;
    });
  }, [setSearchParams]);

  const setPageSize = useCallback((newPageSize) => {
    localStorage.setItem(storageKey, newPageSize.toString());
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('size', newPageSize.toString());
      newParams.delete('page'); // Reset to first page
      return newParams;
    });
  }, [setSearchParams, storageKey]);

  // ========================================
  // SORTING STATE (Synced with URL)
  // ========================================

  const defaultSortField = defaultSort?.field;
  const defaultSortDirection = defaultSort?.direction;

  const sorting = useMemo(() => {
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      const [id, dir] = sortParam.split(',');
      return [{ id, desc: dir === 'desc' }];
    }
    if (defaultSortField) {
      return [{ id: defaultSortField, desc: defaultSortDirection === 'desc' }];
    }
    return [];
  }, [searchParams, defaultSortField, defaultSortDirection]);

  const setSorting = useCallback((updater) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);

      // Calculate new sorting value based on updater
      const currentSortParam = newParams.get('sort');
      let currentSort = [];
      if (currentSortParam) {
        const [id, dir] = currentSortParam.split(',');
        currentSort = [{ id, desc: dir === 'desc' }];
      } else if (defaultSort) {
        currentSort = [{ id: defaultSort.field, desc: defaultSort.direction === 'desc' }];
      }

      const nextSorting = typeof updater === 'function' ? updater(currentSort) : updater;

      if (nextSorting && nextSorting.length > 0) {
        const { id, desc } = nextSorting[0];
        newParams.set('sort', `${id},${desc ? 'desc' : 'asc'}`);
      } else {
        newParams.delete('sort');
      }
      return newParams;
    });
  }, [setSearchParams, defaultSort]);

  // ========================================
  // FILTERING STATE (Local State Only - Can be enhanced later)
  // ========================================

  const [columnFilters, setColumnFilters] = useState(initialFilters);

  const handleFilterChange = useCallback((columnId, value) => {
    setColumnFilters((prev) => {
      // ... logic same as before
      if (value === '' || value === null || value === undefined) {
        const newFilters = { ...prev };
        delete newFilters[columnId];
        return newFilters;
      }
      return { ...prev, [columnId]: value };
    });
    setPage(0);
  }, [setPage]);

  const handleClearFilters = useCallback(() => {
    setColumnFilters({});
    setPage(0);
  }, [setPage]);

  // ========================================
  // ROW SELECTION STATE (Optional)
  // ========================================

  const [rowSelection, setRowSelection] = useState({});

  const handleRowSelectionChange = useCallback((updater) => {
    setRowSelection(updater);
  }, []);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  // ========================================
  // RESET FUNCTION
  // ========================================

  const resetTableState = useCallback(() => {
    setColumnFilters(initialFilters);
    setRowSelection({});

    // Clear URL Params for state
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('page');
      newParams.delete('size');
      newParams.delete('sort');
      newParams.delete('search');
      return newParams;
    });
  }, [initialFilters, setSearchParams]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const hasActiveFilters = useMemo(() => {
    return Object.keys(columnFilters).length > 0;
  }, [columnFilters]);

  const selectedRowCount = useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key]).length;
  }, [rowSelection]);

  // ========================================
  // RETURN STATE AND CONTROLS
  // ========================================

  return {
    // Pagination
    page,
    pageSize,
    setPage: setPage,
    setPageSize: setPageSize,

    // Sorting
    sorting,
    setSorting: setSorting,

    // Search
    searchTerm,
    setSearchTerm,

    // Filtering
    columnFilters,
    setColumnFilters,
    setFilter: handleFilterChange,
    clearFilters: handleClearFilters,
    hasActiveFilters,

    // Row Selection
    rowSelection,
    setRowSelection: handleRowSelectionChange,
    clearSelection: handleClearSelection,
    selectedRowCount,

    // Reset
    resetState: resetTableState
  };
};

export default useTableState;
