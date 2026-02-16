package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.Data;

@Data
public class MappingRequestDto {
    private Long rawServiceId;
    private Long masterServiceId;
    private String reason;
    private Double confidence;
}
