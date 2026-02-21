# Provider Domain - API Contract

**Version**: 1.0  
**Date**: December 30, 2024  
**Module**: Provider (Foundation Module - Step 2)  
**Status**: Draft

---

## Table of Contents
1. [Overview](#overview)
2. [Domain Model](#domain-model)
3. [Field Registry](#field-registry)
4. [API Endpoints](#api-endpoints)
5. [Validation Rules](#validation-rules)
6. [Error Scenarios](#error-scenarios)
7. [Integration Points](#integration-points)

---

## Overview

### Purpose
The **Provider** module manages healthcare providers (hospitals, clinics, doctors) and their offered medical services. It serves as the foundation for provider networks, contracts, and claims processing.

### Key Principles
- **Service-Agnostic Structure**: Providers reference medical service codes (from MedicalTaxonomy) via junction table
- **Organization-Scoped**: All providers belong to an organization (multi-tenancy)
- **License-Based Identity**: Each provider has unique license number within organization
- **Flexible Service Catalog**: Many-to-many relationship with MedicalService via ProviderService junction
- **Soft Delete**: Preserve provider history (active flag)

### Architectural Boundaries
```java
// ✅ ALLOWED
provider.getServiceCodes();              // List of offered service codes
provider.hasService("SRV-CARDIO-001");  // Check if provider offers service
provider.getLicenseNumber();             // Unique within organization

// ❌ FORBIDDEN (handled by other modules)
provider.getContractPricing();           // → ProviderContract module
provider.getNetwork();                   // → Network module (future)
provider.getClaims();                    // → Claim module (future)
```

---

## Domain Model

### Provider Entity
Represents a healthcare provider (hospital, clinic, doctor).

```java
@Entity
@Table(name = "providers")
public class Provider {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String code;  // Immutable, unique
    
    @Column(nullable = false, length = 200)
    private String name;
    
    @Column(name = "name_en", length = 200)
    private String nameEn;
    
    @Column(name = "license_number", nullable = false, length = 100)
    private String licenseNumber;  // Unique within organization
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ProviderType type;  // HOSPITAL, CLINIC, DOCTOR, PHARMACY, LAB
    
    @Column(length = 100)
    private String specialization;  // For doctors (Cardiology, Neurology, etc.)
    
    @Column(name = "contact_phone", length = 20)
    private String contactPhone;
    
    @Column(name = "contact_email", length = 100)
    private String contactEmail;
    
    @Column(length = 500)
    private String address;
    
    @Column(name = "address_en", length = 500)
    private String addressEn;
    
    @Column(nullable = false)
    private Long organizationId;  // FK to Organization
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```

### ProviderService Entity (Junction Table)
Many-to-many relationship between Provider and MedicalService.

```java
@Entity
@Table(name = "provider_services")
public class ProviderService {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "provider_id", nullable = false)
    private Long providerId;  // FK to Provider
    
    @Column(name = "service_code", nullable = false, length = 50)
    private String serviceCode;  // References MedicalService.code
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    // Unique constraint: (providerId, serviceCode)
}
```

### ProviderType Enum
```java
public enum ProviderType {
    HOSPITAL,    // مستشفى
    CLINIC,      // عيادة
    DOCTOR,      // طبيب
    PHARMACY,    // صيدلية
    LAB          // مختبر
}
```

---

## Field Registry

### Provider Fields

| Field | Type | Max Length | Required | Immutable | Unique | Default | Description |
|-------|------|------------|----------|-----------|--------|---------|-------------|
| `id` | Long | - | Auto | Yes | Yes | - | Primary key |
| `code` | String | 50 | Yes | **Yes** | Yes | - | Provider unique code |
| `name` | String | 200 | Yes | No | No | - | Arabic name |
| `nameEn` | String | 200 | No | No | No | - | English name |
| `licenseNumber` | String | 100 | Yes | No | Yes* | - | License (unique per org) |
| `type` | Enum | 50 | Yes | No | No | - | Provider type |
| `specialization` | String | 100 | No | No | No | - | For doctors |
| `contactPhone` | String | 20 | No | No | No | - | Contact phone |
| `contactEmail` | String | 100 | No | No | No | - | Contact email |
| `address` | String | 500 | No | No | No | - | Arabic address |
| `addressEn` | String | 500 | No | No | No | - | English address |
| `organizationId` | Long | - | Yes | No | No | - | Organization FK |
| `active` | Boolean | - | Yes | No | No | true | Soft delete flag |
| `createdAt` | Timestamp | - | Auto | Yes | No | now() | Creation timestamp |
| `updatedAt` | Timestamp | - | Auto | No | No | now() | Last update timestamp |

\* License number unique within organization scope

### ProviderService Fields

| Field | Type | Max Length | Required | Immutable | Unique | Default | Description |
|-------|------|------------|----------|-----------|--------|---------|-------------|
| `id` | Long | - | Auto | Yes | Yes | - | Primary key |
| `providerId` | Long | - | Yes | Yes | No | - | Provider FK |
| `serviceCode` | String | 50 | Yes | Yes | No | - | MedicalService code |
| `active` | Boolean | - | Yes | No | No | true | Service assignment active |
| `createdAt` | Timestamp | - | Auto | Yes | No | now() | Creation timestamp |
| `updatedAt` | Timestamp | - | Auto | No | No | now() | Last update timestamp |

**Unique Constraint**: `(providerId, serviceCode)` - Provider cannot have duplicate service assignments

---

## API Endpoints

### Provider Endpoints (10 endpoints)

#### 1. Create Provider
**Endpoint**: `POST /api/providers`  
**Authorization**: `providers.create` or `SUPER_ADMIN`  
**Description**: Create a new provider

**Request Body**:
```json
{
  "code": "PRV-HOSPITAL-001",
  "name": "مستشفى الملك فيصل",
  "nameEn": "King Faisal Hospital",
  "licenseNumber": "LIC-KSA-12345",
  "type": "HOSPITAL",
  "specialization": null,
  "contactPhone": "+966112345678",
  "contactEmail": "info@kfh.sa",
  "address": "الرياض، المملكة العربية السعودية",
  "addressEn": "Riyadh, Saudi Arabia"
}
```

**Success Response** (201 Created):
```json
{
  "status": "success",
  "message": "Provider created successfully",
  "data": {
    "id": 1,
    "code": "PRV-HOSPITAL-001",
    "name": "مستشفى الملك فيصل",
    "nameEn": "King Faisal Hospital",
    "licenseNumber": "LIC-KSA-12345",
    "type": "HOSPITAL",
    "specialization": null,
    "contactPhone": "+966112345678",
    "contactEmail": "info@kfh.sa",
    "address": "الرياض، المملكة العربية السعودية",
    "addressEn": "Riyadh, Saudi Arabia",
    "organizationId": 10,
    "serviceCodes": [],
    "active": true,
    "createdAt": "2024-12-30T12:00:00",
    "updatedAt": "2024-12-30T12:00:00"
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

**Validation**:
- `code`: Required, unique, max 50 chars
- `name`: Required, max 200 chars
- `licenseNumber`: Required, unique within organization, max 100 chars
- `type`: Required, valid enum value
- `contactEmail`: Valid email format (if provided)

---

#### 2. Get Provider by ID
**Endpoint**: `GET /api/providers/{id}`  
**Authorization**: `providers.view` or `SUPER_ADMIN`  
**Description**: Retrieve provider by ID with service codes

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "code": "PRV-HOSPITAL-001",
    "name": "مستشفى الملك فيصل",
    "nameEn": "King Faisal Hospital",
    "licenseNumber": "LIC-KSA-12345",
    "type": "HOSPITAL",
    "serviceCodes": ["SRV-CARDIO-001", "SRV-NEURO-001"],
    "active": true,
    "organizationId": 10
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 3. Get Provider by Code
**Endpoint**: `GET /api/providers/code/{code}`  
**Authorization**: `providers.view` or `SUPER_ADMIN`  
**Description**: Retrieve provider by unique code

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "code": "PRV-HOSPITAL-001",
    "name": "مستشفى الملك فيصل"
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 4. List Providers (Paginated)
**Endpoint**: `GET /api/providers`  
**Authorization**: `providers.view` or `SUPER_ADMIN`  
**Description**: List all providers with pagination and organization filter

**Query Parameters**:
- `page`: Page number (default: 0)
- `size`: Page size (default: 20)
- `active`: Filter by active status (optional)

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "content": [
      {
        "id": 1,
        "code": "PRV-HOSPITAL-001",
        "name": "مستشفى الملك فيصل",
        "type": "HOSPITAL",
        "licenseNumber": "LIC-KSA-12345",
        "active": true
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20
    },
    "totalElements": 50,
    "totalPages": 3
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 5. Update Provider
**Endpoint**: `PUT /api/providers/{id}`  
**Authorization**: `providers.update` or `SUPER_ADMIN`  
**Description**: Update provider (code is immutable)

**Request Body**:
```json
{
  "name": "مستشفى الملك فيصل التخصصي",
  "contactPhone": "+966112345679"
}
```

**Success Response** (200 OK):
```json
{
  "status": "success",
  "message": "Provider updated successfully",
  "data": {
    "id": 1,
    "code": "PRV-HOSPITAL-001",
    "name": "مستشفى الملك فيصل التخصصي",
    "contactPhone": "+966112345679"
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 6. Delete Provider
**Endpoint**: `DELETE /api/providers/{id}`  
**Authorization**: `providers.delete` or `SUPER_ADMIN`  
**Description**: Soft delete provider (sets active = false)

**Success Response** (200 OK):
```json
{
  "status": "success",
  "message": "Provider deleted successfully",
  "data": null,
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 7. Search Providers
**Endpoint**: `GET /api/providers/search`  
**Authorization**: `providers.view` or `SUPER_ADMIN`  
**Description**: Advanced search with filters

**Query Parameters**:
- `term`: Search term (name/nameEn/licenseNumber)
- `type`: Filter by provider type
- `specialization`: Filter by specialization
- `active`: Filter by active status
- `page`: Page number
- `size`: Page size

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "content": [
      {
        "id": 1,
        "code": "PRV-HOSPITAL-001",
        "name": "مستشفى الملك فيصل",
        "type": "HOSPITAL"
      }
    ],
    "totalElements": 5
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 8. Filter by Type
**Endpoint**: `GET /api/providers/type/{type}`  
**Authorization**: `providers.view` or `SUPER_ADMIN`  
**Description**: Filter providers by type

**Path Parameters**:
- `type`: Provider type (HOSPITAL, CLINIC, DOCTOR, PHARMACY, LAB)

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "content": [
      {
        "id": 1,
        "code": "PRV-HOSPITAL-001",
        "name": "مستشفى الملك فيصل",
        "type": "HOSPITAL"
      }
    ]
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

---

#### 9. Assign Service to Provider
**Endpoint**: `POST /api/providers/{id}/services`  
**Authorization**: `providers.update` or `SUPER_ADMIN`  
**Description**: Assign medical service to provider

**Request Body**:
```json
{
  "serviceCode": "SRV-CARDIO-001"
}
```

**Success Response** (200 OK):
```json
{
  "status": "success",
  "message": "Service assigned successfully",
  "data": {
    "providerId": 1,
    "serviceCode": "SRV-CARDIO-001",
    "active": true
  },
  "timestamp": "2024-12-30T12:00:00"
}
```

**Validation**:
- Service code must exist in MedicalService table
- Service must be active
- Provider cannot have duplicate service assignments

---

#### 10. Remove Service from Provider
**Endpoint**: `DELETE /api/providers/{id}/services/{serviceCode}`  
**Authorization**: `providers.update` or `SUPER_ADMIN`  
**Description**: Remove service assignment (soft delete)

**Success Response** (200 OK):
```json
{
  "status": "success",
  "message": "Service removed successfully",
  "data": null,
  "timestamp": "2024-12-30T12:00:00"
}
```

---

## Validation Rules

### Provider Validation

#### 1. Code Uniqueness
```java
// RULE: Provider code must be unique globally
boolean exists = providerRepository.existsByCode(code);
if (exists) {
    throw new BusinessRuleException("Provider code already exists: " + code);
}
```

#### 2. Code Immutability
```java
// RULE: Code cannot be changed after creation
// Excluded from ProviderUpdateDto
```

#### 3. License Uniqueness per Organization
```java
// RULE: License number must be unique within organization
boolean exists = providerRepository.existsByLicenseNumberAndOrganizationId(
    licenseNumber, organizationId);
if (exists) {
    throw new BusinessRuleException(
        "License number already exists in this organization");
}
```

#### 4. Valid Provider Type
```java
// RULE: Type must be valid enum value
if (!Arrays.asList(ProviderType.values()).contains(type)) {
    throw new BusinessRuleException("Invalid provider type: " + type);
}
```

#### 5. Email Format (if provided)
```java
// RULE: Email must be valid format (if provided)
@Email(message = "Invalid email format")
private String contactEmail;
```

#### 6. Specialization for Doctors
```java
// RULE: Specialization recommended for DOCTOR type (not enforced)
if (type == ProviderType.DOCTOR && specialization == null) {
    // Log warning
}
```

### ProviderService Validation

#### 1. Service Code Exists
```java
// RULE: Service code must exist in MedicalService table
Optional<MedicalService> service = medicalServiceRepository
    .findByCode(serviceCode);
if (service.isEmpty() || !service.get().isActive()) {
    throw new BusinessRuleException(
        "Medical service not found or inactive: " + serviceCode);
}
```

#### 2. No Duplicate Assignments
```java
// RULE: Provider cannot have duplicate service assignments
boolean exists = providerServiceRepository
    .existsByProviderIdAndServiceCode(providerId, serviceCode);
if (exists) {
    throw new BusinessRuleException(
        "Service already assigned to provider");
}
```

#### 3. Provider Must Exist and Be Active
```java
// RULE: Provider must exist and be active
Provider provider = providerRepository.findById(providerId)
    .orElseThrow(() -> new BusinessRuleException("Provider not found"));
if (!provider.isActive()) {
    throw new BusinessRuleException("Cannot assign service to inactive provider");
}
```

---

## Error Scenarios

### Provider Errors

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Provider not found | 404 | PROVIDER_NOT_FOUND | "Provider not found with ID: {id}" |
| Duplicate code | 400 | DUPLICATE_PROVIDER_CODE | "Provider code already exists: {code}" |
| Duplicate license (org) | 400 | DUPLICATE_LICENSE | "License number already exists in organization" |
| Invalid provider type | 400 | INVALID_PROVIDER_TYPE | "Invalid provider type: {type}" |
| Invalid email format | 400 | INVALID_EMAIL | "Invalid email format" |
| Code immutable | 400 | CODE_IMMUTABLE | "Provider code cannot be changed" |

### ProviderService Errors

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Service not found | 404 | SERVICE_NOT_FOUND | "Medical service not found: {code}" |
| Service inactive | 400 | SERVICE_INACTIVE | "Cannot assign inactive service: {code}" |
| Duplicate assignment | 400 | DUPLICATE_SERVICE_ASSIGNMENT | "Service already assigned to provider" |
| Provider inactive | 400 | PROVIDER_INACTIVE | "Cannot assign service to inactive provider" |
| Assignment not found | 404 | ASSIGNMENT_NOT_FOUND | "Service assignment not found" |

---

## Integration Points

### With MedicalTaxonomy Module
```java
// Provider references service codes (NOT full entity)
// This maintains loose coupling

// ✅ CORRECT: Reference by code
providerService.setServiceCode("SRV-CARDIO-001");

// ❌ WRONG: Direct FK to MedicalService entity
// private MedicalService service;  // NO!
```

### Validation Example
```java
// Before assigning service, validate it exists
@Service
public class ProviderServiceService {
    @Autowired
    private MedicalServiceRepository medicalServiceRepository;
    
    public void assignService(Long providerId, String serviceCode) {
        // Validate service exists and is active
        MedicalService service = medicalServiceRepository
            .findByCode(serviceCode)
            .orElseThrow(() -> new BusinessRuleException(
                "Medical service not found: " + serviceCode));
        
        if (!service.isActive()) {
            throw new BusinessRuleException(
                "Cannot assign inactive service: " + serviceCode);
        }
        
        // Create assignment
        ProviderService ps = new ProviderService();
        ps.setProviderId(providerId);
        ps.setServiceCode(serviceCode);
        providerServiceRepository.save(ps);
    }
}
```

### Future Integration Points

#### ProviderContract Module (Future)
```java
// Provider contracts will reference both Provider and MedicalService
public class ProviderContract {
    private Long providerId;
    private String serviceCode;
    private BigDecimal contractPrice;  // Provider-specific pricing
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
```

#### Network Module (Future)
```java
// Provider network assignments
public class ProviderNetwork {
    private Long providerId;
    private Long networkId;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
```

#### Claim Module (Future)
```java
// Claims will reference Provider for service delivery
public class Claim {
    private Long providerId;
    private String serviceCode;
    private BigDecimal claimedAmount;
    // Pricing from ProviderContract, not basePrice
}
```

---

## Security

### Authorization Scopes
- `providers.view` - Read providers
- `providers.create` - Create providers
- `providers.update` - Update providers (including service assignments)
- `providers.delete` - Delete providers

### Organization Filtering
All provider queries are automatically scoped to the user's organization:
```java
@PreAuthorize("hasAuthority('providers.view')")
public Page<Provider> findAll(Pageable pageable) {
    Long organizationId = SecurityContextHolder.getOrganizationId();
    return providerRepository.findByOrganizationId(organizationId, pageable);
}
```

---

## Notes

### Code Immutability
- Provider `code` is immutable after creation
- Excluded from `ProviderUpdateDto`
- Use for stable external references

### License Number Scope
- Unique within organization (not globally)
- Allows same license across different organizations
- Database constraint: `UNIQUE (license_number, organization_id)`

### Soft Delete
- Providers are soft deleted (active = false)
- Service assignments are also soft deleted
- Preserves history for auditing and reporting

### Service Assignment Philosophy
- **Loose Coupling**: Reference by code, not FK
- **Flexibility**: Easy to add/remove services
- **Validation**: Always check service exists and is active
- **Future-Proof**: Ready for ProviderContract pricing

---

## Examples

### Example 1: Create Hospital Provider
```json
POST /api/providers
{
  "code": "PRV-HOSP-KFH",
  "name": "مستشفى الملك فيصل التخصصي",
  "nameEn": "King Faisal Specialist Hospital",
  "licenseNumber": "MOH-RY-2024-001",
  "type": "HOSPITAL",
  "contactPhone": "+966112345678",
  "contactEmail": "info@kfsh.med.sa",
  "address": "طريق الملك فهد، الرياض",
  "addressEn": "King Fahd Road, Riyadh"
}
```

### Example 2: Create Doctor Provider
```json
POST /api/providers
{
  "code": "PRV-DOC-AHMAD",
  "name": "د. أحمد محمد",
  "nameEn": "Dr. Ahmad Mohammed",
  "licenseNumber": "SCFHS-12345",
  "type": "DOCTOR",
  "specialization": "Cardiology",
  "contactPhone": "+966501234567",
  "contactEmail": "ahmad@example.com"
}
```

### Example 3: Assign Services to Hospital
```json
POST /api/providers/1/services
{"serviceCode": "SRV-CARDIO-CONSULT"}

POST /api/providers/1/services
{"serviceCode": "SRV-CARDIO-ECG"}

POST /api/providers/1/services
{"serviceCode": "SRV-CARDIO-ECHO"}
```

### Example 4: Search Cardiologists
```
GET /api/providers/search?type=DOCTOR&specialization=Cardiology&active=true
```

---

## Appendix A: Database Schema

### providers Table
```sql
CREATE TABLE providers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    license_number VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    specialization VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address VARCHAR(500),
    address_en VARCHAR(500),
    organization_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_license_per_org UNIQUE (license_number, organization_id),
    CONSTRAINT fk_provider_organization FOREIGN KEY (organization_id) 
        REFERENCES organizations(id)
);

CREATE INDEX idx_providers_code ON providers(code);
CREATE INDEX idx_providers_license ON providers(license_number);
CREATE INDEX idx_providers_org ON providers(organization_id);
CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_active ON providers(active);
```

### provider_services Table
```sql
CREATE TABLE provider_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_provider_service UNIQUE (provider_id, service_code),
    CONSTRAINT fk_provider_service_provider FOREIGN KEY (provider_id) 
        REFERENCES providers(id)
);

CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX idx_provider_services_code ON provider_services(service_code);
CREATE INDEX idx_provider_services_active ON provider_services(active);
```

---

**End of Contract**  
**Next Module**: ProviderContract (pricing per provider-service combination)
