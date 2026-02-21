package com.waad.tba.common.exception;

import com.waad.tba.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
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

import org.springframework.context.i18n.LocaleContextHolder;
import java.util.HashMap;
import java.util.Map;

/**
 * Global Exception Handler for centralized error handling
 * Provides consistent error responses across the application
 */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final org.springframework.context.MessageSource messageSource;

    /**
     * Handle Business Rule Exceptions
     */
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRuleException(
            BusinessRuleException ex, WebRequest request) {
        log.warn("Business rule violation: {}", ex.getMessage());

        String message = ex.getMessage();
        try {
            message = messageSource.getMessage(ex.getMessage(), ex.getArgs(), LocaleContextHolder.getLocale());
        } catch (Exception e) {
            // If not a key, use the message as is
        }

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(message));
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

        String baseMessage = messageSource.getMessage("validation.error", null, "خطأ في التحقق من البيانات",
                LocaleContextHolder.getLocale());

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(baseMessage + ": " + errors.toString()));
    }

    /**
     * Handle Access Denied (403)
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied: {}", ex.getMessage());
        String message = messageSource.getMessage("api.unauthorized", null, "غير مصرح لك بالوصول إلى هذا المورد",
                LocaleContextHolder.getLocale());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(message));
    }

    /**
     * Handle Authentication Errors (401)
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(
            BadCredentialsException ex, WebRequest request) {
        log.warn("Authentication failed: {}", ex.getMessage());
        String message = messageSource.getMessage("auth.login.error", null, "بيانات الاعتماد غير صحيحة",
                LocaleContextHolder.getLocale());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(message));
    }

    /**
     * Handle Resource Not Found
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        log.warn("Resource not found: {}", ex.getMessage());
        String message = ex.getMessage();
        // If message looks like a key, translate it
        if (!message.contains(" ")) {
            message = messageSource.getMessage(message, null, message, LocaleContextHolder.getLocale());
        }
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(message));
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
     * Handle Type Mismatch Exceptions (400)
     * Specifically handles when "null" string is passed for Long parameters
     */
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        log.warn("Method argument type mismatch: {} = {}", ex.getName(), ex.getValue());

        String message = String.format("قيمة غير صالحة للمعامل '%s': '%s'", ex.getName(), ex.getValue());
        if ("null".equals(String.valueOf(ex.getValue()))) {
            message = String.format("لا يمكن تمرير نص 'null' للمعامل '%s'. يرجى تركه فارغاً.", ex.getName());
        }

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(message));
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
