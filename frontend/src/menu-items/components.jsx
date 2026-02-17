// material-ui icons
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  LocalHospital as LocalHospitalIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as ReceiptLongIcon,
  Description as DescriptionIcon,
  PeopleAlt as PeopleAltIcon,
  MedicalServices as MedicalServicesIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Gavel as GavelIcon,
  CardGiftcard as CardGiftcardIcon,
  Inbox as InboxIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Policy as PolicyIcon,
  Handshake as HandshakeIcon,
  ManageAccounts as ManageAccountsIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  FactCheck as FactCheckIcon,
  AssignmentInd as AssignmentIndIcon,
  HowToReg as HowToRegIcon,
  PostAdd as PostAddIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Folder as FolderIcon,
  VpnKey as VpnKeyIcon,
  HelpOutline as HelperIcon,
  AutoFixHigh as AutoFixHighIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';

// RBAC Configuration
import { ROLES } from 'constants/permissions.constants';
import { filterMenuByPermissions } from 'config/rbac.config';

// ==============================|| RBAC MENU FILTERING ||============================== //

/**
 * Filter menu items based on user permissions (UNIFIED ARCHITECTURE)
 * @param {Array} menuItems - Full menu structure
 * @param {Array} userRoles - User's assigned roles
 * @param {Object} user - User object with permissions
 * @returns {Array} Filtered menu items
 */
export const filterMenuByRoles = (menuItems, userRoles = [], user = null) => {
  // If user object lacks permissions but roles exist, construct a minimal user for the filter
  const filteringUser = user || { roles: userRoles, permissions: [] };

  // Use the unified permission-based filtering
  return filterMenuByPermissions(menuItems, filteringUser);
};

// ==============================|| MENU ITEMS ||============================== //

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏥 PROFESSIONAL TPA SYSTEM - NAVIGATION MENU (2026 STANDARD)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DESIGN PHILOSOPHY:
 * ✅ Professional TPA Industry Standards
 * ✅ Clear separation: Implemented vs. Under Development
 * ✅ Future-proof structure (no breaking changes when adding features)
 * ✅ Role-based visibility (RBAC enforced)
 *
 * NAVIGATION STRUCTURE:
 *
 * 📊 Dashboard
 * 👥 Members
 * 🏢 Employers (Partners)
 * 🏥 Providers
 * 💰 Claims & Approvals
 * 📈 Reports
 * 📂 Documents (under development)
 * ⚙️ System Settings
 *
 * STATUS INDICATORS:
 * ✅ = Implemented and working
 * ⏳ = Under development (shows placeholder page)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const menuItem = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-dashboard',
    title: 'لوحة المعلومات',
    titleEn: 'Dashboard',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.EMPLOYER_ADMIN],
    children: [
      {
        id: 'dashboard',
        title: 'لوحة المعلومات الرئيسية',
        titleEn: 'Main Dashboard',
        type: 'item',
        url: '/dashboard',
        icon: DashboardIcon,
        breadcrumbs: false,
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 👥 MEMBERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-members',
    title: 'المستفيدين',
    titleEn: 'Insured',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.MEDICAL_REVIEWER],
    permission: ['MEMBER_VIEW'],
    children: [
      {
        id: 'members',
        title: 'المستفيدين',
        titleEn: 'Insured',
        type: 'item',
        url: '/members',
        icon: PeopleAltIcon,
        breadcrumbs: false,
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏥 PROVIDER OPERATIONS (Daily Workflow)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-provider-portal',
    title: 'بوابة الخدمة',
    titleEn: 'Provider Portal',
    type: 'group',
    restrictedTo: [ROLES.PROVIDER, ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN],
    permission: ['PROVIDER_PORTAL_VIEW'],
    children: [
      {
        id: 'provider-portal',
        title: 'بوابة الخدمة',
        titleEn: 'Provider Portal',
        type: 'collapse',
        icon: LocalHospitalIcon,
        children: [
          {
            id: 'provider-eligibility-check',
            title: 'التحقق من الأهلية',
            titleEn: 'Eligibility Check',
            type: 'item',
            url: '/provider/eligibility-check',
            icon: HowToRegIcon,
          },
          {
            id: 'provider-visit-log',
            title: 'سجل الزيارات',
            titleEn: 'Visit Log',
            type: 'item',
            url: '/provider/visits',
            icon: AssignmentIcon,
          },
          {
            id: 'provider-documents',
            title: 'المستندات',
            titleEn: 'Documents',
            type: 'item',
            url: '/provider/documents',
            icon: FolderIcon,
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📂 MY SERVICES (History & Tracking)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-my-services',
    title: 'خدماتي',
    titleEn: 'My Services',
    type: 'group',
    restrictedTo: [ROLES.PROVIDER, ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN],
    children: [
      {
        id: 'my-services',
        title: 'خدماتي',
        titleEn: 'My Services',
        type: 'collapse',
        icon: AssignmentIndIcon,
        children: [
          {
            id: 'provider-claims',
            title: 'مطالباتي',
            titleEn: 'My Claims',
            type: 'item',
            url: '/reports/claims',
            icon: ReceiptIcon,
          },
          {
            id: 'provider-pre-approvals',
            title: 'موافقاتي',
            titleEn: 'My Pre-Approvals',
            type: 'item',
            url: '/reports/pre-approvals',
            icon: AssignmentIcon,
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏢 EMPLOYERS (PARTNERS)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-employers',
    title: 'جهات العمل',
    titleEn: 'Employers',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.PARTNER_MANAGER],
    children: [
      {
        id: 'employers',
        title: 'إدارة جهات العمل',
        titleEn: 'Employers Management',
        type: 'collapse',
        icon: BusinessIcon,
        children: [
          {
            id: 'employers-list',
            title: 'قائمة جهات العمل',
            titleEn: 'Employers List',
            type: 'item',
            url: '/employers',
            icon: FormatListBulletedIcon,
          },
          {
            id: 'benefit-policies',
            title: 'وثائق التأمين',
            titleEn: 'Benefit Policies',
            type: 'item',
            url: '/benefit-policies',
            icon: PolicyIcon,
            permission: ['BENEFIT_POLICY_VIEW'],
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏥 PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-providers',
    title: 'مقدمو الخدمات',
    titleEn: 'Providers',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.PARTNER_MANAGER],
    children: [
      {
        id: 'providers',
        title: 'إدارة مقدمي الخدمات',
        titleEn: 'Providers Management',
        type: 'collapse',
        icon: LocalHospitalIcon,
        children: [
          {
            id: 'providers-list',
            title: 'قائمة المقدمين',
            titleEn: 'Providers List',
            type: 'item',
            url: '/providers',
            icon: FormatListBulletedIcon,
          },
          {
            id: 'provider-contracts',
            title: 'عقود مقدمي الخدمات',
            titleEn: 'Provider Contracts',
            type: 'item',
            url: '/provider-contracts',
            icon: HandshakeIcon,
          }
          // REMOVED (2026-01-14): provider-network (used deleted provider-dashboard)
          // REMOVED (2026-01-14): provider-portal link (Provider Portal is NOT part of Provider Management)
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 CLAIMS & APPROVALS
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE (2026-01-23): Reviewers/Insurance staff only REVIEW, they don't CREATE
  // Claims and Pre-Approvals are created ONLY by Providers via Visit Log
  {
    id: 'group-claims-approvals',
    title: 'المطالبات والموافقات',
    titleEn: 'Claims & Approvals',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.MEDICAL_REVIEWER],
    children: [
      {
        id: 'claims-approvals',
        title: 'مراجعة المطالبات والموافقات',
        titleEn: 'Review Claims & Approvals',
        type: 'collapse',
        icon: ReceiptIcon,
        children: [
          {
            id: 'claims-inbox',
            title: 'وارد المطالبات',
            titleEn: 'Claims Inbox',
            type: 'item',
            url: '/claims/inbox',
            icon: InboxIcon,
          },
          {
            id: 'pre-approvals-inbox',
            title: 'وارد الموافقات المسبقة',
            titleEn: 'Pre-Approvals Inbox',
            type: 'item',
            url: '/pre-approvals/inbox',
            icon: InboxIcon,
          },
          {
            id: 'unified-approvals-dashboard',
            title: 'لوحة الموافقات الموحدة',
            titleEn: 'Unified Approvals Dashboard',
            type: 'item',
            url: '/approvals/dashboard',
            icon: DashboardIcon,
          },
          {
            id: 'settlement-inbox',
            title: 'صندوق التسويات المالية',
            titleEn: 'Settlement & Finance',
            type: 'item',
            url: '/claims/settlement',
            icon: PaymentIcon,
          }
          // NOTE (2026-01-23): Removed 'pre-approvals' (list page) and 'claims' (history page)
          // Reviewers access everything through Inbox pages
          // No CREATE options - only Providers can create via Visit Log
          // NOTE (2026-01-23): Removed 'visits' - redundant (already in Reports section)
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 SETTLEMENT & FINANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-settlement',
    title: 'التسويات المالية',
    titleEn: 'Settlement & Finance',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.ACCOUNTANT],
    children: [
      {
        id: 'settlement',
        title: 'إدارة التسويات',
        titleEn: 'Settlement Management',
        type: 'collapse',
        icon: PaymentIcon,
        children: [
          {
            id: 'settlement-batches',
            title: 'دفعات التسوية',
            titleEn: 'Settlement Batches',
            type: 'item',
            url: '/settlement/batches',
            icon: ReceiptIcon,
          },
          {
            id: 'provider-accounts',
            title: 'حسابات مقدمي الخدمة',
            titleEn: 'Provider Accounts',
            type: 'item',
            url: '/settlement/accounts',
            icon: LocalHospitalIcon
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📈 REPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-reports',
    title: 'التقارير',
    titleEn: 'Reports',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.EMPLOYER_ADMIN, ROLES.MEDICAL_REVIEWER, ROLES.ACCOUNTANT],
    children: [
      {
        id: 'reports',
        title: 'مركز التقارير',
        titleEn: 'Reports Center',
        type: 'collapse',
        icon: AssessmentIcon,
        children: [
          {
            id: 'claims-report',
            title: 'تقارير المطالبات',
            titleEn: 'Claims Reports',
            type: 'item',
            url: '/reports/claims',
            icon: ReceiptIcon,
          },
          {
            id: 'pre-approvals-report',
            title: 'تقارير الموافقات المسبقة',
            titleEn: 'Pre-Approvals Reports',
            type: 'item',
            url: '/reports/pre-approvals',
            icon: AssignmentIcon,
          },
          {
            id: 'financial-reports',
            title: 'التقارير المالية',
            titleEn: 'Financial Reports',
            type: 'item',
            url: '/reports/financial',
            icon: PaymentIcon,
          },
          {
            id: 'provider-pdf-reports',
            title: 'تقارير مقدمي الخدمة PDF',
            titleEn: 'Provider PDF Reports',
            type: 'item',
            url: '/reports/providers',
            icon: LocalHospitalIcon,
          },
          {
            id: 'provider-settlement-reports',
            title: 'تقارير تسوية مقدمي الخدمة',
            titleEn: 'Provider Settlement Reports',
            type: 'item',
            url: '/reports/provider-settlement',
            icon: LocalHospitalIcon,
          },
          {
            id: 'employer-reports',
            title: 'تقارير جهات العمل',
            titleEn: 'Employer Reports',
            type: 'item',
            url: '/reports/employer-dashboard',
            icon: BusinessIcon,
          },
          {
            id: 'visits-report',
            title: 'تقارير الزيارات',
            titleEn: 'Visits Reports',
            type: 'item',
            url: '/reports/visits',
            icon: AssignmentIcon,
          },
          {
            id: 'benefit-policy-report',
            title: 'تقارير وثائق التأمين',
            titleEn: 'Benefit Policy Reports',
            type: 'item',
            url: '/reports/benefit-policy',
            icon: PolicyIcon,
          },
          {
            id: 'beneficiaries-report',
            title: 'تقارير المستفيدين',
            titleEn: 'Insured Reports',
            type: 'item',
            url: '/reports/beneficiaries',
            icon: PeopleAltIcon,
          },
          {
            id: 'export-center',
            title: 'مركز التصدير (PDF / Excel)',
            titleEn: 'Export Center (PDF / Excel)',
            type: 'item',
            url: '/under-development',
            icon: DescriptionIcon,
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📂 DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-documents',
    title: 'الوثائق',
    titleEn: 'Documents',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN, ROLES.EMPLOYER_ADMIN],
    children: [
      {
        id: 'documents-library',
        title: 'مكتبة الوثائق',
        titleEn: 'Documents Library',
        type: 'item',
        url: '/documents',
        icon: DescriptionIcon,
        permission: ['CLAIM_VIEW', 'PREAUTH_VIEW'],
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚙️ SYSTEM SETTINGS - إعدادات النظام
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'group-system-settings',
    title: 'إعدادات النظام',
    titleEn: 'System Settings',
    type: 'group',
    restrictedTo: [ROLES.SUPER_ADMIN, ROLES.INSURANCE_ADMIN],
    children: [
      // ────────────────────────────────────────────────────────────────────────
      // سجل التدقيق
      // ────────────────────────────────────────────────────────────────────────
      {
        id: 'audit',
        title: 'سجل التدقيق',
        titleEn: 'Audit Log',
        type: 'item',
        url: '/audit',
        icon: TimelineIcon,
      },
      // ────────────────────────────────────────────────────────────────────────
      // الفهرس والخدمات الطبية (Unified Catalog & Taxonomy)
      // ────────────────────────────────────────────────────────────────────────
      {
        id: 'medical-taxonomy',
        title: 'الفهرس والترميز الطبي',
        titleEn: 'Medical Catalog & Taxonomy',
        type: 'collapse',
        icon: MedicalServicesIcon,
        children: [
          {
            id: 'mapping-center',
            title: 'ربط الخدمات',
            titleEn: 'Mapping Center',
            type: 'item',
            url: '/medical-catalog/mapping-center',
            icon: AutoFixHighIcon,
          },
          {
            id: 'unified-dictionary',
            title: 'القاموس الموحد',
            titleEn: 'Unified Dictionary',
            type: 'item',
            url: '/medical-catalog/list',
            icon: DashboardIcon,
          },
          {
            id: 'medical-categories',
            title: 'التصنيفات الطبية',
            titleEn: 'Medical Categories',
            type: 'item',
            url: '/medical-categories',
            icon: CategoryIcon,
          }
        ]
      },
      // ────────────────────────────────────────────────────────────────────────
      // إعدادات المؤسسة (Organization Settings with Users & Roles tabs)
      // ────────────────────────────────────────────────────────────────────────
      {
        id: 'organization-settings',
        title: 'إعدادات المؤسسة',
        titleEn: 'Organization Settings',
        type: 'collapse',
        icon: SettingsIcon,
        permission: ['SYSTEM_SETTINGS'],
        children: [
          {
            id: 'system-settings',
            title: 'معلومات المؤسسة',
            titleEn: 'Organization Info',
            type: 'item',
            url: '/settings/system',
            icon: BusinessIcon,
          },
          {
            id: 'users-management',
            title: 'إدارة المستخدمين',
            titleEn: 'Users Management',
            type: 'item',
            url: '/rbac/users',
            icon: ManageAccountsIcon,
            permission: ['USER_VIEW'],
          },
          {
            id: 'roles-management',
            title: 'إدارة الأدوار',
            titleEn: 'Roles Management',
            type: 'item',
            url: '/rbac/roles',
            icon: SecurityIcon,
            permission: ['ROLE_VIEW'],
          }
        ]
      }
    ]
  }
];

export default menuItem;
