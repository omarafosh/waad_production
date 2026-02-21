# خطة تحسين استيراد الأعضاء من Excel

## 🎯 المشكلة المحددة

عند رفع ملفات Excel للأعضاء (من مجلد `موظفين/`):
- ❌ لا يمكن تحديد صاحب العمل (Employer) مباشرة
- ❌ لا يمكن تحديد وثيقة المنافع (Benefit Policy)
- ❌ نظام الاستيراد الحالي يحاول البحث عن Employer من عمود "الشركة" ويفشل
- ❌ لا توجد آلية لتوليد Card Number تلقائياً

## 📋 الحل المقترح

### المرحلة 1: معاينة مع خيارات (Preview with Options)

عند رفع الملف:
```
1. رفع الملف → /api/members/import/preview
2. عرض معاينة البيانات
3. المستخدم يختار:
   - ✅ Employer (صاحب العمل) - إلزامي
   - ✅ Benefit Policy (وثيقة المنافع) - اختياري
   - ✅ تأكيد القوائم المعروضة
```

### المرحلة 2: تنفيذ مع الخيارات (Execute with Options)

```
POST /api/members/import/execute
Content-Type: multipart/form-data

Parameters:
- file: Excel file
- employerId: Long (REQUIRED) - من الخيار المحدد
- benefitPolicyId: Long (OPTIONAL) - من الخيار المحدد
- batchId: String (from preview)
```

### المرحلة 3: معالجة البيانات

#### توليد Card Number تلقائي:
```java
@PrePersist
public void ensureCardNumber() {
    if (this.cardNumber == null || this.cardNumber.isEmpty()) {
        this.cardNumber = CardNumberGenerator.generate();
        // Format: WAAD|MEMBER|{timestamp}
    }
}
```

#### الحقول الإلزامية فقط:
- ✅ `fullNameArabic` - الاسم الكامل (من Excel)
- ✅ `employerId` - من المعاينة (اختيار المستخدم)
- ✅ `cardNumber` - توليد تلقائي

#### الحقول الاختيارية (لا توقف الاستيراد):
- ⚪ `civilId` - الرقم الوطني
- ⚪ `birthDate` - تاريخ الميلاد
- ⚪ `gender` - الجنس
- ⚪ `phone` - الهاتف
- ⚪ `email` - البريد
- ⚪ `benefitPolicyId` - من المعاينة أو من Excel
- ⚪ جميع الحقول الأخرى

---

## 🔧 التغييرات المطلوبة

### 1. تحديث DTOs

#### MemberImportPreviewDto.java (إضافة حقول جديدة)
```java
public class MemberImportPreviewDto {
    // ... existing fields
    
    // NEW: Available employers for selection
    private List<EmployerOptionDto> availableEmployers;
    
    // NEW: Available benefit policies for selection
    private List<BenefitPolicyOptionDto> availableBenefitPolicies;
    
    @Data
    @Builder
    public static class EmployerOptionDto {
        private Long id;
        private String code;
        private String nameAr;
        private String nameEn;
    }
    
    @Data
    @Builder
    public static class BenefitPolicyOptionDto {
        private Long id;
        private String policyNumber;
        private String nameAr;
        private String nameEn;
        private Long employerId;  // FK to show policies per employer
        private Boolean isActive;
    }
}
```

### 2. تحديث Service

#### MemberExcelImportService.java

**تحديث parseAndPreview()**:
```java
public MemberImportPreviewDto parseAndPreview(MultipartFile file, Map<String, String> customMappings) {
    // ... existing logic
    
    // NEW: Load available employers
    List<Employer> employers = employerRepository.findAll();
    List<EmployerOptionDto> employerOptions = employers.stream()
            .map(e -> EmployerOptionDto.builder()
                    .id(e.getId())
                    .code(e.getCode())
                    .nameAr(e.getNameAr())
                    .nameEn(e.getNameEn())
                    .build())
            .toList();
    
    // NEW: Load available benefit policies
    List<BenefitPolicy> policies = benefitPolicyRepository.findAll();
    List<BenefitPolicyOptionDto> policyOptions = policies.stream()
            .map(p -> BenefitPolicyOptionDto.builder()
                    .id(p.getId())
                    .policyNumber(p.getPolicyNumber())
                    .nameAr(p.getNameAr())
                    .nameEn(p.getNameEn())
                    .employerId(p.getEmployerOrganization() != null ? p.getEmployerOrganization().getId() : null)
                    .isActive(p.getIsActive())
                    .build())
            .toList();
    
    preview.setAvailableEmployers(employerOptions);
    preview.setAvailableBenefitPolicies(policyOptions);
    
    return preview;
}
```

**تحديث executeImport() - إضافة parameters**:
```java
public MemberImportResultDto executeImport(
        MultipartFile file, 
        String batchId,
        Long employerId,              // NEW: Selected employer
        Long benefitPolicyId) {       // NEW: Selected policy (optional)
    
    log.info("📥 Starting import: file={}, employer={}, policy={}", 
            file.getOriginalFilename(), employerId, benefitPolicyId);
    
    // Validate employer exists
    Organization employerOrg = organizationRepository.findById(employerId)
            .orElseThrow(() -> new BusinessRuleException("صاحب العمل غير موجود: " + employerId));
    
    if (employerOrg.getType() != OrganizationType.EMPLOYER) {
        throw new BusinessRuleException("المنظمة المحددة ليست صاحب عمل");
    }
    
    // Validate policy if provided
    BenefitPolicy policy = null;
    if (benefitPolicyId != null) {
        policy = benefitPolicyRepository.findById(benefitPolicyId)
                .orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة: " + benefitPolicyId));
    }
    
    // Process rows with selected employer and policy
    // ... existing logic with modifications
}
```

**تحديث processRow() - استخدام Employer المحدد**:
```java
private ImportRowResult processRow(
        Row row, int rowNum,
        Map<String, Integer> fieldToColumnIndex,
        Map<Integer, String> columnIndexToName,
        MemberImportLog importLog,
        Organization employerOrg,        // NEW: Pre-selected employer
        BenefitPolicy benefitPolicy) {   // NEW: Pre-selected policy (optional)
    
    // Extract fields
    String fullName = getFieldValue(row, fieldToColumnIndex, "fullName");
    String civilId = getFieldValue(row, fieldToColumnIndex, "civilId");  // Optional
    
    // CRITICAL VALIDATION - Only fullName is truly required
    if (fullName == null || fullName.isBlank()) {
        log.debug("⏭️ Skipping row {}: missing full_name", rowNum);
        return ImportRowResult.skipped();
    }
    
    // Check if member already exists by civilId (if provided)
    Member existingMember = null;
    if (civilId != null && !civilId.isBlank()) {
        existingMember = memberRepository.findByCivilId(civilId).orElse(null);
    }
    
    Member member;
    if (existingMember != null) {
        // UPDATE existing member
        member = existingMember;
        member.setFullNameArabic(fullName);
        // Update other fields if present...
        
    } else {
        // CREATE new member
        member = Member.builder()
                .fullNameArabic(fullName)
                .employerOrganization(employerOrg)      // From selection
                .benefitPolicy(benefitPolicy)            // From selection (optional)
                .status(MemberStatus.ACTIVE)
                .cardStatus(Member.CardStatus.ACTIVE)
                .active(true)
                .build();
        
        // Card Number will be generated automatically via @PrePersist
    }
    
    // Set optional fields (do NOT fail if missing)
    setCivilId(member, civilId);
    setBirthDate(member, row, fieldToColumnIndex);
    setGender(member, row, fieldToColumnIndex);
    setPhone(member, row, fieldToColumnIndex);
    setEmail(member, row, fieldToColumnIndex);
    // ... other optional fields
    
    memberRepository.save(member);
    
    return existingMember != null 
            ? ImportRowResult.updated(member.getId())
            : ImportRowResult.created(member.getId());
}
```

### 3. تحديث Controller

#### MemberImportController.java

**تحديث executeImport() endpoint**:
```java
@PostMapping(value = "/execute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('members.import')")
@Operation(
    summary = "Execute Excel import",
    description = "Import members from Excel file with selected employer and benefit policy"
)
public ResponseEntity<ApiResponse<MemberImportResultDto>> executeImport(
        @Parameter(description = "Excel file (.xlsx)")
        @RequestParam("file") MultipartFile file,
        
        @Parameter(description = "Selected Employer ID", required = true)
        @RequestParam("employerId") Long employerId,
        
        @Parameter(description = "Selected Benefit Policy ID (optional)")
        @RequestParam(value = "benefitPolicyId", required = false) Long benefitPolicyId,
        
        @Parameter(description = "Batch ID from preview (optional)")
        @RequestParam(value = "batchId", required = false) String batchId) {
    
    log.info("📥 Execute import: file={}, employer={}, policy={}, batch={}", 
            file.getOriginalFilename(), employerId, benefitPolicyId, batchId);
    
    // Validate employer
    if (employerId == null) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("يجب تحديد صاحب العمل"));
    }
    
    // Generate batch ID if not provided
    if (batchId == null || batchId.isBlank()) {
        batchId = UUID.randomUUID().toString();
    }
    
    try {
        MemberImportResultDto result = importService.executeImport(
                file, batchId, employerId, benefitPolicyId);
        
        String status = result.getStatus();
        if ("COMPLETED".equals(status)) {
            return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
        } else if ("PARTIAL".equals(status)) {
            return ResponseEntity.ok(ApiResponse.success(
                    "تم الاستيراد مع بعض الأخطاء: " + result.getMessage(), result));
        } else {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("فشل الاستيراد: " + result.getMessage()));
        }
        
    } catch (BusinessRuleException e) {
        log.error("❌ Import validation error: {}", e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
                
    } catch (Exception e) {
        log.error("❌ Import failed: {}", e.getMessage(), e);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error("خطأ في الاستيراد: " + e.getMessage()));
    }
}
```

---

## 🎨 Frontend Changes

### 1. تحديث MemberImportDialog

```jsx
const MemberImportDialog = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Select, 3: Confirm
  
  const handleFileUpload = async (uploadedFile) => {
    // Call preview API
    const response = await previewMemberImport(uploadedFile);
    setPreview(response.data);
    setFile(uploadedFile);
    setStep(2); // Move to preview step
  };
  
  const handleExecuteImport = async () => {
    if (!selectedEmployer) {
      showError('يجب اختيار صاحب العمل');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employerId', selectedEmployer.id);
    if (selectedPolicy) {
      formData.append('benefitPolicyId', selectedPolicy.id);
    }
    
    const result = await executeMemberImport(formData);
    onSuccess(result);
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      {step === 1 && (
        <DialogContent>
          <ExcelUploadButton onUpload={handleFileUpload} />
        </DialogContent>
      )}
      
      {step === 2 && (
        <DialogContent>
          <Typography variant="h6">معاينة البيانات</Typography>
          
          {/* Employer Selection - REQUIRED */}
          <FormControl fullWidth required sx={{ mt: 2 }}>
            <InputLabel>صاحب العمل (إلزامي)</InputLabel>
            <Select
              value={selectedEmployer?.id || ''}
              onChange={(e) => {
                const employer = preview.availableEmployers.find(
                  emp => emp.id === e.target.value
                );
                setSelectedEmployer(employer);
              }}
            >
              {preview.availableEmployers.map(employer => (
                <MenuItem key={employer.id} value={employer.id}>
                  {employer.nameAr} ({employer.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Benefit Policy Selection - OPTIONAL */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>وثيقة المنافع (اختياري)</InputLabel>
            <Select
              value={selectedPolicy?.id || ''}
              onChange={(e) => {
                const policy = preview.availableBenefitPolicies
                  .filter(p => p.employerId === selectedEmployer?.id)
                  .find(p => p.id === e.target.value);
                setSelectedPolicy(policy);
              }}
              disabled={!selectedEmployer}
            >
              <MenuItem value="">
                <em>بدون وثيقة (سيتم التعيين لاحقاً)</em>
              </MenuItem>
              {preview.availableBenefitPolicies
                .filter(p => p.employerId === selectedEmployer?.id)
                .map(policy => (
                  <MenuItem key={policy.id} value={policy.id}>
                    {policy.nameAr} ({policy.policyNumber})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          
          {/* Preview Table */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2">
              سيتم استيراد {preview.summary.total} عضو
            </Typography>
            <DataTable rows={preview.rows} />
          </Box>
        </DialogContent>
      )}
      
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        {step === 2 && (
          <Button
            variant="contained"
            onClick={handleExecuteImport}
            disabled={!selectedEmployer}
          >
            تأكيد الاستيراد
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
```

---

## ✅ الميزات الرئيسية

### 1. توليد Card Number تلقائي ✅
```
Format: WAAD|MEMBER|{timestamp}
Example: WAAD|MEMBER|1735234859123
```

### 2. الحقول الإلزامية فقط ✅
- الاسم الكامل (من Excel)
- صاحب العمل (من اختيار المستخدم)

### 3. جميع الحقول الأخرى اختيارية ✅
- civilId, birthDate, gender, phone, email
- لا توقف عملية الاستيراد

### 4. دعم Update للأعضاء الموجودين ✅
- المطابقة بواسطة civilId (إن وُجد)
- تحديث البيانات الموجودة

---

## 🚀 خطوات التنفيذ

1. ✅ تحديث DTOs (إضافة employer/policy options)
2. ✅ تحديث Service (إضافة parameters)
3. ✅ تحديث Controller (إضافة required parameters)
4. ✅ تحديث Frontend (dialog مع خطوات)
5. ✅ اختبار Integration
6. ✅ توثيق API

---

**نهاية الخطة**
