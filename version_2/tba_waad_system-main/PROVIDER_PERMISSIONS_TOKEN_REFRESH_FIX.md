# إصلاح مشكلة الصلاحيات المتغيرة لمقدم الخدمة
## Provider Permissions Token Refresh Fix

**التاريخ:** 7 فبراير 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ تم الحل

---

## 📋 المشكلة | Problem

### الوصف العربي
عند تحديد صلاحيات لدور مقدم الخدمة (PROVIDER) من واجهة إدارة المزودين:
- ✅ يتم حفظ الصلاحيات بنجاح في قاعدة البيانات
- ❌ **عند تسجيل خروج ودخول المستخدم، تختفي الصلاحيات الجديدة**
- ❌ يحتاج المستخدم لإعادة تعيين الصلاحيات في كل مرة

### English Description
When assigning permissions to PROVIDER role from the provider management interface:
- ✅ Permissions are successfully saved in the database
- ❌ **After logout/login, new permissions disappear**
- ❌ User needs to re-assign permissions every time

---

## 🔍 السبب الجذري | Root Cause

### التحليل الفني
المشكلة تكمن في آلية JWT Token:

```java
// عند تسجيل الدخول (Login):
1. المستخدم يدخل username + password
2. النظام يقرأ الصلاحيات من قاعدة البيانات
3. يتم توليد JWT Token يحتوي على:
   - roles: ['PROVIDER']
   - permissions: ['VIEW_CLAIMS', 'SUBMIT_CLAIMS', ...]
4. JWT Token يتم تخزينه في localStorage في المتصفح

// عند تعيين صلاحيات جديدة:
5. Admin يضيف صلاحيات جديدة للدور PROVIDER
6. ✅ الصلاحيات تُحفظ في قاعدة البيانات
7. ❌ لكن JWT Token القديم لا يزال في المتصفح
8. ❌ JWT Token القديم لا يحتوي على الصلاحيات الجديدة

// عند تسجيل الخروج والدخول:
9. المستخدم يسجل خروج (يحذف JWT Token)
10. يسجل دخول مرة أخرى
11. ✅ يتم توليد JWT Token جديد بالصلاحيات الجديدة
```

### Technical Analysis
The problem is in the JWT Token mechanism:

```javascript
// Current Flow:
User Login → Read Permissions from DB → Generate JWT with Permissions
            ↓
    JWT stored in localStorage (STATIC)
            ↓
Admin Assigns New Permissions → Saved in DB
            ↓
    ❌ Old JWT still in browser (OUTDATED)
            ↓
User needs Logout + Login to refresh JWT
```

---

## ✅ الحل | Solution

### 1. Backend: إضافة Endpoint لتحديث Token

تم إضافة endpoint جديد يسمح للمستخدم بتحديث JWT Token بدون الحاجة لتسجيل خروج/دخول:

```java
/**
 * AuthController.java - NEW ENDPOINT
 */
@PostMapping("/refresh-token")
@Operation(
    summary = "Refresh JWT token with updated permissions",
    description = "Generates new JWT token with current user's updated roles and permissions"
)
public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
        @AuthenticationPrincipal UserDetails userDetails) {
    
    log.info("🔄 Refreshing JWT token for user: {}", userDetails.getUsername());
    
    // Get fresh user data with updated roles/permissions from database
    LoginResponse refreshedToken = authService.refreshUserToken(userDetails.getUsername());
    
    return ResponseEntity.ok(ApiResponse.success(
        "Token refreshed successfully with updated permissions",
        refreshedToken
    ));
}
```

### 2. Backend: إضافة Service Method

```java
/**
 * AuthService.java - NEW METHOD
 */
@Transactional(readOnly = true)
public LoginResponse refreshUserToken(String username) {
    log.info("🔄 Refreshing token for user: {}", username);

    // Fetch FRESH user data from database with all roles and permissions
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

    if (!user.getActive()) {
        throw new RuntimeException("Account is not active");
    }

    // Validate role bindings (same as login)
    validateRoleBindingsBeforeLogin(user);

    // Extract FRESH roles and permissions
    List<String> roles = user.getRoles().stream()
            .map(Role::getName)
            .collect(Collectors.toList());

    List<String> permissions = user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .map(permission -> permission.getName())
            .distinct()
            .collect(Collectors.toList());

    // Generate NEW JWT token with fresh permissions
    String token = jwtTokenProvider.generateToken(user);

    // Return complete LoginResponse with new token
    return LoginResponse.builder()
            .token(token)
            .user(UserInfo.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .roles(roles)
                    .permissions(permissions)
                    // ... other fields
                    .build())
            .build();
}
```

---

## 🚀 كيفية الاستخدام | Usage

### السيناريو 1: تحديد صلاحيات جديدة من لوحة الإدارة

#### الطريقة القديمة (قبل الإصلاح):
```text
1. Admin يفتح صفحة إدارة الأدوار
2. يضيف صلاحيات جديدة للدور PROVIDER
3. المستخدم لا يرى الصلاحيات الجديدة
4. ❌ يحتاج تسجيل خروج ودخول
```

#### الطريقة الجديدة (بعد الإصلاح):
```javascript
// Frontend Code
async function refreshUserToken() {
  try {
    const response = await axios.post('/api/v1/auth/refresh-token');
    const newToken = response.data.data.token;
    const newPermissions = response.data.data.user.permissions;
    
    // Update localStorage
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
    
    // Update state
    setUser(response.data.data.user);
    
    console.log('✅ Token refreshed successfully!');
    console.log('New permissions:', newPermissions);
    
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }
}

// Usage after admin assigns new permissions:
async function handlePermissionsChanged() {
  await refreshUserToken();
  // User can now use new permissions immediately!
}
```

### السيناريو 2: تحديث تلقائي بعد تعيين الصلاحيات

يمكن إضافة استدعاء تلقائي لـ `refresh-token` بعد تعيين الصلاحيات:

```javascript
// ProviderEdit.jsx - SUGGESTED ENHANCEMENT
const handleAssignRoles = async (userId, roleIds) => {
  try {
    // 1. Assign roles to user
    await usersService.assignRoles(userId, roleIds);
    
    // 2. If current user is the one being updated, refresh their token
    const currentUserId = getCurrentUserId(); // Get from context/localStorage
    if (userId === currentUserId) {
      await authService.refreshToken();
      enqueueSnackbar('تم تحديث صلاحياتك بنجاح', { variant: 'success' });
    }
    
    enqueueSnackbar('تم تعيين الصلاحيات بنجاح', { variant: 'success' });
  } catch (error) {
    console.error(error);
    enqueueSnackbar('فشل تعيين الصلاحيات', { variant: 'error' });
  }
};
```

---

## 📡 API Reference

### Refresh Token Endpoint

**URL:** `POST /api/v1/auth/refresh-token`

**Authentication:** Required (Bearer Token)

**Request:**
```http
POST /api/v1/auth/refresh-token HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Token refreshed successfully with updated permissions",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN...",
    "user": {
      "id": 123,
      "username": "provider.user",
      "fullName": "Provider User",
      "email": "provider@example.com",
      "roles": ["PROVIDER"],
      "permissions": [
        "VIEW_CLAIMS",
        "SUBMIT_CLAIMS",
        "VIEW_PRE_APPROVALS",
        "NEW_PERMISSION_1",
        "NEW_PERMISSION_2"
      ],
      "providerId": 5,
      "providerName": "مستشفى الأمل",
      "employerId": null,
      "companyId": null
    }
  },
  "timestamp": "2026-02-07T16:15:00"
}
```

**Response (Error - 401):**
```json
{
  "status": "error",
  "message": "Unauthorized",
  "timestamp": "2026-02-07T16:15:00"
}
```

---

## 🔐 الأمان | Security

### التحقق من الصلاحيات
```java
// النظام يتحقق من:
1. المستخدم مُسجل دخول (JWT Token صالح)
2. الحساب نشط (active = true)
3. PROVIDER users must have valid providerId
4. Provider exists and is active
```

### الحماية من الهجمات
```text
✅ Rate Limiting: يمكن إضافة حد أقصى لعدد طلبات التحديث
✅ Token Expiration: JWT Tokens لها وقت انتهاء
✅ Database Validation: دائماً يتم قراءة الصلاحيات من قاعدة البيانات
✅ Role Binding Check: التحقق من ربط المستخدم بمقدم الخدمة
```

---

## 📊 الفروقات قبل وبعد | Before/After Comparison

| الميزة | قبل الإصلاح | بعد الإصلاح |
|-------|------------|-------------|
| **تحديث الصلاحيات** | يحتاج logout + login | تحديث فوري |
| **تجربة المستخدم** | مزعجة ومربكة | سلسة وسريعة |
| **الأمان** | ✅ آمن | ✅ آمن |
| **الأداء** | بطيء (re-authentication) | سريع (token refresh) |
| **التطبيق على المستخدم الحالي** | ❌ لا يعمل | ✅ يعمل |

---

## 🧪 كيفية الاختبار | Testing

### Test Case 1: تحديث صلاحيات مستخدم Provider

```bash
# 1. Login as SUPER_ADMIN
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin",
    "password": "admin123"
  }'

# Save token: TOKEN_ADMIN="..."

# 2. Login as PROVIDER user
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "provider.user",
    "password": "password123"
  }'

# Save token: TOKEN_PROVIDER="..."
# Check initial permissions in response

# 3. Admin assigns new role to provider user
curl -X PUT http://localhost:8080/api/v1/admin/users/123/roles \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleIds": [2, 3]
  }'

# 4. Provider user refreshes token (WITHOUT logout)
curl -X POST http://localhost:8080/api/v1/auth/refresh-token \
  -H "Authorization: Bearer $TOKEN_PROVIDER"

# ✅ Response should contain NEW permissions
# ✅ User can use new permissions immediately
```

### Test Case 2: Frontend Integration

```javascript
// Test in Browser Console
async function testTokenRefresh() {
  // 1. Check current permissions
  const currentUser = JSON.parse(localStorage.getItem('user'));
  console.log('Current permissions:', currentUser.permissions);
  
  // 2. Admin assigns new permissions (separate browser/tab)
  // ...
  
  // 3. Refresh token
  const response = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  const data = await response.json();
  
  // 4. Update localStorage
  localStorage.setItem('token', data.data.token);
  localStorage.setItem('user', JSON.stringify(data.data.user));
  
  // 5. Check updated permissions
  console.log('Updated permissions:', data.data.user.permissions);
  
  // ✅ Success! New permissions available without logout
}

testTokenRefresh();
```

---

## 📝 ملاحظات إضافية | Additional Notes

### 1. متى يجب استخدام Refresh Token؟

**استخدم Refresh Token عند:**
- ✅ تعيين صلاحيات جديدة للمستخدم
- ✅ إزالة صلاحيات من المستخدم
- ✅ تغيير دور المستخدم
- ✅ تحديث بيانات المستخدم الأساسية

**لا تحتاج Refresh Token عند:**
- ❌ تسجيل خروج عادي
- ❌ انتهاء صلاحية JWT Token (يحتاج login جديد)
- ❌ تغيير كلمة المرور (يحتاج login جديد)

### 2. JWT Token Lifecycle

```text
┌─────────────────┐
│   User Login    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate JWT    │◄── Contains: roles, permissions, userId
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in Browser│◄── localStorage.setItem('token', jwt)
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  User Makes API Calls   │
│  (Token valid 24h)      │
└────────┬────────────────┘
         │
         ▼
    Admin Changes
    Permissions
         │
         ▼
┌─────────────────┐
│ Refresh Token   │◄── NEW: No logout needed!
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  New JWT with   │
│Updated Permissions│
└─────────────────┘
```

### 3. التوافق مع Session-Based Auth

```java
// النظام يدعم طريقتين للمصادقة:
1. JWT-Based Auth (Stateless)
   - Token في localStorage
   - يحتاج /refresh-token لتحديث الصلاحيات

2. Session-Based Auth (Stateful)
   - Session في الخادم
   - الصلاحيات تُقرأ من DB في كل طلب
   - ✅ تحديث الصلاحيات فوري تلقائياً
```

---

## ✨ التحسينات المستقبلية | Future Enhancements

### 1. تحديث تلقائي في Frontend
```javascript
// Auto-refresh token when permissions change detected
useEffect(() => {
  const checkPermissionsChange = async () => {
    const lastPermissionsHash = localStorage.getItem('permissions_hash');
    const currentHash = await getPermissionsHash();
    
    if (lastPermissionsHash !== currentHash) {
      await refreshToken();
      localStorage.setItem('permissions_hash', currentHash);
    }
  };
  
  // Check every 30 seconds
  const interval = setInterval(checkPermissionsChange, 30000);
  return () => clearInterval(interval);
}, []);
```

### 2. WebSocket Notifications
```javascript
// Real-time notification when admin changes permissions
socket.on('permissions_updated', async (userId) => {
  if (userId === currentUser.id) {
    await refreshToken();
    showNotification('تم تحديث صلاحياتك');
  }
});
```

### 3. Refresh Token Cache
```java
// Cache refresh tokens for 5 minutes to prevent spam
@Cacheable(value = "refreshTokens", key = "#username")
public LoginResponse refreshUserToken(String username) {
    // ... implementation
}
```

---

## 🎯 الخلاصة | Summary

### المشكلة
الصلاحيات تختفي بعد تسجيل خروج/دخول المستخدم

### السبب
JWT Token لا يتم تحديثه تلقائياً عند تغيير الصلاحيات

### الحل
إضافة endpoint `/api/v1/auth/refresh-token` للتحديث الفوري

### الفائدة
- ✅ تحديث الصلاحيات بدون logout
- ✅ تجربة مستخدم أفضل
- ✅ أمان محافظ عليه
- ✅ أداء أسرع

---

## 📞 الدعم | Support

إذا واجهت أي مشاكل، يرجى التواصل مع فريق التطوير.

**التاريخ:** 7 فبراير 2026  
**الإصدار:** 1.0.0  
**المطور:** TBA WAAD System Team
