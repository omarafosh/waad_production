# 🔧 Quick Permission Fix Script

## الهدف:
إضافة `permission` field لكل عنصر قائمة في menu-items/components.jsx

## الخطة:

### Menu Items Permissions Map:

```javascript
const MENU_PERMISSIONS = {
  // Dashboard
  'dashboard': 'VIEW_DASHBOARD',
  
  // Members  
  'members-list': 'VIEW_MEMBERS',
  'members-create': 'MANAGE_MEMBERS',
  'members-import': 'IMPORT_MEMBERS',
  
  // Employers
  'employers-list': 'VIEW_EMPLOYERS',
  'employers-create': 'MANAGE_EMPLOYERS',
  
  // Providers
  'providers-list': 'VIEW_PROVIDERS',
  'providers-create': 'MANAGE_PROVIDERS',
  'provider-contracts': 'VIEW_PROVIDER_CONTRACTS',
  
  // Claims
  'claims-list': 'VIEW_CLAIMS',
  'claims-inbox': 'MANAGE_CLAIMS',
  'claims-create': 'CREATE_CLAIM',
  
  // Pre-Authorizations  
  'pre-approvals-list': 'VIEW_PRE_APPROVALS',
  'pre-approvals-inbox': 'MANAGE_PRE_APPROVALS',
  'pre-auth-dashboard': 'VIEW_PRE_APPROVALS',
  
  // Provider Portal
  'provider-eligibility-check': 'PROVIDER_STAFF',
  'provider-visit-log': 'PROVIDER_STAFF',
  'provider-documents': 'PROVIDER_STAFF',
  
  // Medical Services
  'medical-services-list': 'VIEW_MEDICAL_SERVICES',
  'medical-categories-list': 'VIEW_MEDICAL_CATEGORIES',
  
  // Packages
  'medical-packages-list': 'VIEW_MEDICAL_PACKAGES',
  'benefit-packages-list': 'VIEW_BENEFIT_PACKAGES',
  'benefit-policies-list': 'VIEW_BENEFIT_POLICIES',
  
  // Financial
  'settlement-inbox': 'VIEW_SETTLEMENTS',
  'settlement-batches': 'VIEW_SETTLEMENTS',
  'provider-accounts': 'VIEW_PROVIDER_ACCOUNTS',
  
  // Reports
  'reports-claims': 'VIEW_REPORTS',
  'reports-financial': 'VIEW_REPORTS',
  
  // Admin/RBAC
  'rbac-users': 'MANAGE_USERS',
  'rbac-roles': 'MANAGE_ROLES',
  
  // Settings
  'settings': 'VIEW_SETTINGS'
};
```

## التنفيذ الفوري:

سأقوم بتحديث menu-items/components.jsx مباشرة مع جميع الـ permissions.

---

**الحالة**: جاري التنفيذ...
