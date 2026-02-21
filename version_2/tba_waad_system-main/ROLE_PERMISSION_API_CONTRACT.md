# 📄 ROLE & PERMISSION API CONTRACT

> **وثيقة العقد الرسمي بين Backend و Frontend لوحدة الأدوار والصلاحيات (RBAC)**  
> **الإصدار:** 1.0  
> **التاريخ:** 2026-01-13  
> **الحالة:** ✅ مُثبَّت

---

## 📑 الفهرس
1. [نظرة عامة](#نظرة-عامة)
2. [Role DTOs](#role-dtos)
3. [Role Endpoints](#role-endpoints)
4. [Permission DTOs](#permission-dtos)
5. [Permission Endpoints](#permission-endpoints)
6. [الصلاحيات المطلوبة](#الصلاحيات-المطلوبة)
7. [أمثلة الاستخدام](#أمثلة-الاستخدام)

---

## نظرة عامة

نظام RBAC (Role-Based Access Control) يدير الأدوار والصلاحيات في النظام.

### ⚠️ قواعد صارمة:
- Base URL للأدوار: `/api/admin/roles`
- Base URL للصلاحيات: `/api/admin/permissions`
- العلاقة Many-to-Many بين Role و Permission
- الـ pagination في هذا الموديول يستخدم `page` بصيغة **0-based**

---

## Role DTOs

### 📤 RoleResponseDto (للقراءة)

```typescript
interface RoleResponseDto {
  id: number;                            // معرف الدور
  name: string;                          // اسم الدور (فريد)
  description: string | null;            // وصف الدور
  permissions: PermissionResponseDto[];  // الصلاحيات المُسندة
  createdAt: string;                     // تاريخ الإنشاء ISO
  updatedAt: string;                     // تاريخ التحديث ISO
}
```

### 📥 RoleCreateDto (للإنشاء/التحديث)

```typescript
interface RoleCreateDto {
  name: string;                  // اسم الدور (مطلوب)
  description?: string;          // وصف الدور (اختياري)
}
```

### 📥 AssignPermissionsDto (لإسناد الصلاحيات)

```typescript
interface AssignPermissionsDto {
  permissionIds: number[];       // قائمة معرفات الصلاحيات (مطلوبة)
}
```

---

## Role Endpoints

### 📋 1. قائمة كل الأدوار

```http
GET /api/admin/roles
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "SUPER_ADMIN",
      "description": "مدير النظام",
      "permissions": [
        { "id": 1, "name": "VIEW_ALL", "description": "عرض الكل" },
        { "id": 2, "name": "MANAGE_ALL", "description": "إدارة الكل" }
      ],
      "createdAt": "2026-01-01T00:00:00",
      "updatedAt": "2026-01-13T10:30:00"
    }
  ],
  "timestamp": "2026-01-13T10:30:00"
}
```

### 📄 2. الأدوار مع Pagination

```http
GET /api/admin/roles/paginate
```

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `page`    | number | 0       | رقم الصفحة (**0-based**) |
| `size`    | number | 10      | حجم الصفحة |

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "content": [RoleResponseDto, ...],
    "totalElements": 15,
    "totalPages": 2,
    "size": 10,
    "number": 0,
    "first": true,
    "last": false
  },
  "timestamp": "..."
}
```

> ⚠️ **ملاحظة:** يُرجع Spring Page format (content, totalElements) وليس PaginationResponse

### 🔍 3. جلب دور بالمعرف

```http
GET /api/admin/roles/{id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": { ...RoleResponseDto },
  "timestamp": "..."
}
```

### 🔎 4. بحث في الأدوار

```http
GET /api/admin/roles/search?query={searchTerm}
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [RoleResponseDto, ...],
  "timestamp": "..."
}
```

### ➕ 5. إنشاء دور جديد

```http
POST /api/admin/roles
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "INSURANCE_ADMIN",
  "description": "مدير شركة التأمين"
}
```

**Response:** `201 Created`
```json
{
  "status": 201,
  "message": "Role created successfully",
  "data": { ...RoleResponseDto },
  "timestamp": "..."
}
```

### ✏️ 6. تحديث دور

```http
PUT /api/admin/roles/{id}
Content-Type: application/json
```

**Request Body:** نفس `RoleCreateDto`

**Response:** `200 OK`
```json
{
  "status": 200,
  "message": "Role updated successfully",
  "data": { ...RoleResponseDto },
  "timestamp": "..."
}
```

### 🗑️ 7. حذف دور

```http
DELETE /api/admin/roles/{id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Role deleted successfully",
  "data": null,
  "timestamp": "..."
}
```

### 🔗 8. إسناد صلاحيات للدور

```http
POST /api/admin/roles/{id}/assign-permissions
Content-Type: application/json
```

**Request Body:**
```json
{
  "permissionIds": [1, 2, 3, 4, 5]
}
```

**Response:** `200 OK`
```json
{
  "status": 200,
  "message": "Permissions assigned successfully",
  "data": {
    "id": 1,
    "name": "INSURANCE_ADMIN",
    "description": "مدير شركة التأمين",
    "permissions": [
      { "id": 1, "name": "VIEW_MEMBERS", "description": "عرض الأعضاء" },
      { "id": 2, "name": "MANAGE_CLAIMS", "description": "إدارة المطالبات" }
    ]
  },
  "timestamp": "..."
}
```

---

## Permission DTOs

### 📤 PermissionResponseDto (للقراءة)

```typescript
interface PermissionResponseDto {
  id: number;                    // معرف الصلاحية
  name: string;                  // اسم الصلاحية (فريد)
  description: string | null;    // وصف الصلاحية
  createdAt: string;             // تاريخ الإنشاء ISO
  updatedAt: string;             // تاريخ التحديث ISO
}
```

### 📥 PermissionCreateDto (للإنشاء/التحديث)

```typescript
interface PermissionCreateDto {
  name: string;                  // اسم الصلاحية (مطلوب)
  description?: string;          // وصف الصلاحية (اختياري)
}
```

---

## Permission Endpoints

### 📋 1. قائمة كل الصلاحيات

```http
GET /api/admin/permissions
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "VIEW_MEMBERS",
      "description": "عرض الأعضاء",
      "createdAt": "2026-01-01T00:00:00",
      "updatedAt": "2026-01-13T10:30:00"
    },
    {
      "id": 2,
      "name": "MANAGE_CLAIMS",
      "description": "إدارة المطالبات",
      "createdAt": "2026-01-01T00:00:00",
      "updatedAt": "2026-01-13T10:30:00"
    }
  ],
  "timestamp": "..."
}
```

### 📄 2. الصلاحيات مع Pagination

```http
GET /api/admin/permissions/paginate
```

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `page`    | number | 0       | رقم الصفحة (**0-based**) |
| `size`    | number | 10      | حجم الصفحة |

**Response:** نفس format الـ Spring Page

### 🔍 3. جلب صلاحية بالمعرف

```http
GET /api/admin/permissions/{id}
```

### 🔎 4. بحث في الصلاحيات

```http
GET /api/admin/permissions/search?query={searchTerm}
```

### ➕ 5. إنشاء صلاحية جديدة

```http
POST /api/admin/permissions
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "EXPORT_REPORTS",
  "description": "تصدير التقارير"
}
```

**Response:** `201 Created`

### ✏️ 6. تحديث صلاحية

```http
PUT /api/admin/permissions/{id}
Content-Type: application/json
```

### 🗑️ 7. حذف صلاحية

```http
DELETE /api/admin/permissions/{id}
```

---

## الصلاحيات المطلوبة

### Role Endpoints

| Endpoint | Permission Required |
|----------|---------------------|
| `GET /api/admin/roles` | `SUPER_ADMIN` أو `roles.view` |
| `GET /api/admin/roles/paginate` | `SUPER_ADMIN` أو `roles.view` |
| `GET /api/admin/roles/{id}` | `SUPER_ADMIN` أو `roles.view` |
| `GET /api/admin/roles/search` | `SUPER_ADMIN` أو `roles.view` |
| `POST /api/admin/roles` | `SUPER_ADMIN` أو `roles.manage` |
| `PUT /api/admin/roles/{id}` | `SUPER_ADMIN` أو `roles.manage` |
| `DELETE /api/admin/roles/{id}` | `SUPER_ADMIN` أو `roles.manage` |
| `POST /api/admin/roles/{id}/assign-permissions` | `SUPER_ADMIN` أو `roles.assign_permissions` |

### Permission Endpoints

| Endpoint | Permission Required |
|----------|---------------------|
| `GET /api/admin/permissions` | `SUPER_ADMIN` أو `permissions.view` |
| `GET /api/admin/permissions/paginate` | `SUPER_ADMIN` أو `permissions.view` |
| `GET /api/admin/permissions/{id}` | `SUPER_ADMIN` أو `permissions.view` |
| `GET /api/admin/permissions/search` | `SUPER_ADMIN` أو `permissions.view` |
| `POST /api/admin/permissions` | `SUPER_ADMIN` أو `permissions.manage` |
| `PUT /api/admin/permissions/{id}` | `SUPER_ADMIN` أو `permissions.manage` |
| `DELETE /api/admin/permissions/{id}` | `SUPER_ADMIN` أو `permissions.manage` |

---

## أمثلة الاستخدام

### Frontend - جلب الأدوار

```javascript
// ✅ صحيح
const response = await api.get('/api/admin/roles');
const roles = response.data.data;

roles.forEach(role => {
  console.log(`الدور: ${role.name}`);
  console.log(`عدد الصلاحيات: ${role.permissions.length}`);
  
  role.permissions.forEach(perm => {
    console.log(`  - ${perm.name}: ${perm.description}`);
  });
});
```

### Frontend - جلب الأدوار مع Pagination

```javascript
// ✅ صحيح - انتبه page=0 أول صفحة
const response = await api.get('/api/admin/roles/paginate', {
  params: { page: 0, size: 10 }
});

// ⚠️ Spring Page format
const { content, totalElements, totalPages } = response.data.data;

console.log(`الإجمالي: ${totalElements}`);
console.log(`عدد الصفحات: ${totalPages}`);
content.forEach(role => console.log(role.name));
```

### Frontend - إنشاء دور جديد

```javascript
// ✅ صحيح
const newRole = {
  name: 'CLAIMS_REVIEWER',
  description: 'مراجع المطالبات'
};

const response = await api.post('/api/admin/roles', newRole);
const createdRole = response.data.data;
console.log(`تم إنشاء الدور: ${createdRole.name}`);
```

### Frontend - إسناد صلاحيات للدور

```javascript
// ✅ صحيح
const roleId = 5;
const permissionsToAssign = {
  permissionIds: [10, 20, 30]  // معرفات الصلاحيات
};

await api.post(`/api/admin/roles/${roleId}/assign-permissions`, permissionsToAssign);
```

### Frontend - جلب الصلاحيات للـ Checkbox List

```javascript
// ✅ صحيح
const response = await api.get('/api/admin/permissions');
const allPermissions = response.data.data;

// عرض في Checkbox list
allPermissions.map(perm => ({
  id: perm.id,
  label: `${perm.name} - ${perm.description}`,
  checked: currentRole.permissions.some(p => p.id === perm.id)
}));
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

| ❌ خطأ | ✅ صحيح |
|--------|---------|
| `/api/roles` | `/api/admin/roles` |
| `/api/permissions` | `/api/admin/permissions` |
| `page=1` (للصفحة الأولى) | `page=0` (0-based) |
| `data.items` | `data.content` (Spring Page) |
| `data.total` | `data.totalElements` (Spring Page) |
| `role.permissionIds` | `role.permissions` (Array of objects) |
| `{ permissions: [1,2,3] }` | `{ permissionIds: [1,2,3] }` |

---

## 🔗 العلاقات

### Role ↔ Permission

- علاقة **Many-to-Many**
- جدول وسيط: `role_permissions`
- الدور يحتوي على مجموعة صلاحيات
- الصلاحية يمكن أن تكون في أكثر من دور

```
┌─────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────┐
│       Role          │──────>│     role_permissions    │<──────│     Permission      │
│                     │       │  (role_id, permission_id)│       │                     │
│  - id               │       └─────────────────────────┘       │  - id               │
│  - name             │                                         │  - name             │
│  - description      │                                         │  - description      │
│  - permissions[]    │                                         │  - module           │
└─────────────────────┘                                         └─────────────────────┘
```

### User ↔ Role

- علاقة **Many-to-Many**
- المستخدم يمكن أن يكون له أكثر من دور
- راجع User API Contract للتفاصيل

---

## 📝 الصلاحيات القياسية في النظام

| Module | Permissions |
|--------|-------------|
| Members | `VIEW_MEMBERS`, `MANAGE_MEMBERS`, `EXPORT_MEMBERS` |
| Claims | `VIEW_CLAIMS`, `MANAGE_CLAIMS`, `APPROVE_CLAIMS`, `REJECT_CLAIMS` |
| Visits | `VIEW_VISITS`, `MANAGE_VISITS` |
| Providers | `VIEW_PROVIDERS`, `MANAGE_PROVIDERS` |
| Reports | `VIEW_REPORTS`, `EXPORT_REPORTS` |
| Settings | `VIEW_SETTINGS`, `MANAGE_SETTINGS` |
| Roles | `roles.view`, `roles.manage`, `roles.assign_permissions` |
| Permissions | `permissions.view`, `permissions.manage` |

---

**📋 آخر تحديث:** 2026-01-13  
**✍️ المُعد:** GitHub Copilot  
**🔒 الحالة:** عقد ثابت ومُلزم
