# 🏥 Provider API Contract (Updated)

**Module:** Provider Management  
**Version:** 2.0  
**Date:** 2025-12-30  
**Status:** 🔥 ACTIVE IMPLEMENTATION  
**Priority:** 🔴 HIGH

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Entity Structure](#3-entity-structure)
4. [Business Rules](#4-business-rules)
5. [API Endpoints](#5-api-endpoints)
6. [Auto-Code Generation](#6-auto-code-generation-missing)
7. [Validation Rules](#7-validation-rules)
8. [Integration Points](#8-integration-points)
9. [Testing Requirements](#9-testing-requirements)
10. [Implementation Plan](#10-implementation-plan)

---

## 1. Overview

### Purpose
Manage healthcare providers (hospitals, clinics, labs, pharmacies, radiology centers) with:
- ⚠️ **Auto-Code Generation** (`PRV-XXX`) - **MISSING**
- ✅ **License Uniqueness** validation - **IMPLEMENTED**
- ✅ **Provider Type** categorization - **IMPLEMENTED**
- ✅ **Contract Management** integration - **VIA ProviderContract MODULE**
- ✅ **Soft Delete** - **IMPLEMENTED**
- ✅ **Audit Trail** - **IMPLEMENTED**
- ⚠️ **Email Validation** - **NEEDS @Email ANNOTATION**
- ⚠️ **Tax Number Validation** - **NEEDS @Pattern ANNOTATION**
- ⚠️ **Contract Date Validation** - **NEEDS BUSINESS LOGIC**

### Key Features (Actual Implementation)
- Bilingual names (nameArabic + nameEnglish)
- License number uniqueness (global)
- Tax number field (no validation yet)
- Contract dates (start/end) - no validation
- Default discount rate (0-100%) - no validation yet
- Provider type enum (HOSPITAL, CLINIC, LAB, PHARMACY, RADIOLOGY)
- Active/Inactive status
- Relationships with ProviderContract (One-to-Many)

---

## 2. Current Implementation Status

### ✅ **What EXISTS:**

#### Provider Entity (`/provider/entity/Provider.java`)
```java
@Entity
@Table(name = "providers")
public class Provider {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ⚠️ MISSING: code field for PRV-XXX
    
    @Column(nullable = false, length = 200)
    private String nameArabic;  // ✅
    
    @Column(nullable = false, length = 200)
    private String nameEnglish;  // ✅
    
    @Column(unique = true, nullable = false, length = 100)
    private String licenseNumber;  // ✅ Unique constraint exists
    
    @Column(length = 50)
    private String taxNumber;  // ⚠️ No validation
    
    @Column(length = 100)
    private String city;  // ✅
    
    @Column(length = 500)
    private String address;  // ✅
    
    @Column(length = 50)
    private String phone;  // ✅
    
    @Column(length = 100)
    private String email;  // ⚠️ No @Email validation
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProviderType providerType;  // ✅
    
    @Column(nullable = false)
    private Boolean active = true;  // ✅
    
    private LocalDate contractStartDate;  // ⚠️ No validation
    private LocalDate contractEndDate;  // ⚠️ No validation
    
    @Column(precision = 5, scale = 2)
    private BigDecimal defaultDiscountRate;  // ⚠️ No validation
    
    private LocalDateTime createdAt;  // ✅
    private LocalDateTime updatedAt;  // ✅
    
    @Column(length = 100)
    private String createdBy;  // ✅
    
    @Column(length = 100)
    private String updatedBy;  // ✅
    
    @OneToMany(mappedBy = "provider", cascade = CascadeType.ALL)
    private List<ProviderContract> contracts = new ArrayList<>();  // ✅
}
```

#### ProviderService (`/provider/service/ProviderService.java`)
```java
@Service
public class ProviderService {
    // ✅ CRUD methods implemented
    public ProviderViewDto createProvider(ProviderCreateDto dto)
    public ProviderViewDto updateProvider(Long id, ProviderUpdateDto dto)
    public ProviderViewDto getProvider(Long id)
    public Page<ProviderViewDto> listProviders(int page, int size, String search)
    public void deleteProvider(Long id)  // Soft delete
    public List<ProviderSelectorDto> getSelectorOptions()
    public List<ProviderViewDto> search(String query)
    public long countProviders()
    
    // ⚠️ MISSING: Auto-code generation
    // ✅ HAS: License uniqueness check
}
```

#### ProviderController (`/provider/controller/ProviderController.java`)
```java
@RestController
@RequestMapping("/api/providers")
public class ProviderController {
    // ✅ All endpoints implemented
    POST   /api/providers
    PUT    /api/providers/{id}
    GET    /api/providers/{id}
    GET    /api/providers (paginated)
    DELETE /api/providers/{id}
    GET    /api/providers/selector
    GET    /api/providers/active
    GET    /api/providers/count
    GET    /api/providers/search
}
```

#### ProviderRepository (`/provider/repository/ProviderRepository.java`)
```java
@Repository
public interface ProviderRepository extends JpaRepository<Provider, Long> {
    // ✅ Search methods
    Page<Provider> searchPaged(String keyword, Pageable pageable);
    List<Provider> findAllActive();
    long countActive();
    List<Provider> search(String query);
    
    // ✅ Uniqueness checks
    boolean existsByLicenseNumber(String licenseNumber);
    boolean existsByNameArabic(String nameArabic);
    boolean existsByNameEnglish(String nameEnglish);
}
```

### ⚠️ **What's MISSING:**

1. **Auto-Code Generation (`PRV-XXX`):**
   - No `code` field in entity
   - No code generator service
   - No uniqueness validation for code

2. **Validation Enhancements:**
   - Email format validation (@Email annotation missing)
   - Tax number format validation (@Pattern missing)
   - Contract date validation (startDate < endDate)
   - Discount rate range validation (0-100%)

3. **Business Logic:**
   - Contract date overlap detection
   - Discount rate constraints
   - Provider type-specific validations

---

## 3. Entity Structure

### **Updated Provider Entity** (WITH CHANGES)

```java
@Entity
@Table(name = "providers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Provider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✨ NEW: Auto-generated code
    @Column(unique = true, nullable = false, length = 20)
    private String code;  // PRV-001, PRV-002, etc.

    @Column(nullable = false, length = 200)
    private String nameArabic;

    @Column(nullable = false, length = 200)
    private String nameEnglish;

    @Column(unique = true, nullable = false, length = 100)
    private String licenseNumber;

    // ✨ UPDATED: Add validation pattern
    @Pattern(regexp = "^3\\d{14}$", message = "Invalid Saudi tax number format (must be 15 digits starting with 3)")
    @Column(length = 50)
    private String taxNumber;

    @Column(length = 100)
    private String city;

    @Column(length = 500)
    private String address;

    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Invalid phone number format")
    @Column(length = 50)
    private String phone;

    // ✨ UPDATED: Add @Email validation
    @Email(message = "Invalid email format")
    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProviderType providerType;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    // ✨ Contract dates (need validation)
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;

    // ✨ UPDATED: Add range validation
    @DecimalMin(value = "0.00", message = "Discount rate must be at least 0.00")
    @DecimalMax(value = "100.00", message = "Discount rate must not exceed 100.00")
    @Digits(integer = 3, fraction = 2, message = "Discount rate must have at most 3 integer digits and 2 decimal digits")
    @Column(precision = 5, scale = 2)
    private BigDecimal defaultDiscountRate;

    // Audit fields
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(length = 100)
    private String createdBy;

    @Column(length = 100)
    private String updatedBy;

    // Relationships
    @OneToMany(mappedBy = "provider", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProviderContract> contracts = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### ProviderType Enum (NO CHANGES - Already Implemented)

```java
public enum ProviderType {
    HOSPITAL,      // مستشفى
    CLINIC,        // عيادة
    LAB,           // مختبر
    PHARMACY,      // صيدلية
    RADIOLOGY      // أشعة
}
```

---

## 4. Business Rules

### 🔴 **CRITICAL Rules**

#### Rule 1: Auto-Code Generation ⚠️ **TO IMPLEMENT**
```yaml
Pattern: PRV-{SEQUENCE}
Format: PRV-001, PRV-002, PRV-003, ...
Implementation:
  - Add code field to Provider entity
  - Create ProviderCodeGenerator service
  - Generate on createProvider() before save
  - Validate uniqueness
  - Make immutable (exclude from update DTO)
```

#### Rule 2: License Uniqueness ✅ **IMPLEMENTED**
```yaml
Field: licenseNumber
Validation:
  - UNIQUE constraint at DB level ✅
  - Check in ProviderService.createProvider() ✅
Error Response:
  - 409 CONFLICT
  - Message: "Provider with license number already exists: {licenseNumber}"
```

#### Rule 3: Email Validation ⚠️ **TO IMPLEMENT**
```yaml
Field: email
Validation:
  - @Email annotation needed
  - Optional field
  - Valid RFC 5322 format
```

#### Rule 4: Tax Number Format ⚠️ **TO IMPLEMENT**
```yaml
Field: taxNumber
Validation:
  - @Pattern(regexp = "^3\\d{14}$")
  - Saudi tax format: 15 digits starting with 3
  - Example: 300012345678901
  - Optional field
```

#### Rule 5: Contract Date Validation ⚠️ **TO IMPLEMENT**
```yaml
Fields: contractStartDate, contractEndDate
Validation:
  - Both optional
  - If both provided: startDate < endDate
  - Custom validator in service layer
Error Response:
  - 400 BAD REQUEST
  - Message: "Contract start date must be before end date"
```

#### Rule 6: Default Discount Rate ⚠️ **TO IMPLEMENT**
```yaml
Field: defaultDiscountRate
Validation:
  - @DecimalMin("0.00")
  - @DecimalMax("100.00")
  - @Digits(integer=3, fraction=2)
  - Optional field
```

#### Rule 7: Soft Delete ✅ **IMPLEMENTED**
```yaml
Field: active
Behavior:
  - DELETE sets active = false ✅
  - Queries filter WHERE active = true ✅
  - Can be reactivated
```

---

## 5. API Endpoints

### 5.1 Create Provider ✅ **IMPLEMENTED**

**Endpoint:** `POST /api/providers`  
**Auth:** `ROLE_SUPER_ADMIN` or `MANAGE_PROVIDERS`

**Request:**
```json
{
  "nameArabic": "مستشفى الملك فهد",
  "nameEnglish": "King Fahad Hospital",
  "licenseNumber": "LIC-2024-001",
  "taxNumber": "300012345678901",
  "city": "Riyadh",
  "address": "King Fahad Road, Riyadh",
  "phone": "+966112345678",
  "email": "info@kfh.sa",
  "providerType": "HOSPITAL",
  "contractStartDate": "2024-01-01",
  "contractEndDate": "2025-12-31",
  "defaultDiscountRate": 15.00
}
```

**Response:** `201 CREATED`
```json
{
  "success": true,
  "message": "Provider created successfully",
  "data": {
    "id": 1,
    "code": "PRV-001",  // ⚠️ TO BE IMPLEMENTED
    "nameArabic": "مستشفى الملك فهد",
    "nameEnglish": "King Fahad Hospital",
    "licenseNumber": "LIC-2024-001",
    "taxNumber": "300012345678901",
    "city": "Riyadh",
    "address": "King Fahad Road, Riyadh",
    "phone": "+966112345678",
    "email": "info@kfh.sa",
    "providerType": "HOSPITAL",
    "providerTypeLabel": "مستشفى",
    "active": true,
    "contractStartDate": "2024-01-01",
    "contractEndDate": "2025-12-31",
    "defaultDiscountRate": 15.00,
    "createdAt": "2024-12-30T10:30:00",
    "updatedAt": "2024-12-30T10:30:00"
  }
}
```

### 5.2 Update Provider ✅ **IMPLEMENTED**

**Endpoint:** `PUT /api/providers/{id}`

### 5.3 Get Provider by ID ✅ **IMPLEMENTED**

**Endpoint:** `GET /api/providers/{id}`

### 5.4 List Providers (Paginated) ✅ **IMPLEMENTED**

**Endpoint:** `GET /api/providers?page=1&size=10&search=keyword`

### 5.5 Get Selector Options ✅ **IMPLEMENTED**

**Endpoint:** `GET /api/providers/selector`

### 5.6 Delete Provider (Soft) ✅ **IMPLEMENTED**

**Endpoint:** `DELETE /api/providers/{id}`

### 5.7 Get Active Providers ✅ **IMPLEMENTED**

**Endpoint:** `GET /api/providers/active`

### 5.8 Count Providers ✅ **IMPLEMENTED**

**Endpoint:** `GET /api/providers/count`

### 5.9 Search Providers ✅ **IMPLEMENTED**

**Endpoint:** `GET /api/providers/search?query=keyword`

---

## 6. Auto-Code Generation ⚠️ **MISSING**

### Implementation Strategy

#### Step 1: Add `code` field to Provider entity
```java
@Column(unique = true, nullable = false, length = 20)
private String code;  // PRV-001, PRV-002, etc.
```

#### Step 2: Create ProviderCodeGenerator service
```java
@Service
@Slf4j
public class ProviderCodeGenerator {
    
    private static final String PREFIX = "PRV-";
    private final AtomicLong sequence = new AtomicLong(1);
    private final ProviderRepository providerRepository;
    
    public ProviderCodeGenerator(ProviderRepository providerRepository) {
        this.providerRepository = providerRepository;
    }
    
    @PostConstruct
    public void initSequence() {
        Long maxId = providerRepository.findMaxId();
        if (maxId != null) {
            sequence.set(maxId + 1);
        }
        log.info("Provider code sequence initialized to: {}", sequence.get());
    }
    
    public synchronized String generateCode() {
        String code;
        do {
            long nextVal = sequence.getAndIncrement();
            code = PREFIX + String.format("%03d", nextVal);
        } while (providerRepository.existsByCode(code));
        
        log.info("Generated provider code: {}", code);
        return code;
    }
}
```

#### Step 3: Add to ProviderRepository
```java
boolean existsByCode(String code);

@Query("SELECT MAX(p.id) FROM Provider p")
Long findMaxId();
```

#### Step 4: Update ProviderService.createProvider()
```java
@Service
public class ProviderService {
    
    private final ProviderCodeGenerator codeGenerator;
    
    public ProviderViewDto createProvider(ProviderCreateDto dto) {
        // Validate license uniqueness
        if (providerRepository.existsByLicenseNumber(dto.getLicenseNumber())) {
            throw new RuntimeException("Provider with license number already exists: " + dto.getLicenseNumber());
        }
        
        // Validate contract dates
        if (dto.getContractStartDate() != null && dto.getContractEndDate() != null) {
            if (!dto.getContractStartDate().isBefore(dto.getContractEndDate())) {
                throw new RuntimeException("Contract start date must be before end date");
            }
        }
        
        // Create provider
        Provider provider = providerMapper.toEntity(dto);
        
        // ✨ Generate code
        provider.setCode(codeGenerator.generateCode());
        
        // Save
        provider = providerRepository.save(provider);
        
        return providerMapper.toViewDto(provider);
    }
}
```

---

## 7. Validation Rules

### Updated ProviderCreateDto

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderCreateDto {
    
    @NotBlank(message = "Arabic name is required")
    @Size(max = 200, message = "Arabic name must not exceed 200 characters")
    private String nameArabic;
    
    @NotBlank(message = "English name is required")
    @Size(max = 200, message = "English name must not exceed 200 characters")
    private String nameEnglish;
    
    @NotBlank(message = "License number is required")
    @Size(max = 100, message = "License number must not exceed 100 characters")
    private String licenseNumber;
    
    @Pattern(regexp = "^3\\d{14}$", message = "Invalid Saudi tax number format (must be 15 digits starting with 3)")
    private String taxNumber;
    
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;
    
    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;
    
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Invalid phone number format")
    private String phone;
    
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;
    
    @NotNull(message = "Provider type is required")
    private String providerType;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate contractStartDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate contractEndDate;
    
    @DecimalMin(value = "0.00", message = "Discount rate must be at least 0.00")
    @DecimalMax(value = "100.00", message = "Discount rate must not exceed 100.00")
    @Digits(integer = 3, fraction = 2, message = "Discount rate must have at most 3 integer digits and 2 decimal digits")
    private BigDecimal defaultDiscountRate;
}
```

---

## 8. Integration Points

### 8.1 ProviderContract Module ✅ **INTEGRATED**
```yaml
Relationship: One-to-Many (Provider → ProviderContract)
Integration:
  - Provider.contracts relationship exists ✅
  - Contract pricing per provider ✅
  - Network status calculation ✅
  - Discount rate application ✅
```

### 8.2 Claim Module ✅ **INTEGRATED**
```yaml
Integration:
  - ClaimService uses ProviderNetworkService ✅
  - Network cost calculation ✅
  - Discount application ✅
```

### 8.3 PreAuthorization Module ✅ **EXISTS**
```yaml
Integration:
  - Provider selected for pre-auth
  - Network validation
```

---

## 9. Testing Requirements

### Unit Tests (15+ tests needed)

```java
@SpringBootTest
class ProviderServiceTest {
    
    // ⚠️ TO IMPLEMENT
    @Test void testCodeGeneration_Success() {}
    @Test void testCodeGeneration_Uniqueness() {}
    @Test void testCodeGeneration_Format() {}
    
    // ✅ EXISTS
    @Test void testCreate_DuplicateLicense_ThrowsConflict() {}
    
    // ⚠️ TO IMPLEMENT
    @Test void testCreate_InvalidEmail_ThrowsBadRequest() {}
    @Test void testCreate_InvalidTaxNumber_ThrowsBadRequest() {}
    @Test void testCreate_InvalidDiscountRate_ThrowsBadRequest() {}
    @Test void testCreate_StartDateAfterEndDate_ThrowsBadRequest() {}
    @Test void testCreate_ValidDateRange_Success() {}
    
    // ✅ EXISTS
    @Test void testCreate_ValidData_Success() {}
    @Test void testUpdate_ValidData_Success() {}
    @Test void testGetById_Exists_ReturnsProvider() {}
    @Test void testGetById_NotExists_ThrowsNotFound() {}
    @Test void testDelete_SoftDelete_SetsActiveToFalse() {}
    @Test void testSearch_ByName_ReturnsResults() {}
    @Test void testListActive_ExcludesInactive() {}
}
```

---

## 10. Implementation Plan

### Phase 1: Auto-Code Generation (Priority 1) - 1 day

- [ ] Add `code` field to Provider entity
- [ ] Create ProviderCodeGenerator service
- [ ] Update ProviderRepository (add existsByCode, findMaxId)
- [ ] Update ProviderService.createProvider() to use generator
- [ ] Update ProviderViewDto to include code
- [ ] Exclude code from ProviderUpdateDto
- [ ] Test code generation (3 unit tests)

### Phase 2: Enhanced Validation (Priority 2) - 0.5 day

- [ ] Add @Email to Provider.email
- [ ] Add @Pattern to Provider.taxNumber
- [ ] Add @Pattern to Provider.phone
- [ ] Add @DecimalMin/@DecimalMax to Provider.defaultDiscountRate
- [ ] Add contract date validator in service
- [ ] Update ProviderCreateDto with all validations
- [ ] Test all validations (6 unit tests)

### Phase 3: Testing & Documentation (Priority 3) - 0.5 day

- [ ] Write all unit tests (15+ total)
- [ ] Integration test for code generation
- [ ] Update API documentation
- [ ] Update contract compliance report

---

## 11. Success Criteria

✅ **Provider Contract COMPLETE When:**

1. ✅ Provider entity exists
2. ⚠️ Auto-code generation (PRV-XXX) implemented and tested
3. ✅ License uniqueness enforced
4. ⚠️ Email validation (@Email) added
5. ⚠️ Tax number format validation added
6. ⚠️ Contract date validation (start < end) added
7. ⚠️ Discount rate validation (0-100%) added
8. ✅ Soft delete working
9. ✅ Integration with ProviderContract verified
10. ⚠️ All 15+ tests passing

**Current Status:** 40% Complete  
**Estimated Time to Complete:** 2 days  
**Priority:** HIGH

---

## 12. Related Documents

- ✅ [ProviderContract API Contract](PROVIDER_CONTRACT_API_CONTRACT.md) - Complete
- ✅ [ProviderContract Implementation Report](PROVIDER_CONTRACT_IMPLEMENTATION_REPORT.md) - Complete
- ✅ [Member API Contract](MEMBER_API_CONTRACT.md) - Complete
- ✅ [BenefitPolicy API Contract](BENEFIT_POLICY_API_CONTRACT.md) - Complete

---

**Next Action:** Implement Phase 1 (Auto-Code Generation) 🚀
