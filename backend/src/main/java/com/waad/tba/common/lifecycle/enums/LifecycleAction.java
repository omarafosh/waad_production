package com.waad.tba.common.lifecycle.enums;

public enum LifecycleAction {
    CANCEL("إلغاء", "Cancel"),
    TERMINATE("إنهاء", "Terminate"),
    ARCHIVE("أرشفة", "Archive"),
    SOFT_DELETE("حذف", "Soft Delete"),
    HARD_DELETE("حذف نهائي", "Hard Delete"),
    RESTORE("استعادة", "Restore"),
    SUSPEND("تعليق", "Suspend"),
    ACTIVATE("تفعيل", "Activate");

    private final String labelAr;
    private final String labelEn;

    LifecycleAction(String labelAr, String labelEn) {
        this.labelAr = labelAr;
        this.labelEn = labelEn;
    }

    public String getLabelAr() {
        return labelAr;
    }

    public String getLabelEn() {
        return labelEn;
    }
}
