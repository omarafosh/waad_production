-- Add indexes to optimize priority rule lookups
-- Index for Service + Encounter
CREATE INDEX idx_bpr_policy_service_encounter ON benefit_policy_rules (benefit_policy_id, medical_service_id, encounter_type);

-- Index for Category + Encounter
CREATE INDEX idx_bpr_policy_category_encounter ON benefit_policy_rules (benefit_policy_id, medical_category_id, encounter_type);

-- Ensure we have indexes for general lookups (service only / category only)
CREATE INDEX idx_bpr_policy_service ON benefit_policy_rules (benefit_policy_id, medical_service_id);
CREATE INDEX idx_bpr_policy_category ON benefit_policy_rules (benefit_policy_id, medical_category_id);
