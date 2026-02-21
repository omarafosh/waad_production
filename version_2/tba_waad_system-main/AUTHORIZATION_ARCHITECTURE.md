# Authorization Architecture — Final Lockdown

> **Status:** LOCKED  
> **Date:** 2026-07-14  
> **Migration:** V81__final_authorization_lockdown.sql

---

## 1. System Roles (Exactly 7)

| Role | Description | Scope |
|------|-------------|-------|
| `SUPER_ADMIN` | Full system access, bypasses all checks | Global |
| `MEDICAL_REVIEWER` | Reviews claims, manages pre-approvals | Provider-scoped |
| `ACCOUNTANT` | Financial operations, settlements | Global |
| `PROVIDER_STAFF` | Provider portal — visits, claims, documents | Provider-scoped |
| `EMPLOYER_ADMIN` | Employer portal — members, reports | Employer-scoped |
| `DATA_ENTRY` | Basic data entry operations | Global |
| `FINANCE_VIEWER` | Read-only financial reports | Global |

### Database Constraint
```sql
ALTER TABLE users ADD CONSTRAINT chk_user_type_valid
    CHECK (user_type IN (
        'SUPER_ADMIN', 'MEDICAL_REVIEWER', 'ACCOUNTANT',
        'PROVIDER_STAFF', 'EMPLOYER_ADMIN', 'DATA_ENTRY', 'FINANCE_VIEWER'
    ));
```

---

## 2. Architecture

### Backend (Spring Boot)
- **Single authority per user:** `ROLE_{userType}` — set by `CustomUserDetailsService`
- **All endpoints use:** `@PreAuthorize("hasRole('ROLE_NAME')")` or `hasAnyRole(...)`
- **No dynamic permissions** — no `hasAuthority()`, no permission tables, no PermissionEvaluator
- **Data scoping:** `AuthorizationService` restricts queries by `employerId` / `providerId`

### JWT Token Claims
```json
{
  "sub": "username",
  "userId": 1,
  "fullName": "...",
  "email": "...",
  "role": "SUPER_ADMIN",
  "roles": ["SUPER_ADMIN"],
  "employerId": null,
  "providerId": null,
  "isSuperAdmin": true
}
```

### Frontend (React)
- **`RoleGuard`** component — checks `allowedRoles` array against user's role
- **`useHasRole(roles)`** hook — returns boolean
- **`useRBACStore`** — Zustand store with role state (`initialize`, `clear`, `hasRole`)
- **`useRBAC()`** hook — primary hook returning role info
- **`applyProviderPortalOnlyMenu()`** — scopes PROVIDER_STAFF to provider portal menu only
- **No permission strings** — no `can()`, no `resource:action`

---

## 3. Eliminated Artifacts

| Artifact | Status | Migration |
|----------|--------|-----------|
| `roles` table | DROPPED | V80 |
| `permissions` table | DROPPED | V80 |
| `role_permissions` table | DROPPED | V80 |
| `user_roles` table | DROPPED | V80 |
| `company_id` column | DROPPED | V81 |
| `hasAuthority()` annotations | REMOVED | Code cleanup |
| `PermissionEvaluator` | NEVER EXISTED | N/A |
| Dynamic role assignment API | REMOVED | Code cleanup |
| `JWTContext.jsx` | DELETED | Code cleanup |
| `ComingSoonReport.jsx` | DELETED | Code cleanup |

### Ghost Roles Normalized

| Ghost Role | Canonical Replacement |
|-----------|----------------------|
| `INSURANCE_ADMIN` | `ACCOUNTANT` (or `SUPER_ADMIN` for admin semantics) |
| `REVIEWER` | `MEDICAL_REVIEWER` |
| `PROVIDER` | `PROVIDER_STAFF` |
| `PROVIDER_USER` | `PROVIDER_STAFF` |
| `PROVIDER_ADMIN` | `PROVIDER_STAFF` |
| `ADMIN` | `SUPER_ADMIN` |
| `EMPLOYER` / `BROKER` | `EMPLOYER_ADMIN` |

---

## 4. Rules

1. **No new permission tables.** Authorization is role-based only.
2. **No `hasAuthority()`.** Use `hasRole()` / `hasAnyRole()` exclusively.
3. **No dynamic role assignment APIs.** Role is set during user creation via `userType`.
4. **SUPER_ADMIN bypasses all frontend role checks.** Backend still enforces via `@PreAuthorize`.
5. **Provider staff see only provider portal.** Enforced by `applyProviderPortalOnlyMenu()`.
6. **Employer admins scoped by employer_id.** Enforced by `AuthorizationService`.
7. **Database CHECK constraint rejects invalid roles.** Any INSERT/UPDATE with non-canonical role fails.
