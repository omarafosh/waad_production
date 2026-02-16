package com.waad.tba.modules.medicaltaxonomy.enterprise.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDate;

@Entity
@Table(name = "ent_medical_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseMedicalService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "name_ar", nullable = false)
    private String nameAr;

    @Column(name = "name_en")
    private String nameEn;

    @Column(name = "category", length = 255)
    private String category;

    @Column(name = "sub_category", length = 255)
    private String subCategory;

    @Column(name = "specialty", length = 255)
    private String specialty;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "is_master")
    @Builder.Default
    private Boolean isMaster = true;

    public boolean isActive() {
        return Boolean.TRUE.equals(active);
    }

    public boolean isMaster() {
        return Boolean.TRUE.equals(isMaster);
    }
}
