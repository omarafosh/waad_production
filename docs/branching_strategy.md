# Branching Strategy - TBA WAAD System

## 1. Main Branches
- **`main`**: The authoritative branch for production-ready code.
- **`develop`**: The integration branch for features and refactoring.

## 2. Supporting Branches
- **`refactor/*`**: Used for the overall system restructuring (e.g., `refactor/phase-1-dtos`).
- **`feature/*`**: Used for new feature development.
- **`fix/*`**: Used for urgent bug fixes.

## 3. Workflow Rules
1. **Micro-Phases**: Every sub-phase from the implementation plan MUST have its own branch or be clearly committed.
2. **Acceptance Criteria**: No branch shall be merged into `main` without fulfilling 100% of its acceptance criteria.
3. **Atomic Commits**: Commits should be small and specific to the task at hand.
4. **Validation**: All tests must pass before merging.

## 4. Current Phase
Currently working on **Phase 0.1: Git & Branching Strategy Setup**.
Current branch: `refactor/phase-0.1-git-setup`
