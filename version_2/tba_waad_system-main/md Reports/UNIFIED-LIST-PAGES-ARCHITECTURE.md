# 🎯 نظام الجداول الموحد - دليل التنفيذ الشامل

## 📋 نظرة عامة

تم إنشاء نظام موحد لجميع صفحات القوائم (List Pages) في نظام التأمين الطبي بناءً على المعمارية التالية:

### 🏗️ المعمارية الأساسية

```
UnifiedPageHeader (مع زر PDF)
    ↓
MainCard
    ↓
GenericDataTable (UI فقط)
    ↓
Backend API (للبيانات والتقارير)
```

### ✅ القواعد الإلزامية

1. **GenericDataTable = UI Component فقط**
   - ❌ لا يحتوي أي منطق PDF
   - ❌ لا يحتوي أي تصدير Excel
   - ❌ لا يعتمد على HTML print أو screenshots
   - ✅ فقط عرض البيانات والفلترة والترتيب

2. **زر طباعة PDF**
   - ✅ يوجد في UnifiedPageHeader فقط
   - ✅ يستدعي Backend API: `/api/reports/{module}/pdf`
   - ❌ لا يطبع الجدول من الواجهة
   - ❌ لا يستخدم html2canvas أو jsPDF

3. **التقارير PDF**
   - ✅ Backend-driven فقط (Spring Boot + OpenPDF)
   - ✅ Frontend دوره Trigger فقط
   - ✅ يمرر الفلاتر والترتيب للـ Backend

4. **لا Excel Export**
   - ❌ تم إزالة جميع أزرار Excel Export
   - ❌ تم إزالة ExcelImportButton
   - ✅ PDF فقط للتقارير

---

## 📦 المكونات الأساسية

### 1. **PdfDownloadButton**
**الملف**: `/frontend/src/components/PdfDownloadButton.jsx`

**الوظيفة**: زر واحد لتحميل PDF من Backend

**الاستخدام**:
```jsx
<PdfDownloadButton
  module="members"
  filters={tableState.columnFilters}
  sorting={tableState.sorting}
  label="طباعة PDF"
/>
```

**الميزات**:
- ✅ يجمع الفلاتر الحالية
- ✅ يرسلها للـ Backend
- ✅ Backend يولد PDF
- ✅ تحميل تلقائي للملف
- ✅ رسائل نجاح/فشل
- ✅ حالة تحميل (loading state)

---

### 2. **UnifiedPageHeader**
**الملف**: `/frontend/src/components/UnifiedPageHeader.jsx`

**الوظيفة**: رأس صفحة موحد لجميع صفحات القوائم

**الاستخدام**:
```jsx
<UnifiedPageHeader
  // Page Info
  title="الأعضاء"
  subtitle="إدارة أعضاء التأمين"
  icon={PeopleAltIcon}
  breadcrumbs={[
    { label: 'الرئيسية', path: '/' },
    { label: 'الأعضاء' }
  ]}
  
  // PDF Download
  pdfModule="members"
  pdfFilters={tableState.columnFilters}
  pdfSorting={tableState.sorting}
  
  // Add Button
  showAddButton={true}
  addButtonLabel="إضافة عضو جديد"
  onAddClick={handleNavigateAdd}
/>
```

**المحتويات**:
- ✅ عنوان الصفحة ووصفها
- ✅ Breadcrumbs
- ✅ زر PDF Download
- ✅ زر إضافة جديد
- ✅ أزرار إضافية (اختيارية)

---

### 3. **GenericDataTable**
**الملف**: `/frontend/src/components/GenericDataTable/GenericDataTable.jsx`

**الوظيفة**: جدول موحد UI-only

**الميزات**:
- ✅ Column filtering (text/number)
- ✅ Multi-column sorting
- ✅ Sticky headers
- ✅ Pagination
- ✅ Responsive
- ✅ RTL support
- ❌ لا PDF export
- ❌ لا Excel export

**الاستخدام**:
```jsx
<GenericDataTable
  columns={columns}
  data={data?.content || []}
  totalCount={data?.totalElements || 0}
  isLoading={isLoading}
  tableState={tableState}
  enableFiltering={true}
  enableSorting={true}
  enablePagination={true}
  stickyHeader={true}
  onRowClick={(row) => handleNavigateView(row.id)}
/>
```

---

### 4. **useTableState Hook**
**الملف**: `/frontend/src/hooks/useTableState.js`

**الوظيفة**: إدارة حالة الجدول

**الاستخدام**:
```jsx
const tableState = useTableState({
  initialPageSize: 10,
  defaultSort: { field: 'createdAt', direction: 'desc' },
  initialFilters: {}
});
```

**ما يوفره**:
```jsx
{
  // Pagination
  page, pageSize, setPage, setPageSize,
  
  // Sorting
  sorting, setSorting,
  
  // Filtering
  columnFilters, setFilter, clearFilters, hasActiveFilters,
  
  // Row Selection
  rowSelection, setRowSelection, clearSelection, selectedRowCount,
  
  // Reset
  resetState
}
```

---

## 🎯 النموذج المرجعي (Golden Reference)

### Medical Services List - النموذج الكامل

**الملف**: `/frontend/src/pages/medical-services/MedicalServicesList.jsx`

**الهيكل**:

```jsx
/**
 * 1. IMPORTS
 */
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// MUI Components
import { Box, IconButton, Stack, Tooltip, Typography, Chip } from '@mui/material';

// MUI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';

// Custom Hooks
import useTableState from 'hooks/useTableState';

// Services
import { getMedicalServices, deleteMedicalService } from 'services/api/medical-services.service';

// Snackbar
import { openSnackbar } from 'api/snackbar';

/**
 * 2. CONSTANTS
 */
const QUERY_KEY = 'medical-services';
const MODULE_NAME = 'medical-services';

/**
 * 3. COMPONENT
 */
const MedicalServicesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /**
   * 4. TABLE STATE
   */
  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'createdAt', direction: 'desc' }
  });

  /**
   * 5. NAVIGATION HANDLERS
   */
  const handleNavigateAdd = useCallback(() => {
    navigate('/medical-services/add');
  }, [navigate]);

  const handleNavigateView = useCallback((id) => {
    navigate(`/medical-services/${id}`);
  }, [navigate]);

  const handleNavigateEdit = useCallback((id) => {
    navigate(`/medical-services/edit/${id}`);
  }, [navigate]);

  /**
   * 6. DELETE HANDLER
   */
  const handleDelete = useCallback(async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;

    try {
      await deleteMedicalService(id);
      openSnackbar({ message: 'تم الحذف بنجاح', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    } catch (err) {
      openSnackbar({ message: 'فشل الحذف', variant: 'error' });
    }
  }, [queryClient]);

  /**
   * 7. DATA FETCHING
   */
  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, 
               tableState.sorting, tableState.columnFilters],
    queryFn: async () => {
      const params = {
        page: tableState.page,
        size: tableState.pageSize
      };

      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
      }

      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      return await getMedicalServices(params);
    },
    keepPreviousData: true
  });

  /**
   * 8. COLUMNS
   */
  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'الرمز',
      enableSorting: true,
      enableColumnFilter: true,
      minWidth: 100,
      align: 'right',
      meta: { filterType: 'text' },
      cell: ({ getValue }) => (
        <Typography variant="body2" fontWeight="medium">
          {getValue() || '-'}
        </Typography>
      )
    },
    // ... more columns
    {
      id: 'actions',
      header: 'الإجراءات',
      enableSorting: false,
      enableColumnFilter: false,
      minWidth: 130,
      align: 'center',
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip title="عرض">
            <IconButton onClick={() => handleNavigateView(row.original?.id)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Edit, Delete buttons */}
        </Stack>
      )
    }
  ], [handleNavigateView, handleNavigateEdit, handleDelete]);

  /**
   * 9. RENDER
   */
  return (
    <Box>
      <UnifiedPageHeader
        title="الخدمات الطبية"
        subtitle="إدارة الخدمات الطبية"
        icon={MedicalServicesIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'الخدمات الطبية' }
        ]}
        pdfModule={MODULE_NAME}
        pdfFilters={tableState.columnFilters}
        pdfSorting={tableState.sorting}
        showAddButton={true}
        addButtonLabel="إضافة خدمة جديدة"
        onAddClick={handleNavigateAdd}
      />

      <MainCard>
        <TableErrorBoundary>
          <GenericDataTable
            columns={columns}
            data={data?.content || []}
            totalCount={data?.totalElements || 0}
            isLoading={isLoading}
            tableState={tableState}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            stickyHeader={true}
            onRowClick={(row) => handleNavigateView(row.id)}
          />
        </TableErrorBoundary>
      </MainCard>
    </Box>
  );
};

export default MedicalServicesList;
```

---

## 📝 Template للنسخ السريع

**الملف**: `/frontend/src/templates/UnifiedListPageTemplate.jsx`

**كيفية الاستخدام**:
1. انسخ الملف
2. استبدل `[MODULE_NAME]` باسم الموديل
3. حدّث تعريفات الأعمدة
4. حدّث service imports
5. تم!

---

## 🔄 خطوات تحويل صفحة قديمة

### القديم (TbaDataTable):
```jsx
<ModernPageHeader
  actions={
    <Stack>
      <ExcelImportButton />
      <Button onClick={handleAdd}>إضافة</Button>
    </Stack>
  }
/>
<MainCard>
  <TbaDataTable
    fetcher={fetcher}
    enableExport={true}
    enablePrint={true}
  />
</MainCard>
```

### الجديد (GenericDataTable):
```jsx
<UnifiedPageHeader
  pdfModule="module-name"
  pdfFilters={tableState.columnFilters}
  pdfSorting={tableState.sorting}
  onAddClick={handleAdd}
/>
<MainCard>
  <GenericDataTable
    data={data?.content}
    tableState={tableState}
  />
</MainCard>
```

### خطوات التحويل:

1. **Update Imports**:
   ```jsx
   // إزالة
   import TbaDataTable from 'components/tba/TbaDataTable';
   import ExcelImportButton from 'components/ExcelImport/ExcelImportButton';
   
   // إضافة
   import { useQuery, useQueryClient } from '@tanstack/react-query';
   import UnifiedPageHeader from 'components/UnifiedPageHeader';
   import GenericDataTable from 'components/GenericDataTable';
   import useTableState from 'hooks/useTableState';
   ```

2. **Add Table State**:
   ```jsx
   const tableState = useTableState({
     initialPageSize: 10,
     defaultSort: { field: 'createdAt', direction: 'desc' }
   });
   ```

3. **Add React Query**:
   ```jsx
   const { data, isLoading } = useQuery({
     queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, 
                tableState.sorting, tableState.columnFilters],
     queryFn: async () => {
       // Build params from tableState
       // Call service
     }
   });
   ```

4. **Update Column Definitions**:
   ```jsx
   // قديم
   {
     accessorKey: 'code',
     header: 'الرمز',
     size: 100,
     Cell: ({ row }) => row.original?.code
   }
   
   // جديد
   {
     accessorKey: 'code',
     header: 'الرمز',
     enableSorting: true,
     enableColumnFilter: true,
     minWidth: 100,
     align: 'right',
     meta: { filterType: 'text' },
     cell: ({ getValue }) => getValue() || '-'
   }
   ```

5. **Replace PageHeader**:
   ```jsx
   <UnifiedPageHeader
     title="..."
     pdfModule="module-name"
     pdfFilters={tableState.columnFilters}
     pdfSorting={tableState.sorting}
     onAddClick={handleAdd}
   />
   ```

6. **Replace Table**:
   ```jsx
   <GenericDataTable
     columns={columns}
     data={data?.content || []}
     totalCount={data?.totalElements || 0}
     isLoading={isLoading}
     tableState={tableState}
   />
   ```

---

## 📊 الصفحات المطلوب تحديثها

### ✅ تم التنفيذ:
1. ✅ **Medical Services** - النموذج المرجعي

### ⏳ قيد التنفيذ:
2. ⏳ **Members** (الأعضاء)
3. ⏳ **Providers** (مقدمو الخدمة)
4. ⏳ **Provider Contracts** (عقود المقدمين)
5. ⏳ **Claims** (المطالبات)
6. ⏳ **Pricing Lists** (قوائم الأسعار)

### 📋 أي صفحة List أخرى

---

## 🔧 Backend API Requirements

### PDF Endpoint Pattern:
```
GET /api/reports/{module}/pdf?{filters}&sort={field},{direction}
```

### مثال:
```
GET /api/reports/members/pdf?active=true&sort=createdAt,desc
```

### Response Headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="members_report.pdf"
```

---

## ✅ قائمة التحقق (Checklist)

عند تحويل أي صفحة List، تأكد من:

- [ ] استخدام `UnifiedPageHeader`
- [ ] زر PDF في الـ header (ليس في الجدول)
- [ ] استخدام `GenericDataTable`
- [ ] استخدام `useTableState`
- [ ] استخدام React Query
- [ ] تمرير `tableState.columnFilters` و `tableState.sorting` لزر PDF
- [ ] إزالة أي `ExcelImportButton`
- [ ] إزالة أي `enableExport` أو `enablePrint` من الجدول
- [ ] Column definitions تتبع النمط الموحد
- [ ] Actions column في النهاية
- [ ] Delete confirmation قبل الحذف
- [ ] Snackbar notifications للنجاح/الفشل

---

## 🎯 النتيجة النهائية

✅ **نظام موحد**:
- نفس الشكل في كل الصفحات
- نفس السلوك
- نفس UX

✅ **PDF فقط**:
- زر واحد في الـ header
- Backend-driven
- يمرر الفلاتر والترتيب

✅ **لا Excel**:
- تم إزالة كل أزرار Excel
- PDF هو الخيار الوحيد للتقارير

✅ **قابلية الصيانة**:
- كود موحد
- سهل النسخ
- سهل التعديل

✅ **الأداء**:
- React Query caching
- useMemo & useCallback
- Optimized re-renders

---

## 📞 الدعم والمساعدة

للمزيد من المعلومات:
- [Generic Table Implementation Guide](GENERIC-TABLE-IMPLEMENTATION-GUIDE.md)
- [Medical Services Implementation](MEDICAL-SERVICES-GENERIC-TABLE-IMPLEMENTATION.md)
- [Template File](frontend/src/templates/UnifiedListPageTemplate.jsx)

---

**تاريخ الإنشاء**: ${new Date().toLocaleDateString('ar-EG')}  
**الحالة**: ✅ جاهز للتطبيق  
**الإصدار**: 1.0.0
