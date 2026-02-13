package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.modules.medicaltaxonomy.dto.ImportPreviewResultDto;
import com.waad.tba.modules.medicaltaxonomy.service.MedicalServiceImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/admin/sandbox/import/medical-services")
@RequiredArgsConstructor
@Tag(name = "Admin Sandbox: Import Tools", description = "Experimental tools for data import and validation")
public class AdminImportController {

    private final MedicalServiceImportService importService;

    @Operation(summary = "Preview Import (Safe Mode)", description = "Analyzes the Excel file and returns a diff report without saving changes.")
    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportPreviewResultDto> previewImport(@RequestParam("file") MultipartFile file)
            throws IOException {
        return ResponseEntity.ok(importService.previewImport(file));
    }
}
