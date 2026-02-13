package com.waad.tba.modules.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberDocumentResponseDto {
    private Long id;
    private String documentType;
    private String fileName;
    private String mimeType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
    private String uploadedBy;
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
    private String verifiedBy;
    private String notes;
    private String filePath; // URL for frontend access
}
