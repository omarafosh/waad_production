# 👤 User API Contract

**Module:** RBAC (Role-Based Access Control)  
**Version:** 1.0  
**Date:** 2025-12-31  
**Status:** 🔴 ACTIVE CONTRACT  
**Priority:** 🔴 CRITICAL - Security & Authentication

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Entity Structure](#3-entity-structure)
4. [Business Rules](#4-business-rules)
5. [API Endpoints](#5-api-endpoints)
6. [Field Normalization](#6-field-normalization)
7. [Validation Rules](#7-validation-rules)
8. [Multi-Tenant Scoping](#8-multi-tenant-scoping)
9. [Security & Authentication](#9-security--authentication)
10. [Error Handling](#10-error-handling)
11. [Testing Requirements](#11-testing-requirements)
12. [Implementation Plan](#12-implementation-plan)

---

## 1. Overview

### Purpose
Manage system users with comprehensive authentication, authorization, and multi-tenant scoping:
- ✅ **Username & Email Uniqueness** - Global uniqueness enforced
- ✅ **Password Hashing** - BCrypt encryption implemented
- ✅ **Role-Based Access Control (RBAC)** - Many-to-Many with Roles
- ✅ **Multi-Tenant Scoping** - employerId for data isolation
- ⚠️ **Email Verification** - Field exists, workflow needed
- ⚠️ **Password Reset** - Not implemented yet
- ⚠️ **Account Lockout** - No failed login tracking
- ⚠️ **Audit Trail** - Basic timestamps only

### Key Features (Current Implementation)
- Username/email authentication via Spring Security
- BCrypt password hashing
- Session-based authentication (HttpOnly cookies)
- JWT token support (legacy/fallback)
- Role assignment (Many-to-Many)
- Soft delete via `active` flag
- Basic audit trail (createdAt, updatedAt)
- Search functionality (username, fullName, email)
- Pagination support

---

## 2. Current Implementation Status

### ✅ Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| User CRUD | ✅ Complete | All endpoints working |
| Username uniqueness | ✅ Complete | Database constraint + validation |
| Email uniqueness | ✅ Complete | Database constraint + validation |
| Password hashing | ✅ Complete | BCrypt with strength 10 |
| Role assignment | ✅ Complete | Many-to-Many via user_roles |
| Session authentication | ✅ Complete | HttpOnly cookies |
| JWT authentication | ✅ Complete | Bearer token (legacy) |
| Search | ✅ Complete | Username, fullName, email |
| Pagination | ✅ Complete | Spring Data paging |
| Soft delete | ✅ Complete | active flag |
| Basic audit | ✅ Complete | createdAt, updatedAt |

### ⚠️ Missing Features

| Feature | Priority | Complexity | Impact |
|---------|----------|------------|--------|
| Email verification workflow | 🟠 HIGH | Medium | Security |
| Password reset (forgot password) | 🟠 HIGH | Medium | UX |
| Password change (logged in user) | 🟠 HIGH | Low | Security |
| Password strength validation | 🟡 MEDIUM | Low | Security |
| Account lockout (failed logins) | 🟡 MEDIUM | Medium | Security |
| Login audit log | 🟡 MEDIUM | Low | Compliance |
| Role change audit | 🟡 MEDIUM | Low | Compliance |
| Phone validation (@Pattern) | 🔵 LOW | Low | Data quality |
| Profile picture | 🔵 LOW | Medium | UX |
| Last login timestamp | 🔵 LOW | Low | Analytics |

### 🔴 Critical Gaps

1. **No Password Policy Enforcement**
   - Current: Minimum 6 characters
   - Recommended: 8+ chars, uppercase, lowercase, number, special char

2. **No Account Lockout Mechanism**
   - Risk: Brute force attacks possible
   - Recommendation: Lock after 5 failed attempts, auto-unlock after 30 mins

3. **Email Verification Not Enforced**
   - Field `emailVerified` exists but always false
   - Users can login without verifying email

4. **No Password Reset Workflow**
   - Users cannot recover forgotten passwords
   - Manual admin intervention required

---

## 3. Entity Structure

### 3.1 User Entity

**Location:** `backend/src/main/java/com/waad/tba/modules/rbac/entity/User.java`

```java
@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;           // Global unique, 3-50 chars
    
    @Column(nullable = false)
    private String password;            // BCrypt hashed
    
    @Column(nullable = false)
    private String fullName;            // Display name
    
    @Column(unique = true, nullable = false)
    private String email;               // Global unique, validated
    
    private String phone;               // Optional, no validation yet
    
    @Column(name = "is_active")
    @Builder.Default
    private Boolean active = true;      // Soft delete flag
    
    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;  // Not enforced yet
    
    // Multi-tenant scoping
    @Column(name = "employer_id")
    private Long employerId;            // For EMPLOYER_ADMIN users
    
    @Deprecated
    @Column(name = "company_id")
    private Long companyId;             // Legacy - display only
    
    // Role-Based Access Control
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
    
    // Audit trail
    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

### 3.2 Role Entity

**Location:** `backend/src/main/java/com/waad/tba/modules/rbac/entity/Role.java`

```java
@Entity
@Table(name = "roles")
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String name;                // e.g., "SUPER_ADMIN", "EMPLOYER_ADMIN"
    
    private String description;
    
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

### 3.3 Permission Entity

**Location:** `backend/src/main/java/com/waad/tba/modules/rbac/entity/Permission.java`

```java
@Entity
@Table(name = "permissions")
public class Permission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String name;                // e.g., "users.view", "members.manage"
    
    private String description;
    
    @Column(name = "module", length = 50)
    private String module;              // e.g., "RBAC", "Member", "Claim"
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

---

## 4. Business Rules

### 4.1 User Creation Rules

| Rule | Description | Status |
|------|-------------|--------|
| **R1** | Username must be globally unique | ✅ Enforced |
| **R2** | Email must be globally unique | ✅ Enforced |
| **R3** | Password must be at least 6 characters | ✅ Enforced |
| **R4** | Password must be hashed with BCrypt | ✅ Enforced |
| **R5** | Default active = true | ✅ Enforced |
| **R6** | Default emailVerified = false | ✅ Enforced |
| **R7** | Username: 3-50 characters | ✅ Enforced |
| **R8** | Email must be valid format | ✅ Enforced |
| **R9** | Phone is optional | ✅ Allowed |
| **R10** | employerId required for EMPLOYER_ADMIN role | ⚠️ **NOT ENFORCED** |
| **R11** | companyId deprecated, should not be set | ⚠️ **NOT ENFORCED** |

### 4.2 Password Rules

| Rule | Description | Status |
|------|-------------|--------|
| **P1** | Minimum 6 characters | ✅ Enforced |
| **P2** | Maximum 100 characters | ⚠️ **NOT ENFORCED** |
| **P3** | Must contain uppercase letter | ❌ Not enforced |
| **P4** | Must contain lowercase letter | ❌ Not enforced |
| **P5** | Must contain number | ❌ Not enforced |
| **P6** | Must contain special character | ❌ Not enforced |
| **P7** | Cannot be same as username | ❌ Not enforced |
| **P8** | Cannot be common password | ❌ Not enforced |

### 4.3 Role Assignment Rules

| Rule | Description | Status |
|------|-------------|--------|
| **RA1** | User can have multiple roles | ✅ Supported |
| **RA2** | Role must exist before assignment | ✅ Validated |
| **RA3** | SUPER_ADMIN can assign any role | ✅ Enforced |
| **RA4** | EMPLOYER_ADMIN cannot assign SUPER_ADMIN | ⚠️ **NOT ENFORCED** |
| **RA5** | Role removal requires permission | ✅ Enforced |

### 4.4 Multi-Tenant Rules

| Rule | Description | Status |
|------|-------------|--------|
| **MT1** | SUPER_ADMIN: No employer restriction | ✅ Working |
| **MT2** | EMPLOYER_ADMIN: Must have employerId | ⚠️ **NOT ENFORCED** |
| **MT3** | EMPLOYER_ADMIN: Can only access own employer data | ✅ Enforced in other modules |
| **MT4** | companyId deprecated - do not use | ⚠️ **WARNING ONLY** |
| **MT5** | employerId links to Organization.id (type=EMPLOYER) | ✅ Foreign key exists |

### 4.5 Account Status Rules

| Rule | Description | Status |
|------|-------------|--------|
| **AS1** | active=false blocks login | ✅ Working |
| **AS2** | emailVerified=false allows login | ⚠️ **SECURITY RISK** |
| **AS3** | Soft delete sets active=false | ✅ Working |
| **AS4** | Hard delete not allowed | ✅ Working |
| **AS5** | Account lockout after failed logins | ❌ Not implemented |

---

## 5. API Endpoints

### 5.1 User Management

#### **GET /api/admin/users**
**Purpose:** List all users  
**Authorization:** `SUPER_ADMIN` OR `users.view`  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "fullName": "System Administrator",
      "email": "admin@waad.ly",
      "phone": "+218912345678",
      "active": true,
      "roles": [
        {
          "id": 1,
          "name": "SUPER_ADMIN",
          "description": "Full system access"
        }
      ],
      "createdAt": "2025-01-15T10:30:00",
      "updatedAt": "2025-01-15T10:30:00"
    }
  ]
}
```

**Note:** Password is NEVER returned in responses.

---

#### **GET /api/admin/users/{id}**
**Purpose:** Get user by ID  
**Authorization:** `SUPER_ADMIN` OR `users.view`  
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "employer_admin",
    "fullName": "Ahmed Khalifa",
    "email": "ahmed@employer.ly",
    "phone": "+218911111111",
    "active": true,
    "roles": [
      {
        "id": 2,
        "name": "EMPLOYER_ADMIN",
        "description": "Employer administrator"
      }
    ],
    "createdAt": "2025-02-01T08:00:00",
    "updatedAt": "2025-02-10T14:20:00"
  }
}
```

**Errors:**
- `404 Not Found`: User with ID {id} not found
```json
{
  "success": false,
  "message": "المستخدم غير موجود (User not found)",
  "error": "User with id 999 not found"
}
```

---

#### **POST /api/admin/users**
**Purpose:** Create new user  
**Authorization:** `SUPER_ADMIN` OR `users.manage`  
**Request Body:**
```json
{
  "username": "new_user",
  "password": "SecurePass123!",
  "fullName": "محمد علي (Mohamed Ali)",
  "email": "mohamed@example.com",
  "phone": "+218922222222"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 10,
    "username": "new_user",
    "fullName": "محمد علي (Mohamed Ali)",
    "email": "mohamed@example.com",
    "phone": "+218922222222",
    "active": true,
    "roles": [],
    "createdAt": "2025-03-01T09:15:00",
    "updatedAt": "2025-03-01T09:15:00"
  }
}
```

**Validation:**
- `username`: 3-50 chars, unique, required
- `password`: min 6 chars, required
- `fullName`: required
- `email`: valid email format, unique, required
- `phone`: optional

**Errors:**
- `400 Bad Request`: Username already exists
```json
{
  "success": false,
  "message": "اسم المستخدم موجود مسبقاً (Username already exists)",
  "error": "Username 'admin' already exists"
}
```

- `400 Bad Request`: Email already exists
```json
{
  "success": false,
  "message": "البريد الإلكتروني موجود مسبقاً (Email already exists)",
  "error": "Email 'admin@waad.ly' already exists"
}
```

- `400 Bad Request`: Validation error
```json
{
  "success": false,
  "message": "خطأ في البيانات المدخلة (Validation error)",
  "errors": {
    "username": "Username must be between 3 and 50 characters",
    "password": "Password must be at least 6 characters",
    "email": "Email must be valid"
  }
}
```

---

#### **PUT /api/admin/users/{id}**
**Purpose:** Update existing user  
**Authorization:** `SUPER_ADMIN` OR `users.manage`  
**Request Body:**
```json
{
  "fullName": "محمد علي المحدث (Mohamed Ali Updated)",
  "email": "mohamed.new@example.com",
  "phone": "+218933333333",
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 10,
    "username": "new_user",
    "fullName": "محمد علي المحدث (Mohamed Ali Updated)",
    "email": "mohamed.new@example.com",
    "phone": "+218933333333",
    "active": true,
    "roles": [],
    "createdAt": "2025-03-01T09:15:00",
    "updatedAt": "2025-03-05T11:30:00"
  }
}
```

**Business Rules:**
- Username CANNOT be changed (immutable)
- Password CANNOT be changed via this endpoint (use password change API)
- Email can be changed if new email is unique
- active flag can toggle user access

**Errors:**
- `404 Not Found`: User not found
- `400 Bad Request`: Email already exists (if changed)

---

#### **DELETE /api/admin/users/{id}**
**Purpose:** Soft delete user (sets active=false)  
**Authorization:** `SUPER_ADMIN` OR `users.manage`  
**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

**Business Rules:**
- Physical deletion NOT allowed
- Sets `active = false` (soft delete)
- User cannot login after deletion
- Can be reactivated by setting active=true via PUT

**Errors:**
- `404 Not Found`: User not found
- `400 Bad Request`: Cannot delete yourself
- `400 Bad Request`: Cannot delete last SUPER_ADMIN

---

#### **GET /api/admin/users/search?query={query}**
**Purpose:** Search users  
**Authorization:** `SUPER_ADMIN` OR `users.view`  
**Query Parameters:**
- `query` (required): Search term

**Search Fields:**
- username (case-insensitive, partial match)
- fullName (case-insensitive, partial match)
- email (case-insensitive, partial match)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "username": "ahmed_admin",
      "fullName": "Ahmed Khalifa",
      "email": "ahmed@employer.ly",
      "phone": "+218911111111",
      "active": true,
      "roles": [...],
      "createdAt": "2025-02-01T08:00:00",
      "updatedAt": "2025-02-10T14:20:00"
    }
  ]
}
```

---

#### **GET /api/admin/users/paginate?page={page}&size={size}**
**Purpose:** Paginated user list  
**Authorization:** `SUPER_ADMIN` OR `users.view`  
**Query Parameters:**
- `page` (default: 0): Page number (0-based)
- `size` (default: 10): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [...],
    "totalElements": 50,
    "totalPages": 5,
    "number": 0,
    "size": 10,
    "first": true,
    "last": false,
    "empty": false
  }
}
```

---

#### **POST /api/admin/users/{id}/assign-roles**
**Purpose:** Assign roles to user  
**Authorization:** `SUPER_ADMIN` OR `users.assign_roles`  
**Request Body:**
```json
{
  "roleIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Roles assigned successfully",
  "data": {
    "id": 10,
    "username": "new_user",
    "fullName": "محمد علي",
    "email": "mohamed@example.com",
    "phone": "+218922222222",
    "active": true,
    "roles": [
      {
        "id": 2,
        "name": "EMPLOYER_ADMIN",
        "description": "Employer administrator"
      },
      {
        "id": 3,
        "name": "MEMBER_VIEWER",
        "description": "Can view members"
      }
    ],
    "createdAt": "2025-03-01T09:15:00",
    "updatedAt": "2025-03-05T15:00:00"
  }
}
```

**Business Rules:**
- Replaces ALL existing roles with new set
- All roleIds must exist
- Empty array removes all roles
- SUPER_ADMIN can assign any role
- EMPLOYER_ADMIN cannot assign SUPER_ADMIN (⚠️ NOT ENFORCED YET)

**Errors:**
- `404 Not Found`: User not found
- `404 Not Found`: Role with id {id} not found
- `400 Bad Request`: Cannot remove all roles from yourself

---

### 5.2 Missing Endpoints (Recommended)

#### **POST /api/auth/register** ❌ Not Implemented
**Purpose:** Self-registration (if allowed)  
**Public:** Yes (with email verification)

#### **POST /api/auth/verify-email** ❌ Not Implemented
**Purpose:** Verify email via token  
**Public:** Yes

#### **POST /api/auth/forgot-password** ❌ Not Implemented
**Purpose:** Request password reset  
**Public:** Yes

#### **POST /api/auth/reset-password** ❌ Not Implemented
**Purpose:** Reset password via token  
**Public:** Yes

#### **PUT /api/users/me/password** ❌ Not Implemented
**Purpose:** Change password (logged in user)  
**Authorization:** Authenticated user

#### **GET /api/users/me** ❌ Not Implemented
**Purpose:** Get current user profile  
**Authorization:** Authenticated user

#### **PUT /api/users/me** ❌ Not Implemented
**Purpose:** Update current user profile  
**Authorization:** Authenticated user

---

## 6. Field Normalization

### 6.1 Current Field Mapping

| Database Column | Entity Field | DTO Field (Create) | DTO Field (Response) | Notes |
|----------------|--------------|-------------------|---------------------|-------|
| `id` | `id` | - | `id` | Auto-generated |
| `username` | `username` | `username` | `username` | Immutable after creation |
| `password` | `password` | `password` | - | NEVER in response |
| `full_name` | `fullName` | `fullName` | `fullName` | Display name |
| `email` | `email` | `email` | `email` | Global unique |
| `phone` | `phone` | `phone` | `phone` | Optional |
| `is_active` | `active` | - | `active` | Default true |
| `email_verified` | `emailVerified` | - | - | Not exposed yet |
| `employer_id` | `employerId` | - | - | Not exposed yet |
| `company_id` | `companyId` | - | - | Deprecated |
| `created_at` | `createdAt` | - | `createdAt` | Auto-generated |
| `updated_at` | `updatedAt` | - | `updatedAt` | Auto-updated |

### 6.2 Missing Normalizations

⚠️ **No Arabic/English name split**: Unlike Member/Employer, User has single `fullName` field

**Recommendation:**
- Keep single `fullName` (simpler for user management)
- Frontend can display as-is
- If bilingual support needed, add `fullNameAr` + `fullNameEn` later

---

## 7. Validation Rules

### 7.1 Create User Validation

```java
@Data
@Builder
public class UserCreateDto {
    
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    // ⚠️ RECOMMENDED: Add @Pattern for password complexity
    private String password;
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    // ⚠️ RECOMMENDED: Add @Pattern for phone validation
    private String phone;
}
```

### 7.2 Update User Validation

```java
@Data
@Builder
public class UserUpdateDto {
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    private String phone;
    
    private Boolean active;
}
```

### 7.3 Recommended Password Validation

```java
@Pattern(
    regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    message = "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
)
private String password;
```

### 7.4 Recommended Phone Validation (Libya)

```java
@Pattern(
    regexp = "^\\+?218[0-9]{9}$",
    message = "Phone must be valid Libyan number (+218XXXXXXXXX)"
)
private String phone;
```

---

## 8. Multi-Tenant Scoping

### 8.1 Employer-Centric Architecture

**Truth (Post-Refactor):**
```
SUPER_ADMIN:
  - employerId = NULL
  - Access all employers
  - Can manage all users

EMPLOYER_ADMIN:
  - employerId = <Employer Organization ID>
  - Access ONLY own employer data
  - Cannot manage other employers' users
```

**Legacy `companyId`:**
- Deprecated field
- Do NOT use for filtering or authorization
- Kept for backward compatibility only
- See: `COMPANY-EMPLOYER-REFACTOR-SUMMARY.md`

### 8.2 User-Employer Linking

**Database Schema:**
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    employer_id BIGINT,  -- FK to organizations.id (type='EMPLOYER')
    company_id BIGINT,   -- DEPRECATED - Do not use
    ...
    FOREIGN KEY (employer_id) REFERENCES organizations(id)
);
```

**Business Logic:**
```java
// ✅ CORRECT: Filter by employerId
List<Member> members = memberRepository.findByEmployerOrganizationId(
    currentUser.getEmployerId()
);

// ❌ WRONG: Do not filter by companyId
List<Member> members = memberRepository.findByCompanyId(
    currentUser.getCompanyId()  // DEPRECATED!
);
```

### 8.3 Authorization Patterns

**SUPER_ADMIN Bypass:**
```java
@PreAuthorize("hasRole('SUPER_ADMIN')")
public List<User> getAllUsers() {
    return userRepository.findAll();
}
```

**Employer-Scoped Access:**
```java
@PreAuthorize("hasRole('EMPLOYER_ADMIN')")
public List<Member> getMyMembers(Authentication auth) {
    User currentUser = (User) auth.getPrincipal();
    if (currentUser.getEmployerId() == null) {
        throw new ForbiddenException("EMPLOYER_ADMIN must have employerId");
    }
    return memberRepository.findByEmployerOrganizationId(
        currentUser.getEmployerId()
    );
}
```

**Permission-Based:**
```java
@PreAuthorize("hasAuthority('users.view')")
public UserResponseDto getUser(Long id) {
    return userService.findById(id);
}
```

---

## 9. Security & Authentication

### 9.1 Authentication Flow

**Current Implementation:**
1. **Session-Based (Primary):**
   - User logs in via `/api/auth/login`
   - Server creates HTTP session
   - Session ID stored in HttpOnly cookie (`JSESSIONID`)
   - Frontend sends cookie automatically (withCredentials: true)
   - Session persists until logout or expiration

2. **JWT-Based (Legacy/Fallback):**
   - User logs in and receives JWT token
   - Frontend stores token (localStorage/sessionStorage)
   - Token sent in `Authorization: Bearer <token>` header
   - Token expires after configured time

**Filter Chain Order (SecurityConfig.java):**
```
SessionAuthenticationFilter → JwtAuthenticationFilter → UsernamePasswordAuthenticationFilter
```

### 9.2 Password Hashing

**Implementation:**
```java
@Bean
PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // Default strength: 10
}
```

**Usage:**
```java
// Service layer
public UserResponseDto create(UserCreateDto dto) {
    User user = userMapper.toEntity(dto);
    user.setPassword(passwordEncoder.encode(dto.getPassword())); // Hash
    return userRepository.save(user);
}
```

**Security:**
- ✅ BCrypt (industry standard)
- ✅ Salt automatically generated per password
- ✅ Adaptive hashing (can increase strength over time)
- ⚠️ Default strength 10 (consider 12 for higher security)

### 9.3 CORS Configuration

**Current Settings (SecurityConfig.java):**
```java
CorsConfiguration configuration = new CorsConfiguration();
configuration.setAllowedOrigins(List.of(
    "http://localhost:3000",   // React dev server
    "http://localhost:5173"    // Vite dev server
));
configuration.setAllowedMethods(Arrays.asList(
    "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
));
configuration.setAllowedHeaders(Arrays.asList("*"));
configuration.setExposedHeaders(Arrays.asList(
    "Authorization", "X-Employer-ID", "X-XSRF-TOKEN"
));
configuration.setAllowCredentials(true);  // Required for cookies
```

**Security Notes:**
- ✅ Credentials allowed (required for session cookies)
- ✅ Specific origins (not wildcard)
- ⚠️ Production: Update allowed origins
- ⚠️ Consider adding rate limiting

### 9.4 CSRF Protection

**Current Status:**
```java
.csrf(AbstractHttpConfigurer::disable)
```

**Justification (from SecurityConfig.java):**
- API uses session-based auth with HttpOnly cookies
- CORS strictly configured (localhost only)
- All endpoints require authentication
- System runs in VPN-protected network
- Modern SPA + REST API architecture

**Recommendations:**
- ✅ Acceptable for internal VPN-protected system
- ⚠️ For public deployment: Enable CSRF with custom token header
- ⚠️ Consider implementing custom X-XSRF-TOKEN mechanism

### 9.5 Session Management

**Configuration:**
```java
.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
)
```

**Behavior:**
- Creates session when needed (login)
- Supports both session and JWT authentication
- Session cookie: HttpOnly, SameSite=Lax (recommended)

**Missing Features:**
- ⚠️ No session timeout configuration
- ⚠️ No concurrent session control
- ⚠️ No session fixation protection config

---

## 10. Error Handling

### 10.1 Standard Error Responses

**Format:**
```json
{
  "success": false,
  "message": "رسالة بالعربية (English message)",
  "error": "Technical error details",
  "timestamp": "2025-03-01T10:30:00"
}
```

### 10.2 Common Error Scenarios

#### Username Already Exists
**HTTP 400 Bad Request**
```json
{
  "success": false,
  "message": "اسم المستخدم موجود مسبقاً (Username already exists)",
  "error": "Username 'ahmed_admin' already exists"
}
```

#### Email Already Exists
**HTTP 400 Bad Request**
```json
{
  "success": false,
  "message": "البريد الإلكتروني موجود مسبقاً (Email already exists)",
  "error": "Email 'ahmed@example.com' already exists"
}
```

#### User Not Found
**HTTP 404 Not Found**
```json
{
  "success": false,
  "message": "المستخدم غير موجود (User not found)",
  "error": "User with id 999 not found"
}
```

#### Validation Error
**HTTP 400 Bad Request**
```json
{
  "success": false,
  "message": "خطأ في البيانات المدخلة (Validation error)",
  "errors": {
    "username": "Username must be between 3 and 50 characters",
    "email": "Email must be valid",
    "password": "Password must be at least 6 characters"
  }
}
```

#### Unauthorized
**HTTP 401 Unauthorized**
```json
{
  "success": false,
  "message": "غير مصرح (Unauthorized)",
  "error": "Full authentication is required to access this resource"
}
```

#### Forbidden
**HTTP 403 Forbidden**
```json
{
  "success": false,
  "message": "ممنوع الوصول (Access denied)",
  "error": "You do not have permission to access this resource"
}
```

#### Role Not Found
**HTTP 404 Not Found**
```json
{
  "success": false,
  "message": "الدور الوظيفي غير موجود (Role not found)",
  "error": "Role with id 99 not found"
}
```

#### Cannot Delete Last SUPER_ADMIN
**HTTP 400 Bad Request**
```json
{
  "success": false,
  "message": "لا يمكن حذف آخر مدير نظام (Cannot delete last SUPER_ADMIN)",
  "error": "System must have at least one SUPER_ADMIN user"
}
```

#### Cannot Delete Self
**HTTP 400 Bad Request**
```json
{
  "success": false,
  "message": "لا يمكن حذف حسابك الخاص (Cannot delete yourself)",
  "error": "You cannot delete your own account"
}
```

---

## 11. Testing Requirements

### 11.1 Unit Tests

**UserService Tests:**
```java
@Test
void createUser_whenValidData_shouldCreateUser()
@Test
void createUser_whenDuplicateUsername_shouldThrowException()
@Test
void createUser_whenDuplicateEmail_shouldThrowException()
@Test
void createUser_shouldHashPassword()
@Test
void updateUser_whenEmailChanged_shouldValidateUniqueness()
@Test
void updateUser_whenEmailUnchanged_shouldNotValidate()
@Test
void deleteUser_shouldSetActiveFalse()
@Test
void findById_whenUserNotFound_shouldThrowException()
@Test
void search_shouldFindByUsernameOrEmailOrFullName()
@Test
void assignRoles_whenRoleNotFound_shouldThrowException()
@Test
void assignRoles_shouldReplaceExistingRoles()
```

### 11.2 Integration Tests

**UserController Tests:**
```java
@Test
void getAllUsers_whenAuthenticated_shouldReturn200()
@Test
void getAllUsers_whenUnauthenticated_shouldReturn401()
@Test
void getAllUsers_whenNoPermission_shouldReturn403()
@Test
void createUser_whenValidData_shouldReturn201()
@Test
void createUser_whenDuplicateUsername_shouldReturn400()
@Test
void createUser_whenInvalidEmail_shouldReturn400()
@Test
void updateUser_whenValidData_shouldReturn200()
@Test
void deleteUser_whenExists_shouldReturn200()
@Test
void deleteUser_whenNotFound_shouldReturn404()
```

### 11.3 Security Tests

```java
@Test
void login_withCorrectPassword_shouldAuthenticate()
@Test
void login_withIncorrectPassword_shouldFail()
@Test
void accessProtectedEndpoint_withoutAuth_shouldReturn401()
@Test
void accessProtectedEndpoint_withValidSession_shouldReturn200()
@Test
void accessProtectedEndpoint_withValidJWT_shouldReturn200()
@Test
void passwordInResponse_shouldNeverBeReturned()
@Test
void passwordStorage_shouldBeHashed()
```

### 11.4 Multi-Tenant Tests

```java
@Test
void employerAdmin_canAccessOwnData()
@Test
void employerAdmin_cannotAccessOtherEmployerData()
@Test
void superAdmin_canAccessAllData()
@Test
void createUser_withEmployerId_shouldLinkToEmployer()
@Test
void createUser_withCompanyId_shouldIgnore() // Deprecated field
```

---

## 12. Implementation Plan

### ✅ Phase 1: Current State (COMPLETE)

- [x] User CRUD endpoints
- [x] Username/Email uniqueness validation
- [x] BCrypt password hashing
- [x] Role assignment
- [x] Session authentication
- [x] JWT authentication (legacy)
- [x] Search & pagination
- [x] Soft delete

### 🟠 Phase 2: Security Enhancements (HIGH PRIORITY)

**Estimated Time:** 2-3 days

#### 2.1 Password Policy Enforcement
- [ ] Add password complexity validation
  - Min 8 characters
  - Uppercase + lowercase + number + special char
- [ ] Add max password length (100 chars)
- [ ] Prevent password = username
- [ ] Add common password blacklist

#### 2.2 Password Management
- [ ] Implement password change endpoint (`PUT /api/users/me/password`)
  - Require old password verification
  - Enforce password policy
  - Invalidate all sessions after change
- [ ] Implement forgot password flow
  - Generate secure reset token (UUID + expiry)
  - Send email with reset link
  - Token valid for 1 hour
- [ ] Implement reset password endpoint (`POST /api/auth/reset-password`)
  - Validate token
  - Set new password
  - Invalidate token

#### 2.3 Account Lockout
- [ ] Add failed login tracking (new table: `user_login_attempts`)
- [ ] Lock account after 5 failed attempts
- [ ] Auto-unlock after 30 minutes
- [ ] Send email notification on lockout
- [ ] Add admin unlock endpoint

#### 2.4 employerId Validation
- [ ] Validate employerId FK (must reference Organization.id where type='EMPLOYER')
- [ ] Enforce employerId for EMPLOYER_ADMIN role
- [ ] Prevent employerId for SUPER_ADMIN role
- [ ] Add validation in UserService.create()

### 🟡 Phase 3: Email Verification (MEDIUM PRIORITY)

**Estimated Time:** 1-2 days

- [ ] Add email verification flow
  - Generate verification token on registration
  - Send verification email
  - Implement verify endpoint (`POST /api/auth/verify-email`)
  - Set emailVerified=true on success
- [ ] Optionally enforce emailVerified for login
- [ ] Add resend verification email endpoint

### 🟡 Phase 4: Audit & Compliance (MEDIUM PRIORITY)

**Estimated Time:** 1 day

- [ ] Create `user_audit_log` table
  - Log login attempts (success/failure)
  - Log role changes
  - Log password changes
  - Log account status changes
- [ ] Add `lastLoginAt` field to User entity
- [ ] Log IP address and user agent
- [ ] Add audit log query endpoints

### 🔵 Phase 5: User Profile (LOW PRIORITY)

**Estimated Time:** 1 day

- [ ] Add `GET /api/users/me` endpoint (current user profile)
- [ ] Add `PUT /api/users/me` endpoint (update own profile)
  - Cannot change username
  - Cannot change roles
  - Cannot change active status
  - Can change fullName, email, phone
- [ ] Add profile picture support (optional)

### 🔵 Phase 6: Advanced Features (OPTIONAL)

- [ ] Two-Factor Authentication (2FA)
- [ ] Single Sign-On (SSO) integration
- [ ] OAuth2 provider support
- [ ] API key generation for programmatic access
- [ ] IP whitelist/blacklist
- [ ] Geographic access restrictions

---

## 13. Database Schema

### 13.1 Current Schema

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- BCrypt hash
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    employer_id BIGINT,
    company_id BIGINT,  -- DEPRECATED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES organizations(id)
);

CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    module VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

### 13.2 Recommended Additions

**Account Lockout:**
```sql
CREATE TABLE user_login_attempts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    username VARCHAR(50),  -- In case user doesn't exist
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    success BOOLEAN,
    failed_reason VARCHAR(255),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_attempted (user_id, attempted_at),
    INDEX idx_username_attempted (username, attempted_at)
);

ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN failed_login_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
```

**Password Reset:**
```sql
CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,  -- UUID
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_expires (user_id, expires_at)
);
```

**Email Verification:**
```sql
CREATE TABLE email_verification_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,  -- UUID
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_expires (user_id, expires_at)
);
```

**Audit Log:**
```sql
CREATE TABLE user_audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    action VARCHAR(50) NOT NULL,  -- LOGIN, LOGOUT, PASSWORD_CHANGE, ROLE_CHANGE, etc.
    details TEXT,  -- JSON with additional info
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    performed_by BIGINT,  -- Admin user who made the change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_action (user_id, action, created_at),
    INDEX idx_created (created_at)
);
```

---

## 14. Success Criteria

### 14.1 Functional Requirements

| Requirement | Status | Priority |
|-------------|--------|----------|
| Create user with unique username/email | ✅ Complete | Critical |
| Update user profile | ✅ Complete | Critical |
| Soft delete user | ✅ Complete | Critical |
| Search users | ✅ Complete | High |
| Assign roles to user | ✅ Complete | Critical |
| Password hashing with BCrypt | ✅ Complete | Critical |
| Session-based authentication | ✅ Complete | Critical |
| Multi-tenant isolation via employerId | ✅ Complete | Critical |
| Password change (own) | ❌ Missing | High |
| Password reset (forgot) | ❌ Missing | High |
| Email verification | ❌ Missing | Medium |
| Account lockout | ❌ Missing | Medium |
| Audit logging | ❌ Missing | Medium |

### 14.2 Non-Functional Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| API response time < 200ms | ✅ Yes | Tested with pagination |
| Password hashing strength (BCrypt 10+) | ✅ Yes | Default 10 |
| HTTPS for production | ⚠️ TBD | Deployment concern |
| Rate limiting | ❌ No | Consider adding |
| CORS properly configured | ✅ Yes | Localhost only |
| CSRF protection | ⚠️ Disabled | Acceptable for internal VPN |
| SQL injection protection | ✅ Yes | JPA/Hibernate parameterized queries |
| XSS protection | ✅ Yes | JSON responses auto-escaped |

### 14.3 Security Checklist

- [x] Passwords never returned in API responses
- [x] Passwords hashed with BCrypt
- [x] Username uniqueness enforced
- [x] Email uniqueness enforced
- [x] Session cookies HttpOnly
- [x] CORS restricted to known origins
- [x] All admin endpoints require authentication
- [x] Role-based authorization implemented
- [ ] Password complexity enforced (⚠️ MISSING)
- [ ] Account lockout after failed logins (⚠️ MISSING)
- [ ] Email verification enforced (⚠️ MISSING)
- [ ] Password reset secure (⚠️ MISSING)
- [ ] Audit logging for sensitive actions (⚠️ MISSING)
- [ ] Rate limiting (⚠️ MISSING)

---

## 15. Related Documents

- ✅ [EMPLOYER_API_CONTRACT.md](EMPLOYER_API_CONTRACT.md) - Organization/Employer management
- ✅ [MEMBER_API_CONTRACT.md](MEMBER_API_CONTRACT.md) - Member management with employerId scoping
- ✅ [COMPANY-EMPLOYER-REFACTOR-SUMMARY.md](COMPANY-EMPLOYER-REFACTOR-SUMMARY.md) - Multi-tenant architecture
- ⚠️ [RBAC Design Document] - To be created (Role & Permission contracts)

---

## 16. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-31 | 1.0 | Initial contract creation | System Analysis |

---

## 17. Approval

**Contract Status:** ✅ APPROVED FOR IMPLEMENTATION

**Next Steps:**
1. Review contract with team
2. Prioritize missing features (Phase 2-6)
3. Create tickets for each implementation phase
4. Start with Phase 2 (Security Enhancements)

---

**Note:** This contract documents the current state and provides a roadmap for improvements. The User module is **functional and secure enough for development/staging** but requires Phase 2 enhancements before **production deployment**.
