package com.waad.tba.modules.member.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Unified Member Lifecycle Status
 * يمثل حالة دورة حياة المستفيد الموحدة في النظام
 */
@Getter
@RequiredArgsConstructor
public enum MemberLifecycleStatus {
    DRAFT("مسودة", "Draft"),
    PENDING_VERIFICATION("قيد التحقق", "Pending Verification"),
    ACTIVE("نشط", "Active"),
    SUSPENDED("موقف مؤقتاً", "Suspended"),
    BLOCKED("محظور", "Blocked"),
    TERMINATED("منتهي الصلاحية", "Terminated"),
    INELIGIBLE("غير مؤهل", "Ineligible");

    private final String labelAr;
    private final String labelEn;
}
