# 🏗️ Unified Member Architecture - Entity Design Complete

## ✅ Phase 2: Entity Structure Design - COMPLETED

**Date:** January 11, 2026  
**Status:** ✅ Design Complete - Ready for Service Layer Implementation

---

## 📐 Architecture Overview

### **Before (Anti-Pattern):**
```
┌─────────────┐         ┌──────────────────┐
│   Member    │◄────────│  FamilyMember    │
│  (Table 1)  │         │    (Table 2)     │
└─────────────┘         └──────────────────┘
   ▲                            ▲
   │ barcode (required)         │ barcode (required)
   │ cardNumber (unique)        │ cardNumber (separate)
```

### **After (Unified Architecture):**
```
┌──────────────────────────────────────┐
│            Member                    │
│  (Single Unified Table)              │
├──────────────────────────────────────┤
│ parent_id (self-referencing FK)      │
│ relationship (for dependents)        │
│ barcode (principal only)             │
│ cardNumber (principal + suffix)      │
└──────────────────────────────────────┘
   ▲                    │
   │                    │
   └────────────────────┘
    (self-referencing)
```

---

## 🎯 Key Changes Implemented

### 1️⃣ **Member Entity (Member.java)**

#### **New Fields:**
```java
// Self-Referencing Relationship
@ManyToOne
@JoinColumn(name = "parent_id")
private Member parent; // NULL for principal, NOT NULL for dependent

@OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
private List<Member> dependents; // Only for principal members

@Enumerated(EnumType.STRING)
@Column(name = "relationship")
private Member.Relationship relationship; // NULL for principal, required for dependent
```

#### **Modified Fields:**
```java
// Barcode - ONLY for principals
@Column(unique = true, length = 100, name = "barcode")
private String barcode; // NOT NULL for principal, NULL for dependent

// Card Number - Unified with suffix
@Column(length = 50, name = "card_number")
private String cardNumber; // Principal: "123456", Dependent: "123456-01"
```

#### **New Enums:**
```java
public enum MemberType {
    PRINCIPAL,  // parent_id = NULL, has barcode
    DEPENDENT   // parent_id != NULL, no barcode
}

public enum Relationship {
    WIFE, HUSBAND, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER
}
```

#### **Helper Methods:**
```java
@Transient
public MemberType getType() {
    return parent == null ? MemberType.PRINCIPAL : MemberType.DEPENDENT;
}

@Transient
public boolean isPrincipal() { return parent == null; }

@Transient
public boolean isDependent() { return parent != null; }

@Transient
public Member getPrincipalMember() {
    return isPrincipal() ? this : parent;
}

@Transient
public String getFamilyBarcode() {
    return getPrincipalMember().getBarcode();
}
```

#### **Validation (@PrePersist):**
```java
// PRINCIPAL: barcode REQUIRED
if (isPrincipal() && barcode == null) {
    throw new IllegalStateException("Principal must have barcode");
}

// DEPENDENT: barcode MUST be NULL
if (isDependent() && barcode != null) {
    throw new IllegalStateException("Dependent should not have barcode");
}

// DEPENDENT: must have parent and relationship
if (isDependent() && (parent == null || relationship == null)) {
    throw new IllegalStateException("Dependent must have parent and relationship");
}
```

---

### 2️⃣ **DTOs Created/Modified**

#### **MemberCreateDto.java** ✅ Updated
```java
// For creating PRINCIPAL
private Long parentId = null; // NULL = principal
private Member.Relationship relationship = null;
private List<DependentMemberDto> dependents; // Optional inline creation

// For creating DEPENDENT
private Long parentId; // NOT NULL = dependent
private Member.Relationship relationship; // REQUIRED
```

#### **DependentMemberDto.java** ✅ New
```java
@NotNull
private Member.Relationship relationship;

@NotBlank
private String fullName;

private String nationalNumber;
private LocalDate birthDate;
private Member.Gender gender;
// NO barcode, NO cardNumber, NO parentId (auto-set)
```

#### **MemberUpdateDto.java** ✅ Updated
```java
// Can update relationship for dependents
private Member.Relationship relationship;

// FORBIDDEN: parentId, barcode, cardNumber (immutable)
```

#### **MemberViewDto.java** ✅ Updated
```java
private String type; // "PRINCIPAL" or "DEPENDENT"
private Long parentId; // Only for dependents
private String parentFullName;
private Member.Relationship relationship; // Only for dependents
private List<DependentViewDto> dependents; // Only for principals
private Integer dependentsCount;

// Legacy support (deprecated)
@Deprecated
private List<FamilyMemberDto> familyMembers;
```

#### **DependentViewDto.java** ✅ New
```java
private Long id;
private Member.Relationship relationship;
private String fullName;
private String cardNumber; // Auto-generated with suffix
private Long parentId;
private String parentFullName;
private String familyBarcode; // Inherited from principal
// NO own barcode
```

#### **FamilyEligibilityResponseDto.java** ✅ New
```java
private Boolean eligible;
private String message;
private MemberViewDto principal; // Head of family
private List<DependentViewDto> dependents; // All family members
private Integer totalFamilyMembers;
private Integer eligibleMembersCount;
private String familyBarcode;
```

---

### 3️⃣ **Migration Script**

**File:** `V200__unified_member_architecture.sql` ✅ Created

**Steps:**
1. ✅ Add `parent_id` column to `members` table
2. ✅ Add `relationship` column to `members` table
3. ✅ Migrate data from `family_members` to `members` (as dependents)
4. ✅ Add FK constraint: `members.parent_id → members.id`
5. ✅ Modify barcode constraint (nullable for dependents)
6. ✅ Add validation CHECK constraints:
   - Principals must have barcode
   - Dependents must have relationship
   - Dependents should not have barcode
7. ✅ Create indexes for performance:
   - `idx_members_parent_id`
   - `idx_members_relationship`
   - `idx_members_barcode_active`
8. ✅ Drop `family_members` table completely

---

## 🎯 Business Rules

### **Principal Member:**
- ✅ `parent_id` = NULL
- ✅ `barcode` = REQUIRED (auto-generated)
- ✅ `relationship` = NULL
- ✅ `cardNumber` = base number (e.g., "123456")
- ✅ Can have multiple dependents

### **Dependent Member:**
- ✅ `parent_id` = principal's ID (REQUIRED)
- ✅ `barcode` = NULL (uses parent's barcode)
- ✅ `relationship` = REQUIRED (WIFE, SON, DAUGHTER, etc.)
- ✅ `cardNumber` = principal's card + suffix (e.g., "123456-01")
- ✅ Cannot have sub-dependents (single level only)

### **Card Number Strategy:**
```
Principal:     123456
Dependent 1:   123456-01
Dependent 2:   123456-02
Dependent 3:   123456-03
```

### **Barcode Strategy:**
```
Principal:     WAD-2026-00001234 (QR scannable)
Dependent 1:   NULL (uses parent's barcode)
Dependent 2:   NULL (uses parent's barcode)
Dependent 3:   NULL (uses parent's barcode)
```

---

## 🔍 Eligibility Check Flow

### **Step 1: Scan Barcode**
```
User scans QR code → System receives barcode
```

### **Step 2: Fetch Family**
```sql
-- Find principal by barcode
SELECT * FROM members WHERE barcode = 'WAD-2026-00001234';

-- Fetch all dependents
SELECT * FROM members WHERE parent_id = {principal_id};
```

### **Step 3: Display Family**
```
┌─────────────────────────────────────┐
│  Principal: أحمد محمد علي           │
│  Card: 123456                       │
│  Status: ✅ Active                  │
├─────────────────────────────────────┤
│  Dependents:                        │
│  1. فاطمة (WIFE)     - 123456-01   │
│  2. محمد (SON)       - 123456-02   │
│  3. سارة (DAUGHTER)  - 123456-03   │
└─────────────────────────────────────┘
[Select Person] [Start Visit]
```

### **Step 4: User Selects Person**
```
User clicks on "محمد (SON)" → Visit starts for dependent ID
```

---

## 📊 Database Schema

```sql
CREATE TABLE members (
    id BIGSERIAL PRIMARY KEY,
    
    -- Self-Referencing Relationship
    parent_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
    relationship VARCHAR(20) CHECK (
        (parent_id IS NULL AND relationship IS NULL) OR 
        (parent_id IS NOT NULL AND relationship IS NOT NULL)
    ),
    
    -- Identification
    barcode VARCHAR(100) UNIQUE CHECK (
        (parent_id IS NULL AND barcode IS NOT NULL) OR 
        (parent_id IS NOT NULL AND barcode IS NULL)
    ),
    card_number VARCHAR(50) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    national_number VARCHAR(50),
    
    -- Personal Info
    birth_date DATE,
    gender VARCHAR(10) NOT NULL DEFAULT 'UNDEFINED',
    marital_status VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Employment & Insurance
    employer_org_id BIGINT NOT NULL,
    benefit_policy_id BIGINT,
    policy_number VARCHAR(100),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    card_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    eligibility_status BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_members_parent_id ON members(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_members_barcode_active ON members(barcode, active) WHERE barcode IS NOT NULL;
CREATE INDEX idx_members_relationship ON members(relationship) WHERE relationship IS NOT NULL;
```

---

## ✅ What's Completed

- ✅ Member Entity updated with self-referencing
- ✅ Relationship enum created
- ✅ MemberType enum created
- ✅ Helper methods added (isPrincipal, isDependent, etc.)
- ✅ Validation logic in @PrePersist
- ✅ MemberCreateDto updated
- ✅ DependentMemberDto created
- ✅ MemberUpdateDto updated
- ✅ MemberViewDto updated
- ✅ DependentViewDto created
- ✅ FamilyEligibilityResponseDto created
- ✅ Migration script V200 created

---

## 🚀 Next Steps (Phase 3)

### **Service Layer Implementation:**
1. Update MemberService to support unified creation
2. Update BarcodeGeneratorService (principal only)
3. Implement CardNumberGenerator (with suffix logic)
4. Update EligibilityService (return family)
5. Delete FamilyMemberService
6. Update MemberMapper

### **Controller Layer:**
1. Update MemberController endpoints
2. Remove FamilyMemberController
3. Update API documentation

---

## 📝 Summary

**Phase 2 Complete:** Entity structure redesigned from ground up. All DTOs created. Migration script ready. No more separate FamilyMember entity. Single unified Member table with self-referencing relationship.

**Architecture:** Professional, scalable, maintainable. Matches international insurance systems standards.

**Ready for:** Phase 3 - Service & Controller implementation.

---

**Completion Time:** January 11, 2026  
**Files Modified:** 7  
**Files Created:** 5  
**Migration Scripts:** 1 (V200)
