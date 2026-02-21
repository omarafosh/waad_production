/**
 * UnifiedPageHeader - Standardized Page Header for List Pages
 * 
 * Provides consistent header across all list pages with:
 * - Page title and subtitle
 * - Breadcrumbs
 * - PDF Download button
 * - Add new button
 * 
 * This is the ONLY place where PDF button should appear.
 * GenericDataTable remains UI-only.
 */

import PropTypes from 'prop-types';

// MUI Components
import { Box, Button, Stack } from '@mui/material';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';

// Project Components
import ModernPageHeader from 'components/tba/ModernPageHeader';
import PdfDownloadButton from 'components/PdfDownloadButton';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UnifiedPageHeader = ({
  // Page info
  title,
  subtitle,
  icon,
  breadcrumbs = [],
  
  // PDF Download
  pdfModule,
  pdfFilters = {},
  pdfSorting = [],
  pdfDisabled = false,
  
  // Add button
  showAddButton = true,
  addButtonLabel = 'إضافة جديد',
  onAddClick,
  addButtonDisabled = false,
  
  // Additional actions
  additionalActions = null
}) => {
  return (
    <ModernPageHeader
      title={title}
      subtitle={subtitle}
      icon={icon}
      breadcrumbs={breadcrumbs}
      actions={
        <Stack direction="row" spacing={2}>
          {/* PDF Download Button */}
          {pdfModule && (
            <PdfDownloadButton
              module={pdfModule}
              filters={pdfFilters}
              sorting={pdfSorting}
              disabled={pdfDisabled}
            />
          )}
          
          {/* Additional Custom Actions */}
          {additionalActions}
          
          {/* Add New Button */}
          {showAddButton && onAddClick && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={onAddClick}
              disabled={addButtonDisabled}
            >
              {addButtonLabel}
            </Button>
          )}
        </Stack>
      }
    />
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================

UnifiedPageHeader.propTypes = {
  // Page info
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.elementType.isRequired,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string
    })
  ),
  
  // PDF Download
  pdfModule: PropTypes.string,
  pdfFilters: PropTypes.object,
  pdfSorting: PropTypes.array,
  pdfDisabled: PropTypes.bool,
  
  // Add button
  showAddButton: PropTypes.bool,
  addButtonLabel: PropTypes.string,
  onAddClick: PropTypes.func,
  addButtonDisabled: PropTypes.bool,
  
  // Additional actions
  additionalActions: PropTypes.node
};

export default UnifiedPageHeader;
