package com.waad.tba.modules.visit.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.entity.SoftDeleteEntity;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.member.entity.Member;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "visits")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@org.hibernate.annotations.SQLDelete(sql = "UPDATE visits SET active = false, updated_at = NOW() WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("active = true")
public class Visit extends SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // NEW: Denormalized employer organization reference (for queries/filtering)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_org_id")
    private Organization employerOrganization;

    @Column(name = "provider_id")
    private Long providerId;

    private String doctorName;
    
    private String specialty;
    
    @Column(nullable = false)
    private LocalDate visitDate;
    
    private String diagnosis;
    
    private String treatment;
    
    @Column()
    private BigDecimal totalAmount;
    
    @Column(length = 1000)
    private String notes;
    
    // active, version, validFrom, validTo, createdAt, updatedAt
    // موروثة من SoftDeleteEntity

    /**
     * Type of visit/service location classification
     * Default: OUTPATIENT (عيادة خارجية)
     * 
     * Examples:
     * - EMERGENCY: Emergency room visits
     * - INPATIENT: Hospital admissions
     * - OUTPATIENT: Clinic visits (default)
     * - ROUTINE: Regular check-ups
     * - FOLLOW_UP: Post-treatment follow-ups
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "visit_type", length = 30)
    @Builder.Default
    private VisitType visitType = VisitType.OUTPATIENT;

    /**
     * Visit status - tracks the lifecycle of the visit
     * NEW: Part of the new Pre-Authorization/Claim flow (2026-01-13)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    @Builder.Default
    private VisitStatus status = VisitStatus.REGISTERED;

    // ==================== NEW FLOW: Visit as central link ====================
    
    /**
     * Eligibility check ID that created this visit
     * Links visit back to the eligibility verification
     */
    @Column(name = "eligibility_check_id")
    private Long eligibilityCheckId;
    
    /**
     * Related claims created from this visit (one visit can have multiple claims)
     */
    @OneToMany(mappedBy = "visit", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<com.waad.tba.modules.claim.entity.Claim> claims = new ArrayList<>();
    
    /**
     * Related eligibility checks for this visit
     */
    @OneToMany(mappedBy = "visit", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<com.waad.tba.modules.eligibility.entity.EligibilityCheck> eligibilityChecks = new ArrayList<>();

    // createdAt و updatedAt موروثة من SoftDeleteEntity
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Helper method to add a claim to this visit
     */
    public void addClaim(com.waad.tba.modules.claim.entity.Claim claim) {
        claims.add(claim);
        claim.setVisit(this);
    }
    
    /**
     * Helper method to remove a claim from this visit
     */
    public void removeClaim(com.waad.tba.modules.claim.entity.Claim claim) {
        claims.remove(claim);
        claim.setVisit(null);
    }
    
    /**
     * Helper method to add an eligibility check to this visit
     */
    public void addEligibilityCheck(com.waad.tba.modules.eligibility.entity.EligibilityCheck check) {
        eligibilityChecks.add(check);
        check.setVisit(this);
    }
    
    // ==================== BUSINESS LOGIC ====================
    
    /**
     * Check if this visit allows creating a claim
     */
    public boolean allowsClaimCreation() {
        return status != null && status.allowsClaimCreation();
    }
    
    /**
     * Check if this visit allows creating a pre-authorization
     */
    public boolean allowsPreAuthCreation() {
        return status != null && status.allowsPreAuthCreation();
    }
    
    /**
     * Update status based on activity
     */
    public void updateStatusForPreAuth() {
        if (this.status == VisitStatus.REGISTERED || this.status == VisitStatus.IN_PROGRESS) {
            this.status = VisitStatus.PENDING_PREAUTH;
        }
    }
    
    public void updateStatusForClaim() {
        if (this.status != VisitStatus.CANCELLED) {
            this.status = VisitStatus.CLAIM_SUBMITTED;
        }
    }
}
