# Canonical Data Dictionary — Member Domain

## Purpose
This dictionary defines the single source of truth for member-related concepts in the current system. Any new field, DTO key, or database column must map to one canonical concept.

## Rules (Non-Negotiable)
1. One concept = one canonical database column.
2. Legacy names are accepted only as API aliases (`JsonAlias`) during transition.
3. No new migration may introduce a second column for an existing concept.
4. Canonical names are lower_snake_case in DB and lowerCamelCase in API DTOs.
5. Every alias must have a planned removal version.

## Canonical Concepts (Member)

| Concept Key | Canonical DB Column | Canonical API Field | Allowed Legacy Aliases (temporary) | Owner |
|---|---|---|---|---|
| member.identity.national_id | members.civil_id | civilId | nationalNumber, national_id | Member Team |
| member.employment.employer_id | members.employer_org_id | employerId | organizationId, employerOrganizationId, employer_id | Member Team |
| member.coverage.policy_id | members.benefit_policy_id | benefitPolicyId | policyId | Member Team |
| member.identity.card_number | members.card_number | cardNumber | memberCardNumber | Member Team |
| member.identity.family_barcode | members.barcode | barcode | qrCode, qr_code | Member Team |
| member.state.member_status | members.status | status | memberStatus | Member Team |
| member.state.card_status | members.card_status | cardStatus | membershipCardStatus | Member Team |
| member.photo.file_key | members.photo_url | photoUrl | profilePhotoUrl | Member Team |
| member.family.parent_id | members.parent_id | parentId | principalId (context-dependent) | Member Team |
| member.family.relationship | members.relationship | relationship | relation | Member Team |

## Hard Decisions for This Program
- Keep `members.civil_id` as canonical identity column for now (no parallel `national_number` in current DB).
- Keep `members.employer_org_id` as canonical employer relation.
- Keep `members.status` and `members.card_status` separate (different business meaning).

## Deprecation Window Policy
- API alias support window: 2 releases maximum.
- After window expires: reject alias with clear 400 message and migration guidance.

## Approval Workflow
- Any new member field requires:
  - concept key assignment,
  - compatibility impact statement,
  - removal plan for any alias.

