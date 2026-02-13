package com.waad.tba.modules.medicaltaxonomy.entity;

import com.waad.tba.modules.provider.entity.Provider;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Provider Raw Service Entity
 * 
 * Stores the raw service codes and names as received from the provider.
 * These are unmapped initially and need to be linked to a Master Medical Service.
 */
@Entity
@Table(name = "provider_raw_services", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider_id", "service_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderRawService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @Column(name = "service_code", nullable = false, length = 100)
    private String serviceCode;

    @Column(name = "service_name")
    private String serviceName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
