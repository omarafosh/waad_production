# 📄 VISIT API CONTRACT

> **وثيقة العقد الرسمي بين Backend و Frontend لوحدة الزيارات**  
> **الإصدار:** 1.0  
> **التاريخ:** 2026-01-13  
> **الحالة:** ✅ مُثبَّت

---

## 📑 الفهرس
1. [نظرة عامة](#نظرة-عامة)
2. [الـ DTOs الرسمية](#الـ-dtos-الرسمية)
3. [Endpoints](#endpoints)
4. [Enums المتاحة](#enums-المتاحة)
5. [Visit Attachments API](#visit-attachments-api)
6. [الصلاحيات المطلوبة](#الصلاحيات-المطلوبة)
7. [أمثلة الاستخدام](#أمثلة-الاستخدام)

---

## نظرة عامة

هذا العقد يحدد **الحقول والأنواع الدقيقة** التي يجب استخدامها عند التعامل مع API الزيارات.

### ⚠️ قواعد صارمة:
- استخدم **الأسماء الموجودة هنا بالضبط** (case-sensitive)
- لا تضف حقولاً غير موجودة
- التواريخ بصيغة **ISO 8601** (`yyyy-MM-dd` أو `yyyy-MM-ddTHH:mm:ss`)

---

## الـ DTOs الرسمية

### 📤 VisitResponseDto (للقراءة)

```typescript
interface VisitResponseDto {
  id: number;                    // معرف الزيارة
  memberId: number;              // معرف العضو
  memberName: string;            // اسم العضو (كامل)
  memberNumber: string;          // رقم العضوية
  providerId: number | null;     // معرف مقدم الخدمة (اختياري)
  visitDate: string;             // تاريخ الزيارة "yyyy-MM-dd"
  doctorName: string;            // اسم الطبيب
  specialty: string | null;      // التخصص
  diagnosis: string | null;      // التشخيص
  treatment: string | null;      // العلاج
  totalAmount: number | null;    // المبلغ الإجمالي
  notes: string | null;          // ملاحظات
  active: boolean;               // نشطة؟
  visitType: VisitType;          // نوع الزيارة (enum)
  visitTypeLabel: string;        // تسمية نوع الزيارة بالعربي
  createdAt: string;             // تاريخ الإنشاء ISO
  updatedAt: string;             // تاريخ التحديث ISO
}
```

### 📥 VisitCreateDto (للإنشاء/التحديث)

```typescript
interface VisitCreateDto {
  memberId: number;              // مطلوب - معرف العضو
  providerId?: number;           // اختياري - معرف مقدم الخدمة
  visitDate: string;             // مطلوب - "yyyy-MM-dd"
  doctorName: string;            // مطلوب - اسم الطبيب (غير فارغ)
  specialty?: string;            // اختياري - التخصص
  diagnosis?: string;            // اختياري - التشخيص
  treatment?: string;            // اختياري - العلاج
  totalAmount?: number;          // اختياري - المبلغ الإجمالي
  notes?: string;                // اختياري - ملاحظات
  visitType?: VisitType;         // اختياري - افتراضي OUTPATIENT
}
```

---

## Endpoints

### 📋 1. قائمة الزيارات (Paginated) - الأساسي

```http
GET /api/visits
```

| Parameter    | Type     | Default    | Description |
|-------------|----------|------------|-------------|
| `page`      | number   | 1          | رقم الصفحة (1-based) |
| `size`      | number   | 10         | حجم الصفحة |
| `search`    | string   | null       | نص البحث |
| `sortBy`    | string   | createdAt  | الحقل للترتيب |
| `sortDir`   | string   | desc       | اتجاه الترتيب (asc/desc) |
| `employerId`| number   | null       | تصفية حسب صاحب العمل |

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "items": [VisitResponseDto, ...],
    "total": 150,
    "page": 1,
    "size": 10
  },
  "timestamp": "2026-01-13T10:30:00"
}
```

### 🔍 2. جلب زيارة واحدة

```http
GET /api/visits/{id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": { ...VisitResponseDto },
  "timestamp": "..."
}
```

### ➕ 3. إنشاء زيارة جديدة

```http
POST /api/visits
Content-Type: application/json
```

**Request Body:**
```json
{
  "memberId": 123,
  "providerId": 5,
  "visitDate": "2026-01-13",
  "doctorName": "د. محمد أحمد",
  "specialty": "باطنية",
  "diagnosis": "التهاب الحلق",
  "treatment": "مضاد حيوي",
  "totalAmount": 150.00,
  "notes": "متابعة بعد 5 أيام",
  "visitType": "OUTPATIENT"
}
```

**Response:** `201 Created`
```json
{
  "status": 201,
  "message": "Visit created successfully",
  "data": { ...VisitResponseDto },
  "timestamp": "..."
}
```

### ✏️ 4. تحديث زيارة

```http
PUT /api/visits/{id}
Content-Type: application/json
```

**Request Body:** نفس `VisitCreateDto`

**Response:** `200 OK`
```json
{
  "status": 200,
  "message": "Visit updated successfully",
  "data": { ...VisitResponseDto },
  "timestamp": "..."
}
```

### 🗑️ 5. حذف زيارة

```http
DELETE /api/visits/{id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Visit deleted successfully",
  "data": null,
  "timestamp": "..."
}
```

### 🔢 6. عدد الزيارات

```http
GET /api/visits/count?employerId={id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": 350,
  "timestamp": "..."
}
```

---

## Enums المتاحة

### VisitType (نوع الزيارة)

| Enum Value      | Arabic Label       | English Label    | Code      |
|-----------------|-------------------|------------------|-----------|
| `EMERGENCY`     | طوارئ             | Emergency        | ER        |
| `OUTPATIENT`    | عيادة خارجية      | Outpatient       | OPD       |
| `INPATIENT`     | إقامة داخلية      | Inpatient        | IPD       |
| `ROUTINE`       | روتينية           | Routine Check-up | ROUTINE   |
| `FOLLOW_UP`     | متابعة            | Follow-up        | FOLLOWUP  |
| `PREVENTIVE`    | وقائية            | Preventive       | PREV      |
| `SPECIALIZED`   | تخصصية            | Specialized      | SPEC      |
| `HOME_CARE`     | رعاية منزلية      | Home Care        | HOME      |
| `TELECONSULTATION` | استشارة عن بُعد | Teleconsultation | TELE      |
| `DAY_SURGERY`   | جراحة يومية       | Day Surgery      | DAY_SURG  |

**⚡ الافتراضي:** `OUTPATIENT`

### VisitStatus (حالة الزيارة)

| Enum Value        | Arabic Label       | English Label     | Actions Allowed |
|-------------------|-------------------|-------------------|-----------------|
| `REGISTERED`      | مسجلة             | Registered        | Claim ✅ PreAuth ✅ |
| `IN_PROGRESS`     | قيد التنفيذ       | In Progress       | Claim ✅ PreAuth ✅ |
| `PENDING_PREAUTH` | انتظار الموافقة   | Pending Pre-Auth  | ❌ |
| `PREAUTH_APPROVED`| موافقة مسبقة      | Pre-Auth Approved | Claim ✅ |
| `CLAIM_SUBMITTED` | مطالبة مقدمة      | Claim Submitted   | ❌ |
| `COMPLETED`       | مكتملة            | Completed         | ❌ |
| `CANCELLED`       | ملغاة             | Cancelled         | ❌ |

---

## Visit Attachments API

### 📤 رفع مرفق

```http
POST /api/visits/{visitId}/attachments
Content-Type: multipart/form-data
```

| Parameter       | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `file`         | File   | ✅       | الملف المرفوع |
| `attachmentType` | string | ✅     | نوع المرفق (enum) |
| `description`  | string | ❌       | وصف المرفق |

### 📋 قائمة المرفقات

```http
GET /api/visits/{visitId}/attachments
```

**Response:**
```json
[
  {
    "id": 1,
    "visitId": 123,
    "attachmentType": "XRAY",
    "originalFileName": "chest_xray.jpg",
    "fileType": "image/jpeg",
    "description": "أشعة صدر"
  }
]
```

### ⬇️ تحميل مرفق

```http
GET /api/visits/{visitId}/attachments/{attachmentId}
```

**Response:** ملف بايناري مع `Content-Disposition: attachment`

### 🗑️ حذف مرفق

```http
DELETE /api/visits/{visitId}/attachments/{attachmentId}
```

### VisitAttachmentType (نوع المرفق)

| Enum Value      | Arabic Label      | English Label   |
|-----------------|------------------|-----------------|
| `XRAY`          | أشعة سينية       | X-Ray           |
| `MRI`           | رنين مغناطيسي    | MRI Scan        |
| `CT_SCAN`       | أشعة مقطعية      | CT Scan         |
| `ULTRASOUND`    | موجات فوق صوتية  | Ultrasound      |
| `LAB_RESULT`    | نتيجة مختبر      | Lab Result      |
| `ECG`           | تخطيط قلب        | ECG/EKG         |
| `PRESCRIPTION`  | وصفة طبية        | Prescription    |
| `MEDICAL_REPORT`| تقرير طبي        | Medical Report  |
| `OTHER`         | أخرى             | Other           |

---

## الصلاحيات المطلوبة

| Endpoint            | Permission Required                |
|--------------------|------------------------------------|
| `GET /api/visits`  | `SUPER_ADMIN` or `VIEW_VISITS`     |
| `GET /api/visits/{id}` | `SUPER_ADMIN` or `VIEW_VISITS` |
| `POST /api/visits` | `SUPER_ADMIN` or `MANAGE_VISITS`   |
| `PUT /api/visits/{id}` | `SUPER_ADMIN` or `MANAGE_VISITS` |
| `DELETE /api/visits/{id}` | `SUPER_ADMIN` or `MANAGE_VISITS` |
| Attachments        | `VISIT_CREATE`, `VISIT_UPDATE`, `VISIT_VIEW`, `VISIT_DELETE`, or `ADMIN` |

---

## أمثلة الاستخدام

### Frontend - جلب الزيارات

```javascript
// ✅ صحيح
const response = await api.get('/api/visits', {
  params: {
    page: 1,
    size: 10,
    sortBy: 'visitDate',
    sortDir: 'desc',
    search: 'محمد'
  }
});
const { items, total, page, size } = response.data.data;

// ✅ استخدام الحقول الصحيحة
items.forEach(visit => {
  console.log(visit.memberName);      // ✅
  console.log(visit.visitTypeLabel);  // ✅ التسمية بالعربي
  console.log(visit.doctorName);      // ✅
});
```

### Frontend - إنشاء زيارة

```javascript
// ✅ صحيح
const newVisit = {
  memberId: 123,
  visitDate: '2026-01-13',
  doctorName: 'د. محمد',
  specialty: 'باطنية',
  visitType: 'OUTPATIENT'  // ✅ استخدم قيم الـ enum
};

const response = await api.post('/api/visits', newVisit);
```

### Frontend - رفع مرفق

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('attachmentType', 'XRAY');
formData.append('description', 'أشعة صدر');

await api.post(`/api/visits/${visitId}/attachments`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 🔄 التغييرات القادمة

| التغيير | الحالة | الإصدار |
|---------|--------|---------|
| إضافة status للـ VisitResponseDto | 🔜 قريباً | 1.1 |
| فلترة حسب visitType | 🔜 قريباً | 1.1 |
| فلترة حسب نطاق تاريخ | 🔜 قريباً | 1.1 |

---

## ⚠️ أخطاء شائعة يجب تجنبها

| ❌ خطأ | ✅ صحيح |
|--------|---------|
| `memberFullName` | `memberName` |
| `doctor` | `doctorName` |
| `type` | `visitType` |
| `typeLabel` | `visitTypeLabel` |
| `sort=visitDate,desc` | `sortBy=visitDate&sortDir=desc` |
| `data.content` | `data.items` |
| `data.totalElements` | `data.total` |

---

**📋 آخر تحديث:** 2026-01-13  
**✍️ المُعد:** GitHub Copilot  
**🔒 الحالة:** عقد ثابت ومُلزم
