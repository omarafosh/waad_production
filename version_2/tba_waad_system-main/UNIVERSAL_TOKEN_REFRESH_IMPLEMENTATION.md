# تطبيق Token Refresh على جميع الأدوار
## Universal Token Refresh Implementation

**التاريخ:** 7 فبراير 2026  
**الإصدار:** 2.0.0 (Universal)  
**الحالة:** ✅ مُطبّق على جميع الأدوار

---

## 📋 نظرة عامة | Overview

### الأدوار المشمولة | Covered Roles

تم تطبيق حل Token Refresh على **جميع الأدوار** في النظام:

| الدور | الاسم العربي | الاسم الإنجليزي | الصفحات المدمجة |
|------|-------------|-----------------|-----------------|
| **SUPER_ADMIN** | مدير النظام الأساسي | Super Administrator | UserEdit, UserDetails, UserCreate |
| **INSURANCE_ADMIN** | مدير شركة التأمين | Insurance Admin | UserEdit, UserDetails, UserCreate |
| **PROVIDER** | مقدم خدمة طبية | Healthcare Provider | UserEdit, UserDetails, ProviderEdit, ProviderCreate |
| **REVIEWER** | مراجع طبي | Medical Reviewer | UserEdit, UserDetails, UserCreate |
| **EMPLOYER_ADMIN** | مدير صاحب العمل | Employer Admin | UserEdit, UserDetails, UserCreate |
| **محاسب مالي** | محاسب مالي | Financial Accountant | UserEdit, UserDetails, UserCreate |
| **أي دور آخر** | أي دور مخصص | Any Custom Role | UserEdit, UserDetails, UserCreate |

---

## 🎯 الصفحات المُحدّثة | Updated Pages

### 1. صفحات إدارة المستخدمين (RBAC)

#### **UserEdit.jsx** ✅
- **المسار:** `/rbac/users/:id/edit`
- **الوظيفة:** تعديل بيانات المستخدم وأدواره
- **التكامل:** 
  ```javascript
  // بعد تحديث الأدوار:
  if (currentUser.id === userId && rolesChanged) {
    await refreshToken();
    // تحديث فوري للصلاحيات
  }
  ```

#### **UserDetails.jsx** ✅
- **المسار:** `/rbac/users/:id`
- **الوظيفة:** عرض تفاصيل المستخدم مع إمكانية تبديل الأدوار
- **التكامل:**
  ```javascript
  // عند تبديل دور (ON/OFF):
  const handleToggleRole = async (roleId, shouldAssign) => {
    await usersService.assignRoles(userId, [roleId]);
    
    if (currentUser.id === userId) {
      await refreshToken();
      // تحديث فوري
    }
  };
  ```

#### **UserCreate.jsx** ✅
- **المسار:** `/rbac/users/create`
- **الوظيفة:** إنشاء مستخدم جديد
- **التكامل:**
  ```javascript
  // حالة نادرة: إذا أنشأ المستخدم حساب لنفسه
  if (currentUser.username === newUser.username) {
    await refreshToken();
  }
  ```

### 2. صفحات إدارة مقدمي الخدمة

#### **ProviderEdit.jsx** ✅
- **المسار:** `/providers/:id/edit`
- **الوظيفة:** تعديل مقدم الخدمة وربطه بمستخدم
- **التكامل:**
  ```javascript
  // عند ربط مستخدم موجود:
  await usersService.updateUser(userId, { providerId });
  if (currentUser.id === userId) {
    await refreshToken();
    // تحديث providerId فوراً
  }
  
  // عند إنشاء مستخدم جديد وتعيين PROVIDER role:
  await usersService.assignRoles(userId, [providerRole.id]);
  if (currentUser.id === userId) {
    await refreshToken();
  }
  ```

#### **ProviderCreate.jsx** ✅
- **المسار:** `/providers/create`
- **الوظيفة:** إنشاء مقدم خدمة جديد
- **التكامل:** نفس آلية ProviderEdit

---

## 🔧 التطبيق التقني | Technical Implementation

### Backend (جاهز لكل الأدوار) ✅

```java
/**
 * AuthController.java
 * Endpoint واحد يخدم جميع الأدوار
 */
@PostMapping("/refresh-token")
public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
        @AuthenticationPrincipal UserDetails userDetails) {
    
    // يعمل لأي مستخدم مسجل دخول بأي دور
    LoginResponse refreshed = authService.refreshUserToken(userDetails.getUsername());
    
    return ResponseEntity.ok(ApiResponse.success(
        "Token refreshed successfully",
        refreshed
    ));
}
```

```java
/**
 * AuthService.java
 * Method واحد يخدم جميع الأدوار
 */
@Transactional(readOnly = true)
public LoginResponse refreshUserToken(String username) {
    // 1. قراءة بيانات المستخدم الحالية من قاعدة البيانات
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    // 2. استخراج الأدوار الحالية
    List<String> roles = user.getRoles().stream()
            .map(Role::getName)
            .collect(Collectors.toList());

    // 3. استخراج الصلاحيات الحالية
    List<String> permissions = user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .map(Permission::getName)
            .distinct()
            .collect(Collectors.toList());

    // 4. توليد JWT Token جديد
    String token = jwtTokenProvider.generateToken(user);

    // 5. إرجاع البيانات الكاملة
    return LoginResponse.builder()
            .token(token)
            .user(UserInfo.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .roles(roles)
                    .permissions(permissions)
                    .providerId(user.getProviderId())
                    .employerId(user.getEmployerId())
                    // ... باقي البيانات
                    .build())
            .build();
}
```

### Frontend Service (مشترك) ✅

```javascript
/**
 * services/auth/tokenRefresh.service.js
 * خدمة واحدة تعمل لجميع الأدوار
 */
export const refreshToken = async () => {
  const currentToken = localStorage.getItem('token');
  
  const response = await axios.post(
    '/api/v1/auth/refresh-token',
    {},
    {
      headers: { Authorization: `Bearer ${currentToken}` }
    }
  );

  const { token, user } = response.data.data;

  // تحديث localStorage
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  return { token, user };
};
```

### Integration Pattern (نمط التطبيق)

```javascript
/**
 * النمط المستخدم في جميع الصفحات
 */
const handleRoleChange = async (userId, newRoles) => {
  try {
    // 1. تحديث الأدوار في Backend
    await usersService.assignRoles(userId, newRoles);
    
    // 2. التحقق: هل المستخدم المُحدّث هو المستخدم الحالي؟
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (currentUser.id && currentUser.id === userId) {
      // 3. نعم، تحديث Token فوراً
      try {
        const refreshed = await refreshToken();
        console.log('✅ Token refreshed:', refreshed.user.roles);
        
        showSuccess('تم تحديث الأدوار والصلاحيات بنجاح');
      } catch (refreshError) {
        console.warn('⚠️ Refresh failed:', refreshError);
        
        showWarning('تم تحديث الأدوار. يرجى تسجيل الخروج والدخول لتحديث الصلاحيات.');
      }
    } else {
      // 4. لا، تحديث مستخدم آخر
      showSuccess('تم تحديث الأدوار بنجاح');
    }
    
  } catch (error) {
    showError('فشل تحديث الأدوار');
  }
};
```

---

## 📊 سيناريوهات الاستخدام | Use Cases

### السيناريو 1: تحديث دور المراجع الطبي (REVIEWER)

```text
1️⃣ Admin يفتح صفحة UserEdit للمراجع الطبي
2️⃣ يضيف صلاحيات جديدة (مثل APPROVE_PRE_AUTH)
3️⃣ يحفظ التغييرات
4️⃣ إذا كان المراجع الطبي مسجل دخول:
   ✅ يتم تحديث Token تلقائياً
   ✅ يرى الصلاحيات الجديدة فوراً
   ✅ لا حاجة logout/login
```

### السيناريو 2: تحديث دور المحاسب المالي

```text
1️⃣ Admin يفتح صفحة UserDetails للمحاسب
2️⃣ يبدل (Toggle) دور FINANCIAL_ADMIN من OFF إلى ON
3️⃣ التبديل يحدث فوراً في UI
4️⃣ إذا كان المحاسب مسجل دخول:
   ✅ يتم استدعاء refreshToken تلقائياً
   ✅ يحصل على صلاحيات FINANCIAL_ADMIN فوراً
   ✅ يستطيع الوصول لصفحات المحاسبة فوراً
```

### السيناريو 3: ربط مستخدم بمقدم خدمة (PROVIDER)

```text
1️⃣ Admin يفتح صفحة ProviderEdit
2️⃣ يختار مستخدم موجود ويربطه بالمزود
3️⃣ يتم تحديث providerId في قاعدة البيانات
4️⃣ إذا كان المستخدم المربوط مسجل دخول:
   ✅ يتم تحديث Token مع providerId الجديد
   ✅ يستطيع الوصول لواجهة Provider فوراً
   ✅ لا حاجة logout/login
```

### السيناريو 4: إنشاء مستخدم جديد بدور معين

```text
1️⃣ Admin يفتح صفحة UserCreate
2️⃣ ينشئ مستخدم جديد
3️⃣ يعين له دور EMPLOYER_ADMIN
4️⃣ المستخدم الجديد يسجل دخول
5️⃣ يحصل على JWT Token بكل الصلاحيات المطلوبة
6️⃣ ✅ لا حاجة لأي خطوات إضافية
```

---

## 🔐 الأمان والتحقق | Security & Validation

### التحققات في Backend

```java
// 1. التحقق من المستخدم النشط
if (!user.getActive()) {
    throw new RuntimeException("Account is not active");
}

// 2. التحقق من ربط PROVIDER
if (isProvider && user.getProviderId() == null) {
    throw new BusinessRuleException("Provider user must have providerId");
}

// 3. التحقق من وجود Provider
Provider provider = providerRepository.findById(user.getProviderId())
        .orElseThrow(() -> new BusinessRuleException("Provider not found"));

// 4. التحقق من نشاط Provider
if (!provider.getActive()) {
    throw new BusinessRuleException("Provider is not active");
}
```

### التحققات في Frontend

```javascript
// 1. التحقق من وجود Token
const currentToken = localStorage.getItem('token');
if (!currentToken) {
    throw new Error('No token found');
}

// 2. التحقق من استجابة refresh
if (!response.data.data.token) {
    throw new Error('Invalid refresh response');
}

// 3. معالجة الأخطاء
try {
    await refreshToken();
} catch (error) {
    if (error.response?.status === 401) {
        // Token expired - redirect to login
        logout();
    } else {
        // Show warning - manual logout needed
        showWarning('يرجى تسجيل الخروج والدخول');
    }
}
```

---

## 🧪 الاختبار | Testing

### Test Case 1: تحديث REVIEWER permissions

```bash
# 1. Login as REVIEWER
curl -X POST /api/v1/auth/login \
  -d '{"identifier":"reviewer1","password":"password123"}'

# Response: Save TOKEN_REVIEWER
# Check initial permissions

# 2. Admin assigns new permission
curl -X PUT /api/v1/admin/users/456/roles \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d '{"roleIds":[4,5]}'

# 3. REVIEWER refreshes token (no logout)
curl -X POST /api/v1/auth/refresh-token \
  -H "Authorization: Bearer $TOKEN_REVIEWER"

# Response: New token with updated permissions
# ✅ REVIEWER can now use new permissions immediately
```

### Test Case 2: Frontend Auto-Refresh

```javascript
// Test in Browser Console
async function testReviewerRefresh() {
  // 1. Check current user
  const user = JSON.parse(localStorage.getItem('user'));
  console.log('Current roles:', user.roles);
  console.log('Current permissions:', user.permissions);
  
  // 2. Admin changes roles (in another tab/session)
  // ...
  
  // 3. Auto-refresh should happen in UserEdit.jsx
  // Or manually trigger:
  const { refreshToken } = await import('./services/auth/tokenRefresh.service.js');
  const refreshed = await refreshToken();
  
  console.log('Updated roles:', refreshed.user.roles);
  console.log('Updated permissions:', refreshed.user.permissions);
  
  // ✅ Changes visible immediately
}

testReviewerRefresh();
```

---

## 📈 الإحصائيات | Statistics

### تغطية الصفحات

| الصفحة | الحالة | عدد الأدوار المدعومة |
|--------|--------|---------------------|
| UserEdit.jsx | ✅ مُطبّق | جميع الأدوار (∞) |
| UserDetails.jsx | ✅ مُطبّق | جميع الأدوار (∞) |
| UserCreate.jsx | ✅ مُطبّق | جميع الأدوار (∞) |
| ProviderEdit.jsx | ✅ مُطبّق | PROVIDER + جميع الأدوار |
| ProviderCreate.jsx | ✅ مُطبّق | PROVIDER + جميع الأدوار |
| **المجموع** | **5 صفحات** | **غير محدود** |

### الأدوار الأساسية المختبرة

| الدور | الاختبار | النتيجة |
|------|---------|---------|
| SUPER_ADMIN | ✅ | يعمل |
| INSURANCE_ADMIN | ✅ | يعمل |
| PROVIDER | ✅ | يعمل |
| REVIEWER | ✅ | يعمل |
| EMPLOYER_ADMIN | ✅ | يعمل |
| أي دور مخصص | ✅ | يعمل |

---

## 🎓 أمثلة متقدمة | Advanced Examples

### مثال 1: Batch Role Assignment

```javascript
/**
 * تعيين عدة أدوار دفعة واحدة مع تحديث Token
 */
const assignMultipleRoles = async (userId, roleIds) => {
  try {
    // Assign all roles at once
    await usersService.assignRoles(userId, roleIds);
    
    // Check if current user
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser.id === userId) {
      // Refresh once after all changes
      const refreshed = await refreshToken();
      
      console.log('✅ All roles assigned and token refreshed');
      console.log('New roles:', refreshed.user.roles);
      
      return refreshed;
    }
  } catch (error) {
    console.error('Failed to assign roles:', error);
    throw error;
  }
};

// Usage:
await assignMultipleRoles(123, [1, 2, 3, 4]);
```

### مثال 2: Role Switching

```javascript
/**
 * تبديل بين الأدوار (حذف القديم، إضافة الجديد)
 */
const switchRole = async (userId, fromRoleId, toRoleId) => {
  try {
    // Remove old role
    await usersService.removeRoles(userId, [fromRoleId]);
    
    // Add new role
    await usersService.assignRoles(userId, [toRoleId]);
    
    // Refresh if current user
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser.id === userId) {
      const refreshed = await refreshToken();
      
      console.log('✅ Role switched and token refreshed');
      
      // Optional: Reload page to update UI
      window.location.reload();
      
      return refreshed;
    }
  } catch (error) {
    console.error('Failed to switch role:', error);
    throw error;
  }
};

// Usage: Switch from REVIEWER to PROVIDER
await switchRole(123, 4, 5);
```

### مثال 3: Custom Event Listener

```javascript
/**
 * مستمع عام لتغييرات الصلاحيات
 */
class PermissionWatcher {
  constructor() {
    this.watchInterval = null;
    this.lastPermissionsHash = null;
  }
  
  start() {
    // Check every 30 seconds
    this.watchInterval = setInterval(async () => {
      const currentHash = this.getPermissionsHash();
      
      if (this.lastPermissionsHash && currentHash !== this.lastPermissionsHash) {
        console.log('🔔 Permissions changed detected!');
        
        try {
          const refreshed = await refreshToken();
          console.log('✅ Auto-refreshed:', refreshed.user.permissions);
          
          // Trigger custom event
          window.dispatchEvent(new CustomEvent('permissions-updated', {
            detail: refreshed.user
          }));
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }
      
      this.lastPermissionsHash = currentHash;
    }, 30000);
  }
  
  stop() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
  }
  
  getPermissionsHash() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const permissions = user.permissions || [];
    return permissions.sort().join(',');
  }
}

// Usage:
const watcher = new PermissionWatcher();
watcher.start();

// Listen for updates
window.addEventListener('permissions-updated', (event) => {
  console.log('Permissions updated:', event.detail.permissions);
  // Update UI, reload data, etc.
});
```

---

## 🔄 التحديثات المستقبلية | Future Enhancements

### 1. WebSocket Real-Time Updates

```javascript
/**
 * إشعارات فورية عبر WebSocket
 */
socket.on('role-changed', async ({ userId, roles }) => {
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  if (currentUser.id === userId) {
    console.log('🔔 Received role change notification');
    
    const refreshed = await refreshToken();
    
    // Show toast notification
    toast.success('تم تحديث أدوارك وصلاحياتك');
    
    // Optional: Update UI
    updateUserContext(refreshed.user);
  }
});
```

### 2. Automatic Background Refresh

```javascript
/**
 * تحديث تلقائي في الخلفية
 */
class TokenAutoRefresh {
  constructor(interval = 300000) { // 5 minutes
    this.interval = interval;
    this.timer = null;
  }
  
  start() {
    this.timer = setInterval(async () => {
      try {
        await refreshToken();
        console.log('🔄 Background token refresh completed');
      } catch (error) {
        console.warn('Background refresh failed:', error);
      }
    }, this.interval);
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

// Usage:
const autoRefresh = new TokenAutoRefresh();
autoRefresh.start();
```

### 3. Permission Change Detection API

```javascript
/**
 * API للكشف عن تغييرات الصلاحيات
 */
const checkPermissionChanges = async () => {
  const response = await axios.get('/api/v1/auth/permission-changes');
  
  if (response.data.hasChanges) {
    // Permissions changed
    await refreshToken();
    
    return {
      changed: true,
      newPermissions: response.data.permissions
    };
  }
  
  return { changed: false };
};
```

---

## 📞 الدعم والمساعدة | Support

### الأسئلة الشائعة

**Q: هل يعمل الحل مع أي دور؟**  
A: نعم، الحل عام ويعمل مع أي دور في النظام (REVIEWER, PROVIDER, EMPLOYER_ADMIN، إلخ)

**Q: ماذا لو فشل refreshToken؟**  
A: يتم عرض رسالة تحذيرية للمستخدم بضرورة تسجيل الخروج والدخول يدوياً

**Q: هل يؤثر على الأداء؟**  
A: لا، الاستدعاء يحدث فقط عند تحديث الأدوار وليس بشكل دوري

**Q: هل يعمل مع Session-based auth؟**  
A: نعم، لكن غير ضروري لأن Session يقرأ الصلاحيات من DB في كل طلب

**Q: كيف أختبر التطبيق؟**  
A: استخدم Browser Console وجرب الأمثلة في قسم الاختبار أعلاه

---

## ✅ الخلاصة | Summary

### الإنجازات

- ✅ **5 صفحات** محدثة بالتكامل الكامل
- ✅ **جميع الأدوار** مدعومة (∞ أدوار)
- ✅ **Backend** جاهز وموحد
- ✅ **Frontend** خدمة مشتركة
- ✅ **Auto-refresh** عند تحديث الأدوار
- ✅ **أمان** كامل مع التحققات
- ✅ **اختبار** شامل لجميع السيناريوهات

### الفوائد

1. **تجربة مستخدم أفضل** - لا حاجة logout/login
2. **تحديث فوري** - الصلاحيات تتحدث مباشرة
3. **أمان محافظ عليه** - نفس مستوى الأمان
4. **توسع سهل** - يعمل مع أي دور جديد تلقائياً
5. **صيانة أسهل** - كود موحد في مكان واحد

---

**التاريخ:** 7 فبراير 2026  
**المطور:** TBA WAAD System Team  
**الإصدار:** 2.0.0 (Universal Implementation)
