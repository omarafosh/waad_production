# Radical Transition Plan — Single Canonical Member Platform

## Objective
Move to one production-grade platform (current codebase) while absorbing required `version_2` capabilities, with strict schema governance and zero semantic duplication.

## Timeline (Suggested)
- Phase A (Week 1): Governance + Freeze
- Phase B (Weeks 2-3): Feature Parity Porting (P0)
- Phase C (Weeks 4-5): Schema Cleanup + Deprecation
- Phase D (Week 6): Cutover + Legacy Shutdown

## Phase A — Governance + Freeze
1. Freeze new non-canonical routes.
2. Adopt canonical dictionary as release gate.
3. Enable compatibility routes only as adapters.

Deliverables:
- Canonical dictionary approved.
- Parity matrix approved.
- Migration backlog agreed.

## Phase B — Port Features (No DB Breakage)
1. Port missing P0 features from matrix into current services.
2. Keep DTO compatibility via aliases only.
3. Add contract tests for each ported capability.

Exit Criteria:
- All P0 features available through `/api/members`.
- Legacy paths still operational with deprecation headers.

## Phase C — Schema Consolidation
1. Expand/Backfill/Contract strategy:
   - Expand: add only canonical columns when needed.
   - Backfill: migrate legacy data deterministically.
   - Contract: remove legacy columns and aliases.
2. Enforce uniqueness at semantic level through governance tables.
3. Block migrations introducing duplicated meaning.

Exit Criteria:
- No duplicate concepts stored under different columns.
- Flyway history green in clean environment.

## Phase D — Cutover & Shutdown
1. Canary release (10% traffic) for 48h.
2. Full cutover after error budget passes.
3. Disable legacy routes and remove alias support.

Exit Criteria:
- Legacy route traffic = 0.
- Alias usage = 0.
- Monitoring stable for 7 days.

## Risk Controls
- Data mismatch risk: pre-cutover reconciliation queries.
- Integration break risk: compatibility adapters with sunset date.
- Regression risk: contract + integration tests for all P0/P1 endpoints.

## Program KPIs
- Duplicate semantic fields count: target `0`.
- Legacy endpoint traffic: target `0` by final phase.
- Failed member operations after cutover: < 0.5%.
