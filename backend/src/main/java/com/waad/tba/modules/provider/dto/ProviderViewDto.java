package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderViewDto {
    private Long id;
    
    /**
     * Provider name (اسم مقدم الخدمة)
     */
    private String name;
    
    private String licenseNumber;
    private String taxNumber;
    private String city;
    private String address;
    private String phone;
    private String email;
    private String providerType;
    private String providerTypeLabel;
    private String networkStatus;
    private String networkStatusLabel;
    private Boolean active;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private BigDecimal defaultDiscountRate;
    
    /**
     * Allow all employers (global network access)
     * السماح لجميع الجهات (شبكة عامة)
     */
    private Boolean allowAllEmployers;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Enhanced statistics for List View
    private Integer contractCount;
    private java.util.List<String> contractedEmployerNames;
    private Boolean hasDocuments;
}
