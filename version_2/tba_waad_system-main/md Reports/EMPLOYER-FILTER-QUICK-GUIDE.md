# 📘 دليل سريع - فلتر صاحب العمل (Employer Filter Quick Reference)

## 🎯 للمطورين - استخدام الفلتر في 3 خطوات

### ✅ الخطوة 1: في React Component

```javascript
import { useEmployerFilter } from 'contexts/EmployerFilterContext';
import EmployerFilterSelector from 'components/tba/EmployerFilterSelector';

function MyPage() {
  const { selectedEmployerId } = useEmployerFilter();
  
  // في fetcher function
  const fetcher = useCallback(async (params) => {
    return myService.getAll({
      ...params,
      employerId: selectedEmployerId  // ⭐ هذا الأهم
    });
  }, [selectedEmployerId]);  // ⭐ Re-fetch عند التغيير
  
  return (
    <>
      <ModernPageHeader
        actions={<EmployerFilterSelector />}  {/* ⭐ إضافة الفلتر */}
      />
      <TbaDataTable fetcher={fetcher} />
    </>
  );
}
```

---

### ✅ الخطوة 2: في API Service

```javascript
export const getMyData = async (params) => {
  return axiosClient.get('/api/my-endpoint', {
    params: {
      page: params.page,
      size: params.size,
      employerId: params.employerId  // ⭐ تمرير للـ Backend
    }
  });
};
```

---

### ✅ الخطوة 3: في Backend Controller

```java
@GetMapping
public ResponseEntity<PaginationResponse<MyDto>> list(
    @RequestParam(required = false) Long employerId,  // ⭐ Optional parameter
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
) {
    Page<MyDto> result = service.list(employerId, page, size);
    return ResponseEntity.ok(ApiResponse.success(result));
}
```

---

### ✅ الخطوة 4: في Backend Service

```java
import com.waad.tba.common.specification.EmployerFilterSpecification;

public Page<MyEntity> list(Long employerId, int page, int size) {
    Specification<MyEntity> spec = Specification.where(null);
    
    // ⭐ تطبيق فلتر صاحب العمل
    spec = spec.and(EmployerFilterSpecification.byEmployer(
        employerId, 
        "member.employerOrganization.id"  // أو "employerOrganization.id" إذا مباشر
    ));
    
    Pageable pageable = PageRequest.of(page, size);
    return repository.findAll(spec, pageable);
}
```

---

## 🔑 Property Paths حسب Entity

| Entity | Path للفلتر |
|--------|-------------|
| Member | `employerOrganization.id` |
| Claim | `member.employerOrganization.id` |
| Visit | `member.employerOrganization.id` |
| PreApproval | `member.employerOrganization.id` |

---

## ⚠️ قواعد إلزامية

### ❌ ممنوع - Client-side filtering:
```javascript
// ❌ WRONG
const filtered = data.filter(item => item.employerId === selectedEmployerId);
```

### ✅ صحيح - Server-side filtering:
```javascript
// ✅ CORRECT
const data = await api.get('/endpoint', {
  params: { employerId: selectedEmployerId }
});
```

---

## 🎨 UI Patterns

### Pattern 1: في Page Header
```jsx
<ModernPageHeader
  title="المطالبات"
  actions={
    <Stack direction="row" spacing={2}>
      <EmployerFilterSelector />  {/* الفلتر */}
      <Button>إضافة</Button>
    </Stack>
  }
/>
```

### Pattern 2: في Toolbar
```jsx
<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
  <EmployerFilterSelector />
  <TextField placeholder="بحث..." />
  <Button>تصدير</Button>
</Stack>
```

---

## 🔒 Security Notes

1. **employerId دائماً في Backend**: لا تعتمد على Frontend
2. **EMPLOYER_ADMIN**: يُجبر على employer الخاص به
3. **SUPER_ADMIN**: يرى الكل إذا employerId = null
4. **لا تسريب**: جميع queries مفلترة في Database

---

## 🧪 Testing Checklist

- [ ] الفلتر يظهر في UI
- [ ] تغيير الفلتر يُحدّث البيانات
- [ ] البيانات صحيحة حسب صاحب العمل
- [ ] EMPLOYER_ADMIN لا يرى غير بياناته
- [ ] SUPER_ADMIN يرى الكل
- [ ] لا أخطاء في Console

---

## 📚 أمثلة جاهزة

انظر إلى:
- ✅ `ClaimsList.jsx` - مرجع كامل
- ✅ `Dashboard/index.jsx` - استخدام متقدم
- ✅ `MembersList.jsx` - Implementation أصلي

---

**نهاية الدليل السريع** 📘
