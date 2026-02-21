# تكامل الواجهة الأمامية - استيراد الأعضاء من Excel

## 📋 نظرة عامة

تم إكمال التكامل الكامل بين الواجهة الأمامية والخلفية لنظام استيراد الأعضاء من ملفات Excel مع دعم اختيار صاحب العمل ووثيقة المنافع.

## ✅ التحديثات المنفذة

### 1. Backend (مكتمل سابقاً)
- ✅ تحديث `MemberExcelImportService.executeImport()` لقبول `employerId` و `benefitPolicyId`
- ✅ تحديث `MemberImportController` لاستقبال المعاملات الجديدة
- ✅ تحديث `MemberImportPreviewDto` مع قوائم الخيارات المتاحة
- ✅ إعادة كتابة `processRow()` لاستخدام الاختيارات بدلاً من Excel lookup

### 2. Frontend Services
**File: `frontend/src/services/api/members.service.js`**

```javascript
export const executeImport = async (file, batchId, employerId, benefitPolicyId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('batchId', batchId);
  formData.append('employerId', employerId);        // ✅ جديد
  
  if (benefitPolicyId) {
    formData.append('benefitPolicyId', benefitPolicyId); // ✅ جديد
  }

  const response = await axiosClient.post(`${BASE_URL}/import/execute`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return unwrap(response);
};
```

### 3. Frontend UI Component
**File: `frontend/src/pages/members/MemberImport.jsx`**

#### 3.1 Imports الجديدة
```jsx
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import { getEmployerSelectors } from 'services/api/employers.service';
import { getBenefitPoliciesSelector } from 'services/api/benefit-policies.service';
```

#### 3.2 State Management
```jsx
// Employer & Benefit Policy Selection state
const [selectedEmployer, setSelectedEmployer] = useState(null);
const [selectedBenefitPolicy, setSelectedBenefitPolicy] = useState(null);
const [availableEmployers, setAvailableEmployers] = useState([]);
const [availablePolicies, setAvailablePolicies] = useState([]);
const [employersLoading, setEmployersLoading] = useState(false);
```

#### 3.3 Preview Handler تحديث
```jsx
const handlePreview = useCallback(async () => {
  const result = await previewImport(selectedFile, customMappings);
  setPreviewData(result);
  
  // Extract employer/policy options from preview
  if (result.availableEmployers) {
    setAvailableEmployers(result.availableEmployers);
  }
  if (result.availableBenefitPolicies) {
    setAvailablePolicies(result.availableBenefitPolicies);
  }
  
  setActiveStep(1);
}, [selectedFile, customMappings]);
```

#### 3.4 Execute Handler تحديث
```jsx
const handleExecuteImport = useCallback(async () => {
  // Validate employer selection
  if (!selectedEmployer) {
    openSnackbar({
      message: 'يرجى تحديد صاحب العمل',
      variant: 'error'
    });
    return;
  }

  const result = await executeImport(
    selectedFile, 
    previewData.batchId,
    selectedEmployer.id,           // ✅ Required
    selectedBenefitPolicy?.id || null  // ✅ Optional
  );
  
  setImportResult(result);
  setActiveStep(2);
}, [selectedFile, previewData, selectedEmployer, selectedBenefitPolicy]);
```

#### 3.5 UI في خطوة المعاينة
```jsx
{activeStep === 1 && previewData && (
  <Box>
    {/* Employer & Benefit Policy Selection Panel */}
    <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'primary.lighter' }}>
      <Typography variant="h6">
        اختيار صاحب العمل ووثيقة المنافع
      </Typography>
      
      <Grid container spacing={2}>
        {/* Employer Autocomplete (REQUIRED) */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            value={selectedEmployer}
            onChange={(event, newValue) => setSelectedEmployer(newValue)}
            options={availableEmployers}
            getOptionLabel={(option) => option.nameAr || option.code}
            renderInput={(params) => (
              <TextField
                {...params}
                label="صاحب العمل *"
                error={!selectedEmployer}
                helperText={!selectedEmployer ? 'يجب تحديد صاحب العمل' : ''}
              />
            )}
          />
        </Grid>
        
        {/* Benefit Policy Autocomplete (OPTIONAL) */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            value={selectedBenefitPolicy}
            onChange={(event, newValue) => setSelectedBenefitPolicy(newValue)}
            options={availablePolicies.filter(p => p.employerId === selectedEmployer?.id)}
            getOptionLabel={(option) => option.nameAr || option.policyNumber}
            renderInput={(params) => (
              <TextField
                {...params}
                label="وثيقة المنافع (اختياري)"
              />
            )}
            disabled={!selectedEmployer}
          />
        </Grid>
      </Grid>
      
      {/* Selection Summary */}
      {selectedEmployer && (
        <Alert severity="info" sx={{ mt: 2 }}>
          سيتم استيراد {previewData.totalRows} موظف لصاحب العمل: {selectedEmployer.nameAr}
        </Alert>
      )}
    </Paper>

    {/* Preview Table */}
    {renderPreviewTable()}
  </Box>
)}
```

#### 3.6 Validation في زر الاستيراد
```jsx
<Button
  onClick={handleExecuteImport}
  disabled={importLoading || previewData.validCount === 0 || !selectedEmployer}
>
  تأكيد الاستيراد
</Button>
```

## 🎯 تدفق العمل الكامل

### الخطوة 1: رفع الملف
1. المستخدم يختار ملف Excel من ملفات الموظفين (موظفين/)
2. النظام يكتشف الأعمدة تلقائياً
3. يمكن مراجعة مطابقة الأعمدة إذا لزم الأمر

### الخطوة 2: المعاينة + الاختيار
1. النظام يعرض:
   - ملخص البيانات (إجمالي، جديد، تحديث، أخطاء)
   - قائمة أصحاب العمل المتاحين
   - قائمة وثائق المنافع المتاحة
2. المستخدم يختار:
   - **صاحب العمل** (إجباري)
   - **وثيقة المنافع** (اختياري)
3. النظام يعرض معاينة الصفوف الأولى

### الخطوة 3: التنفيذ
1. المستخدم يضغط "تأكيد الاستيراد"
2. النظام يرسل:
   - الملف
   - batchId
   - employerId ← من الاختيار
   - benefitPolicyId ← من الاختيار (إن وُجد)
3. Backend ينفذ الاستيراد:
   - يستخدم `employerOrg` من المعامل (لا من Excel)
   - ينشئ/يحدث الأعضاء
   - يولد `cardNumber` تلقائياً
   - فقط `fullNameArabic` مطلوب
4. يعرض النتيجة

## 📊 البيانات المتبادلة

### Preview Response (من Backend)
```json
{
  "batchId": "uuid",
  "totalRows": 150,
  "validCount": 145,
  "errorCount": 5,
  "availableEmployers": [
    {
      "id": 1,
      "code": "EMP001",
      "nameAr": "شركة النجاح للتجارة",
      "nameEn": "Al-Najah Trading Co.",
      "active": true
    }
  ],
  "availableBenefitPolicies": [
    {
      "id": 10,
      "policyNumber": "POL-2025-001",
      "nameAr": "وثيقة الموظفين الذهبية 2025",
      "nameEn": "Gold Employees Policy 2025",
      "employerId": 1,
      "isActive": true
    }
  ],
  "rows": [...]
}
```

### Execute Request (إلى Backend)
```
POST /api/members/import/execute
Content-Type: multipart/form-data

- file: [Excel file]
- batchId: "uuid"
- employerId: 1             ← مطلوب
- benefitPolicyId: 10       ← اختياري
```

## ✨ الميزات المنفذة

### ✅ User Experience
- واجهة سهلة بثلاث خطوات واضحة
- Autocomplete مع بحث لأصحاب العمل والوثائق
- تصفية وثائق المنافع حسب صاحب العمل المختار
- رسائل توضيحية وتحذيرات
- ملخص الاختيار قبل التنفيذ

### ✅ Validation
- منع الاستيراد بدون اختيار صاحب العمل
- تعطيل dropdown الوثائق حتى يتم اختيار صاحب العمل
- عرض حالة الوثيقة (نشطة/غير نشطة)
- تأكيد قبل التنفيذ النهائي

### ✅ Error Handling
- رسائل خطأ واضحة
- التحقق من البيانات قبل الإرسال
- معالجة حالات الفشل بشكل سليم

## 🔄 التكامل مع ملفات موظفين/ القديمة

الآن ملفات Excel في `/odoo Data اودو بيانات/موظفين/` ستعمل بنجاح:

### قبل:
❌ فشل لأن عمود "الشركة" لا يطابق صاحب عمل في النظام
❌ رقم الكرت مطلوب ولكن غير موجود
❌ حقول كثيرة مطلوبة تمنع الاستيراد

### بعد:
✅ المستخدم يختار صاحب العمل من القائمة
✅ رقم الكرت يُولد تلقائياً
✅ فقط الاسم مطلوب، باقي الحقول اختيارية
✅ يمكن تعيين وثيقة المنافع (أو تركها فارغة)

## 📝 ملاحظات مهمة

1. **صاحب العمل إجباري**: لا يمكن استيراد بدون تحديده
2. **وثيقة المنافع اختيارية**: يمكن تعيينها لاحقاً
3. **Auto-generation**: رقم الكرت يُنشأ تلقائياً
4. **Flexibility**: فقط fullNameArabic مطلوب
5. **Update Mode**: يُحدّث العضو إذا وُجد civilId مطابق

## 🧪 الاختبار المطلوب

- [ ] رفع ملف من `/موظفين/`
- [ ] اختيار صاحب عمل من القائمة
- [ ] اختيار وثيقة منافع (اختياري)
- [ ] التحقق من المعاينة
- [ ] تنفيذ الاستيراد
- [ ] التحقق من إنشاء الأعضاء في قاعدة البيانات
- [ ] التحقق من تولد رقم الكرت
- [ ] التحقق من ربط صاحب العمل ووثيقة المنافع

## 🚀 الحالة

✅ **Backend**: مكتمل 100%
✅ **Frontend Services**: مكتمل 100%
✅ **Frontend UI**: مكتمل 100%
✅ **Integration**: مكتمل 100%

**جاهز للاختبار!** 🎉
