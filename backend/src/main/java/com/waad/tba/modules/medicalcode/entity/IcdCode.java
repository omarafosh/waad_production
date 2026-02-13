package com.waad.tba.modules.medicalcode.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "icd_codes", uniqueConstraints = {
    @UniqueConstraint(columnNames = "code", name = "uk_icd_code")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class IcdCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "ICD code is required")
    @Column(unique = true, nullable = false, length = 20)
    private String code;

    @NotBlank(message = "Description (Arabic) is required")
    @Column(nullable = false, length = 500)
    private String descriptionAr;

    @NotBlank(message = "Description (English) is required")
    @Column(nullable = false, length = 500)
    private String descriptionEn;

    @Column(length = 50)
    private String category;

    @Column(length = 100)
    private String subCategory;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private IcdVersion version;

    @Column(length = 2000)
    private String notes;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum IcdVersion {
        ICD_10,
        ICD_11
    }
}
