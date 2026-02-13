package com.waad.tba.modules.provider.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.file.FileStorageService;
import com.waad.tba.common.file.FileUploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderClaimAttachmentService {

    private final FileStorageService fileStorageService;

    public void validateFiles(MultipartFile[] files) {
        if (files == null || files.length == 0) return;

        if (files.length > 10) {
            throw new BusinessRuleException("❌ الحد الأقصى: 10 ملفات (حاليًا: " + files.length + ")");
        }
        
        List<String> allowedMimeTypes = Arrays.asList(
            "application/pdf",
            "image/jpeg",
            "image/png"
        );
        
        long totalSize = 0;
        
        for (MultipartFile file : files) {
            String mimeType = file.getContentType();
            if (mimeType == null || !allowedMimeTypes.contains(mimeType.toLowerCase())) {
                throw new BusinessRuleException(
                    "❌ نوع الملف غير مسموح: " + file.getOriginalFilename() + 
                    " (المسموح: PDF, JPEG, PNG فقط)");
            }
            
            long fileSizeMB = file.getSize();
            if (fileSizeMB > 5 * 1024 * 1024) {
                throw new BusinessRuleException(
                    "❌ حجم الملف كبير جدًا: " + file.getOriginalFilename() + 
                    " (" + (fileSizeMB / 1024 / 1024) + " MB) | الحد الأقصى: 5 MB");
            }
            
            totalSize += fileSizeMB;
        }
        
        if (totalSize > 20 * 1024 * 1024) {
            throw new BusinessRuleException(
                "❌ الحجم الإجمالي للملفات كبير جدًا: " + 
                (totalSize / 1024 / 1024) + " MB | الحد الأقصى: 20 MB");
        }
        
        log.info("✅ File validation passed: {} files, total size: {} MB", 
                 files.length, totalSize / 1024 / 1024);
    }

    public void uploadClaimAttachments(Long claimId, MultipartFile[] files) {
        if (files == null || files.length == 0) return;

        String folder = "claims/" + claimId;
        log.info("📤 Uploading {} file(s) for claim {}", files.length, claimId);
        
        for (MultipartFile file : files) {
            try {
                FileUploadResult result = fileStorageService.upload(file, folder);
                log.info("✅ Uploaded: {} → {} ({} bytes)", 
                         file.getOriginalFilename(), 
                         result.getFileKey(),
                         file.getSize());
                
            } catch (Exception e) {
                log.error("❌ File upload failed: {} - {}", file.getOriginalFilename(), e.getMessage());
                throw new BusinessRuleException(
                    "فشل رفع الملف: " + file.getOriginalFilename() + " - " + e.getMessage());
            }
        }
    }
}
