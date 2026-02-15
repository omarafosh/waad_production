package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class MappingSuggestionDto {
    private UUID masterServiceId;
    private String code;
    private String nameAr;
    private String nameEn;
    private Double confidenceScore;
    private String matchSource; // e.g., "TEXT_SIMILARITY", "ALIAS", "CODE_MATCH"
}
