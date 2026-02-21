package com.waad.tba.modules.provider.entity;

import com.waad.tba.common.entity.SoftDeleteEntity;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "providers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@org.hibernate.annotations.SQLDelete(sql = "UPDATE providers SET active = false, updated_at = NOW() WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("active = true")
public class Provider extends SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Provider name (اسم مقدم الخدمة)
     * Unified single name field
     */
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(unique = true, nullable = false, length = 100)
    private String licenseNumber;

    @Column(length = 50)
    private String taxNumber;

    @Column(length = 100)
    private String city;

    @Column(length = 500)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProviderType providerType;

    // active, version, validFrom, validTo, createdAt, updatedAt
    // موروثة من SoftDeleteEntity

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private NetworkTier networkStatus;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal defaultDiscountRate;

    /**
     * TPA Model: Specific employers allowed for this provider
     * (Without a formal contract for each)
     */
    @OneToMany(mappedBy = "provider", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProviderAllowedEmployer> allowedEmployers = new ArrayList<>();
    @Column(name = "allow_all_employers", nullable = false)
    @Builder.Default
    private Boolean allowAllEmployers = false;


    // createdAt, updatedAt, createdBy, updatedBy
    // createdBy و updatedBy موروثة من SoftDeleteEntity

    @OneToMany(mappedBy = "provider", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProviderContract> contracts = new ArrayList<>();

    public enum ProviderType {
        HOSPITAL,
        CLINIC,
        LAB,
        PHARMACY,
        RADIOLOGY
    }

    /**
     * Network Tier for Insurance Providers
     * - IN_NETWORK: Provider has contract with insurance (معتمد داخل الشبكة)
     * - OUT_OF_NETWORK: Provider not contracted (خارج الشبكة)
     * - PREFERRED: Preferred provider with better rates (مزود مفضل)
     */
    public enum NetworkTier {
        IN_NETWORK,
        OUT_OF_NETWORK,
        PREFERRED
    }
}
