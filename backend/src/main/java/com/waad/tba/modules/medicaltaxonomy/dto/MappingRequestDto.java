package com.waad.tba.modules.medicaltaxonomy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MappingRequestDto {
    @NotNull(message = "Provider Raw Service ID is required")
    private Long rawServiceId;
    
    @NotNull(message = "Master Service ID is required")
    private Long masterServiceId;
    
    @NotBlank(message = "Reason Code is required")
    private String reasonCode;
    
    private Double confidence;
}
