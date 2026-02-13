package com.waad.tba.modules.provider.service;

import com.waad.tba.modules.provider.dto.ProviderDocumentDto;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.entity.ProviderDocument;
import com.waad.tba.modules.provider.repository.ProviderDocumentRepository;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProviderDocumentService {

    private final ProviderDocumentRepository documentRepository;
    private final ProviderRepository providerRepository;
    private final com.waad.tba.common.file.FileStorageService fileStorageService;

    // Repositories for operational documents
    private final com.waad.tba.modules.visit.repository.VisitAttachmentRepository visitAttachmentRepository;
    private final com.waad.tba.modules.claim.repository.ClaimAttachmentRepository claimAttachmentRepository;
    private final com.waad.tba.modules.preauthorization.repository.PreAuthorizationAttachmentRepository preAuthAttachmentRepository;

    @Transactional(readOnly = true)
    public List<ProviderDocumentDto> getDocuments(Long providerId) {
        return documentRepository.findByProviderIdAndActiveTrue(providerId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProviderDocumentDto addDocument(ProviderDocumentDto dto,
            org.springframework.web.multipart.MultipartFile file) {
        Provider provider = providerRepository.findById(dto.getProviderId())
                .orElseThrow(() -> new RuntimeException("Provider not found"));

        String fileUrl = dto.getFileUrl();
        String fileName = dto.getFileName();

        if (file != null && !file.isEmpty()) {
            var result = fileStorageService.upload(file, "providers/" + provider.getId());
            fileUrl = result.getUrl();
            fileName = result.getFileName(); // Use stored filename
        }

        ProviderDocument doc = ProviderDocument.builder()
                .provider(provider)
                .type(dto.getType())
                .fileName(fileName)
                .fileUrl(fileUrl)
                .documentNumber(dto.getDocumentNumber())
                .expiryDate(dto.getExpiryDate())
                .notes(dto.getNotes())
                .active(true)
                .build();

        doc = documentRepository.save(doc);
        return toDto(doc);
    }

    @Transactional
    public void deleteDocument(Long id) {
        ProviderDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Delete physical file
        if (doc.getFileUrl() != null && doc.getFileUrl().contains("key=")) {
            try {
                String fullUrl = doc.getFileUrl();
                String encodedKey = fullUrl.substring(fullUrl.indexOf("key=") + 4);
                String fileKey = java.net.URLDecoder.decode(encodedKey, java.nio.charset.StandardCharsets.UTF_8);
                fileStorageService.delete(fileKey);
            } catch (Exception e) {
                // Log error but continue with soft delete
                System.err.println("Failed to delete physical file: " + e.getMessage());
            }
        }

        documentRepository.delete(doc);
    }

    @Transactional(readOnly = true)
    public List<ProviderDocumentDto> getOperationalDocuments(Long providerId, String referenceType) {
        List<ProviderDocumentDto> allDocs = new java.util.ArrayList<>();

        // 1. Core Provider Documents (Only if no specific type or type is OTHER)
        if (referenceType == null || referenceType.isEmpty()) {
            allDocs.addAll(getDocuments(providerId));
        }

        // 2. Visit Attachments
        if (referenceType == null || referenceType.isEmpty() || "VISIT".equals(referenceType)) {
            visitAttachmentRepository.findByVisitProviderId(providerId).forEach(a -> {
                allDocs.add(ProviderDocumentDto.builder()
                        .id(a.getId())
                        .providerId(providerId)
                        .type(ProviderDocument.DocumentType.OTHER)
                        .fileName(a.getFileName())
                        .fileUrl(a.getFileKey())
                        .notes("زيارة: " + (a.getVisit() != null ? a.getVisit().getId() : ""))
                        .build());
            });
        }

        // 3. Claim Attachments
        if (referenceType == null || referenceType.isEmpty() || "CLAIM".equals(referenceType)) {
            claimAttachmentRepository.findByClaimProviderId(providerId).forEach(a -> {
                String claimRef = (a.getClaim() != null) ? String.valueOf(a.getClaim().getId()) : "";
                allDocs.add(ProviderDocumentDto.builder()
                        .id(a.getId())
                        .providerId(providerId)
                        .type(ProviderDocument.DocumentType.OTHER)
                        .fileName(a.getFileName())
                        .fileUrl(a.getFileUrl())
                        .notes("مطالبة: " + claimRef)
                        .build());
            });
        }

        // 4. PreAuth Attachments
        if (referenceType == null || referenceType.isEmpty() || "PRE_AUTH".equals(referenceType)) {
            preAuthAttachmentRepository.findByProviderId(providerId).forEach(a -> {
                allDocs.add(ProviderDocumentDto.builder()
                        .id(a.getId())
                        .providerId(providerId)
                        .type(ProviderDocument.DocumentType.OTHER)
                        .fileName(a.getOriginalFileName())
                        .fileUrl(a.getFilePath())
                        .notes("موافقة مسبقة: " + a.getPreAuthorizationId())
                        .build());
            });
        }

        return allDocs;
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getOperationalStats(Long providerId) {
        java.util.Map<String, Long> stats = new java.util.HashMap<>();

        try {
            long totalDocs = documentRepository.countByProviderIdAndActiveTrue(providerId);
            long visitDocs = visitAttachmentRepository.findByVisitProviderId(providerId).size();
            long claimDocs = claimAttachmentRepository.findByClaimProviderId(providerId).size();
            long preAuthDocs = preAuthAttachmentRepository.findByProviderId(providerId).size();

            stats.put("totalDocuments", totalDocs + visitDocs + claimDocs + preAuthDocs);
            stats.put("visitDocuments", (long) visitDocs);
            stats.put("claimDocuments", (long) claimDocs);
            stats.put("preAuthDocuments", (long) preAuthDocs);
            stats.put("totalCoreDocuments", totalDocs);
        } catch (Exception e) {
            // Defensive stats retrieval
            stats.put("totalDocuments", 0L);
            stats.put("visitDocuments", 0L);
            stats.put("claimDocuments", 0L);
            stats.put("preAuthDocuments", 0L);
        }

        return stats;
    }

    private ProviderDocumentDto toDto(ProviderDocument doc) {
        return ProviderDocumentDto.builder()
                .id(doc.getId())
                .providerId(doc.getProvider().getId())
                .type(doc.getType())
                .fileName(doc.getFileName())
                .fileUrl(doc.getFileUrl())
                .documentNumber(doc.getDocumentNumber())
                .expiryDate(doc.getExpiryDate())
                .notes(doc.getNotes())
                .build();
    }
}
