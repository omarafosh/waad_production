package com.waad.tba.modules.medicaltaxonomy.dto;

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
    private String matchSource;
    private Boolean autoApprove;
    private Boolean requiresReview;
    private String decision;
    private String reason;
    private String matchScope;
}
