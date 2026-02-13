package com.waad.tba.modules.rbac.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionCreateDto {
    
    @NotBlank(message = "Permission name is required")
    private String name;
    
    private String description;
}
