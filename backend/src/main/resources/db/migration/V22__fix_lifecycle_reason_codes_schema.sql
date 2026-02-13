-- ═══════════════════════════════════════════════════════════════════════════
-- V22: Fix Lifecycle Reason Codes Structure (Add missing columns & Fix names)
-- ═══════════════════════════════════════════════════════════════════════════

-- This fixes the issue where early V19 created a schema different from the Entity.
-- Entity expects: code, label_ar, label_en, applicable_entities, applicable_actions, active

DO $$
BEGIN
    -- 1. Add applicable_actions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'applicable_actions') THEN
        ALTER TABLE lifecycle_reason_codes ADD COLUMN applicable_actions TEXT[];
    END IF;

    -- 2. Add applicable_entities if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'applicable_entities') THEN
        ALTER TABLE lifecycle_reason_codes ADD COLUMN applicable_entities TEXT[];
    END IF;

    -- 3. Fix label_ar (might be ui_label_ar)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'ui_label_ar') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'label_ar') THEN
        ALTER TABLE lifecycle_reason_codes RENAME COLUMN ui_label_ar TO label_ar;
    END IF;
    -- Ensure label_ar exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'label_ar') THEN
        ALTER TABLE lifecycle_reason_codes ADD COLUMN label_ar VARCHAR(200) DEFAULT 'N/A' NOT NULL;
    END IF;

    -- 4. Fix label_en (might be ui_label_en)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'ui_label_en') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'label_en') THEN
        ALTER TABLE lifecycle_reason_codes RENAME COLUMN ui_label_en TO label_en;
    END IF;
    -- Ensure label_en exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lifecycle_reason_codes' AND column_name = 'label_en') THEN
        ALTER TABLE lifecycle_reason_codes ADD COLUMN label_en VARCHAR(200);
    END IF;

END $$;
