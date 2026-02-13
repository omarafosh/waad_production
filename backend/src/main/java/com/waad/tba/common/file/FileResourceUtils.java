package com.waad.tba.common.file;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.DigestUtils;
import org.springframework.web.context.request.WebRequest;

import java.util.concurrent.TimeUnit;

/**
 * Enterprise File Resources Utility
 * 
 * Provides professional-grade handling for file responses with support for:
 * - HTTP Caching (ETag, Cache-Control)
 * - Conditional Requests (If-None-Match)
 * - Dynamic Content Type Detection
 * - Secure Stream Management
 * 
 * @author Engineering Lead (Professional Implementation)
 * @since 2026-01-31
 */
@Slf4j
public class FileResourceUtils {

    /**
     * Builds an optimized ResponseEntity for a file.
     * 
     * @param bytes File content bytes
     * @param fileName File name for metadata/extension
     * @param request WebRequest to handle conditional GET headers
     * @return Optimized ResponseEntity
     */
    public static ResponseEntity<byte[]> serveFile(byte[] bytes, String fileName, WebRequest request) {
        if (bytes == null || bytes.length == 0) {
            return ResponseEntity.notFound().build();
        }

        // 1. Generate ETag based on content hash (Professional Caching)
        String etag = DigestUtils.md5DigestAsHex(bytes);

        // 2. Check for Conditional GET (304 Not Modified)
        if (request.checkNotModified(etag)) {
            log.debug("Resource not modified, returning 304 for: {}", fileName);
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
        }

        // 3. Detect Media Type
        MediaType mediaType = detectMediaType(fileName);

        // 4. Build Professional Response with Cache Control (1 Year for immutable files)
        return ResponseEntity.ok()
                .contentType(mediaType)
                .eTag(etag)
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .body(bytes);
    }

    private static MediaType detectMediaType(String fileName) {
        if (fileName == null) return MediaType.APPLICATION_OCTET_STREAM;
        
        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lowerName.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lowerName.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lowerName.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
