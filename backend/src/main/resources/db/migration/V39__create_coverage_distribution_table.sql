-- 1. Update Benefit Policies table
ALTER TABLE benefit_policies 
ADD COLUMN IF NOT EXISTS distribution_type VARCHAR(20) DEFAULT 'UNIFIED';

-- 2. Create Coverage Distribution table
CREATE TABLE IF NOT EXISTS coverage_distributions (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    
    limit_amount DECIMAL(15, 2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dist_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_dist_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id),
    CONSTRAINT fk_dist_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id),
    
    -- Exclusive target validation
    CONSTRAINT ck_dist_target CHECK (
        (medical_category_id IS NOT NULL AND medical_service_id IS NULL) OR
        (medical_service_id IS NOT NULL AND medical_category_id IS NULL)
    )
);

-- Indexing
CREATE INDEX idx_dist_policy ON coverage_distributions(benefit_policy_id);
CREATE INDEX idx_dist_category ON coverage_distributions(medical_category_id);
CREATE INDEX idx_dist_service ON coverage_distributions(medical_service_id);
