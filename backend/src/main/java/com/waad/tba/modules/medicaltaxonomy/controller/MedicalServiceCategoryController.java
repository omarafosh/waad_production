package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.service.MedicalCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for managing the association between Medical Services and Categories.
 */
@Slf4j
@RestController
@RequestMapping("/api/medical-services/{serviceId}/categories")
@RequiredArgsConstructor
@Tag(name = "Medical Service Categories", description = "Manage many-to-many relationship between services and categories")
public class MedicalServiceCategoryController {

    private final MedicalCategoryService categoryService;

    @PostMapping("/{categoryId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Add category to service", description = "Links a medical service to a category with context and primary flag")
    public ResponseEntity<ApiResponse<Void>> addCategoryToService(
            @PathVariable Long serviceId,
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "false") boolean isPrimary,
            @RequestParam(defaultValue = "ANY") String context) {
        
        log.info("[SERVICE-CATEGORIES] Linking service {} to category {} (primary={}, context={})", 
                serviceId, categoryId, isPrimary, context);
        
        categoryService.addCategoryToService(serviceId, categoryId, isPrimary, context);
        
        return ResponseEntity.ok(ApiResponse.success("Category linked to service successfully", null));
    }

    @DeleteMapping("/{categoryId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Remove category from service", description = "Unlinks a medical service from a category for a specific context")
    public ResponseEntity<ApiResponse<Void>> removeCategoryFromService(
            @PathVariable Long serviceId,
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "ANY") String context) {
        
        log.info("[SERVICE-CATEGORIES] Unlinking service {} from category {} (context={})", 
                serviceId, categoryId, context);
        
        categoryService.removeCategoryFromService(serviceId, categoryId, context);
        
        return ResponseEntity.ok(ApiResponse.success("Category unlinked from service successfully", null));
    }
}
