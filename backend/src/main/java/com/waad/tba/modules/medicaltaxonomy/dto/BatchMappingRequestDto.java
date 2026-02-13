package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * Request DTO for batch mapping provider services to the Master Catalog.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchMappingRequestDto {
    private Long providerId;
    private List<MappingEntry> mappings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MappingEntry {
        private String providerServiceCode;
        private String masterServiceCode;
        private Double confidence;
    }
}
