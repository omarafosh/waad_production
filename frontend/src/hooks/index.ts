/**
 * Centralized exports for custom hooks
 * This file is now a barrel export for the organized hooks structure.
 */

// Auth Hooks
export * from './auth/useAuth';
export { default as useAuth } from './auth/useAuth';
export * from './auth/useRoleGuard';
export { default as useRoleGuard } from './auth/useRoleGuard';
export * from './auth/useRBACSidebar';
export { default as useRBACSidebar } from './auth/useRBACSidebar';
export * from './auth/usePermissionAwareApi';
export { default as usePermissionAwareApi } from './auth/usePermissionAwareApi';

// Benefit Policy Hooks
export * from './benefit-policy/useBenefitPolicies';
export { default as useBenefitPolicies } from './benefit-policy/useBenefitPolicies';
export * from './benefit-policy/useBenefitPackages';
export { default as useBenefitPackages } from './benefit-policy/useBenefitPackages';
export * from './benefit-policy/report';
export { default as useBenefitPolicyReport } from './benefit-policy/report';

// Claims Hooks
export * from './claims/useClaims';
export { default as useClaims } from './claims/useClaims';
export * from './claims/useClaimsReport';
export { default as useClaimsReport } from './claims/useClaimsReport';
export * from './claims/usePreApprovals';
export { default as usePreApprovals } from './claims/usePreApprovals';
export * from './claims/usePreApprovalsReport';
export { default as usePreApprovalsReport } from './claims/usePreApprovalsReport';
export * from './claims/useVisits';
export { default as useVisits } from './claims/useVisits';
export * from './claims/useVisitsReport';
export { default as useVisitsReport } from './claims/useVisitsReport';
export * from './claims/usePreAuthAudit';
export { default as usePreAuthAudit } from './claims/usePreAuthAudit';
export * from './claims/usePreAuthDashboard';
export { default as usePreAuthDashboard } from './claims/usePreAuthDashboard';

// Common Hooks
export * from './common/useTableState';
export { default as useTableState } from './common/useTableState';
export * from './common/useFormatter';
export { default as useFormatter } from './common/useFormatter';
export * from './common/useLocale';
export { default as useLocale } from './common/useLocale';
export * from './common/useConfig';
export { default as useConfig } from './common/useConfig';
export * from './common/usePagination';
export { default as usePagination } from './common/usePagination';
export * from './common/useLocalStorage';
export { default as useLocalStorage } from './common/useLocalStorage';
export * from './common/useFetch';
export { default as useFetch } from './common/useFetch';

// Dashboard Hooks
export * from './dashboard/useDashboardStats';
export { default as useDashboardStats } from './dashboard/useDashboardStats';
export * from './dashboard/useEmployerDashboardKPIs';
export { default as useEmployerDashboardKPIs } from './dashboard/useEmployerDashboardKPIs';
export * from './dashboard/useMonthlyTrends';
export { default as useMonthlyTrends } from './dashboard/useMonthlyTrends';
export * from './dashboard/useRecentActivities';
export { default as useRecentActivities } from './dashboard/useRecentActivities';
export * from './dashboard/useServiceDistribution';
export { default as useServiceDistribution } from './dashboard/useServiceDistribution';

// Employers Hooks
export * from './employers/useEmployers';
export { default as useEmployers } from './employers/useEmployers';
export * from './employers/useEmployerScope';
export { default as useEmployerScope } from './employers/useEmployerScope';

// Medical Hooks
export * from './medical/useMedicalCategories';
export { default as useMedicalCategories } from './medical/useMedicalCategories';
export * from './medical/useMedicalPackages';
export { default as useMedicalPackages } from './medical/useMedicalPackages';
export * from './medical/useMedicalServices';
export { default as useMedicalServices } from './medical/useMedicalServices';

// Members Hooks
export * from './members/useMembers';
export { default as useMembers } from './members/useMembers';
export * from './members/useMemberForm';
export { default as useMemberForm } from './members/useMemberForm';
export * from './members/useMembersGrowth';
export { default as useMembersGrowth } from './members/useMembersGrowth';

// UI Hooks
export * from './ui/useMenuCollapse';
export { default as useMenuCollapse } from './ui/useMenuCollapse';
export * from './ui/useImageCompression';
export { default as useImageCompression } from './ui/useImageCompression';
export * from './ui/useFileUpload';
export { default as useFileUpload } from './ui/useFileUpload';

// System Hooks
export * from './system/useCompanySettings';
export { default as useCompanySettings } from './system/useCompanySettings';
export * from './system/useSettings';
export { default as useSettings } from './system/useSettings';
export * from './system/useEntityHistory';
export { default as useEntityHistory } from './system/useEntityHistory';
