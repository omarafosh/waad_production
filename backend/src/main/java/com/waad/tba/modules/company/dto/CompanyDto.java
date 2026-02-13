package com.waad.tba.modules.company.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for Company - Single Company Context
 * 
 * Includes branding and identity fields for system-wide use.
 * All branding fields are optional - if null, they won't be displayed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDto {

    private Long id;

    @NotBlank(message = "Company name is required")
    private String name;

    @NotBlank(message = "Company code is required")
    private String code;

    private Boolean active;

    /**
     * Indicates if this is the default/system company.
     */
    private Boolean isDefault;

    // ============================================================================
    // BRANDING & IDENTITY FIELDS
    // ============================================================================

    /**
     * Company logo URL/path.
     * Optional - if null, no logo is displayed.
     */
    private String logoUrl;

    /**
     * Primary contact phone.
     * Optional - if null, not displayed in headers/footers.
     */
    private String phone;

    /**
     * Primary contact email.
     * Optional - if null, not displayed in headers/footers.
     */
    private String email;

    /**
     * Physical/registered address.
     * Optional - if null, not displayed in headers/footers.
     */
    private String address;

    /**
     * Company website URL.
     * Optional - if null, not displayed in headers/footers.
     */
    private String website;

    /**
     * Type of business (e.g., "Third Party Administrator").
     * Optional - if null, not displayed.
     */
    private String businessType;

    /**
     * Tax/Commercial registration number.
     * Optional - if null, not displayed.
     */
    private String taxNumber;

    /**
     * System default currency.
     */
    private String currency;

    /**
     * Smart Card Numbering Format.
     */
    private String cardNumberFormat;

    /**
     * Claim processing SLA in business days.
     */
    private Integer claimSlaDays;

    /**
     * Pre-approval processing SLA in business days.
     */
    private Integer preApprovalSlaDays;

    /**
     * Preferred system font family.
     */
    private String fontFamily;

    /**
     * System font size.
     */
    private Integer fontSize;

    /**
     * Barcode Prefix (Admin Only).
     */
    private String barcodePrefix;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
