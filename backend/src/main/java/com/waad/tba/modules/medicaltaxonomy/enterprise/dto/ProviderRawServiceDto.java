package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderRawServiceDto {
    private Long id;
    private Long providerId;
    private String rawName;
    private String rawCode;
    private Long mappedServiceId;
    private String mappedServiceName;
    private String mappingStatus;
    private Double confidenceScore;
}
