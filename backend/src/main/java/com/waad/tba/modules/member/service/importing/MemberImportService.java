package com.waad.tba.modules.member.service.importing;

import com.waad.tba.modules.member.dto.MemberImportPreviewDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto;
import org.springframework.web.multipart.MultipartFile;

/**
 * Unified Member Import Service.
 * Handles Excel file parsing, mapping, previewing, and asynchronous processing.
 */
public interface MemberImportService {

    /**
     * Preview Excel content and detect column mappings.
     */
    MemberImportPreviewDto previewImport(MultipartFile file);

    /**
     * Preview saved Excel file from temporary storage.
     */
    MemberImportPreviewDto previewSavedFile(String fileName);

    /**
     * Process import asynchronously.
     */
    MemberImportResultDto processImport(String fileName, String mode);

    /**
     * Save uploaded file to temp directory for later processing.
     */
    String saveImportFile(MultipartFile file);

    /**
     * Get real-time status of an ongoing import.
     */
    MemberImportResultDto getImportStatus(String fileName);
}
