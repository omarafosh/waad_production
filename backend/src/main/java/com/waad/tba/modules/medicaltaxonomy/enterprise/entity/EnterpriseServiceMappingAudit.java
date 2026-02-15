package com.waad.tba.modules.medicaltaxonomy.enterprise.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderRawService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseProviderRawService;

@Entity
@Table(name = "ent_service_mapping_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseServiceMappingAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;



    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ent_provider_raw_service_id")
    private EnterpriseProviderRawService providerRawService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_raw_service_id")
    private ProviderRawService legacyRawService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_medical_service_id")
    private EnterpriseMedicalService oldMedicalService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_medical_service_id")
    private EnterpriseMedicalService newMedicalService;

    @Column(name = "changed_by", nullable = false)
    private String changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    @Column(name = "reason", length = 500)
    private String reason;
}
