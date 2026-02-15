package com.waad.tba.modules.medicaltaxonomy.enterprise.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class MappingRequestDto {
    private Long rawServiceId;
    private UUID masterServiceId;
    private String reason;
    private Double confidence;
}
