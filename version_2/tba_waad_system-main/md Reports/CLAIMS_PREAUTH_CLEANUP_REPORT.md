# 📋 تقرير التنظيف الشامل - Claims & Pre-Authorizations

**التاريخ:** 2026-01-15  
**الحالة:** ✅ مكتمل بنجاح  
**الوقت المستغرق:** ~30 دقيقة

---

## 📊 ملخص التنفيذ

| المهمة | الحالة | ملاحظات |
|--------|--------|---------|
| 1️⃣ إزالة Controllers القديمة | ✅ مكتمل | حذف PreApprovalController و PreAuthAttachmentController |
| 2️⃣ توحيد Attachments | ✅ مكتمل | إنشاء Entity + Repository + Service جديدة |
| 3️⃣ إصلاح /simple endpoint | ✅ مكتمل | تحديث Frontend لاستخدام endpoint القياسي |
| 4️⃣ إضافة Endpoints ناقصة - Claims | ✅ مكتمل | 3 endpoints جديدة |
| 5️⃣ إضافة Endpoints ناقصة - PreAuth | ✅ مكتمل | 2 endpoints جديدة |
| 6️⃣ تنظيف DTOs | ✅ مكتمل | إضافة @Deprecated لحقل status |
| 7️⃣ تنظيف Frontend Services | ✅ مكتمل | تحديث create method |
| 8️⃣ إصلاح Compilation Errors | ✅ مكتمل | إضافة UNDER_REVIEW enum + إزالة setCost |

---

## 🗑️ الملفات المحذوفة

```
backend/src/main/java/com/waad/tba/modules/preauth/controller/
├── PreApprovalController.java ❌
└── PreAuthAttachmentController.java ❌
```

**السبب:** كانت تستخدم `/api/pre-approvals` بينما النظام يستخدم `/api/pre-authorizations`

---

## 📁 الملفات المنشأة

### 1. PreAuthorizationAttachment.java
**المسار:** `modules/preauthorization/entity/`
```java
@Entity
@Table(name = "pre_authorization_attachments")
public class PreAuthorizationAttachment {
    private Long id;
    private Long preAuthorizationId;
    private String originalFileName;
    private String storedFileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private String attachmentType;
    private LocalDateTime createdAt;
    private String createdBy;
}
```

### 2. PreAuthorizationAttachmentRepository.java
**المسار:** `modules/preauthorization/repository/`
```java
public interface PreAuthorizationAttachmentRepository extends JpaRepository<PreAuthorizationAttachment, Long> {
    List<PreAuthorizationAttachment> findByPreAuthorizationId(Long preAuthorizationId);
    long countByPreAuthorizationId(Long preAuthorizationId);
    void deleteByPreAuthorizationId(Long preAuthorizationId);
}
```

### 3. PreAuthorizationAttachmentService.java
**المسار:** `modules/preauthorization/service/`
```java
@Service
public class PreAuthorizationAttachmentService {
    // uploadAttachment()
    // getAttachments()
    // getAttachment()
    // downloadAttachment()
    // deleteAttachment()
    // countAttachments()
}
```

---

## 🔧 الملفات المعدّلة

### Backend

| الملف | التعديلات |
|-------|-----------|
| `PreAuthorizationController.java` | إضافة 6 endpoints جديدة للـ attachments و start-review و check-validity |
| `PreAuthorizationService.java` | إضافة methods: `startReview()`, `checkValidity()` |
| `PreAuthorization.java` (Entity) | إضافة `UNDER_REVIEW` للـ PreAuthStatus enum |
| `ClaimController.java` | إضافة 3 endpoints: `/visit/{id}`, `/number/{num}`, `/status/{status}` |
| `ClaimService.java` | إضافة methods: `getClaimsByVisit()`, `getClaimByNumber()`, `getClaimsByStatus()` |
| `ClaimRepository.java` | إضافة queries: `findByVisitId()`, `findByClaimNumber()` |
| `ClaimUpdateDto.java` | إضافة `@Deprecated` لحقل status |
| `MedicalServiceBulkImportService.java` | إزالة `setCost()` (الحقل غير موجود) |

### Frontend

| الملف | التعديلات |
|-------|-----------|
| `pre-approvals.service.js` | تحديث `create()` لاستخدام endpoint القياسي بدلاً من `/simple` |

---

## 🔗 الـ Endpoints المُضافة

### Claims Module

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/claims/visit/{visitId}` | جلب المطالبات حسب الزيارة |
| GET | `/api/claims/number/{claimNumber}` | جلب مطالبة برقمها |
| GET | `/api/claims/status/{status}` | جلب المطالبات حسب الحالة |

### Pre-Authorizations Module

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/pre-authorizations/{id}/start-review` | بدء مراجعة الموافقة |
| GET | `/api/pre-authorizations/check-validity` | التحقق من صلاحية الموافقة |
| POST | `/api/pre-authorizations/{id}/attachments` | رفع مرفق |
| GET | `/api/pre-authorizations/{id}/attachments` | جلب المرفقات |
| GET | `/api/pre-authorizations/{id}/attachments/{attachmentId}` | تحميل مرفق |
| DELETE | `/api/pre-authorizations/{id}/attachments/{attachmentId}` | حذف مرفق |

---

## 📊 PreAuthStatus Enum - الحالات المتاحة

```java
public enum PreAuthStatus {
    PENDING,       // في انتظار المراجعة
    UNDER_REVIEW,  // قيد المراجعة ← جديد
    APPROVED,      // معتمدة وصالحة
    REJECTED,      // مرفوضة
    EXPIRED,       // منتهية الصلاحية
    CANCELLED,     // ملغاة
    USED           // مستخدمة في مطالبة
}
```

---

## ⚠️ ملاحظات مهمة

### 1. Visit-Centric Architecture
```
⚠️ يجب إنشاء Pre-Authorization من Visit موجودة
visitId مطلوب في PreAuthorizationCreateDto
```

### 2. Claim Entity Dependency
```
⚠️ تم الاحتفاظ بـ preauth/entity و preauth/repository
لأن Claim.java يعتمد على PreApproval.java
فقط Controllers تم حذفها
```

### 3. Status Changes via Workflow
```
⚠️ تغيير Status يجب أن يتم عبر workflow endpoints:
- /submit
- /start-review
- /approve
- /reject
- /settle

حقل status في ClaimUpdateDto تم وضعه كـ @Deprecated
```

---

## 🧪 اختبار التجميع

```bash
cd /workspaces/tba_waad_system/backend
mvn compile -q
# ✅ نجح بدون أخطاء
```

---

## 📋 الخطوات القادمة (اختياري)

1. **Database Migration:** إنشاء جدول `pre_authorization_attachments`
2. **Testing:** اختبار الـ endpoints الجديدة
3. **Documentation:** تحديث Swagger/OpenAPI
4. **Flyway:** إضافة migration script للجدول الجديد

### Migration Script المقترح

```sql
-- V__add_preauth_attachments.sql
CREATE TABLE IF NOT EXISTS pre_authorization_attachments (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    attachment_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    CONSTRAINT fk_preauth_attachment
        FOREIGN KEY (pre_authorization_id)
        REFERENCES pre_authorizations(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_preauth_attachments_preauth_id 
    ON pre_authorization_attachments(pre_authorization_id);
```

---

## ✅ خلاصة

تم تنفيذ خطة التنظيف الشاملة بنجاح:

- 🗑️ **2 ملفات محذوفة** (Controllers مكررة)
- 📁 **3 ملفات جديدة** (Attachment support)
- 🔧 **8 ملفات معدّلة** (Endpoints + Services)
- ✅ **0 أخطاء تجميع**
- 🔗 **9 endpoints جديدة** متوفرة

**النظام الآن:**
- ✅ يستخدم `/api/pre-authorizations` بشكل موحد
- ✅ يدعم Attachments للموافقات المسبقة
- ✅ يتوافق مع Visit-Centric Architecture
- ✅ لديه جميع الـ endpoints المطلوبة للـ Claims و PreAuth

---

*تم إنشاء هذا التقرير تلقائياً - 2026-01-15*
