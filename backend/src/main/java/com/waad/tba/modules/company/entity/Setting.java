package com.waad.tba.modules.company.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * System Settings Entity.
 * Stores global system configuration, branding, and SLAs.
 * Simplified to support a single-record configuration (ID: 1).
 */
@Entity
@Table(name = "settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Setting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "System name is required")
    @Column(name = "system_name", nullable = false, length = 200)
    private String systemName;

    @NotBlank(message = "System code is required")
    @Column(name = "system_code", nullable = false, unique = true, length = 50)
    private String systemCode;

    @Column(name = "business_type", length = 100)
    private String businessType;

    // ============================================================================
    // BRANDING & IDENTITY FIELDS
    // ============================================================================

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "favicon_url", columnDefinition = "TEXT")
    private String faviconUrl;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "website", length = 200)
    private String website;

    @Column(name = "tax_number", length = 50)
    private String taxNumber;

    @Column(name = "currency", length = 10)
    private String currency;

    // ============================================================================
    // OPERATION & FORMATTING SETTINGS
    // ============================================================================

    @Column(name = "claim_sla_days")
    @Builder.Default
    private Integer claimSlaDays = 10;

    @Column(name = "pre_approval_sla_days")
    @Builder.Default
    private Integer preApprovalSlaDays = 3;

    @Column(name = "primary_color", length = 20)
    @Builder.Default
    private String primaryColor = "#1890ff";

    @Column(name = "font_family", length = 50)
    @Builder.Default
    private String fontFamily = "Tajawal";

    @Column(name = "font_size")
    @Builder.Default
    private Double fontSize = 14.0;

    @Column(name = "date_calendar", length = 20)
    @Builder.Default
    private String dateCalendar = "gregory";

    @Column(name = "barcode_prefix", length = 20)
    @Builder.Default
    private String barcodePrefix = "WAAD";

    @Column(name = "card_number_format", length = 100)
    @Builder.Default
    private String cardNumberFormat = "[PRO]-[YEAR]-[MP_NO][REL_SUFFIX]";

    @Column(name = "dependent_suffixes", columnDefinition = "TEXT")
    @Builder.Default
    private String dependentSuffixes = "{\"WIFE\":\"W\",\"HUSBAND\":\"H\",\"SON\":\"S\",\"DAUGHTER\":\"D\",\"FATHER\":\"F\",\"MOTHER\":\"M\",\"BROTHER\":\"B\",\"SISTER\":\"I\"}";

    // ============================================================================
    // AUDIT FIELDS
    // ============================================================================

    @Version
    @Builder.Default
    private Long version = 0L;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private String updatedBy;
}
