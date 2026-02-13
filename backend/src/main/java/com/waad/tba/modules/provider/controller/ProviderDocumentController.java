package com.waad.tba.modules.provider.controller;

import com.waad.tba.modules.provider.dto.ProviderDocumentDto;
import com.waad.tba.modules.provider.service.ProviderDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/providers/{providerId}/documents")
@RequiredArgsConstructor
public class ProviderDocumentController {

    private final ProviderDocumentService documentService;

    @GetMapping
    public ResponseEntity<List<ProviderDocumentDto>> getDocuments(@PathVariable Long providerId) {
        return ResponseEntity.ok(documentService.getDocuments(providerId));
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProviderDocumentDto> addDocument(
            @PathVariable Long providerId, 
            @RequestPart("data") ProviderDocumentDto dto,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        dto.setProviderId(providerId);
        return ResponseEntity.ok(documentService.addDocument(dto, file));
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long providerId, @PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.noContent().build();
    }
}
