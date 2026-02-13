package com.waad.tba.common.lifecycle.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReasonCodeDto {
    private String code;
    private String labelAr;
    private String labelEn;
}
