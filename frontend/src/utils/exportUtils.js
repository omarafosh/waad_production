/**
 * Export Utilities
 * Unified export functions for Excel and PDF
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FINANCIAL CLOSURE RULE - EXPORT = VIEW = API RESPONSE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 🚫 FORBIDDEN: Calculating totals or aggregates in this file
 * 🚫 FORBIDDEN: Transforming financial amounts before export
 * 🚫 FORBIDDEN: Creating new financial fields not in source data
 * 
 * ✅ REQUIRED: Export uses EXACT data from API response
 * ✅ REQUIRED: No .reduce(), .sum(), or manual aggregation
 * ✅ REQUIRED: What user sees = What user exports
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPANY BRANDING - SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * All exports include company branding (name, logo) from CompanySettingsContext.
 * To use branding, pass companySettings object to export functions.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Export data to Excel (CSV) file with company branding
 * 
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 * @param {Object} options - Export options
 * @param {string} options.companyName - Company name for header
 * @param {string} options.reportTitle - Report title
 */
export const exportToExcel = (data, filename = 'export', options = {}) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const { companyName, reportTitle } = options;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content with BOM for Arabic support
  const BOM = '\uFEFF';
  let csvContent = BOM;
  
  // Add company name header if provided
  if (companyName) {
    csvContent += `"${companyName}"\n`;
    if (reportTitle) {
      csvContent += `"${reportTitle}"\n`;
    }
    csvContent += `"تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}"\n`;
    csvContent += '\n'; // Empty row before data
  }
  
  // Add column headers
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
  
  // Add rows
  data.forEach(row => {
    const rowData = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvContent += rowData.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export data to PDF file
 * @param {Array<string>} columns - Column headers
 * @param {Array<Array>} rows - Row data
 * @param {string} title - Document title
 * @param {string} filename - Filename without extension
 */
/**
 * Export data to PDF file with company branding
 * 
 * Supports two signatures:
 * 1. (data, title, filename, options) - Auto-extract columns from object keys
 * 2. (columns, rows, title, filename, options) - Explicit columns and rows
 * 
 * @param {Object} options - Export options
 * @param {string} options.companyName - Company name for header
 * @param {string} options.logoBase64 - Base64 logo for header
 * @param {string} options.footerText - Footer text
 * @param {string} options.primaryColor - Primary color for styling
 */
export const exportToPDF = (arg1, arg2, arg3, arg4, arg5) => {
  let columns, rows, title, filename, options;

  // Determine signature: if arg1 is array of objects (not array of arrays)
  if (Array.isArray(arg1) && arg1.length > 0 && typeof arg1[0] === 'object' && !Array.isArray(arg1[0])) {
      // Signature 1: (data, title, filename, options)
      const data = arg1;
      columns = Object.keys(data[0]);
      rows = data.map(obj => Object.values(obj));
      title = arg2 || 'Export';
      filename = arg3 || 'export';
      options = arg4 || {};
  } else {
      // Signature 2: (columns, rows, title, filename, options)
      columns = arg1 || [];
      rows = arg2 || [];
      title = arg3 || 'Export';
      filename = arg4 || 'export';
      options = arg5 || {};
  }

  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Extract branding options
  const { companyName, logoBase64, footerText, primaryColor = '#1976d2' } = options;

  // Ensure columns is defined
  if (!columns || columns.length === 0 && rows.length > 0) {
      columns = Array.from({length: rows[0].length}, (_, i) => `Column ${i+1}`);
  }

  // Build header with company branding
  const headerHTML = companyName || logoBase64 ? `
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" alt="${companyName || 'Logo'}" class="logo" />` : ''}
      ${companyName ? `<div class="company-name">${companyName}</div>` : ''}
    </div>
  ` : '';

  const tableHTML = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          margin: 20px;
          direction: rtl;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid ${primaryColor};
        }
        .logo {
          max-height: 60px;
          max-width: 200px;
          object-fit: contain;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          color: ${primaryColor};
          margin-top: 8px;
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px 8px;
          text-align: right;
        }
        th {
          background-color: ${primaryColor};
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #f5f5f5; }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${headerHTML}
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${cell ?? '-'}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">
        ${footerText || (companyName ? `${companyName} - ` : '')}تم الإنشاء: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  } else {
    console.error('Could not open print window');
  }
};

export default { exportToExcel, exportToPDF };
