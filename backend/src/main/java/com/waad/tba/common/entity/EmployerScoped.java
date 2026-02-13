package com.waad.tba.common.entity;

/**
 * EmployerScoped Interface
 * 
 * Purpose: Marks entities that belong to a specific employer organization.
 * Security: Ensures employer-level data isolation across the system.
 * 
 * Implementation Pattern:
 * - Any entity implementing this interface MUST be filterable by employerId
 * - Used by EmployerFilterSpecification for unified filtering
 * - Prevents data leakage between employers
 * 
 * Examples:
 * - Member implements EmployerScoped (direct employer_org_id)
 * - Claim implements EmployerScoped (via member.employer_org_id)
 * - Visit implements EmployerScoped (via member.employer_org_id)
 * 
 * @see com.waad.tba.common.specification.EmployerFilterSpecification
 */
public interface EmployerScoped {
    
    /**
     * Get the employer organization ID for this entity.
     * 
     * @return Employer organization ID, or null if not applicable
     */
    Long getEmployerOrganizationId();
}
