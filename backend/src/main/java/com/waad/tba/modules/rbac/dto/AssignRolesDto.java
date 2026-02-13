package com.waad.tba.modules.rbac.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignRolesDto {
    
    @NotEmpty(message = "Role IDs are required")
    private List<Long> roleIds;
}
