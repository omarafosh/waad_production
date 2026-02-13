package com.waad.tba.modules.provider.dto;

import com.waad.tba.modules.provider.entity.ProviderDocument.DocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderDocumentDto {
    private Long id;
    private Long providerId;
    private DocumentType type;
    private String fileName;
    private String fileUrl;
    private String documentNumber;
    private LocalDate expiryDate;
    private String notes;
}
