package com.waad.tba.modules.reviewer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewerCompanySelectorDto {
    private Long id;
    private String code;
    private String nameAr;
}
