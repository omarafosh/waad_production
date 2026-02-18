-- ═══════════════════════════════════════════════════════════════════════════
-- V40: Update Benefit Policy Rules Encounter Type Constraint
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Add missing VisitTypes (LABORATORY, RADIOLOGY, etc.) to the check constraint
--          to prevent 500 Internal Server Errors when saving rules from the Quick Wizard.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop the old restrictive constraint
ALTER TABLE benefit_policy_rules DROP CONSTRAINT IF EXISTS chk_bpr_encounter_type;

-- 2. Add the new constraint with ALL values from VisitType enum
ALTER TABLE benefit_policy_rules ADD CONSTRAINT chk_bpr_encounter_type CHECK (
    encounter_type IN (
        -- Original Base Types
        'EMERGENCY', 
        'OUTPATIENT', 
        'INPATIENT', 
        'ROUTINE', 
        'FOLLOW_UP', 
        'PREVENTIVE', 
        'SPECIALIZED', 
        'HOME_CARE', 
        'TELECONSULTATION', 
        'DAY_SURGERY',
        
        -- New Unified Contexts
        'LABORATORY', 
        'RADIOLOGY', 
        'DENTAL', 
        'OPTICAL', 
        'PHYSIOTHERAPY', 
        'PHARMACY', 
        'OPERATIONS'
    )
);
