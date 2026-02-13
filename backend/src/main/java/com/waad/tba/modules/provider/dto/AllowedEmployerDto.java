package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllowedEmployerDto {
    private Long id;
    private String name;
    private String nameEn;
    private Boolean isGlobal; // true if this represents "All Employers" (e.g. from a global contract)
    private Boolean isActive;
}
