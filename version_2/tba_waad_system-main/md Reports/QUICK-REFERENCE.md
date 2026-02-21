# 🚀 Quick Reference - نظام الجداول الموحد

## TL;DR - ملخص سريع

```jsx
// 1. Import
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';

// 2. Setup State
const tableState = useTableState({ initialPageSize: 10 });

// 3. Fetch Data
const { data, isLoading } = useQuery({ ... });

// 4. Render
<UnifiedPageHeader pdfModule="members" pdfFilters={tableState.columnFilters} />
<GenericDataTable data={data} tableState={tableState} />
```

---

## 🎯 القواعد الذهبية

### ✅ افعل:
- استخدم `UnifiedPageHeader` دائماً
- ضع زر PDF في الـ header
- استخدم `GenericDataTable` كما هو
- مرر `tableState.columnFilters` و `tableState.sorting` لزر PDF

### ❌ لا تفعل:
- لا تضع زر PDF في الجدول
- لا تضف Excel export
- لا تستخدم html2canvas/jsPDF
- لا تعدل `GenericDataTable`

---

## 📋 Template سريع

```jsx
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@mui/material';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import useTableState from 'hooks/useTableState';

const ModuleList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'createdAt', direction: 'desc' }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['module', tableState.page, tableState.pageSize, 
               tableState.sorting, tableState.columnFilters],
    queryFn: async () => { /* fetch data */ },
    keepPreviousData: true
  });

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'الاسم',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { filterType: 'text' },
      cell: ({ getValue }) => getValue() || '-'
    },
    // ... more columns
  ], []);

  return (
    <Box>
      <UnifiedPageHeader
        title="العنوان"
        icon={Icon}
        pdfModule="module-name"
        pdfFilters={tableState.columnFilters}
        pdfSorting={tableState.sorting}
        onAddClick={() => navigate('/module/add')}
      />
      
      <MainCard>
        <GenericDataTable
          columns={columns}
          data={data?.content || []}
          totalCount={data?.totalElements || 0}
          isLoading={isLoading}
          tableState={tableState}
        />
      </MainCard>
    </Box>
  );
};

export default ModuleList;
```

---

## 🔧 Column Definition Examples

### Text Column:
```jsx
{
  accessorKey: 'name',
  header: 'الاسم',
  enableSorting: true,
  enableColumnFilter: true,
  minWidth: 200,
  align: 'right',
  meta: { filterType: 'text' },
  cell: ({ getValue }) => getValue() || '-'
}
```

### Number Column:
```jsx
{
  accessorKey: 'price',
  header: 'السعر',
  enableSorting: true,
  enableColumnFilter: true,
  minWidth: 120,
  align: 'center',
  meta: { filterType: 'number' },
  cell: ({ getValue }) => `${getValue()?.toFixed(2)} د.ل`
}
```

### Chip Column:
```jsx
{
  accessorKey: 'active',
  header: 'الحالة',
  enableSorting: true,
  enableColumnFilter: false,
  minWidth: 100,
  align: 'center',
  cell: ({ getValue }) => (
    <Chip 
      label={getValue() ? 'نشط' : 'غير نشط'} 
      color={getValue() ? 'success' : 'default'}
      size="small"
    />
  )
}
```

### Actions Column:
```jsx
{
  id: 'actions',
  header: 'الإجراءات',
  enableSorting: false,
  enableColumnFilter: false,
  minWidth: 130,
  align: 'center',
  cell: ({ row }) => (
    <Stack direction="row" spacing={0.5}>
      <IconButton onClick={() => handleView(row.original.id)}>
        <VisibilityIcon />
      </IconButton>
      <IconButton onClick={() => handleEdit(row.original.id)}>
        <EditIcon />
      </IconButton>
      <IconButton onClick={() => handleDelete(row.original.id)}>
        <DeleteIcon />
      </IconButton>
    </Stack>
  )
}
```

---

## 📦 الملفات المطلوبة

### للنسخ:
```
/frontend/src/templates/UnifiedListPageTemplate.jsx
```

### للاستخدام:
```
/frontend/src/components/UnifiedPageHeader.jsx
/frontend/src/components/GenericDataTable/GenericDataTable.jsx
/frontend/src/hooks/useTableState.js
```

### للمرجعية:
```
/frontend/src/pages/medical-services/MedicalServicesList.jsx
```

---

## 🔍 Troubleshooting

### الفلاتر لا تعمل؟
```jsx
// تأكد من إضافة columnFilters في queryKey
queryKey: [..., tableState.columnFilters]

// وفي queryFn
Object.entries(tableState.columnFilters).forEach(([key, value]) => {
  if (value) params[key] = value;
});
```

### الترتيب لا يعمل؟
```jsx
// تأكد من إضافة sorting في queryKey
queryKey: [..., tableState.sorting]

// وفي queryFn
if (tableState.sorting.length > 0) {
  const sort = tableState.sorting[0];
  params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
}
```

### زر PDF لا يظهر؟
```jsx
// تأكد من تمرير pdfModule
<UnifiedPageHeader pdfModule="module-name" ... />
```

---

## 📚 المزيد من التفاصيل

- [الدليل الشامل](UNIFIED-LIST-PAGES-ARCHITECTURE.md)
- [تقرير التنفيذ](UNIFIED-SYSTEM-IMPLEMENTATION-REPORT.md)
- [دليل GenericDataTable](GENERIC-TABLE-IMPLEMENTATION-GUIDE.md)

---

**نسخة**: 1.0.0  
**آخر تحديث**: ${new Date().toLocaleDateString('ar-EG')}
