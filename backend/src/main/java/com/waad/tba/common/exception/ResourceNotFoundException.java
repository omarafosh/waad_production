package com.waad.tba.common.exception;

/**
 * Exception thrown when a requested resource is not found
 */
public class ResourceNotFoundException extends RuntimeException {
    
    public ResourceNotFoundException(String message) {
        super(message);
    }
    
    public ResourceNotFoundException(String resourceName, Long id) {
        super(String.format("%s not found with id: %d", resourceName, id));
    }
    
    public ResourceNotFoundException(String resourceName, String field, Object value) {
        super(String.format("%s not found with %s: %s", resourceName, field, value));
    }
}
