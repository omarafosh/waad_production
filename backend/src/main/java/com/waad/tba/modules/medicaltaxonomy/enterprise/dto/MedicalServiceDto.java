package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceDto {
    private UUID id;
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
