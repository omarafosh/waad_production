package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name="medical_service_split_queue")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalServiceSplitQueue {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="split_id", nullable=false, unique=true, length=50)
    private String splitId;
    @Column(name="service_text", nullable=false, length=500)
    private String serviceText;
    @Column(name="service_normalized", nullable=false, length=500)
    private String serviceNormalized;
    @Column(name="medical_specialty", length=100)
    private String medicalSpecialty;
    @Column(name="status", nullable=false, length=30)
    private String status;
    @Column(name="confidence", nullable=false)
    private Double confidence;
    @Column(name="providers", columnDefinition="TEXT")
    private String providers;
    @Column(name="reason", columnDefinition="TEXT")
    private String reason;
    @Column(name="created_at", nullable=false)
    private LocalDateTime createdAt;
}
