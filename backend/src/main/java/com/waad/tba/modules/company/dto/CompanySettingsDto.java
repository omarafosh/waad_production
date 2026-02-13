package com.waad.tba.modules.company.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CompanySettingsDto - Phase 9
 * 
 * Data Transfer Object for company settings.
 * Used for API requests/responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanySettingsDto {
    
    private Long id;
    
    @NotNull(message = "Company ID is required")
    private Long companyId;
    
    @NotNull(message = "Employer ID is required")
    private Long employerId;
    
    private Boolean canViewClaims;
    private Boolean canViewVisits;
    private Boolean canEditMembers;
    private Boolean canDownloadAttachments;
    /**
     * Employer name (for display purposes)
     */
    private String employerName;
    
    /**
     * Employer code (for filtering and identification)
     */
    private String employerCode;
    
    /**
     * Company name (for display purposes)
     */
    private String companyName;
    
    /**
     * UI visibility configuration (Phase B4)
     */
    private UiVisibilityDto uiVisibility;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public String getEmployerName() { return employerName; }
    public void setEmployerName(String employerName) { this.employerName = employerName; }
    public String getEmployerCode() { return employerCode; }
    public void setEmployerCode(String employerCode) { this.employerCode = employerCode; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public UiVisibilityDto getUiVisibility() { return uiVisibility; }
    public void setUiVisibility(UiVisibilityDto uiVisibility) { this.uiVisibility = uiVisibility; }
}
