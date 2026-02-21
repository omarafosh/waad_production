# تحديث صفحات إدارة مقدمي الخدمة - ملخص التنفيذ

## ✅ التحديثات المنجزة

### 1. Services Updates
تم إضافة الوظائف التالية بنجاح:

**usersService.js**:
- ✅ `getUnassignedProviders()` - المستخدمون غير المرتبطين بمقدم خدمة
- ✅ `getUsersByProvider(providerId)` - المستخدمون المرتبطون بمقدم خدمة

**providersService.js**:
- ✅ `getDocuments(id)` - قائمة المستندات
- ✅ `addDocument(id, formData)` - إضافة مستند
- ✅ `deleteDocument(providerId, docId)` - حذف مستند
- ✅ `getAllowedEmployerIds(id)` - الشركاء المصرح بهم

### 2. ProviderCreate.jsx - تم الاستبدال بالكامل
**الميزات الجديدة**:
- ✅ واجهة Tabs بدلاً من Stepper (3 تبويبات)
- ✅ تبويب "مدير الحساب" مع 3 أوضاع:
  - CREATE: إنشاء مستخدم جديد
  - LINK: ربط مستخدم موجود
  - SKIP: تخطي تعيين مستخدم
- ✅ Auto-fill لحقول المستخدم من البيانات الأساسية
- ✅ Autocomplete للمستخدمين غير المرتبطين
- ✅ تعيين دور PROVIDER تلقائياً
- ✅ التحقق من صحة البيانات متقدم

**الأكواد الرئيسية**:
```javascript
const [accountMode, setAccountMode] = useState('CREATE'); // 'CREATE' | 'LINK' | 'SKIP'
const [unassignedUsers, setUnassignedUsers] = useState([]);
const [selectedUserToLink, setSelectedUserToLink] = useState(null);

// Load unassigned users when switching to LINK mode
useEffect(() => {
  if (accountMode === 'LINK' && activeTab === 2) loadUnassignedUsers();
}, [accountMode, activeTab]);

const loadUnassignedUsers = async () => {
  const users = await usersService.getUnassignedProviders();
  setUnassignedUsers(users || []);
};

const createNewAccount = async (providerId) => {
  const userRes = await usersService.createUser(userPayload);
  const userId = userRes?.data?.data?.id;
  if (userId) {
    const roles = await rolesService.getAllRoles();
    const providerRole = roles.find(r => r.name === 'PROVIDER');
    if (providerRole) await usersService.assignRoles(userId, [providerRole.id]);
  }
};
```

---

## ⚠️ المتبقي - ProviderEdit.jsx

### التبويبات المطلوبة (6 تبويبات)

#### Tab 0: Basic Info (أساسي)
```javascript
const renderBasicInfo = () => (
  <Grid container spacing={3}>
    <TextField label="اسم مقدم الخدمة" value={formData.name} />
    <TextField label="رقم الترخيص" value={formData.licenseNumber} disabled />
    <TextField label="الرقم الضريبي" value={formData.taxNumber} />
    <TextField select label="نوع مقدم الخدمة" value={formData.providerType} />
    <TextField select label="حالة الشبكة" value={formData.networkStatus} />
    <TextField select label="الحالة" value={formData.active} />
  </Grid>
);
```

#### Tab 1: Location (الموقع والتواصل)
```javascript
const renderLocationContact = () => (
  <Grid container spacing={3}>
    <TextField label="المدينة" value={formData.city} />
    <TextField label="العنوان" value={formData.address} />
    <TextField label="رقم الهاتف" value={formData.phone} />
    <TextField label="البريد الإلكتروني" value={formData.email} />
  </Grid>
);
```

#### Tab 2: Contracts (عقود)
```javascript
const renderContractInfo = () => (
  <Grid container spacing={3}>
    <GregorianDatePicker label="بداية العقد" value={formData.contractStartDate} />
    <GregorianDatePicker label="نهاية العقد" value={formData.contractEndDate} />
    <TextField label="نسبة الخصم %" value={formData.defaultDiscountRate} />
  </Grid>
);
```

#### Tab 3: Partners (شركاء) - **ADVANCED**
```javascript
const renderPartners = () => {
  const [payers, setPayers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(3);

  // Load partners on tab change
  useEffect(() => {
    if (activeTab === 3) loadPartnersData();
  }, [activeTab]);

  const loadPartnersData = async () => {
    const employersRes = await getEmployerSelectors();
    const allEmployers = employersRes;
    const allowedIds = await providersService.getAllowedEmployerIds(id);
    const allowedSet = new Set(allowedIds);
    
    const mapped = allEmployers.map(emp => ({
      id: emp.id,
      name: emp.label,
      enabled: allowedSet.has(emp.id)
    }));
    setPayers(mapped);
  };

  return (
    <Box>
      <FormControlLabel
        control={<Switch checked={formData.allowAllEmployers} />}
        label="شبكة عامة (السماح لجميع الجهات)"
      />
      {formData.allowAllEmployers ? (
        <Alert severity="success">وضع الشبكة العامة مفعل</Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>شريك التأمين</TableCell>
                <TableCell align="right">الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payers.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(payer => (
                <TableRow key={payer.id}>
                  <TableCell>{payer.name}</TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={payer.enabled}
                      onChange={() => handlePayerToggle(payer)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination />
        </TableContainer>
      )}
    </Box>
  );
};

const handlePayerToggle = (payer) => {
  setConfirmDialog({ open: true, payerId: payer.id, action: payer.enabled ? 'disable' : 'enable' });
};
```

#### Tab 4: Responsible User (مدير الحساب) - **ADVANCED**
```javascript
const renderResponsibleUser = () => {
  const [activeUser, setActiveUser] = useState(null);
  const [linkMode, setLinkMode] = useState('LINK'); // 'LINK' | 'CREATE'
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [unlinkDialog, setUnlinkDialog] = useState({ open: false, confirmationText: '' });

  // Load linked user on tab change
  useEffect(() => {
    if (activeTab === 4) fetchLinkedUser();
  }, [activeTab]);

  const fetchLinkedUser = async () => {
    const users = await usersService.getUsersByProvider(id);
    if (users.length > 0) {
      setActiveUser(users[0]);
    } else {
      fetchUnassignedUsers();
    }
  };

  const handleUnlinkUser = () => {
    setUnlinkDialog({ open: true, confirmationText: '' });
  };

  const handleConfirmUnlink = async () => {
    if (unlinkDialog.confirmationText !== activeUser.username) {
      enqueueSnackbar('النص المدخل غير صحيح', { variant: 'error' });
      return;
    }
    await usersService.updateUser(activeUser.id, { providerId: null });
    enqueueSnackbar('تم فك الارتباط بنجاح', { variant: 'success' });
    setActiveUser(null);
    setUnlinkDialog({ open: false, confirmationText: '' });
  };

  return (
    <Box>
      {activeUser ? (
        // Show Active User Card
        <Card>
          <CardContent>
            <Avatar>{activeUser.fullName?.charAt(0)}</Avatar>
            <Typography variant="h6">{activeUser.fullName}</Typography>
            <Typography variant="body2">{activeUser.username}</Typography>
          </CardContent>
          <CardActions>
            <Button color="error" onClick={handleUnlinkUser}>فك الارتباط</Button>
          </CardActions>
        </Card>
      ) : (
        // Show Link/Create Options
        <Paper>
          <RadioGroup value={linkMode} onChange={(e) => setLinkMode(e.target.value)}>
            <FormControlLabel value="LINK" label="ربط مستخدم موجود" />
            <FormControlLabel value="CREATE" label="إنشاء مستخدم جديد" />
          </RadioGroup>
          {linkMode === 'LINK' ? (
            <Autocomplete
              options={unassignedUsers}
              renderInput={(params) => <TextField {...params} label="اختر مستخدم" />}
            />
          ) : (
            <Grid container spacing={2}>
              <TextField label="اسم المستخدم" />
              <TextField label="كلمة المرور" type="password" />
              <TextField label="الاسم الكامل" />
            </Grid>
          )}
        </Paper>
      )}

      {/* Unlink Strict Confirmation Dialog */}
      <Dialog open={unlinkDialog.open}>
        <DialogTitle color="error.main">تأكيد فك ارتباط المسؤول</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            للتأكيد، يرجى كتابة اسم المستخدم: <strong>{activeUser?.username}</strong>
          </Alert>
          <TextField
            fullWidth
            autoFocus
            label="اكتب اسم المستخدم للتأكيد"
            value={unlinkDialog.confirmationText}
            onChange={(e) => setUnlinkDialog({ ...unlinkDialog, confirmationText: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkDialog({ open: false, confirmationText: '' })}>إلغاء</Button>
          <Button color="error" onClick={handleConfirmUnlink}>تأكيد الفك</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

#### Tab 5: Documents (مستندات) - **ADVANCED**
```javascript
const renderDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [docDialog, setDocDialog] = useState({
    open: false, type: 'LICENSE', expiryDate: '', notes: '', fileName: '', file: null
  });
  const [previewDialog, setPreviewDialog] = useState({ open: false, url: '', title: '' });

  const DOC_TYPE_LABELS = {
    'LICENSE': 'رخصة مزاولة مهنة',
    'COMMERCIAL_REGISTER': 'سجل تجاري',
    'TAX_CERTIFICATE': 'شهادة ضريبية',
    'CONTRACT_COPY': 'نسخة العقد',
    'OTHER': 'أخرى'
  };

  // Load documents on tab change
  useEffect(() => {
    if (activeTab === 5) fetchDocuments();
  }, [activeTab]);

  const fetchDocuments = async () => {
    const docs = await providersService.getDocuments(id);
    setDocuments(docs || []);
  };

  const handleAddDocument = async () => {
    const formDataDocs = new FormData();
    const dto = {
      providerId: id,
      type: docDialog.type,
      fileName: docDialog.fileName,
      expiryDate: docDialog.expiryDate || null,
      notes: docDialog.notes,
      documentNumber: `DOC-${Date.now()}`
    };
    formDataDocs.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (docDialog.file) formDataDocs.append('file', docDialog.file);

    await providersService.addDocument(id, formDataDocs);
    enqueueSnackbar('تم الإضافة بنجاح', { variant: 'success' });
    fetchDocuments();
  };

  const handlePreview = (doc) => {
    setPreviewDialog({ open: true, url: doc.fileUrl, title: doc.fileName });
  };

  const handleDelete = async (docId) => {
    await providersService.deleteDocument(id, docId);
    enqueueSnackbar('تم الحذف بنجاح', { variant: 'success' });
    fetchDocuments();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">المستندات</Typography>
        <Button variant="contained" onClick={() => setDocDialog({ ...docDialog, open: true })}>
          إضافة مستند
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>اسم الملف</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>تاريخ الانتهاء</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map(doc => (
              <TableRow key={doc.id}>
                <TableCell>{doc.fileName}</TableCell>
                <TableCell>
                  <Chip label={DOC_TYPE_LABELS[doc.type]} size="small" />
                </TableCell>
                <TableCell>{doc.expiryDate || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handlePreview(doc)}>
                    <Visibility />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(doc.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Document Dialog */}
      <Dialog open={docDialog.open}>
        <DialogTitle>إضافة مستند</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              select
              label="النوع"
              value={docDialog.type}
              onChange={(e) => setDocDialog({ ...docDialog, type: e.target.value })}
            >
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" component="label">
              {docDialog.fileName || 'اختر ملف'}
              <input
                type="file"
                hidden
                onChange={(e) => setDocDialog({
                  ...docDialog,
                  fileName: e.target.files[0].name,
                  file: e.target.files[0]
                })}
              />
            </Button>
            <TextField
              type="date"
              label="تاريخ الانتهاء"
              value={docDialog.expiryDate}
              onChange={(e) => setDocDialog({ ...docDialog, expiryDate: e.target.value })}
            />
            <TextField
              label="ملاحظات"
              multiline
              rows={3}
              value={docDialog.notes}
              onChange={(e) => setDocDialog({ ...docDialog, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialog({ ...docDialog, open: false })}>إلغاء</Button>
          <Button onClick={handleAddDocument} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} maxWidth="lg" fullWidth>
        <DialogTitle>{previewDialog.title}</DialogTitle>
        <DialogContent sx={{ height: '80vh' }}>
          {previewDialog.url && (
            <iframe
              src={previewDialog.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="preview"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ ...previewDialog, open: false })}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

---

## 🛠️ Required Backend Endpoints

تأكد من وجود الـ endpoints التالية في الـ backend:

```java
// UserController.java
@GetMapping("/admin/users/unassigned-providers")
public ResponseEntity<ApiResponse<List<UserDto>>> getUnassignedProviders()

@GetMapping("/admin/users/provider/{providerId}")
public ResponseEntity<ApiResponse<List<UserDto>>> getUsersByProvider(@PathVariable Long providerId)

// ProviderController.java
@GetMapping("/api/providers/{id}/documents")
public ResponseEntity<ApiResponse<List<ProviderDocumentDto>>> getDocuments(@PathVariable Long id)

@PostMapping("/api/providers/{id}/documents")
public ResponseEntity<ApiResponse<ProviderDocumentDto>> addDocument(
    @PathVariable Long id,
    @RequestPart("data") ProviderDocumentDto dto,
    @RequestPart("file") MultipartFile file
)

@DeleteMapping("/api/providers/{providerId}/documents/{docId}")
public ResponseEntity<ApiResponse<Void>> deleteDocument(
    @PathVariable Long providerId,
    @PathVariable Long docId
)

@GetMapping("/api/providers/{id}/allowed-employers")
public ResponseEntity<ApiResponse<List<Long>>> getAllowedEmployerIds(@PathVariable Long id)
```

---

## ✅ Checklist

- [x] إضافة وظائف usersService
- [x] إضافة وظائف providersService
- [x] استبدال ProviderCreate.jsx بالكامل
- [ ] **[TODO]** استبدال ProviderEdit.jsx بالكامل (824 سطر)
- [ ] اختبار Compile للـ frontend
- [ ] اختبار Create مع CREATE mode
- [ ] اختبار Create مع LINK mode
- [ ] اختبار Edit - جميع التبويبات
- [ ] اختبار User Link/Unlink
- [ ] اختبار Partners management
- [ ] اختبار Documents upload/delete

---

## 📝 Next Steps

بسبب حدود الـ Token، ملف ProviderEdit.jsx الكامل (824 سطر) جاهز للتطبيق لكنه يحتاج إلى:

1. **كتابة الملف الكامل** باستخدام نفس الطريقة المستخدمة في ProviderCreate.jsx
2. **التأكد من جميع الـ imports**:
   ```javascript
   import { useState, useEffect } from 'react';
   import { useNavigate, useParams } from 'react-router-dom';
   import { useSnackbar } from 'notistack';
   import { getEmployerSelectors } from 'services/api/employers.service';
   import { providersService } from 'services/api/providers.service';
   import { usersService } from 'services/rbac/users.service';
   import { rolesService } from 'services/rbac/roles.service';
   import { useTableRefresh } from 'contexts/TableRefreshContext';
   import GregorianDatePicker from 'components/common/GregorianDatePicker';
   // ... all MUI imports
   ```
3. **State Management** للـ 6 تبويبات
4. **3 Dialog Components**:
   - Unlink Confirmation Dialog
   - Partner Toggle Dialog
   - Document Add/Preview/Delete Dialogs

---

**Status**: ✅ ProviderCreate كامل | ⚠️ ProviderEdit (نحتاج تطبيقه)
**File Size**: 
- ProviderCreate.jsx: ~575 lines ✅
- ProviderEdit.jsx: ~824 lines (waiting)
