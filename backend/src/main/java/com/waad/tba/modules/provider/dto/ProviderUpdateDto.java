package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderUpdateDto {
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
    private String networkStatus;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private BigDecimal defaultDiscountRate;
    private Boolean active;
    
    /**
     * Allow all employers (global network access)
     * السماح لجميع الجهات (شبكة عامة)
     */
    private Boolean allowAllEmployers;
    
    /**
     * List of allowed employer IDs for this provider.
     * The backend will create/update contracts based on this list.
     * If an employer ID is in this list, a contract is created/activated.
     * If not in this list, the contract is suspended.
     */
    private List<Long> allowedPayers;
}
