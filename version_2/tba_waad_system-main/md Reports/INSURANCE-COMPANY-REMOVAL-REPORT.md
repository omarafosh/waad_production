# Insurance Company Module Removal Report

**Date:** 2025-12-24  
**Status:** ✅ COMPLETE

---

## Overview

The Insurance Company module has been completely removed from the TBA-WAAD system. This was a legacy module that duplicated functionality now handled by the unified `organizations` table with `type='INSURANCE'`.

---

## Backend Changes

### Deleted Files

The entire insurance module directory was removed:
- `backend/src/main/java/com/waad/tba/modules/insurance/` (9 files)
  - `entity/InsuranceCompany.java`
  - `repository/InsuranceCompanyRepository.java`
  - `service/InsuranceCompanyService.java`
  - `controller/InsuranceCompanyController.java`
  - `mapper/InsuranceCompanyMapper.java`
  - `dto/InsuranceCompanyCreateDto.java`
  - `dto/InsuranceCompanyUpdateDto.java`
  - `dto/InsuranceCompanyResponseDto.java`
  - `dto/InsuranceCompanySelectorDto.java`

### Modified Files

1. **SystemAdminService.java**
   - Removed `InsuranceCompanyRepository` import and dependency
   - Removed `insuranceCompanyRepository.deleteAll()` from reset method

2. **Member.java** (entity)
   - Removed `InsuranceCompany` import
   - Removed deprecated `insuranceCompany` field (was already read-only)
   - `insuranceOrganization` field (Organization) remains for insurance reference

3. **Claim.java** (entity)
   - Removed `InsuranceCompany` import
   - Removed deprecated `insuranceCompany` field
   - `insuranceOrganization` field (Organization) remains

4. **Policy.java** (entity)
   - Removed `InsuranceCompany` import
   - Removed deprecated `insuranceCompany` field

5. **InsurancePolicy.java** (entity)
   - Changed `insuranceCompany` → `insuranceOrganization` (Organization type)
   - Updated column reference from `insurance_company_id` → `insurance_org_id`

6. **ClaimMapper.java**
   - Changed `InsuranceCompanyRepository` → `OrganizationRepository`
   - Updated `toEntity()` to use `insuranceOrganization`
   - Updated `toViewDto()` to read from `insuranceOrganization`

7. **DashboardService.java**
   - Changed `InsuranceCompanyRepository` → `OrganizationRepository`
   - Updated count to use `organizationRepository.countByTypeAndActiveTrue(OrganizationType.INSURANCE)`

8. **InsurancePolicyService.java**
   - Changed `InsuranceCompanyRepository` → `OrganizationRepository`
   - Updated create/update methods to use `Organization` instead of `InsuranceCompany`

9. **InsurancePolicyMapper.java**
   - Changed all `InsuranceCompany` references to `Organization`
   - Updated field access from `insuranceCompany` to `insuranceOrganization`

---

## Frontend Changes

### Deleted Files

1. **Pages** (6 files):
   - `frontend/src/pages/insurance-companies/` directory deleted
     - `InsuranceCompaniesList.jsx`
     - `InsuranceCompanyCreate.jsx`
     - `InsuranceCompanyEdit.jsx`
     - `InsuranceCompanyView.jsx`
     - `InsuranceCompanyLocked.jsx`
     - `index.jsx`

2. **Hooks**:
   - `frontend/src/hooks/useInsuranceCompanies.js`

3. **Services**:
   - `frontend/src/services/api/insuranceCompanies.service.js`

4. **Constants**:
   - `frontend/src/constants/insuranceCompany.js`

### Modified Files

1. **services/api/index.js**
   - Removed `insuranceCompaniesService` export

2. **routes/MainRoutes.jsx**
   - Removed `InsuranceCompanyLocked` import
   - Removed `/insurance-companies` route definition

3. **menu-items/components.jsx**
   - Removed `BusinessCenterIcon` import (no longer needed)
   - Removed `insurance-companies` menu item from navigation
   - Removed `insurance-companies` from all role-based hide/show arrays

4. **utils/labels.js**
   - Removed `insuranceCompanies` from navigation labels
   - Removed `insuranceCompany` from employer labels

---

## Database Migration

Created: `V2025_12_24_001__remove_insurance_companies.sql`

This migration:
1. Drops foreign key constraints from `members`, `claims`, `policies`, `insurance_policies`
2. Drops `insurance_company_id` columns from all tables
3. Adds `insurance_org_id` column to `insurance_policies` (if not exists)
4. Drops the `insurance_companies` table
5. Removes related RBAC permissions

---

## Architecture After Removal

### Entity Relationships

```
Organization (type='INSURANCE')
    ↓
InsurancePolicy.insuranceOrganization
Claim.insuranceOrganization  
Member.insuranceOrganization
```

### API Endpoints Removed

- `GET /api/insurance-companies`
- `GET /api/insurance-companies/{id}`
- `POST /api/insurance-companies`
- `PUT /api/insurance-companies/{id}`
- `DELETE /api/insurance-companies/{id}`
- `GET /api/insurance-companies/selector`

---

## Verification

✅ Backend compiles successfully (`mvn compile`)  
✅ All InsuranceCompany imports removed  
✅ All InsuranceCompanyRepository references replaced with OrganizationRepository  
✅ Frontend routes/menu items cleaned up  
✅ Database migration created  

---

## Notes

1. The `InsurancePolicy` module remains functional - it now references `Organization` instead of `InsuranceCompany`
2. The `insurance_policies` frontend pages remain untouched - they handle policy products, not the insurance company entity
3. Dashboard statistics now count insurance organizations via `OrganizationRepository.countByTypeAndActiveTrue()`
4. Any existing insurance company data should be migrated to the `organizations` table with `type='INSURANCE'`
