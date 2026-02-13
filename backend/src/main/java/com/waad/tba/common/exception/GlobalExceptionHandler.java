package com.waad.tba.common.exception;

import com.waad.tba.common.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DataIntegrityViolationException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;

/**
 * Global Exception Handler for centralized error handling
 * Provides consistent error responses across the application
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handle Business Rule Exceptions
     */
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRuleException(
            BusinessRuleException ex, WebRequest request) {
        log.warn("Business rule violation: {}", ex.getMessage());
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Handle Validation Errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.warn("Validation failed: {}", errors);
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("خطأ في التحقق من البيانات: " + errors.toString()));
    }

    /**
     * Handle Access Denied (403)
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("غير مصرح لك بالوصول إلى هذا المورد"));
    }

    /**
     * Handle Authentication Errors (401)
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(
            BadCredentialsException ex, WebRequest request) {
        log.warn("Authentication failed: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("بيانات الاعتماد غير صحيحة"));
    }

    /**
     * Handle Resource Not Found
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Handle Illegal Argument Exceptions (400)
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(
            IllegalArgumentException ex, WebRequest request) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Handle Database Integrity Violations (e.g. Unique Constraints)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex, WebRequest request) {
        log.error("Database integrity violation: {}", ex.getMessage());
        
        String message = "فشل تنفيذ العملية بسبب تضارب في البيانات";
        
        // Try to provide a more specific message for unique constraints
        if (ex.getMessage() != null) {
            if (ex.getMessage().contains("uk_bpr_policy_category_context") || 
                ex.getMessage().contains("uk_bpr_policy_service_context")) {
                message = "هذه القاعدة موجودة بالفعل لهذه الوثيقة في السياق المحدد";
            } else if (ex.getMessage().contains("unique constraint") || ex.getMessage().contains("Duplicate entry")) {
                message = "هذا السجل موجود بالفعل";
            }
        }
        
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(message));
    }

    /**
     * Handle JPA/Hibernate Constraint Violations
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
            ConstraintViolationException ex, WebRequest request) {
        log.warn("Constraint violation: {}", ex.getMessage());
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("خطأ في التحقق من صحة البيانات: " + ex.getMessage()));
    }

    /**
     * Handle All Other Exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGlobalException(
            Exception ex, WebRequest request) {
        log.error("Unexpected error occurred", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."));
    }
}
