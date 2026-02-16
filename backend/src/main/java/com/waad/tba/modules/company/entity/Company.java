package com.waad.tba.modules.company.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Legacy TPA company entity - READ ONLY.
 * 
 * @deprecated Use {@link com.waad.tba.common.entity.Organization} with type=TPA instead.
 *             This entity is kept for backward compatibility only. All new code must use Organization.
 *             Writing to this entity is prohibited - use Organization with OrganizationType.TPA.
 */
@Deprecated
@Entity
@Table(name = "companies", uniqueConstraints = {
    @UniqueConstraint(columnNames = "code", name = "uk_company_code")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Company name is required")
    @Column(nullable = false, length = 200)
    private String name;

    @NotBlank(message = "Company code is required")
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    /**
     * Indicates if this is the default/primary company.
     * In single-company mode, only one company should have this set to true.
     */
    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    // ============================================================================
    // BRANDING & IDENTITY FIELDS
    // ============================================================================

    /**
     * Company logo URL/path.
     * Can be relative path to uploaded file or full URL.
     */
    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    /**
     * Primary contact phone number.
     */
    @Column(name = "phone", length = 50)
    private String phone;

    /**
     * Primary contact email.
     */
    @Column(name = "email", length = 100)
    private String email;

    /**
     * Physical/registered address.
     */
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    /**
     * Company website URL.
     */
    @Column(name = "website", length = 200)
    private String website;

    /**
     * Type of business (e.g., "Third Party Administrator", "Insurance Company").
     */
    @Column(name = "business_type", length = 100)
    private String businessType;

    /**
     * Tax/Commercial registration number.
     */
    @Column(name = "tax_number", length = 50)
    private String taxNumber;

    /**
     * System default currency.
     */
    @Column(name = "currency", length = 10)
    private String currency;

    /**
     * Smart Card Numbering Format.
     */
    @Column(name = "card_number_format", length = 200)
    private String cardNumberFormat;

    /**
     * Claim processing SLA in business days.
     */
    @Column(name = "claim_sla_days")
    private Integer claimSlaDays;

    /**
     * Pre-approval processing SLA in business days.
     */
    @Column(name = "pre_approval_sla_days")
    private Integer preApprovalSlaDays;

    /**
     * Preferred system font family.
     */
    @Column(name = "font_family", length = 50)
    private String fontFamily;

    /**
     * System font size (default 12).
     */
    @Builder.Default
    @Column(name = "font_size")
    private Integer fontSize = 12;

    /**
     * Barcode Prefix (e.g., WAAD).
     */
    @Builder.Default
    @Column(name = "barcode_prefix", length = 20)
    private String barcodePrefix = "WAAD";

    /**
     * Date calendar type (e.g., 'gregory', 'islamic').
     */
    @Builder.Default
    @Column(name = "date_calendar", length = 20)
    private String dateCalendar = "gregory";

    /**
     * Month format (e.g., 'numeric', '2-digit', 'long').
     */
    @Builder.Default
    @Column(name = "month_format", length = 20)
    private String monthFormat = "numeric";

    /**
     * Number system (e.g., 'latn', 'arab').
     */
    @Builder.Default
    @Column(name = "number_system", length = 20)
    private String numberSystem = "latn";
    
    /**
     * Card title color (HEX format, e.g., #2196f3).
     */
    @Column(name = "card_title_color", length = 20)
    private String cardTitleColor;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
