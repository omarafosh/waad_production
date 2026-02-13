package com.waad.tba.modules.company.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CompanySettings Entity - Phase 9
 * 
 * This entity stores feature toggles/flags for each employer within a company.
 * It allows granular control over what features each employer can access.
 * 
 * Feature Flags:
 * - canViewClaims: Allow EMPLOYER_ADMIN to view claims (default: false)
 * - canViewVisits: Allow EMPLOYER_ADMIN to view visits (default: false)
 * - canEditMembers: Allow EMPLOYER_ADMIN to edit members (default: true)
 * - canDownloadAttachments: Allow downloading attachments (default: true)
 * 
 * These settings work ON TOP of RBAC permissions. Even if a user has the 
 * VIEW_CLAIMS permission, they still need canViewClaims=true to access claims.
 */
@Entity
@Table(name = "company_settings", 
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"company_id", "employer_id"}, 
                         name = "uk_company_employer_settings")
    },
    indexes = {
        @Index(name = "idx_company_settings_employer", columnList = "employer_id"),
        @Index(name = "idx_company_settings_company", columnList = "company_id")
    })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CompanySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public Long getId() {
        return id;
    }

    /**
     * Reference to the company (TPA)
     */
    @Column(name = "company_id", nullable = false)
    private Long companyId;

    /**
     * Reference to the employer
     * Each employer can have different feature access
     */
    @Column(name = "employer_id", nullable = false)
    private Long employerId;

    /**
     * Feature Flags (Tenant-Level restrictions)
     */
    @Column(name = "can_view_claims", nullable = false)
    @Builder.Default
    private Boolean canViewClaims = false;

    @Column(name = "can_view_visits", nullable = false)
    @Builder.Default
    private Boolean canViewVisits = false;

    @Column(name = "can_edit_members", nullable = false)
    @Builder.Default
    private Boolean canEditMembers = true;

    @Column(name = "can_download_attachments", nullable = false)
    @Builder.Default
    private Boolean canDownloadAttachments = true;
    /**
     * UI visibility configuration stored as JSONB in PostgreSQL.
     * We keep it as String here and parse/serialize using Jackson in the service layer.
     * Default: null (nullable to avoid SQL errors if column doesn't exist)
     * 
     * NOTE: This field may not exist in all databases. Handle gracefully.
     */
    @Column(name = "ui_visibility", columnDefinition = "jsonb", nullable = true)
    private String uiVisibility;

    public String getUiVisibility() { return uiVisibility; }
    public void setUiVisibility(String uiVisibility) { this.uiVisibility = uiVisibility; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public Long getEmployerId() { return employerId; }
    public void setEmployerId(Long employerId) { this.employerId = employerId; }

    public Boolean getCanViewClaims() { return canViewClaims; }
    public void setCanViewClaims(Boolean canViewClaims) { this.canViewClaims = canViewClaims; }

    public Boolean getCanViewVisits() { return canViewVisits; }
    public void setCanViewVisits(Boolean canViewVisits) { this.canViewVisits = canViewVisits; }

    public Boolean getCanEditMembers() { return canEditMembers; }
    public void setCanEditMembers(Boolean canEditMembers) { this.canEditMembers = canEditMembers; }

    public Boolean getCanDownloadAttachments() { return canDownloadAttachments; }
    public void setCanDownloadAttachments(Boolean canDownloadAttachments) { this.canDownloadAttachments = canDownloadAttachments; }

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


}
