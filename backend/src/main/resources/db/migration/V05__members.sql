-- ═══════════════════════════════════════════════════════════════════════════
-- V05: MEMBERS SYSTEM (نظام الأعضاء والمستفيدين)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MEMBERS (المستفيدون)
CREATE TABLE IF NOT EXISTS members (
    id BIGSERIAL PRIMARY KEY,
    card_number VARCHAR(50) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    civil_id VARCHAR(20) UNIQUE,
    passport_number VARCHAR(50),
    full_name VARCHAR(200) NOT NULL,
    full_name_ar VARCHAR(200),
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE')),
    birth_date DATE,
    nationality VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    type VARCHAR(20) NOT NULL CHECK (type IN ('PRINCIPAL', 'DEPENDENT')),
    parent_id BIGINT,
    employer_organization_id BIGINT,
    relationship VARCHAR(50) CHECK (relationship IN ('SPOUSE', 'CHILD', 'PARENT', 'OTHER')),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING')),
    enrollment_date DATE,
    termination_date DATE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_member_parent FOREIGN KEY (parent_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_employer FOREIGN KEY (employer_organization_id) REFERENCES employers(id) ON DELETE SET NULL
);

-- 2. DOCUMENTS (المستندات)
CREATE TABLE IF NOT EXISTS member_documents (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),
    CONSTRAINT fk_doc_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 3. HISTORY (السجل)
CREATE TABLE IF NOT EXISTS member_history (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    reason VARCHAR(500),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100),
    CONSTRAINT fk_history_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 4. SEQUENCES (التسلسلات)
CREATE SEQUENCE IF NOT EXISTS member_card_number_seq START WITH 1000000;
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 2000000;
