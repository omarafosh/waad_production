-- ═══════════════════════════════════════════════════════════════════════════
-- V23: Create Medical Package Services Table (Join Table)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medical_package_services (
    package_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    PRIMARY KEY (package_id, service_id),
    CONSTRAINT fk_package_services_package FOREIGN KEY (package_id) REFERENCES medical_packages(id),
    CONSTRAINT fk_package_services_service FOREIGN KEY (service_id) REFERENCES medical_services(id)
);

CREATE INDEX IF NOT EXISTS idx_package_services_service ON medical_package_services(service_id);
