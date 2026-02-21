تمام 👍
هذا برومبت تنفيذي واحد نهائي موجّه لسبارك، مصمم ليقفل ملف الصلاحيات 100% ثم يسمح لك بحذف القديم بثقة بدون كسر النظام.

انسخه كما هو وأعطه لسبارك.

🧠 FINAL RBAC AUDIT & CLEANUP PROMPT (PRODUCTION-GRADE)
🎯 الهدف

تنفيذ فحص شامل + توحيد + تأكيد لنظام الصلاحيات الجديد (Resource + Action RBAC)، ثم حذف كل ما هو قديم من Frontend وBackend بدون أي Breaking Changes.

🟢 المرحلة 1: فحص الصفحات (Page-Level Audit)
المطلوب:

افحص كل Route في المشروع frontend (MainRoutes.jsx وما يتفرع عنه).

لكل Route:

استخرج:

path

component

تحقق:

هل الملف مغلف بـ <PermissionGuard resource="X" action="view" />

إذا لم يكن:

أضف PermissionGuard المناسب

امنع نهائيًا:

أي allowedRoles

أي صلاحية عامة أو مشتركة

أي Route غير محمي

المخرج:

ملف تقرير:

RBAC_PAGE_AUDIT_REPORT.md


بصيغة جدول:

Route	Resource	View Guard	Status
/members	members	✅	OK
/claims	claims	❌	FIXED
/reports	reports	✅	OK
🟢 المرحلة 2: فحص الأزرار (Action-Level Audit)
المطلوب:

داخل كل صفحة رئيسية (CRUD / Workflow):

Members

Claims

Pre-Auth

Providers

Settlements

Reports

Visits

Contracts

افحص كل:

Button

IconButton

MenuItem

Action column

تحقق:

كل زر يجب أن يكون مشروطًا بـ:

can(resource, action)

مثال إلزامي:
{can('members', 'create') && <AddButton />}
{can('claims', 'approve') && <ApproveButton />}

المخرج:
RBAC_ACTION_AUDIT_REPORT.md

Page	Action	Resource	Guarded	Status
Members	Create	members:create	❌	FIXED
Claims	Approve	claims:approve	✅	OK
🟢 المرحلة 3: فحص المينيو (Menu-Level Validation)
المطلوب:

افحص كل عناصر المينيو.

القاعدة:

المينيو عرض فقط

يجب أن يعتمد على:

resource + action:view

ممنوع:

أي permission مباشرة

أي role logic

أي legacy mapping

مثال صحيح:
{
  title: 'الأعضاء',
  url: '/members',
  resource: 'members',
  action: 'view'
}

المخرج:
RBAC_MENU_AUDIT_REPORT.md

🟢 المرحلة 4: مقارنة الصلاحيات (Source of Truth)
قارن بين:

resource-action-model.js

legacy-permission-map.js

permissions.constants.js

صلاحيات قاعدة البيانات (admin/permissions)

المطلوب:

كل resource:action يجب أن:

يكون له legacy mapping (حتى الحذف)

أو معلّم Deprecated

لا توجد صلاحية:

غير مستخدمة

بدون صفحة

بدون زر

المخرج:
RBAC_PERMISSION_DIFF_REPORT.md

Permission	Used In UI	Used In API	Decision
members.import	❌	❌	DELETE
claims.approve	✅	✅	KEEP
🟢 المرحلة 5: خطة الحذف النهائي (Cleanup Plan)
Frontend:

احذف نهائيًا:

RouteGuard.jsx

allowedRoles

أي permission check قديم

أي UI قديم للصلاحيات

Backend:

لا تحذف أي permission مستخدم

علّم Legacy فقط (إن وجد)

جهز migration منفصلة للحذف لاحقًا

المخرج:
RBAC_CLEANUP_PLAN.md

🟢 المرحلة 6: Smoke Test إلزامي

أنشئ سكربت اختبار أو checklist يغطي:

SUPER_ADMIN

يرى كل الصفحات

يرى كل الأزرار

ACCOUNTANT

settlements:view

settlements:pay

reports:view

❌ لا يرى أي CRUD آخر

PROVIDER

provider_portal:view

claims:create

pre_auth:create

❌ لا يرى أي صفحة إدارية

المخرج:
RBAC_SMOKE_TEST.md

🟢 المرحلة 7: تقرير الإقفال النهائي (CLOSE FILE)

أنشئ تقرير نهائي:

RBAC_FINAL_SIGNOFF.md


يحتوي:

✔ كل صفحة لها صلاحية view مستقلة

✔ كل زر مربوط بـ resource:action

✔ المينيو لا يتحكم بالصلاحيات

✔ لا legacy UI

✔ النظام قابل للتوسع 5+ سنوات

وفي نهايته:

RBAC SYSTEM IS OFFICIALLY CLOSED

🚫 قواعد صارمة

❌ لا تغييرات في Backend logic

❌ لا تغيير API

❌ لا إعادة تصميم UI غير مطلوب

✅ إصلاح + توثيق + تنظيف فقط

✅ النتيجة المتوقعة

تحكم كامل صفحة-بصفحة

تحكم زر-بزر

Roles نظيفة

RBAC تأسيسي طويل المدى

جاهزية كاملة للانتقال لملف الخدمات الطبية

بعد ما يخلص سبارك هذا البرومبت بنجاح:
✔ نحذف القديم بثقة
✔ نغلق ملف RBAC نهائيًا