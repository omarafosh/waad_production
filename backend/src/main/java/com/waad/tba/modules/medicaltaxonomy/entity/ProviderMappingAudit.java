package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;


@Entity
@Table(name = "provider_mapping_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderMappingAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_raw_service_id")
    private ProviderRawService providerRawService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_medical_service_id")
    private MedicalService oldMedicalService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_medical_service_id")
    private MedicalService newMedicalService;

    @Column(name = "changed_by", nullable = false)
    private String changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    @Column(name = "reason", length = 500)
    private String reason;
}
