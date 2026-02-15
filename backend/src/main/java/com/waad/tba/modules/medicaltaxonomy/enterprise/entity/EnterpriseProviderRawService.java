package com.waad.tba.modules.medicaltaxonomy.enterprise.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "ent_provider_raw_services", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider_id", "raw_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseProviderRawService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Column(name = "raw_name", nullable = false, length = 255)
    private String rawName;

    @Column(name = "raw_code", nullable = false, length = 100)
    private String rawCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapped_service_id")
    private EnterpriseMedicalService mappedService;

    @Enumerated(EnumType.STRING)
    @Column(name = "mapping_status", nullable = false, length = 20)
    @Builder.Default
    private MappingStatus mappingStatus = MappingStatus.UNMAPPED;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    public enum MappingStatus {
        UNMAPPED, PENDING, ACTIVE, REJECTED
    }
}
