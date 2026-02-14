package com.waad.tba.common.file;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * File Controller
 * 
 * REST endpoints for file upload, download, and management
 * 
 * Endpoints:
 * - POST   /api/files/upload         - Upload file
 * - GET    /api/files/{key}/download - Download file
 * - DELETE /api/files/{key}          - Delete file
 * - GET    /api/files/{key}/url      - Get presigned URL
 * 
 * @author TBA System
 * @version 1.0
 */
@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {
    
    private final FileStorageService fileStorageService;
    
    /**
     * Upload a file
     * 
     * @param file MultipartFile to upload
     * @param folder Target folder (claims, preauth, members, etc.)
     * @param description Optional file description
     * @return FileUploadResult with file details
     */
    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FileUploadResult> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("folder") String folder,
            @RequestParam(value = "description", required = false) String description) {
        
        // Sanitize folder path to prevent Path Traversal
        String safeFolder = FileResourceUtils.sanitizePath(folder);
        log.info("Uploading file: {} to folder: {}", file.getOriginalFilename(), safeFolder);
        
        try {
            FileUploadResult result = fileStorageService.upload(file, safeFolder);
            return ResponseEntity.ok(result);
            
        } catch (FileStorageException e) {
            log.error("File upload failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    
    /**
     * Download a file
     * 
     * @param fileKey File identifier
     * @return File content with appropriate headers
     */
    @GetMapping("/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadFile(@RequestParam("key") String fileKey) {
        
        // Sanitize file key to prevent Path Traversal
        String safeKey = FileResourceUtils.sanitizePath(fileKey);
        log.info("Downloading file: {}", safeKey);
        
        try {
            byte[] fileContent = fileStorageService.download(safeKey);
            ByteArrayResource resource = new ByteArrayResource(fileContent);
            
            // Extract filename from key
            String filename = safeKey.substring(safeKey.lastIndexOf('/') + 1);
            
            // Determine Content-Type
            String contentType = "application/octet-stream";
            if (filename.toLowerCase().endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (filename.toLowerCase().endsWith(".png")) {
                contentType = "image/png";
            }
            
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
                
        } catch (FileStorageException e) {
            log.error("File download failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Delete a file
     * 
     * @param folder Folder name
     * @param filename File name
     * @return Success/failure response
     */
    @DeleteMapping("/{folder}/{filename}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    public ResponseEntity<String> deleteFile(
            @PathVariable String folder,
            @PathVariable String filename) {
        
        String safeFolder = FileResourceUtils.sanitizePath(folder);
        String safeFilename = FileResourceUtils.sanitizeFilename(filename);
        String fileKey = safeFolder + "/" + safeFilename;
        
        log.info("Deleting file: {}", fileKey);
        
        try {
            fileStorageService.delete(fileKey);
            return ResponseEntity.ok("File deleted successfully");
            
        } catch (FileStorageException e) {
            log.error("File deletion failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to delete file: " + e.getMessage());
        }
    }
    
    /**
     * Get presigned URL for file access
     * 
     * @param folder Folder name
     * @param filename File name
     * @param expiryMinutes URL validity duration (default: 60 minutes)
     * @return Presigned URL
     */
    @GetMapping("/{folder}/{filename}/url")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> getPresignedUrl(
            @PathVariable String folder,
            @PathVariable String filename,
            @RequestParam(value = "expiryMinutes", defaultValue = "60") int expiryMinutes) {
        
        String safeFolder = FileResourceUtils.sanitizePath(folder);
        String safeFilename = FileResourceUtils.sanitizeFilename(filename);
        String fileKey = safeFolder + "/" + safeFilename;
        
        log.info("Generating presigned URL for: {}", fileKey);
        
        try {
            String url = fileStorageService.getPresignedUrl(fileKey, expiryMinutes);
            // URL is generated by service, but we've sanitized the components of the key
            return ResponseEntity.ok(url);
            
        } catch (FileStorageException e) {
            log.error("URL generation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    /**
     * Check if file exists
     * 
     * @param folder Folder name
     * @param filename File name
     * @return true if exists, false otherwise
     */
    @GetMapping("/{folder}/{filename}/exists")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Boolean> fileExists(
            @PathVariable String folder,
            @PathVariable String filename) {
        
        String safeFolder = FileResourceUtils.sanitizePath(folder);
        String safeFilename = FileResourceUtils.sanitizeFilename(filename);
        String fileKey = safeFolder + "/" + safeFilename;
        
        boolean exists = fileStorageService.exists(fileKey);
        return ResponseEntity.ok(exists);
    }
}
