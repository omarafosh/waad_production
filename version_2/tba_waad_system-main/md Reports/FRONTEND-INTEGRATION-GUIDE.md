# 🚀 Frontend Integration Guide - Excel Import

## 📋 Overview

This guide shows how to integrate the new Excel Import architecture into any module's frontend.

---

## 🎯 Quick Start

### 1. Import Required Services
```javascript
import { 
  downloadMemberTemplate, 
  importMembers 
} from '@/services/api/excel-import.service';
import { ExcelImportButton } from '@/components/ExcelImport';
```

### 2. Add Import Button to Your Page
```jsx
// Example: Members List Page
import React from 'react';
import { Box, Typography } from '@mui/material';
import { ExcelImportButton } from '@/components/ExcelImport';
import { downloadMemberTemplate, importMembers } from '@/services/api/excel-import.service';

const MembersPage = () => {
  const [members, setMembers] = useState([]);

  const fetchMembers = async () => {
    // Refresh member list
    const data = await membersService.getAll();
    setMembers(data);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">الأعضاء</Typography>
        
        <ExcelImportButton
          title="استيراد الأعضاء"
          buttonLabel="استيراد من Excel"
          templateFilename="Members_Template.xlsx"
          onDownloadTemplate={downloadMemberTemplate}
          onImport={importMembers}
          onSuccess={fetchMembers}  // Refresh list after successful import
        />
      </Box>

      {/* Members table/list here */}
    </Box>
  );
};
```

---

## 📦 Module-Specific Examples

### 👤 Members Module
```jsx
import { downloadMemberTemplate, importMembers } from '@/services/api/excel-import.service';

<ExcelImportButton
  title="استيراد الأعضاء"
  templateFilename="Members_Template.xlsx"
  onDownloadTemplate={downloadMemberTemplate}
  onImport={importMembers}
  onSuccess={() => {
    toast.success('تم استيراد الأعضاء بنجاح');
    fetchMembers();
  }}
/>
```

### 🏥 Providers Module
```jsx
import { downloadProviderTemplate, importProviders } from '@/services/api/excel-import.service';

<ExcelImportButton
  title="استيراد مقدمي الخدمة"
  templateFilename="Providers_Template.xlsx"
  onDownloadTemplate={downloadProviderTemplate}
  onImport={importProviders}
  onSuccess={() => {
    toast.success('تم استيراد مقدمي الخدمة بنجاح');
    fetchProviders();
  }}
/>
```

### 🧾 Medical Services Module
```jsx
import { downloadMedicalServiceTemplate, importMedicalServices } from '@/services/api/excel-import.service';

<ExcelImportButton
  title="استيراد الخدمات الطبية"
  templateFilename="Medical_Services_Template.xlsx"
  onDownloadTemplate={downloadMedicalServiceTemplate}
  onImport={importMedicalServices}
  onSuccess={() => {
    toast.success('تم استيراد الخدمات الطبية بنجاح');
    fetchServices();
  }}
/>
```

---

## 🛠️ Advanced Usage

### Custom Dialog Implementation
If you need more control, use the dialog directly:

```jsx
import React, { useState } from 'react';
import { Button } from '@mui/material';
import { ExcelImportDialog } from '@/components/ExcelImport';
import { downloadMemberTemplate, importMembers } from '@/services/api/excel-import.service';

const CustomMemberImport = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleImportSuccess = async (result) => {
    console.log('Import completed:', result);
    
    // Custom success handling
    if (result.summary.created > 0) {
      await fetchMembers();
      showNotification(`تم إنشاء ${result.summary.created} عضو`);
    }
    
    // Log errors for admin
    if (result.errors.length > 0) {
      logImportErrors(result.errors);
    }
  };

  const handleImport = async (file) => {
    const result = await importMembers(file);
    handleImportSuccess(result);
    return result;
  };

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        استيراد مخصص
      </Button>

      <ExcelImportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="استيراد الأعضاء"
        templateFilename="Members_Template.xlsx"
        onDownloadTemplate={downloadMemberTemplate}
        onImport={handleImport}
      />
    </>
  );
};
```

---

## 🎨 Customization Options

### Button Props
```jsx
<ExcelImportButton
  // Dialog settings
  title="استيراد الأعضاء"
  templateFilename="Members_Template.xlsx"
  onDownloadTemplate={downloadMemberTemplate}
  onImport={importMembers}
  onSuccess={(result) => console.log('Success:', result)}
  
  // Button customization
  buttonLabel="رفع ملف Excel"
  buttonVariant="contained"  // outlined | text | contained
  buttonColor="primary"      // primary | secondary | success
  size="large"               // small | medium | large
  fullWidth={true}
  disabled={!hasPermission}
  
  // Any other MUI Button props
  sx={{ mt: 2 }}
/>
```

---

## 📊 Result Handling

### Import Result Structure
```typescript
interface ExcelImportResult {
  summary: {
    totalRows: number;
    created: number;
    skipped: number;
    rejected: number;
    updated: number;
    failed: number;
  };
  errors: Array<{
    rowNumber: number;
    errorType: string;
    columnName: string;
    fieldName: string;
    messageAr: string;
    messageEn: string;
    value: string;
  }>;
  success: boolean;
  messageAr: string;
  messageEn: string;
  timestamp: string;
}
```

### Display Results
```jsx
const handleImportComplete = (result) => {
  // Show summary
  const message = `
    تم الاستيراد بنجاح:
    - تم إنشاء: ${result.summary.created}
    - تم الرفض: ${result.summary.rejected}
    - فشل: ${result.summary.failed}
  `;
  
  if (result.success) {
    toast.success(message);
  } else {
    toast.error('فشل الاستيراد: ' + result.messageAr);
  }
  
  // Log errors for debugging
  if (result.errors.length > 0) {
    console.table(result.errors);
  }
  
  // Refresh data if any records were created
  if (result.summary.created > 0) {
    fetchData();
  }
};
```

---

## 🔐 Permission Checks

### Conditional Rendering
```jsx
import { useAuth } from '@/hooks/useAuth';

const MembersPage = () => {
  const { hasPermission } = useAuth();
  
  const canImport = hasPermission('members.import') || hasPermission('SUPER_ADMIN');

  return (
    <Box>
      {canImport && (
        <ExcelImportButton
          title="استيراد الأعضاء"
          templateFilename="Members_Template.xlsx"
          onDownloadTemplate={downloadMemberTemplate}
          onImport={importMembers}
          onSuccess={fetchMembers}
        />
      )}
    </Box>
  );
};
```

---

## 🧪 Error Handling

### Handle API Errors
```jsx
const handleImport = async (file) => {
  try {
    const result = await importMembers(file);
    
    if (result.success) {
      toast.success(result.messageAr);
      fetchMembers();
    } else {
      // Import completed but with errors
      toast.warning(`${result.messageAr}\nالرجاء مراجعة الأخطاء`);
    }
    
    return result;
  } catch (error) {
    // API error (network, auth, etc.)
    toast.error('فشل الاتصال بالخادم: ' + error.message);
    throw error;  // Re-throw for dialog to handle
  }
};
```

---

## 📱 Responsive Design

### Mobile-Friendly Button
```jsx
import { useMediaQuery, useTheme } from '@mui/material';

const MembersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ExcelImportButton
      title="استيراد الأعضاء"
      buttonLabel={isMobile ? 'استيراد' : 'استيراد من Excel'}
      size={isMobile ? 'small' : 'medium'}
      fullWidth={isMobile}
      templateFilename="Members_Template.xlsx"
      onDownloadTemplate={downloadMemberTemplate}
      onImport={importMembers}
      onSuccess={fetchMembers}
    />
  );
};
```

---

## 🎯 Best Practices

### 1. Always Refresh After Import
```jsx
<ExcelImportButton
  onSuccess={(result) => {
    // Refresh list to show new records
    fetchData();
    
    // Update statistics
    updateStats();
    
    // Show notification
    toast.success(`تم إنشاء ${result.summary.created} سجل`);
  }}
/>
```

### 2. Log Import Activity
```jsx
<ExcelImportButton
  onSuccess={(result) => {
    // Log to analytics
    analytics.track('excel_import_success', {
      module: 'members',
      created: result.summary.created,
      rejected: result.summary.rejected
    });
    
    // Refresh data
    fetchMembers();
  }}
/>
```

### 3. Handle Large Imports
```jsx
const handleLargeImport = async (result) => {
  if (result.summary.totalRows > 1000) {
    // Show progress notification
    toast.info('جاري تحديث البيانات... قد يستغرق بعض الوقت');
    
    // Refresh in background
    setTimeout(fetchMembers, 2000);
  } else {
    // Immediate refresh
    fetchMembers();
  }
};
```

---

## 🧰 Utility Functions

### Export for Reuse
```javascript
// utils/excel-import-helpers.js

export const showImportResult = (result, toast) => {
  const { summary } = result;
  
  if (result.success) {
    toast.success(
      `تم الاستيراد بنجاح!\n` +
      `تم إنشاء ${summary.created} سجل\n` +
      (summary.rejected > 0 ? `تم رفض ${summary.rejected} سجل` : '')
    );
  } else {
    toast.error(`فشل الاستيراد: ${result.messageAr}`);
  }
};

export const downloadImportErrors = (errors) => {
  const csvContent = errors.map(err => 
    `${err.rowNumber},${err.errorType},${err.messageAr},${err.value}`
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  downloadBlob(blob, 'import_errors.csv');
};
```

---

## 📚 Complete Example

```jsx
// pages/Members/MembersPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ExcelImportButton } from '@/components/ExcelImport';
import { downloadMemberTemplate, importMembers } from '@/services/api/excel-import.service';
import { membersService } from '@/services/api/members.service';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { hasPermission } = useAuth();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch (error) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleImportSuccess = (result) => {
    const { summary } = result;
    
    // Show notification
    toast.success(
      `تم الاستيراد بنجاح!\n` +
      `تم إنشاء ${summary.created} عضو جديد`
    );
    
    // Log activity
    console.log('Import completed:', result);
    
    // Refresh list
    fetchMembers();
  };

  const canImport = hasPermission('members.import') || hasPermission('SUPER_ADMIN');

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">الأعضاء</Typography>
        
        <Box display="flex" gap={2}>
          <Button variant="outlined" onClick={fetchMembers}>
            تحديث
          </Button>
          
          {canImport && (
            <ExcelImportButton
              title="استيراد الأعضاء"
              buttonLabel="استيراد من Excel"
              buttonVariant="contained"
              templateFilename="Members_Template.xlsx"
              onDownloadTemplate={downloadMemberTemplate}
              onImport={importMembers}
              onSuccess={handleImportSuccess}
            />
          )}
        </Box>
      </Box>

      {/* Members Table */}
      {/* ... */}
    </Box>
  );
};

export default MembersPage;
```

---

## ✅ Checklist

Before deploying:
- [ ] Import button added to module page
- [ ] Correct service functions imported
- [ ] onSuccess handler refreshes data
- [ ] Permission checks implemented
- [ ] Error handling in place
- [ ] Toast notifications configured
- [ ] Responsive design tested
- [ ] User documentation updated

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-03
