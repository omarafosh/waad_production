package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_service_aliases_v2")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SafeMedicalServiceAlias {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name="alias_id", nullable=false, unique=true, length=50)
    private String aliasId;
    @Column(name="provider_id")
    private Long providerId;
    @Column(name="provider_name_snapshot", length=200)
    private String providerNameSnapshot;
    @Column(name="match_scope", nullable=false, length=30)
    private String matchScope;
    @Column(name="match_priority", nullable=false)
    private Integer matchPriority;
    @Column(name="alias_text", nullable=false, length=255)
    private String aliasText;
    @Column(name="alias_normalized", nullable=false, length=255)
    private String aliasNormalized;
    @Column(name="provider_code_normalized", length=120)
    private String providerCodeNormalized;
    @Column(name="section_normalized", length=255)
    private String sectionNormalized;
    @Column(name="master_code", nullable=false, length=255)
    private String masterCode;
    @Column(name="medical_service_id")
    private Long medicalServiceId;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="medical_service_id", insertable=false, updatable=false)
    private MedicalService medicalService;
    @Column(name="official_cat_code", nullable=false, length=60)
    private String officialCatCode;
    @Column(name="specialty", length=100)
    private String specialty;
    @Column(name="confidence", nullable=false)
    private Double confidence;
    @Column(name="status", nullable=false, length=40)
    private String status;
    @Column(name="auto_approve", nullable=false)
    private Boolean autoApprove;
    @Column(name="context_rule", length=80)
    private String contextRule;
    @Column(name="source", length=100)
    private String source;
    @Column(name="source_action", length=100)
    private String sourceAction;
    @Column(name="standard_name", length=255)
    private String standardName;
    @Column(name="reference_text", length=255)
    private String reference;
    @Column(name="notes", columnDefinition="TEXT")
    private String notes;
    @Column(name="created_at", nullable=false)
    private LocalDateTime createdAt;
    @Column(name="updated_at", nullable=false)
    private LocalDateTime updatedAt;
}
