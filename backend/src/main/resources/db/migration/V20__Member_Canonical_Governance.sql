-- V20: Member Canonical Governance
-- Purpose: enforce schema governance metadata to prevent semantic field duplication over time.

CREATE TABLE IF NOT EXISTS schema_canonical_fields (
    id BIGSERIAL PRIMARY KEY,
    domain VARCHAR(100) NOT NULL,
    semantic_key VARCHAR(200) NOT NULL,
    table_name VARCHAR(150) NOT NULL,
    column_name VARCHAR(150) NOT NULL,
    api_field_name VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CANONICAL',
    owner_team VARCHAR(100) NOT NULL DEFAULT 'Member Team',
    deprecates_semantic_key VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_schema_canonical_fields_status
        CHECK (status IN ('CANONICAL', 'DEPRECATED', 'LEGACY_ALIAS')),
    CONSTRAINT uk_schema_canonical_fields_semantic UNIQUE (domain, semantic_key),
    CONSTRAINT uk_schema_canonical_fields_column UNIQUE (table_name, column_name)
);

CREATE TABLE IF NOT EXISTS schema_field_aliases (
    id BIGSERIAL PRIMARY KEY,
    domain VARCHAR(100) NOT NULL,
    semantic_key VARCHAR(200) NOT NULL,
    alias_name VARCHAR(150) NOT NULL,
    alias_layer VARCHAR(30) NOT NULL,
    remove_in_version VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_schema_field_aliases_layer
        CHECK (alias_layer IN ('API', 'DB_LEGACY', 'FRONTEND')),
    CONSTRAINT uk_schema_field_aliases_alias UNIQUE (domain, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_schema_aliases_semantic
    ON schema_field_aliases(domain, semantic_key);

-- Seed canonical member concepts
INSERT INTO schema_canonical_fields (domain, semantic_key, table_name, column_name, api_field_name, status)
VALUES
    ('member', 'member.identity.national_id', 'members', 'civil_id', 'civilId', 'CANONICAL'),
    ('member', 'member.employment.employer_id', 'members', 'employer_org_id', 'employerId', 'CANONICAL'),
    ('member', 'member.coverage.policy_id', 'members', 'benefit_policy_id', 'benefitPolicyId', 'CANONICAL'),
    ('member', 'member.identity.card_number', 'members', 'card_number', 'cardNumber', 'CANONICAL'),
    ('member', 'member.identity.family_barcode', 'members', 'barcode', 'barcode', 'CANONICAL'),
    ('member', 'member.state.member_status', 'members', 'status', 'status', 'CANONICAL'),
    ('member', 'member.state.card_status', 'members', 'card_status', 'cardStatus', 'CANONICAL'),
    ('member', 'member.photo.file_key', 'members', 'photo_url', 'photoUrl', 'CANONICAL'),
    ('member', 'member.family.parent_id', 'members', 'parent_id', 'parentId', 'CANONICAL'),
    ('member', 'member.family.relationship', 'members', 'relationship', 'relationship', 'CANONICAL')
ON CONFLICT (domain, semantic_key) DO NOTHING;

-- Seed temporary aliases
INSERT INTO schema_field_aliases (domain, semantic_key, alias_name, alias_layer, remove_in_version)
VALUES
    ('member', 'member.employment.employer_id', 'organizationId', 'API', 'R+2'),
    ('member', 'member.employment.employer_id', 'employerOrganizationId', 'API', 'R+2'),
    ('member', 'member.identity.national_id', 'nationalNumber', 'API', 'R+2'),
    ('member', 'member.identity.national_id', 'national_id', 'API', 'R+2')
ON CONFLICT (domain, alias_name) DO NOTHING;
