# Excel Upload Feature - Quick Start Guide
## دليل سريع لميزة رفع Excel

---

## 🚀 كيفية الاستخدام

### للمستخدمين النهائيين

#### 1. افتح صفحة الشبكة الطبية
- الخدمات الطبية: `/medical-services`
- التصنيفات الطبية: `/medical-categories`
- مقدمي الخدمات: `/providers`

#### 2. اضغط على زر "رفع Excel"
الموجود في شريط الأدوات بجانب أزرار التصدير والطباعة

#### 3. اختر ملف Excel
**طريقتان:**
- اسحب الملف وأفلته (Drag & Drop)
- انقر على المنطقة لفتح نافذة اختيار الملفات

#### 4. تحقق من الملف
- الأنواع المسموحة: `.xlsx`, `.xls`
- الحد الأقصى: 10 ميجابايت
- سيظهر معاينة الملف (الاسم، الحجم، النوع)

#### 5. اضغط "رفع الملف"
- سيظهر progress indicator
- انتظر اكتمال الرفع
- سيتم تحديث الجدول تلقائياً

---

## 🎯 للمطورين - إضافة الميزة لصفحة جديدة

### الخطوة 1: إضافة Handler

```jsx
import { useCallback } from 'react';

const MyListPage = () => {
  const handleExcelUpload = useCallback(
    async (file) => {
      try {
        console.log('[MyModule] Uploading:', file.name);
        
        // Call your backend API
        // const result = await uploadMyDataExcel(file);
        
        // Show success message
        alert(`تم رفع الملف: ${file.name}`);
        
        // Table will auto-refresh
      } catch (error) {
        console.error('[MyModule] Upload failed:', error);
        throw error; // ExcelUploadButton will show error UI
      }
    },
    []
  );
  
  // ... rest of component
};
```

### الخطوة 2: تفعيل في TbaDataTable

```jsx
<TbaDataTable
  columns={columns}
  fetcher={fetcher}
  queryKey="my-module"
  
  // Enable Excel upload
  enableExcelUpload={true}
  onExcelUpload={handleExcelUpload}
  
  // Other features
  enableExport={true}
  enablePrint={true}
  enableFilters={true}
/>
```

### الخطوة 3: تنفيذ Backend API

```jsx
// services/api/my-module.service.js

export const uploadMyDataExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', 'upsert'); // insert, update, or upsert

  const response = await axios.post(
    '/api/my-module/import/excel',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};
```

---

## 📋 Validation Rules

### File Type
```javascript
Allowed Extensions: ['.xlsx', '.xls']
Allowed MIME Types: [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
]
```

### File Size
```javascript
Maximum: 10 MB (10,485,760 bytes)
Minimum: > 0 bytes (empty files rejected)
```

### Error Messages (Arabic)
```
- "نوع الملف غير مدعوم. الأنواع المسموحة: .xlsx, .xls"
- "حجم الملف كبير جداً. الحد الأقصى: 10 ميجابايت"
- "الملف فارغ"
```

---

## 🎨 Component Props

### ExcelUploadButton

```typescript
interface ExcelUploadButtonProps {
  onUpload: (file: File) => Promise<void>;  // Required
  disabled?: boolean;                        // Default: false
  buttonText?: string;                       // Default: "رفع ملف Excel"
  uploadingText?: string;                    // Default: "جاري الرفع..."
  successMessage?: string;                   // Default: "تم رفع الملف بنجاح"
  size?: 'small' | 'medium' | 'large';      // Default: 'medium'
  variant?: 'contained' | 'outlined' | 'text'; // Default: 'outlined'
  color?: MuiColor;                          // Default: 'primary'
  fullWidth?: boolean;                       // Default: false
}
```

### TbaDataTable (New Props)

```typescript
interface TbaDataTableProps {
  // ... existing props
  enableExcelUpload?: boolean;               // Default: false
  onExcelUpload?: (file: File) => Promise<void>; // Optional
}
```

---

## 🔧 Backend API Contract (Recommended)

### Request

```
POST /api/{module}/import/excel
Content-Type: multipart/form-data

Body:
  file: File (xlsx/xls)
  mode: 'insert' | 'update' | 'upsert' (optional)
```

### Response (Success)

```json
{
  "success": true,
  "summary": {
    "total": 150,
    "inserted": 120,
    "updated": 20,
    "skipped": 0,
    "failed": 10,
    "errors": [
      {
        "row": 5,
        "column": "priceLyd",
        "value": "ABC",
        "error": "Invalid price format"
      }
    ]
  },
  "message": "تم استيراد 140 سجل من أصل 150"
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "INVALID_FILE_FORMAT",
  "message": "الملف تالف أو بصيغة غير صحيحة",
  "details": {
    "sheet": "Sheet1",
    "issue": "Missing required column: code"
  }
}
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Upload valid .xlsx file
- [ ] Upload valid .xls file
- [ ] Try to upload .pdf (should reject)
- [ ] Try to upload file > 10MB (should reject)
- [ ] Try to upload empty file (should reject)
- [ ] Test drag & drop
- [ ] Test click to select
- [ ] Cancel upload mid-process
- [ ] Upload while table is loading
- [ ] Upload multiple times in sequence

### Edge Cases

- [ ] Very large file (9.9 MB)
- [ ] File with Arabic name
- [ ] File with special characters in name
- [ ] Network error during upload
- [ ] Backend timeout
- [ ] Backend validation errors

---

## 📝 Example Excel Templates

### Medical Services Template

| code | nameAr | nameEn | categoryId | priceLyd | requiresApproval | active |
|------|--------|--------|------------|----------|------------------|--------|
| SRV001 | فحص شامل | Full Checkup | 1 | 150.00 | true | true |
| SRV002 | أشعة سينية | X-Ray | 2 | 80.00 | false | true |

### Medical Categories Template

| code | nameAr | nameEn | sortOrder | active |
|------|--------|--------|-----------|--------|
| CAT001 | فحوصات | Tests | 1 | true |
| CAT002 | أشعة | Radiology | 2 | true |

### Providers Template

| name | providerType | licenseNumber | city | phone | networkStatus | active |
|------|--------------|---------------|------|-------|---------------|--------|
| مستشفى النور | HOSPITAL | LIC-001 | طرابلس | 0912345678 | IN_NETWORK | true |
| عيادة الشفاء | CLINIC | LIC-002 | بنغازي | 0923456789 | IN_NETWORK | true |

---

## 🚨 Important Notes

### ⚠️ Current Status: UI Only

**الميزة الحالية تشمل واجهة المستخدم فقط!**

- ✅ UI/UX complete
- ✅ File validation
- ✅ Upload dialog
- ❌ Backend processing (TODO)

**لاستخدامها في الإنتاج:**
1. نفذ Backend API endpoints
2. استبدل `alert()` في handlers بـ API calls
3. عالج الأخطاء من Backend
4. اختبر مع بيانات حقيقية

### 📦 No New Dependencies

لم يتم إضافة أي مكتبات خارجية:
- ✅ MUI components only
- ✅ Material React Table (existing)
- ✅ Standard React hooks
- ✅ Clean, maintainable code

---

## 🎯 Next Steps

1. **Implement Backend APIs**
   - Excel parsing (Apache POI / SheetJS)
   - Data validation
   - Bulk insert/update
   - Error handling

2. **Enhance Frontend Integration**
   - Replace placeholder handlers
   - Show detailed results
   - Download error report
   - Progress percentage

3. **Add Documentation**
   - User manual with screenshots
   - Video tutorial
   - API documentation
   - Excel templates

4. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests
   - Performance tests

---

## 📞 Support

للمساعدة أو الإبلاغ عن مشاكل:
1. راجع [MEDICAL-NETWORK-UI-IMPROVEMENTS.md](./MEDICAL-NETWORK-UI-IMPROVEMENTS.md)
2. افحص console logs
3. تحقق من Network tab (DevTools)
4. تأكد من Backend API متاح

---

**Happy Coding! 🚀**
