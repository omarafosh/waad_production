package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for services in my contract
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyContractServiceDto {
    private Long id; // Pricing Item ID
    private Long medicalServiceId; // Medical Service ID - IMPORTANT for claim creation
    private String serviceCode;
    private String serviceName;
    private String categoryName;
    private BigDecimal contractPrice;
    private String currency;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean hasContract;
    private Boolean requiresPreAuth; // From BenefitPolicyRule
}
