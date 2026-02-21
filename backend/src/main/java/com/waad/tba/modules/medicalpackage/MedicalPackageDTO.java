package com.waad.tba.modules.medicalpackage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalPackageDTO {
    
    private Long id;
    private String code;
    private String name;
    private String description;
    private java.util.Set<Long> serviceIds;
    private java.math.BigDecimal totalCoverageLimit;
    private Boolean active;
}
