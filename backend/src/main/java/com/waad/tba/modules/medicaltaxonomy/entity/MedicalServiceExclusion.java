package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name="medical_service_exclusions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalServiceExclusion {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="exclusion_id", nullable=false, unique=true, length=50)
    private String exclusionId;
    @Column(name="alias_text", nullable=false, length=255)
    private String aliasText;
    @Column(name="alias_normalized", nullable=false, length=255)
    private String aliasNormalized;
    @Column(name="exclusion_type", nullable=false, length=40)
    private String exclusionType;
    @Column(name="official_cat_code", length=60)
    private String officialCatCode;
    @Column(name="confidence", nullable=false)
    private Double confidence;
    @Column(name="status", nullable=false, length=30)
    private String status;
    @Column(name="reason", columnDefinition="TEXT")
    private String reason;
    @Column(name="created_at", nullable=false)
    private LocalDateTime createdAt;
}
