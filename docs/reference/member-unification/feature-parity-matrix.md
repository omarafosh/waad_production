# Feature Parity Matrix — Current vs Version 2

## Scope
Target is to keep current architecture and import all valid business capabilities from `version_2` without carrying architectural debt.

## Status Legend
- ✅ Present in current
- 🟡 Partial in current (needs hardening)
- ❌ Missing in current
- 🚫 Do not port as-is (needs redesign)

| Capability | Current | Version 2 | Migration Decision |
|---|---:|---:|---|
| Principal/Dependent model | ✅ | ✅ | Keep current implementation |
| Unified eligibility search | ✅ | ✅ | Keep current + parity tests |
| Remaining limit endpoint | 🟡 | ✅ | Implement in current service layer |
| Financial summary endpoint | ❌ | ✅ | Port behavior, redesign contract if needed |
| Member photo upload/delete | ✅ | ✅ | Keep current, add GET photo content endpoint parity |
| Excel export | ✅ | ✅ | Keep current |
| Bulk import preview/execute | ✅ | ✅ | Keep current canonical import |
| Import live status/errors/logs | ✅ | ✅ | Keep current (already fixed) |
| Legacy import routes | ✅ (compat mode) | ✅ | Keep temporary compatibility only |
| Member count endpoints | 🟡 | ✅ | Add missing filtered count variants |
| Name autocomplete | ❌ | ✅ | Port as dedicated search endpoint |
| Policy refresh/assign bulk operations | 🟡 | ✅ | Port with authorization hardening |
| Unified search detail endpoint | 🟡 | ✅ | Port if required by frontend UX |
| Hard delete endpoint | 🚫 | ✅ | Do not port without archive policy |

## Porting Priority

### P0 (Immediate)
1. Count variants used by dashboards.
2. Remaining limit + financial summary read APIs.
3. Name autocomplete endpoint.

### P1 (Short-term)
1. Bulk policy assignment/refresh workflows.
2. Missing search detail capabilities.

### P2 (Optional)
1. Any endpoint not used by product analytics for 60 days is deprecated.

## Acceptance Criteria per Feature
- API contract documented.
- Auth scope enforced (`AuthorizationService`).
- Integration test added.
- No new duplicate fields introduced.
- Frontend uses canonical route (`/api/members/*`).
