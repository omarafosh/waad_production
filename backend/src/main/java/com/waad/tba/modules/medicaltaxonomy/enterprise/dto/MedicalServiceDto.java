package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceDto {
    private Long id;
    private String code;
    private String nameAr;
    private String nameEn;
    private String category;
    private String subCategory;
    private String serviceType;
    private Boolean isMaster;
    private String status;
    private Integer version;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
