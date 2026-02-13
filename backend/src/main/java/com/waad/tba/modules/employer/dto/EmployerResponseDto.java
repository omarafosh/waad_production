package com.waad.tba.modules.employer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Employer Response DTO - Simplified Version
 * 
 * Field Mapping:
 * - Returns 'nameAr' (Entity field name) for frontend compatibility
 * - Returns 'code' (canonical backend name)
 * - Includes audit timestamps
 * - Arabic name only (no English name)
 * 
 * @see EMPLOYER_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployerResponseDto {

    /**
     * Employer ID (Primary Key)
     */
    private Long id;

    /**
     * Employer code (canonical backend name)
     */
    private String code;

    /**
     * Employer name
     * Unified Name
     */
    private String name;

    /**
     * Active status
     */
    private boolean active;

    /**
     * Archived status (soft delete)
     * Archived employers are hidden from default lists
     */
    private boolean archived;

    /**
     * Creation timestamp (audit field)
     */
    private LocalDateTime createdAt;

    /**
     * Active Benefit Policy Name
     */
    private String activePolicyName;

    /**
     * Active Benefit Policy ID
     */
    private Long activePolicyId;

    /**
     * Last update timestamp (audit field)
     */
    private LocalDateTime updatedAt;

    // ========================================
    // STATISTICS FIELDS
    // ========================================

    /**
     * Total number of members (beneficiaries) linked to this employer
     */
    private Long totalMembers;

    /**
     * Number of active benefit policies for this employer
     */
    private Integer activePoliciesCount;
}
