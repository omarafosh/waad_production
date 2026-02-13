/**
 * PdfDownloadButton - Unified PDF Download Button
 * 
 * Single button for downloading PDF reports from backend.
 * Does NOT generate PDF in frontend - only triggers backend API.
 * 
 * Usage:
 * <PdfDownloadButton
 *   module="members"
 *   filters={tableState.columnFilters}
 *   sorting={tableState.sorting}
 * />
 */

import { useState } from 'react';
import PropTypes from 'prop-types';

// MUI Components
import { Button, CircularProgress, Tooltip } from '@mui/material';

// MUI Icons
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Utils
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// PDF DOWNLOAD UTILITY
// ============================================================================

/**
 * Download PDF report from backend
 * @param {string} module - Module name (members, providers, claims, etc.)
 * @param {object} filters - Column filters from tableState
 * @param {array} sorting - Sorting configuration from tableState
 * @returns {Promise<void>}
 */
const downloadPdfReport = async (module, filters = {}, sorting = []) => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    
    // Add sorting
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.append('sort', `${sort.id},${sort.desc ? 'desc' : 'asc'}`);
    }
    
    // Backend endpoint
    const endpoint = `/api/reports/${module}/pdf?${params.toString()}`;
    
    // Fetch PDF
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('فشل تحميل التقرير');
    }
    
    // Get filename from response headers
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `${module}_report.pdf`;
    
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('[PdfDownload] Error:', error);
    throw error;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PdfDownloadButton = ({ 
  module, 
  filters = {}, 
  sorting = [],
  label = 'طباعة PDF',
  variant = 'outlined',
  size = 'medium',
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    
    try {
      await downloadPdfReport(module, filters, sorting);
      
      openSnackbar({
        message: 'تم تحميل التقرير بنجاح',
        variant: 'success'
      });
    } catch (error) {
      openSnackbar({
        message: error.message || 'فشل تحميل التقرير',
        variant: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip title="تحميل تقرير PDF من الخادم">
      <span>
        <Button
          variant={variant}
          size={size}
          color="error"
          startIcon={isLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
          onClick={handleDownload}
          disabled={disabled || isLoading}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================

PdfDownloadButton.propTypes = {
  module: PropTypes.string.isRequired,
  filters: PropTypes.object,
  sorting: PropTypes.array,
  label: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'outlined', 'contained']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool
};

export default PdfDownloadButton;
