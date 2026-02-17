package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderRawServiceDto {
    private Long id;
    private Long providerId;
    private String providerName;
    private String serviceCode;
    private String serviceName;
    private String serviceDescription;
    private String category;
    private String specialty;
    private boolean mapped;
    private String medicalServiceCode;
    private LocalDateTime mappedAt;
    private Boolean active;
    private LocalDateTime createdAt;
}
