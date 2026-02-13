package com.waad.tba.modules.member.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.common.annotation.SecureField;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.PrePersist;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "members", uniqueConstraints = {
        @UniqueConstraint(columnNames = "cardNumber", name = "uk_member_card_number"),
        @UniqueConstraint(columnNames = "barcode", name = "uk_member_barcode"),
        @UniqueConstraint(columnNames = "civil_id", name = "uk_member_civil_id")
})
@Data
@lombok.experimental.SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@lombok.EqualsAndHashCode(callSuper = true)
@org.hibernate.annotations.SQLDelete(sql = "UPDATE members SET deleted = true, deleted_at = NOW() WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("deleted = false")
public class Member extends com.waad.tba.common.entity.SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==================== UNIFIED MEMBER ARCHITECTURE ====================
    // Self-Referencing Relationship for Principal/Dependent Structure
    
    /**
     * Parent Member (Principal) - NULL for principal members, set for dependents.
     * This creates a self-referencing tree structure where:
     * - Principal: parent = null
     * - Dependent: parent = Principal Member
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Member parent;

    /**
     * List of dependents (family members) for this member.
     * Only populated for Principal members (where parent = null).
     * Cascade ALL to ensure dependents are deleted when principal is deleted.
     */
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Member> dependents = new ArrayList<>();

    /**
     * Count of dependents for this member.
     * Calculated using a subquery to avoid N+1 problem during list retrieval.
     */
    @org.hibernate.annotations.Formula("(SELECT COUNT(*) FROM members m WHERE m.parent_id = id)")
    private Integer dependentsCount;

    /**
     * Relationship type - ONLY for dependents (where parent != null).
     * NULL for principal members.
     * Examples: WIFE, HUSBAND, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 20, name = "relationship")
    private Relationship relationship;

    /**
     * Member Type - AUTO-CALCULATED based on parent_id.
     * PRINCIPAL: parent = null
     * DEPENDENT: parent != null
     */
    @Transient
    public MemberType getType() {
        return parent == null ? MemberType.PRINCIPAL : MemberType.DEPENDENT;
    }

    /**
     * Check if this member is a principal (has no parent).
     */
    @Transient
    public boolean isPrincipal() {
        return parent == null;
    }

    /**
     * Check if this member is a dependent (has a parent).
     */
    @Transient
    public boolean isDependent() {
        return parent != null;
    }

    // ==================== ORGANIZATION RELATIONSHIPS ====================

    // NEW: Organization-based relationships (canonical)
    @NotNull(message = "Employer organization is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_org_id", nullable = false)
    private Organization employerOrganization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insurance_org_id")
    private Organization insuranceOrganization;

    /**
     * BenefitPolicy for coverage rules (CANONICAL - Single Source of Truth).
     * This is the source of truth for what benefits the member is entitled to.
     * Auto-assigned on creation based on employer's active policy.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benefit_policy_id")
    private BenefitPolicy benefitPolicy;

    // ==================== ENTERPRISE SMART CARD FIELDS ====================
    
    @Column(name = "relationship_code", length = 5)
    private String relationshipCode; // P, D, S, C, T, G

    @Column(name = "provider_code", length = 3)
    private String providerCode;

    @Column(name = "company_code", length = 20)
    private String companyCode;

    @Column(name = "internal_id_part", length = 20)
    private String internalIdPart;

    @Column(name = "card_activated_at")
    private LocalDateTime cardActivatedAt;

    @Column(name = "is_smart_card")
    @Builder.Default
    private Boolean isSmartCard = false;

    @Column(name = "secondary_status", length = 50)
    private String secondaryStatus;


    // Fast-Track / VIP Features
    @Column(name = "is_vip")
    @Builder.Default
    private Boolean isVip = false;

    @Column(name = "is_urgent")
    @Builder.Default
    private Boolean isUrgent = false;

    @Column(name = "emergency_notes", length = 1000)
    private String emergencyNotes;

    // Personal Information
    @NotBlank(message = "Full name is required")
    @Column(nullable = false, length = 200, name = "full_name")
    private String fullName;

    // Unified Identification System
    @SecureField(mask = true, permission = "VIEW_SENSITIVE_DATA")
    @Column(length = 50, name = "civil_id")
    private String civilId;

    // ==================== UNIFIED IDENTIFICATION SYSTEM ====================
    
    /**
     * Card Number (رقم بطاقة العضو) - UNIFIED for family.
     * 
     * PRINCIPAL: Base card number (e.g., "123456")
     * DEPENDENT: Principal's card number + suffix (e.g., "123456-01", "123456-02")
     * 
     * Business Rules:
     * - Principal: Auto-generated or manual input
     * - Dependent: Inherited from principal with auto-incremented suffix
     * - Format: {principal_card_number}-{sequence}
     * - Unique when not null
     */
    @Column(length = 50, name = "card_number")
    private String cardNumber;

    /**
     * Barcode - MANDATORY for PRINCIPAL, NULL for DEPENDENT.
     * 
     * PRINCIPAL: Auto-generated unique barcode (WAD-YYYY-NNNNNNNN)
     * DEPENDENT: NULL (uses parent's barcode for eligibility check)
     * 
     * Business Rules:
     * - Only Principal members have barcodes
     * - Barcode scanning returns the Principal + all Dependents
     * - Used for QR code scanning and family eligibility verification
     * - Format: WAD-{YEAR}-{SEQUENCE}
     */
    @Column(unique = true, length = 100, name = "barcode")
    private String barcode;

    @PrePersist
    public void validateState() {
        // UNIFIED VALIDATION: Barcode MUST exist for PRINCIPAL only
        if (isPrincipal()) {
            if (this.barcode == null || this.barcode.trim().isEmpty()) {
                throw new IllegalStateException(
                    "Principal Member cannot be persisted without a valid barcode. " +
                    "Use BarcodeGeneratorService.generateForMember()."
                );
            }
        } else if (isDependent()) {
            // IMPORTANT: Dependents should NOT have barcode
            if (this.barcode != null && !this.barcode.trim().isEmpty()) {
                throw new IllegalStateException(
                    "Dependent Member should NOT have a barcode. " +
                    "Barcode is only for Principal members."
                );
            }
            // Dependents MUST have a parent
            if (this.parent == null) {
                throw new IllegalStateException(
                    "Dependent Member must have a parent (Principal Member)."
                );
            }
            // Dependents MUST have a relationship
            if (this.relationship == null) {
                throw new IllegalStateException(
                    "Dependent Member must have a relationship type (e.g., SON, DAUGHTER, WIFE)."
                );
            }
        }
        
        // Set default gender if not provided
        if (this.gender == null) {
            this.gender = Gender.UNDEFINED;
        }
    }

    /**
     * Get the principal member (root of the family).
     * - For Principal: returns self
     * - For Dependent: returns parent
     */
    @Transient
    public Member getPrincipalMember() {
        return isPrincipal() ? this : parent;
    }

    /**
     * Get the family barcode (always from principal).
     */
    @Transient
    public String getFamilyBarcode() {
        return getPrincipalMember().getBarcode();
    }

    // Date of Birth - OPTIONAL
    @Column(name = "birth_date")
    private LocalDate birthDate;

    // Gender - OPTIONAL with default UNDEFINED
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 10)
    private Gender gender = Gender.UNDEFINED;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, name = "marital_status")
    private MaritalStatus maritalStatus;

    @SecureField(mask = true, permission = "VIEW_PHONE")
    @Column(length = 20)
    private String phone;

    @SecureField(mask = true, permission = "VIEW_EMAIL")
    @Email(message = "Invalid email format")
    @Column(length = 255)
    private String email;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String nationality;

    // Insurance Information
    @Column(length = 100, name = "policy_number")
    private String policyNumber;

    // Employment Information
    @Column(length = 100, name = "employee_number")
    private String employeeNumber;

    @Column(name = "join_date")
    private LocalDate joinDate;

    @Column(length = 100)
    private String occupation;

    // Membership Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private MemberStatus status = MemberStatus.ACTIVE;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20, name = "card_status")
    private CardStatus cardStatus = CardStatus.ACTIVE;

    @Column(length = 500, name = "blocked_reason")
    private String blockedReason;

    // Eligibility
    @Builder.Default
    @Column(nullable = false, name = "eligibility_status")
    private Boolean eligibilityStatus = true;

    @Column(name = "eligibility_updated_at")
    private LocalDateTime eligibilityUpdatedAt;

    // Additional Information
    @Column(length = 500, name = "photo_url")
    private String photoUrl;

    @Column(length = 2000)
    private String notes;

    // Flexible Attributes
    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MemberAttribute> attributes = new ArrayList<>();

    /**
     * Check if member has an active benefit policy
     */
    @Transient
    public boolean hasActiveBenefitPolicy() {
        return benefitPolicy != null && benefitPolicy.isEffective();
    }

    /**
     * Check if member has an active benefit policy on a specific date
     */
    @Transient
    public boolean hasActiveBenefitPolicyOn(LocalDate date) {
        return benefitPolicy != null && benefitPolicy.isEffectiveOn(date);
    }

    // ==================== ENUMS ====================
    
    /**
     * Member Type - AUTO-CALCULATED based on parent_id.
     * PRINCIPAL: parent = null (head of family, has barcode)
     * DEPENDENT: parent != null (family member, uses parent's barcode)
     */
    public enum MemberType {
        PRINCIPAL,  // Parent = null, has barcode, can have dependents
        DEPENDENT   // Parent != null, no barcode, has relationship
    }

    /**
     * Relationship Type - ONLY for DEPENDENT members.
     * NULL for PRINCIPAL members.
     */
    public enum Relationship {
        WIFE,      // زوجة
        HUSBAND,   // زوج
        SON,       // ابن
        DAUGHTER,  // ابنة
        FATHER,    // أب
        MOTHER,    // أم
        BROTHER,   // أخ
        SISTER     // أخت
    }

    public enum Gender {
        MALE, FEMALE, UNDEFINED
    }

    public enum MaritalStatus {
        SINGLE, MARRIED, DIVORCED, WIDOWED
    }

    public enum MemberStatus {
        ACTIVE, SUSPENDED, TERMINATED, PENDING, DRAFT, PENDING_VERIFICATION
    }

    public enum CardStatus {
        ACTIVE, INACTIVE, BLOCKED, EXPIRED
    }
}
