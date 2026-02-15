-- ═══════════════════════════════════════════════════════════════════════════
-- V12: SCHEMA CONSOLIDATION & FUTURE DELTAS
-- ═══════════════════════════════════════════════════════════════════════════
-- ملاحظة: تم دمج كافة الجداول الأساسية في ملفات التأسيس (V01 - V11).
-- هذا الملف مخصص لأي تغييرات مستقبلية أو مزامنة إضافية فقط.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MISSING SEQUENCES (Ensuring existence)
CREATE SEQUENCE IF NOT EXISTS seq_smart_card_random_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 2000000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_card_number_seq START WITH 1000000 INCREMENT BY 1;

