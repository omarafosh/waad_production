/**
 * PDF Preview Modal - Advanced PDF Preview and Print Component
 * 
 * Features:
 * - Displays data in a properly formatted table
 * - RTL support
 * - Print functionality with professional styling
 * - Page numbering and headers
 * - Uses jsPDF + autoTable for PDF generation
 * 
 * Usage:
 * <PdfPreviewModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="تقرير الأعضاء"
 *   data={members}
 *   columns={columns}
 *   partnerName="اسم الشريك"
 * />
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider,
  Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';

// PDF Generation
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Arabic font for jsPDF (you'll need to add this)
// import './fonts/Amiri-Regular-normal'; // Make sure to include Arabic font

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date in Arabic
 */
const formatDateArabic = (date = new Date()) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };
  return new Intl.DateTimeFormat('ar-SA', options).format(date);
};

/**
 * Generate PDF from data
 */
const generatePDF = (title, data, columns, partnerName = null) => {
  // Create new PDF (A4, portrait)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Set Arabic font
  doc.setFont('Amiri-Regular', 'normal');
  doc.setR2L(true);

  // Add header
  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.width / 2, 15, { align: 'center' });

  // Add date
  doc.setFontSize(10);
  doc.text(`التاريخ: ${formatDateArabic()}`, doc.internal.pageSize.width - 15, 25, { align: 'right' });

  // Add partner name if provided
  if (partnerName) {
    doc.text(`الشريك: ${partnerName}`, doc.internal.pageSize.width - 15, 32, { align: 'right' });
  }

  // Prepare table headers
  const headers = columns
    .filter(col => col.accessorKey !== 'actions' && col.id !== 'actions')
    .map(col => col.header);

  // Prepare table body
  const body = data.map(row => {
    return columns
      .filter(col => col.accessorKey !== 'actions' && col.id !== 'actions')
      .map(col => {
        const value = row[col.accessorKey];
        
        // Handle special formatting
        if (col.accessorKey === 'memberType') {
          return value === 'PRINCIPAL' ? 'أصيل' : value === 'DEPENDENT' ? 'تابع' : value;
        }
        if (col.accessorKey === 'cardStatus') {
          return value === 'ACTIVE' ? 'فعال' : value === 'BLOCKED' ? 'محظور' : value === 'EXPIRED' ? 'منتهي' : value;
        }
        
        return value || '-';
      });
  });

  // Add table
  doc.autoTable({
    head: [headers],
    body: body,
    startY: partnerName ? 38 : 32,
    styles: {
      font: 'Amiri-Regular',
      fontStyle: 'normal',
      halign: 'right',
      cellPadding: 2,
      fontSize: 9,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 10, right: 10, bottom: 20, left: 10 },
    didDrawPage: function (data) {
      // Add page number at bottom
      const pageCount = doc.internal.getNumberOfPages();
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.text(
        `صفحة ${currentPage} من ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  });

  return doc;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PdfPreviewModal = ({ 
  open, 
  onClose, 
  title, 
  data = [], 
  columns = [],
  partnerName = null
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  /**
   * Handle print action - Uses Browser Native Print
   */
  const handlePrint = async () => {
    try {
      setIsPrinting(true);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
      }

      const headers = columns
        .filter(col => col.accessorKey !== 'actions' && col.id !== 'actions' && col.id !== 'select')
        .map(col => typeof col.header === 'string' ? col.header : col.header?.name || col.id);

      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: right; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            h1 { text-align: center; margin-bottom: 5px; }
            .meta { text-align: right; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; }
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { padding: 0; }
              table { font-size: 10px; }
              th, td { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <p><strong>التاريخ:</strong> ${formatDateArabic()}</p>
            ${partnerName ? `<p><strong>الشريك:</strong> ${partnerName}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${columns
                    .filter(col => col.accessorKey !== 'actions' && col.id !== 'actions' && col.id !== 'select')
                    .map(col => {
                      const value = row[col.accessorKey];
                      let display = value || '-';
                      
                      if (col.accessorKey === 'memberType') {
                        display = value === 'PRINCIPAL' ? 'أصيل' : value === 'DEPENDENT' ? 'تابع' : value;
                      } else if (col.accessorKey === 'cardStatus') {
                        display = value === 'ACTIVE' ? 'فعال' : value === 'BLOCKED' ? 'محظور' : value === 'EXPIRED' ? 'منتهي' : value;
                      } else if (col.accessorKey === 'birthDate' || col.accessorKey === 'joinDate' || col.accessorKey === 'createdAt') {
                         if(value && Array.isArray(value)) display = value.join('-'); // Handle array dates if any
                         // Assume string
                      }
                      
                      return `<td>${display}</td>`;
                    }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      // Print is triggered by onload script

    } catch (error) {
      console.error('[PdfPreview] Print error:', error);
      alert('حدث خطأ أثناء الطباعة');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      disableEnforceFocus
      PaperProps={{
        sx: {
          minHeight: '80vh',
          direction: 'rtl'
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            معاينة التقرير
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      {/* Dialog Content */}
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Report Header */}
          <Typography variant="h6" textAlign="center" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary">
            {formatDateArabic()}
          </Typography>
          {partnerName && (
            <Typography variant="body2" textAlign="center" color="primary" fontWeight="medium" mt={1}>
              الشريك: {partnerName}
            </Typography>
          )}
        </Box>

        {/* Data Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ direction: 'rtl' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {columns
                  .filter(col => col.accessorKey !== 'actions' && col.id !== 'actions')
                  .map((col, index) => (
                    <TableCell
                      key={index}
                      align="center"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        borderRight: index > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                      }}
                    >
                      {col.header}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter(col => col.accessorKey !== 'actions' && col.id !== 'actions').length}
                    align="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      لا توجد بيانات للعرض
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    {columns
                      .filter(col => col.accessorKey !== 'actions' && col.id !== 'actions')
                      .map((col, colIndex) => {
                        let value = row[col.accessorKey];

                        // Handle special formatting
                        if (col.accessorKey === 'memberType') {
                          value = value === 'PRINCIPAL' ? 'أصيل' : value === 'DEPENDENT' ? 'تابع' : value;
                        } else if (col.accessorKey === 'cardStatus') {
                          value = value === 'ACTIVE' ? 'فعال' : value === 'BLOCKED' ? 'محظور' : value === 'EXPIRED' ? 'منتهي' : value;
                        }

                        return (
                          <TableCell
                            key={colIndex}
                            align={col.align || 'right'}
                            sx={{
                              borderRight: colIndex > 0 ? '1px solid rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            {value || '-'}
                          </TableCell>
                        );
                      })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer Info */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            عدد السجلات: {data.length}
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      {/* Dialog Actions */}
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          إلغاء
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          disabled={isPrinting || data.length === 0}
        >
          {isPrinting ? 'جاري الإعداد...' : 'طباعة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================

PdfPreviewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  data: PropTypes.array,
  columns: PropTypes.array,
  partnerName: PropTypes.string
};

export default PdfPreviewModal;
