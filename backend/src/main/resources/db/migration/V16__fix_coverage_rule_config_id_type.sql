-- ═══════════════════════════════════════════════════════════════════════════
-- V16: Fix Coverage Rule Config ID Type
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix 'wrong column type' error: found [serial (Types#INTEGER)], but expecting [bigint (Types#BIGINT)]
-- We change the ID column to BIGINT. The sequence (SERIAL) implies 4-byte int by default in old Postgres versions
-- or if defined as SERIAL instead of BIGSERIAL.

ALTER TABLE coverage_rule_config 
ALTER COLUMN id TYPE BIGINT;

-- Also, ensure the sequence is capable of BIGINT values if needed, 
-- though altering the column type usually handles the underlying storage.
