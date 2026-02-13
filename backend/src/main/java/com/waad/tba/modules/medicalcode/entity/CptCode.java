package com.waad.tba.modules.medicalcode.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cpt_codes", uniqueConstraints = {
    @UniqueConstraint(columnNames = "code", name = "uk_cpt_code")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CptCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "CPT code is required")
    @Column(unique = true, nullable = false, length = 20)
    private String code;

    @NotBlank(message = "Description (Arabic) is required")
    @Column(nullable = false, length = 500)
    private String descriptionAr;

    @NotBlank(message = "Description (English) is required")
    @Column(nullable = false, length = 500)
    private String descriptionEn;

    @Column(length = 100)
    private String category;

    @Column(length = 100)
    private String subCategory;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProcedureType procedureType;

    // Standard Pricing (can be overridden by provider contracts)
    @Column()
    private BigDecimal standardPrice;

    @Column()
    private BigDecimal maxAllowedPrice;

    @Column()
    private BigDecimal minAllowedPrice;

    // Coverage Information
    @Builder.Default
    @Column(nullable = false)
    private Boolean covered = true;

    @Column()
    private BigDecimal coPaymentPercentage;

    // Pre-authorization requirement
    @Builder.Default
    @Column(nullable = false)
    private Boolean requiresPreAuth = false;

    @Column(length = 2000)
    private String notes;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ProcedureType {
        CONSULTATION,
        DIAGNOSTIC,
        THERAPEUTIC,
        SURGICAL,
        LABORATORY,
        RADIOLOGY,
        REHABILITATION,
        PREVENTIVE,
        OTHER
    }
}
