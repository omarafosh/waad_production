package com.waad.tba.modules.member.service;

import com.waad.tba.modules.member.dto.MemberFinancialSummaryDto;

/**
 * Member Financial Summary Service
 * 
 * Provides comprehensive financial overview for members.
 */
public interface MemberFinancialSummaryService {

    /**
     * Get comprehensive financial summary for a member
     * 
     * @param memberId Member ID
     * @return Financial summary DTO with all metrics
     */
    MemberFinancialSummaryDto getFinancialSummary(Long memberId);
}
