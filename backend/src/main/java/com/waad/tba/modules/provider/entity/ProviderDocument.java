package com.waad.tba.modules.provider.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DocumentType type;

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 500)
    private String fileUrl; // Or path/key if using S3/MinIO

    @Column(length = 100)
    private String documentNumber; // Optional (e.g. License # if different from main)

    private LocalDate expiryDate;

    @Column(length = 500)
    private String notes;

    @Builder.Default
    private Boolean active = true;

    // Audit
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum DocumentType {
        LICENSE,                // رخصة مزاولة المهنة
        COMMERCIAL_REGISTER,    // سجل تجاري
        TAX_CERTIFICATE,        // شهادة ضريبية
        CONTRACT_COPY,          // نسخة العقد
        OTHER                   // أخرى
    }
}
