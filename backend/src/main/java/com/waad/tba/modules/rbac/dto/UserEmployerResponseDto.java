package com.waad.tba.modules.rbac.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEmployerResponseDto {
    private Long id;
    private String name;
    private String nameAr;
    private String code;
}
