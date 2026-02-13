package com.waad.tba.modules.preauthorization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for PreAuthorization Attachment response.
 * Masks internal file paths and unique stored file names for security.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreAuthorizationAttachmentResponseDto {
    private Long id;
    private Long preAuthorizationId;
    private String originalFileName;
    private String fileType;
    private Long fileSize;
    private String attachmentType;
    private LocalDateTime createdAt;
    private String createdBy;
}
