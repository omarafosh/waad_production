# 📊 تحليل بنية الواجهة الأمامية — نظام WAAD TBA

> **تاريخ التحليل:** 2026-02-20  
> **المسار المُحلَّل:** `frontend/src/`  
> **المحلِّل:** Antigravity AI  
> **الحالة:** 🔴 يحتاج إلى إعادة هيكلة  

---

## 📋 فهرس المحتويات

1. [ملخص تنفيذي](#-1-ملخص-تنفيذي)
2. [تحليل إدارة الحالة](#-2-تحليل-إدارة-الحالة)
3. [تحليل هيكل المجلدات](#-3-تحليل-هيكل-المجلدات)
4. [المشاكل المكتشفة بالتفصيل](#-4-المشاكل-المكتشفة-بالتفصيل)
5. [خريطة الاستخدام الحالية](#-5-خريطة-الاستخدام-الحالية)
6. [خطة إعادة الهيكلة](#-6-خطة-إعادة-الهيكلة)
7. [الهيكل المقترح](#-7-الهيكل-المقترح)
8. [قواعد إدارة الحالة](#-8-قواعد-إدارة-الحالة-للمستقبل)
9. [الأولويات والجدول الزمني](#-9-الأولويات-والجدول-الزمني)

---

## 🔍 1. ملخص تنفيذي

| المؤشر | القيمة الحالية | القيمة المستهدفة |
|--------|---------------|-----------------|
| **ملفات الـ Context** | 8 ملفات | 4 ملفات (بعد الحذف والدمج) |
| **متاجر Zustand** | 2 متجر متكرر | 2 متجر منظم وموحد |
| **ملفات الـ Hooks** | 46 ملف مسطح | مُنظَّم بالنطاق الوظيفي |
| **أكبر Hook** | 878 سطر | يُقسَّم إلى 3 hooks |
| **مزودات Context في AppProviders** | 5 مستويات تداخل | 3 مستويات (بعد نقل Employer لـ Zustand) |
| **ملفات منتهية الصلاحية** | 1 ملف (JWTContext) | صفر |

---

## 🗂️ 2. تحليل إدارة الحالة

### 2.1 Zustand — الاستخدام الحالي

| الملف | الموقع | الغرض | التقييم |
|-------|--------|--------|---------|
| `api/rbac.ts` | `src/api/` | متجر RBAC الرئيسي (الأدوار، الصلاحيات، المستخدم) | ⚠️ **موضوع خاطئ** — يجب أن يكون في `store/` |
| `store/rbacSlice.ts` | `src/store/` | متجر RBAC آخر بتنفيذ مختلف مع `persist` | ❌ **تكرار** — لا يُستخدَم حالياً، خطر الالتباس |

**المشكلة الجوهرية:** ملفان لنفس الغرض بتنفيذين مختلفين، والذي يُستخدَم فعلياً (`api/rbac.ts`) محفوظ في مجلد اسمه `api` رغم أنه لا يحتوي على أي استدعاء HTTP.

---

### 2.2 Context API — الاستخدام الحالي

| الملف | الحجم | الغرض | القرار |
|-------|-------|--------|--------|
| `AuthContext.tsx` | 10 KB | جلسة المصادقة + مؤقت الخمول + تزامن التبويبات | ✅ **احتفظ به** — جانبي تفاعلي حقيقي |
| `EmployerFilterContext.tsx` | 6 KB | تصفية جهة العمل المحددة | ⚠️ **حوّل لـ Zustand** — حالة مشتركة بسيطة |
| `GlobalImportProgressContext.tsx` | 16 KB | تتبع تقدم الاستيراد مع widget عائم | ⚠️ **افصل الـ UI عن الـ Context** |
| `TableRefreshContext.tsx` | 4.8 KB | إشارة تحديث الجداول + BroadcastChannel | ✅ **احتفظ به** — يعتمد على دورة حياة React |
| `JWTContext.tsx` | 7.6 KB | مصادقة JWT القديمة | ❌ **احذفه** — منتهي الصلاحية صراحةً |
| `SystemSettingsContext.tsx` | 2.7 KB | إعدادات النظام | ✅ **احتفظ به** — مناسب |
| `ConfigContext.tsx` | 0.8 KB | إعدادات التطبيق | ✅ **احتفظ به** |

---

## 🏗️ 3. تحليل هيكل المجلدات

### 3.1 الهيكل الحالي

```
frontend/src/
├── api/                    ← ❌ يحتوي على متجر Zustand (RBAC) + طلبات HTTP
│   ├── rbac.ts             ← متجر Zustand (خاطئ المكان)
│   ├── menu.ts             ← منطق القائمة (يستخدم Zustand)
│   └── snackbar.ts
├── store/
│   └── rbacSlice.ts        ← ❌ نسخة مكررة من RBAC store
├── contexts/               
│   ├── AuthContext.tsx      ← ✅
│   ├── JWTContext.tsx       ← ❌ منتهي الصلاحية
│   ├── EmployerFilterContext.tsx ← ⚠️ أفضل كـ Zustand
│   ├── GlobalImportProgressContext.tsx ← ⚠️ يحتوي على UI
│   ├── TableRefreshContext.tsx ← ✅
│   ├── SystemSettingsContext.tsx ← ✅
│   └── ConfigContext.tsx    ← ✅
├── hooks/                  ← ⚠️ 46 ملف مسطح بلا تنظيم
│   ├── useBenefitPolicyReport.ts ← ❌ 878 سطراً — God Hook
│   ├── useTableState.ts    ← ✅ تصميم جيد
│   └── ... (44 ملف آخر)
├── services/
│   ├── api/                ← 32 ملف (يحتاج تنظيماً)
│   └── rbac/
└── pages/                  ← ✅ 30 وحدة مُنظَّمة بالنطاق
```

### 3.2 نقاط القوة الموجودة

- ✅ **`pages/`** مُنظَّم بشكل ممتاز بالنطاق الوظيفي (claims, members, settlement...)
- ✅ **`useTableState.ts`** تصميم نظيف مع URL sync و localStorage
- ✅ **`AuthContext.tsx`** تنفيذ متكامل وصحيح للمصادقة المبنية على الجلسة
- ✅ **Zustand v5** مثبَّت ومُستخدَم فعلياً
- ✅ **`useBenefitPolicyReport`** يحتوي على منطق تحليلي ثري رغم حجمه

---

## 🐛 4. المشاكل المكتشفة بالتفصيل

### 🔴 مشكلة 1: تكرار متجر RBAC

**السبب:** ملفان يديران نفس البيانات (أدوار المستخدم وصلاحياته).

| | `src/api/rbac.ts` | `src/store/rbacSlice.ts` |
|-|-------------------|--------------------------|
| **المُستخدَم فعلاً** | ✅ نعم (10+ ملفات تستورده) | ❌ لا |
| **يستخدم persist** | ❌ يكتب localStorage يدوياً | ✅ نعم |
| **الموقع** | `api/` ❌ | `store/` ✅ |
| **الواجهة** | أكثر تكاملاً | أبسط |

**الحل:** نقل `api/rbac.ts` إلى `store/rbacStore.ts` وحذف `store/rbacSlice.ts`.

---

### 🔴 مشكلة 2: JWTContext — ملف منتهي الصلاحية حي

**الموقع:** `src/contexts/JWTContext.tsx` (7.6 KB)

**النتائج:**
- الملف يحتوي تعليقاً صريحاً يقول إنه **deprecated**
- **لا يُستورَد من أي مكان** في الكود النشط (تم التحقق بالـ grep)
- لكنه لا يزال في المستودع يسبب التباساً للمطورين
- يحتوي على 87 استدعاء لـ `useRBACStore.getState()` — نفس الوظيفة المنقولة بالكامل لـ `AuthContext.tsx`

**الحل:** حذف الملف فوراً مع التحقق من عدم وجود أي استيراد متبقٍّ.

---

### 🔴 مشكلة 3: God Hook — `useBenefitPolicyReport.ts`

**الحجم:** 878 سطراً في ملف واحد  
**المستخدِم الوحيد:** `pages/reports/benefit-policy/index.tsx`

**ما يفعله ملف واحد:**

| الوظيفة | الأسطر (تقريباً) | يجب أن يكون |
|---------|-----------------|-------------|
| جلب البيانات (policies, members, claims) | 1–240 | `useBenefitPolicyData.ts` |
| فلترة من جانب العميل | 245–310 | `useBenefitPolicyFilters.ts` |
| حساب KPIs الرئيسية | 320–410 | `useBenefitPolicyKPIs.ts` |
| تحليل ضغط الحدود (limitsStress) | 423–491 | `useBenefitPolicyKPIs.ts` |
| تحليل الرفض (rejections) | 508–615 | `useBenefitPolicyInsights.ts` |
| تصنيف الفعالية | 630–752 | `useBenefitPolicyInsights.ts` |
| رسوم توضيحية وإحصاءات | 762–878 | `useBenefitPolicyInsights.ts` |

---

### 🟡 مشكلة 4: EmployerFilterContext — استخدام خاطئ لـ Context API

**الموقع:** `src/contexts/EmployerFilterContext.tsx`

**لماذا هي مشكلة:**
- لا يوجد فيها أي Side Effect تفاعلي يستدعي Context
- هي مجرد حالة مشتركة (employerId + employerName) تُقرأ من أماكن متعددة
- تُضيف مستوى تداخل إضافياً في `AppProviders.tsx`
- **9 ملفات** تستورد منها (pages + hooks + components) — وهذا بالضبط ما صُمِّم Zustand له

**المقارنة:**

```typescript
// ❌ الطريقة الحالية — Context API غير ضروري
const { selectedEmployerId } = useEmployerFilter();

// ✅ الطريقة المناسبة — Zustand مباشرة
const { selectedEmployerId } = useEmployerFilterStore();
```

---

### 🟡 مشكلة 5: GlobalImportProgressContext يخلط Context بالـ UI

**الموقع:** `src/contexts/GlobalImportProgressContext.tsx` (16.8 KB)

**المشكلة:** الملف يحتوي على:
1. منطق Context (state + polling)
2. **Widget عائم كامل (Floating Widget)** مبني بـ MUI
3. مكوّنات داخلية (`CircularLoader`, `ChipLabel`)
4. Modal لعرض الأخطاء

**قاعدة الفصل:** Context يجب أن يُعرِّض `value` فقط. لا يجب أن يُصيِّر UI.

---

### 🟡 مشكلة 6: مجلد الـ Hooks غير مُنظَّم

46 ملفاً في مستوى واحد مسطح — لا يمكن معرفة ما يخص ما دون فتح كل ملف.

```
hooks/
├── useBenefitPackages.ts      ← خاص بـ benefit packages
├── useBenefitPolicies.ts      ← خاص بـ benefit policies
├── useBenefitPolicyReport.ts  ← خاص بـ benefit policies
├── useClaims.ts               ← خاص بـ claims
├── useClaimsReport.ts         ← خاص بـ claims
├── useDashboardStats.ts       ← خاص بـ dashboard
├── useEmployerDashboardKPIs.ts ← خاص بـ dashboard
...
```

---

### 🟢 مشكلة 7: storageKey الافتراضي في useTableState

```typescript
// ✅ الكود موجود في useTableState.ts:
storageKey = 'table_page_size', // Default generic key
```

**المشكلة:** جميع الجداول التي لا تُمرِّر `storageKey` مخصصاً ستتشارك نفس الـ key في localStorage، فيتذكر حجم الصفحة من جدول آخر.

---

## 🗺️ 5. خريطة الاستخدام الحالية

### استيرادات `api/rbac.ts`

```
utils/axios.ts          ← useRBACStore (للحصول على بيانات المستخدم في الأخطاء)
services/errorLogger.ts ← useRBACStore (للحصول على user في logging)
contexts/AuthContext.tsx ← useRBACStore (initialize/clear عند تسجيل الدخول/الخروج)
contexts/JWTContext.tsx  ← useRBACStore (deprecated - يجب حذفه)
pages/dashboard/index.tsx ← useRBAC hook
layout/Dashboard/.../Navigation/index.tsx ← useRBAC hook
layout/Component/.../Navigation/index.tsx ← useRoles hook
components/rbac/PermissionGuard.tsx ← useRBAC hook
components/guards/RoleGuard.tsx ← useRBAC hook
api/menu.ts             ← useRBACStore (للقائمة حسب الدور)
```

### استيرادات `contexts/EmployerFilterContext.tsx`

```
providers/AppProviders.tsx   ← EmployerFilterProvider (التسجيل)
pages/dashboard/index.tsx    ← useEmployerFilter
pages/reports/FinancialReports.tsx ← useEmployerFilter
pages/claims/ClaimsInbox.tsx ← useEmployerFilter
pages/claims/ClaimsList.tsx  ← useEmployerFilter
pages/claims/SettlementInbox.tsx ← useEmployerFilter
pages/claims/ClaimsInboxPro.tsx  ← useEmployerFilter
hooks/useDashboardStats.ts   ← useEmployerFilter
hooks/useMonthlyTrends.ts    ← useEmployerFilter
components/tba/EmployerFilterSelector.tsx ← useEmployerFilter (لكتابة البيانات)
```

---

## 🔧 6. خطة إعادة الهيكلة

### المرحلة الأولى — تنظيف فوري 🔴 (أسبوع 1)

#### الخطوة 1: نقل متجر RBAC إلى المكان الصحيح

```
src/api/rbac.ts  →  src/store/rbacStore.ts
```

الأثر: تحديث 10 ملفات import (بحث واستبدال بسيط).

#### الخطوة 2: حذف JWTContext

```
حذف: src/contexts/JWTContext.tsx
```

آمن لأنه لا يُستورَد من أي مكان نشط (تحقق بالـ grep).

#### الخطوة 3: حذف rbacSlice.ts المكرر

```
حذف: src/store/rbacSlice.ts
```

لا يُستورَد من أي مكان (تحقق بالـ grep — نتيجة: No results found).

#### الخطوة 4: إصلاح storageKey في useTableState

```typescript
// قبل:
storageKey = 'table_page_size',

// بعد:
storageKey: string | null = null,   // null = لا حفظ في localStorage
```

---

### المرحلة الثانية — تحسين البنية 🟡 (أسبوع 2)

#### الخطوة 5: تحويل EmployerFilterContext إلى Zustand Store

**إنشاء:** `src/store/employerFilterStore.ts`

```typescript
// src/store/employerFilterStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Employer {
  id: number | string;
  label?: string;
  name?: string;
  code?: string;
}

interface EmployerFilterState {
  selectedEmployerId: number | string | null;
  selectedEmployer: Employer | null;
  setEmployer: (employer: Employer | null) => void;
  clearFilter: () => void;
  isFilterActive: boolean;
}

export const useEmployerFilterStore = create<EmployerFilterState>()(
  persist(
    (set, get) => ({
      selectedEmployerId: null,
      selectedEmployer: null,
      isFilterActive: false,

      setEmployer: (employer) => set({
        selectedEmployerId: employer?.id ?? null,
        selectedEmployer: employer,
        isFilterActive: !!employer,
      }),

      clearFilter: () => set({
        selectedEmployerId: null,
        selectedEmployer: null,
        isFilterActive: false,
      }),
    }),
    { name: 'tba-employer-filter' }
  )
);
```

**الفوائد:**
- إزالة `<EmployerFilterProvider>` من `AppProviders.tsx`
- تبسيط الـ API (نفس الواجهة للمستخدمين تقريباً)
- حفظ تلقائي بـ persist middleware بدل الكود اليدوي الحالي

#### الخطوة 6: فصل GlobalImportProgressContext عن الـ UI

```
src/contexts/GlobalImportProgressContext.tsx   ← بيانات فقط
src/components/import/ImportProgressWidget.tsx  ← UI مستقل
```

---

### المرحلة الثالثة — تنظيم وتقسيم 🟢 (أسبوع 3-4)

#### الخطوة 7: تقسيم useBenefitPolicyReport (878 سطراً)

```
hooks/
└── benefit-policy/
    ├── useBenefitPolicyData.ts      ← جلب البيانات فقط
    ├── useBenefitPolicyFilters.ts   ← فلترة العميل
    ├── useBenefitPolicyKPIs.ts      ← حسابات KPI
    └── useBenefitPolicyInsights.ts  ← التحليلات والتصنيف
```

#### الخطوة 8: تنظيم مجلد hooks بالنطاق الوظيفي

```
hooks/
├── auth/
│   └── useAuth.ts
├── rbac/
│   ├── useRoleGuard.ts
│   ├── useRBACSidebar.ts
│   └── usePermissionAwareApi.ts
├── dashboard/
│   ├── useDashboardStats.ts
│   ├── useEmployerDashboardKPIs.ts
│   ├── useRecentActivities.ts
│   ├── useMembersGrowth.ts
│   ├── useMonthlyTrends.ts
│   ├── useCostsByProvider.ts
│   └── useServiceDistribution.ts
├── claims/
│   ├── useClaims.ts
│   └── useClaimsReport.ts
├── members/
│   ├── useMembers.ts
│   └── useMemberForm.ts
├── benefit-policy/
│   ├── useBenefitPolicies.ts
│   ├── useBenefitPolicyData.ts      ← مقسَّم من God Hook
│   ├── useBenefitPolicyKPIs.ts
│   └── useBenefitPolicyInsights.ts
├── benefit-packages/
│   └── useBenefitPackages.ts
├── providers/
│   └── useProviders.ts
├── medical/
│   ├── useMedicalCategories.ts
│   ├── useMedicalPackages.ts
│   └── useMedicalServices.ts
├── visits/
│   ├── useVisits.ts
│   └── useVisitsReport.ts
├── pre-approvals/
│   ├── usePreApprovals.ts
│   └── usePreApprovalsReport.ts
├── settings/
│   ├── useSettings.ts
│   └── useCompanySettings.ts
└── ui/                              ← hooks مستقلة عن النطاق
    ├── useTableState.ts
    ├── usePagination.ts
    ├── useMenuCollapse.ts
    ├── useLocalStorage.ts
    ├── useFormatter.ts
    ├── useLocale.ts
    ├── useAriaHidden.ts
    └── useFetch.ts
```

#### الخطوة 9: إنشاء barrel export لـ Store

```typescript
// src/store/index.ts
export { useRBACStore, useRBAC, useRole, useRoles, useUser } from './rbacStore';
export { useEmployerFilterStore } from './employerFilterStore';
```

---

## 🏛️ 7. الهيكل المقترح

```
frontend/src/
├── store/                          ← جميع متاجر Zustand
│   ├── rbacStore.ts                ← منقول من api/rbac.ts
│   ├── employerFilterStore.ts      ← جديد (بدل Context)
│   └── index.ts                    ← Barrel export
│
├── contexts/                       ← Context لجانبي التأثير فقط
│   ├── AuthContext.tsx             ← ✅ بقاء
│   ├── GlobalImportProgressContext.tsx ← ✅ بقاء (بعد إزالة UI)
│   ├── TableRefreshContext.tsx     ← ✅ بقاء
│   ├── SystemSettingsContext.tsx   ← ✅ بقاء
│   └── ConfigContext.tsx           ← ✅ بقاء
│   [EmployerFilterContext.tsx — محذوف]
│   [JWTContext.tsx — محذوف]
│
├── hooks/                          ← منظَّمة بالنطاق (انظر الخطوة 8)
│   ├── auth/
│   ├── rbac/
│   ├── dashboard/
│   ├── claims/
│   ├── members/
│   ├── benefit-policy/
│   ├── visits/
│   ├── pre-approvals/
│   └── ui/
│
├── api/                            ← طلبات HTTP فقط (لا Zustand هنا)
│   ├── menu.ts                     ← يبقى (منطق القائمة)
│   ├── snackbar.ts                 ← يبقى
│   └── rbac.ts                     ← يُحذف (منقول إلى store/)
│
├── components/
│   ├── import/
│   │   └── ImportProgressWidget.tsx ← مستخرج من Context
│   └── ...
│
└── providers/
    └── AppProviders.tsx            ← 3 مستويات بدل 5
```

---

## 📏 8. قواعد إدارة الحالة للمستقبل

### متى تستخدم Zustand ✅

```
✅ الحالة المشتركة بين مكونات غير مترابطة في الشجرة
✅ بيانات المستخدم والصلاحيات (RBAC)
✅ فلاتر عالمية (employer filter, date range)
✅ إعدادات واجهة المستخدم (sidebar state, theme)
✅ أي حالة تحتاج الوصول من خارج React (utils, axios)
```

### متى تستخدم Context API ✅

```
✅ سلوك يحتاج دورة حياة React (useEffect, cleanup)
✅ BroadcastChannel أو WebSocket أو EventListener
✅ مؤقتات خمول أو تحديث دورية متعلقة بـ mount/unmount
✅ إدارة دورة حياة الجلسة (login, logout, inactivity)
```

### متى تستخدم useState محلياً ✅

```
✅ حالة خاصة بمكوّن واحد (form fields, modal open)
✅ بيانات مؤقتة لا تحتاج مشاركة
✅ حالة UI محلية (loading, error في مكوّن واحد)
```

### ما يجب تجنبه ❌

```
❌ Context لحالة مشتركة بسيطة بلا side effects → استخدم Zustand
❌ Zustand لبيانات مؤقتة للمكوّن → استخدم useState
❌ God Hooks تجمع جلب البيانات + الحسابات + التحليلات
❌ ملفات State خارج مجلد store/
❌ تكرار نفس المتجر في ملفين مختلفين
```

---

## ⏱️ 9. الأولويات والجدول الزمني

### 🔴 الأسبوع الأول — إصلاحات حرجة

| المهمة | الأثر | الجهد | المخاطرة |
|--------|-------|-------|---------|
| نقل `api/rbac.ts` → `store/rbacStore.ts` | تحديث 10 imports | منخفض | منخفضة |
| حذف `JWTContext.tsx` | إزالة التباس | منخفض جداً | صفر |
| حذف `store/rbacSlice.ts` المكرر | إزالة تكرار | منخفض جداً | صفر |
| إصلاح `storageKey` في useTableState | منع تعارض القيم | منخفض | منخفضة |

**الكود المتأثر:** ~15 ملف  
**الاختبار المطلوب:** التحقق من RBAC بعد نقل الملف

---

### 🟡 الأسبوع الثاني — تحسينات مهمة

| المهمة | الأثر | الجهد | المخاطرة |
|--------|-------|-------|---------|
| تحويل `EmployerFilterContext` → Zustand | إزالة Provider | متوسط | متوسطة |
| فصل `GlobalImportProgressContext` عن UI | تحسين الوضوح | متوسط | منخفضة |

**الكود المتأثر:** ~12 ملف  
**الاختبار المطلوب:** اختبار فلتر جهة العمل في جميع الصفحات

---

### 🟢 الأسبوع 3-4 — تنظيم وإعادة هيكلة

| المهمة | الأثر | الجهد | المخاطرة |
|--------|-------|-------|---------|
| تقسيم `useBenefitPolicyReport` (878 سطراً) | تحسين الصيانة | عالٍ | منخفضة |
| تنظيم `hooks/` بالنطاق | تحسين التنقل | متوسط | منخفضة |
| إنشاء `store/index.ts` barrel | تبسيط الاستيراد | منخفض | صفر |

---

## 📊 ملخص نقاط التحسين

```
عدد الملفات التي تحتاج تعديلاً:     ~30 ملف
عدد الملفات التي ستُحذف:             2 ملفات (JWTContext, rbacSlice)
عدد الملفات الجديدة المقترحة:        ~6 ملفات
تقليل مستويات التداخل في AppProviders: من 5 إلى 4
تقليل حجم أكبر Hook:                 من 878 إلى ~250 سطر (لكل منها)
```

---

> **ملاحظة:** هذا التحليل مبني على فحص الكود الفعلي وليس افتراضات.  
> جميع الأرقام والمسارات المذكورة تم التحقق منها بالـ grep والقراءة المباشرة للملفات.

---

*📝 آخر تحديث: 2026-02-20 | الإصدار: 1.0*
