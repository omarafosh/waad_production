package com.waad.tba.common.file;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Utility class for serving files as HTTP responses
 */
public class FileResourceUtils {

    /**
     * Serve a file from byte array
     * 
     * @param fileBytes The file content as byte array
     * @param fileName The filename to use in Content-Disposition header
     * @param request The HTTP request
     * @return ResponseEntity with the file content
     */
    public static ResponseEntity<Resource> serveFile(byte[] fileBytes, String fileName, HttpServletRequest request) {
        if (fileBytes == null || fileBytes.length == 0) {
            return ResponseEntity.notFound().build();
        }

        // Determine content type
        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(fileName);
        } catch (Exception e) {
            // Ignore
        }

        // Fallback to default content type if not determined
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        // Build response
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .body(new ByteArrayResource(fileBytes));
    }
}
