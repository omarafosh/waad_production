package com.waad.tba.modules.provider.entity;

import com.waad.tba.common.entity.Organization;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * TPA Model: Specific employers allowed for this provider
 * Under the TPA model, a provider has one master contract with the TPA (Waad),
 * and this list defines which specific payers/employers they can serve.
 */
@Entity
@Table(name = "provider_allowed_employers")
@Getter
@Setter
@ToString(exclude = {"provider", "employer"})
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderAllowedEmployer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @ManyToOne(fetch = FetchType.EAGER) // Eager because we usually need names
    @JoinColumn(name = "employer_id", nullable = false)
    private Organization employer;

    @Column(name = "active")
    @Builder.Default
    private Boolean active = true;
}
