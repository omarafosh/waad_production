package com.waad.tba.modules.member.service;

import com.waad.tba.modules.member.dto.MemberViewDto;
import java.util.List;

/**
 * PDF Export Service for Members
 */
public interface MemberPdfExportService {

    /**
     * Generate PDF report for members list
     * 
     * @param members List of members to include in report
     * @param filterDescription Optional description of applied filters
     * @return PDF file as byte array
     */
    byte[] generateMembersPdf(List<MemberViewDto> members, String filterDescription);
    
    /**
     * Generate PDF card for a single member
     * 
     * @param member Member details to include in PDF
     * @return PDF file as byte array
     */
    byte[] generateMemberCardPdf(MemberViewDto member);
}
