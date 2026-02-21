# Phase 5.5: Role-Based Landing Pages - Flow Diagram

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER VISITS APPLICATION                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │ Visit "/"   │
                         └─────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ RoleBasedRedirect     │
                    │ Component             │
                    └───────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
        ┌──────────────┐              ┌──────────────┐
        │ Not Logged   │              │ Logged In    │
        │ In           │              │              │
        └──────────────┘              └──────────────┘
                │                               │
                ▼                               ▼
        ┌──────────────┐              ┌──────────────┐
        │ Redirect to  │              │ Get user.role│
        │ /login       │              │              │
        └──────────────┘              └──────────────┘
                                                │
                                                ▼
                                    ┌────────────────────┐
                                    │ getDefaultRoute    │
                                    │ ForRole(user.role) │
                                    └────────────────────┘
                                                │
                    ┌───────────────────────────┼──────────────────────────┐
                    │              │            │           │              │
                    ▼              ▼            ▼           ▼              ▼
            ┌──────────┐   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
            │SUPER_    │   │ACCOUNTANT│ │REVIEWER  │ │PROVIDER  │ │EMPLOYER  │
            │ADMIN     │   │          │ │          │ │          │ │          │
            └──────────┘   └──────────┘ └──────────┘ └──────────┘ └──────────┘
                    │              │            │           │              │
                    ▼              ▼            ▼           ▼              ▼
            ┌──────────┐   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
            │/dashboard│   │/settlement│ │/claims/  │ │/provider/│ │/         │
            │          │   │/batches  │ │inbox     │ │visits    │ │          │
            └──────────┘   └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ENTERS CREDENTIALS                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ AuthLogin Component   │
                    │ onSubmit()            │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ Call login()          │
                    │ from AuthContext      │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ POST /api/auth/login  │
                    └───────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
        ┌──────────────┐              ┌──────────────┐
        │ Success      │              │ Error        │
        │ Returns user │              │ Show error   │
        └──────────────┘              └──────────────┘
                │                               │
                ▼                               ▼
    ┌────────────────────────┐        ┌──────────────┐
    │ getDefaultRouteForRole │        │ Stay on      │
    │ (user.role)            │        │ /login       │
    └────────────────────────┘        └──────────────┘
                │
                ▼
    ┌────────────────────────┐
    │ navigate(landingRoute) │
    └────────────────────────┘
                │
                ▼
    ┌────────────────────────┐
    │ User lands on role-    │
    │ specific page          │
    └────────────────────────┘
```

## Error Boundary Coverage

```
┌──────────────────────────────────────────────────────────────┐
│                     APPLICATION ROOT                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          SystemErrorBoundary (App.jsx)              │    │
│  │                                                      │    │
│  │  ┌───────────────────────────────────────────────┐ │    │
│  │  │         ThemeCustomization                    │ │    │
│  │  │                                               │ │    │
│  │  │  ┌─────────────────────────────────────────┐ │ │    │
│  │  │  │         RTLLayout                       │ │ │    │
│  │  │  │                                         │ │ │    │
│  │  │  │  ┌───────────────────────────────────┐ │ │ │    │
│  │  │  │  │     AuthProvider                  │ │ │ │    │
│  │  │  │  │                                   │ │ │ │    │
│  │  │  │  │  ┌─────────────────────────────┐ │ │ │ │    │
│  │  │  │  │  │  RouterProvider             │ │ │ │ │    │
│  │  │  │  │  │                             │ │ │ │ │    │
│  │  │  │  │  │  - LoginRoutes              │ │ │ │ │    │
│  │  │  │  │  │  - MainRoutes               │ │ │ │ │    │
│  │  │  │  │  │  - RoleBasedRedirect        │ │ │ │ │    │
│  │  │  │  │  │                             │ │ │ │ │    │
│  │  │  │  │  └─────────────────────────────┘ │ │ │ │    │
│  │  │  │  │                                   │ │ │ │    │
│  │  │  │  └───────────────────────────────────┘ │ │ │    │
│  │  │  │                                         │ │ │    │
│  │  │  └─────────────────────────────────────────┘ │ │    │
│  │  │                                               │ │    │
│  │  └───────────────────────────────────────────────┘ │    │
│  │                                                      │    │
│  │  ⚠️ ANY ERROR CAUGHT HERE                           │    │
│  │  Shows: "حدث خطأ غير متوقع"                         │    │
│  │  Options: [إعادة المحاولة] [الصفحة الرئيسية]       │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Role Routes Mapping

```
┌──────────────┬────────────────────────┬──────────────────────────┐
│     Role     │    Landing Route       │    Primary Function       │
├──────────────┼────────────────────────┼──────────────────────────┤
│ SUPER_ADMIN  │ /dashboard             │ System overview          │
│              │                        │ Full control access      │
├──────────────┼────────────────────────┼──────────────────────────┤
│ ACCOUNTANT   │ /settlement/batches    │ Financial settlements    │
│              │                        │ Payment processing       │
├──────────────┼────────────────────────┼──────────────────────────┤
│ REVIEWER     │ /claims/inbox          │ Claim review workflow    │
│              │                        │ Approval/rejection       │
├──────────────┼────────────────────────┼──────────────────────────┤
│ PROVIDER     │ /provider/visits       │ Medical visit management │
│              │                        │ Provider portal          │
├──────────────┼────────────────────────┼──────────────────────────┤
│ EMPLOYER     │ /                      │ Basic employer view      │
│              │                        │ Employee management      │
└──────────────┴────────────────────────┴──────────────────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                        Component Flow                            │
└─────────────────────────────────────────────────────────────────┘

    AuthLogin.jsx
         │
         │ User submits credentials
         │
         ▼
    login() ──────► AuthContext
         │              │
         │              │ POST /api/auth/login
         │              │
         │              ▼
         │         Set user state
         │              │
         │◄─────────────┘
         │ Returns user
         │
         ▼
    getDefaultRouteForRole() ──────► roleRoutes.js
         │                                  │
         │                                  │ Map role → route
         │                                  │
         │◄─────────────────────────────────┘
         │ Returns landing route
         │
         ▼
    navigate(route)
         │
         ▼
    User lands on role-specific page


    Browser "/" Access
         │
         ▼
    RoleBasedRedirect.jsx
         │
         │ Check auth status
         │
         ▼
    useAuth() ──────► AuthContext
         │                 │
         │                 │ Get isLoggedIn, user
         │                 │
         │◄────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Not logged   Logged in
    │            │
    │            ▼
    │       getDefaultRouteForRole()
    │            │
    ▼            ▼
/login    Role-specific route
```

## Testing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Smoke Test                               │
└─────────────────────────────────────────────────────────────────┘

    window.runSmokeTest()
         │
         ▼
    testRoleLandingPages()
         │
         │ For each role:
         │
         ▼
    getDefaultRouteForRole(role)
         │
         ▼
    Compare: actualRoute === expectedRoute
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
  PASS      FAIL
    │         │
    └────┬────┘
         │
         ▼
    Display results:
    ✅ 6/6 tests passed
    or
    ❌ 4/6 tests failed


┌─────────────────────────────────────────────────────────────────┐
│                      Manual Test Page                            │
└─────────────────────────────────────────────────────────────────┘

    Visit /test/landing-pages
         │
         ▼
    LandingPageTest.jsx
         │
         ├─► View role configuration table
         │
         ├─► Click "انتقل" for any role
         │   │
         │   ▼
         │   navigate(route)
         │
         ├─► Click "تشغيل جميع الاختبارات"
         │   │
         │   ▼
         │   Run automated tests
         │   │
         │   ▼
         │   Display results table
         │
         └─► See current user's landing
```

---

**Legend:**
- `│` Vertical flow
- `▼` Direction of flow
- `┌─┐` Decision/branch points
- `├─┤` Multiple options
- `►` Function call/data flow
- `◄` Return value
