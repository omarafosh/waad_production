package com.waad.tba.modules.reviewer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewerCompanyResponseDto {
    private Long id;
    private String name;
    private String medicalDirector;
    private String phone;
    private String email;
    private String address;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
