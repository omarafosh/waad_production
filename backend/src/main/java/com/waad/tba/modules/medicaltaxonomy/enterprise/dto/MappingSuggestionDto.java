package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MappingSuggestionDto {
    private Long masterServiceId;
    private String code;
    private String nameAr;
    private String nameEn;
    private Double confidenceScore;
    private String matchSource; // e.g., "TEXT_SIMILARITY", "ALIAS", "CODE_MATCH"
}
