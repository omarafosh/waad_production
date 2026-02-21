package com.waad.tba.modules.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Encapsulates search and filter criteria for members.
 * Unifies 10+ parameters into a single object.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberSearchCriteria {
    private String searchTerm;
    private String civilId;
    private String barcode;
    private String cardNumber;
    private Long organizationId;
    private Long benefitPolicyId;
    private String status; // ACTIVE, INACTIVE, DRAFT, etc.
    private String type; // PRINCIPAL, DEPENDENT
    private Boolean deleted;
}
