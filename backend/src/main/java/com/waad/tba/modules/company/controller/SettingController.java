package com.waad.tba.modules.company.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.company.dto.SettingDto;
import com.waad.tba.modules.company.service.SettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * REST Controller for Global System Settings
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Settings", description = "Global System Settings Management APIs")
public class SettingController {

    private final SettingService settingService;

    /**
     * Get global settings
     */
    @GetMapping
    @PreAuthorize("permitAll()")
    @Operation(summary = "Get global settings", description = "Retrieves the global system configuration and branding")
    public ResponseEntity<ApiResponse<SettingDto>> getSettings() {
        log.info("REST request to get global system settings");
        SettingDto settings = settingService.getSettings();
        return ResponseEntity.ok(ApiResponse.success("Settings retrieved successfully", settings));
    }

    /**
     * Update global settings
     */
    @PutMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update global settings", description = "Updates the global system configuration (Super Admin only)")
    public ResponseEntity<ApiResponse<SettingDto>> updateSettings(
            @Valid @RequestBody SettingDto settingDto,
            Principal principal) {
        
        log.info("REST request to update global settings by {}", principal.getName());
        SettingDto updated = settingService.updateSettings(settingDto, principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Settings updated successfully", updated));
    }

    /**
     * Initialize settings (Internal use)
     */
    @PostMapping("/init")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Initialize settings", description = "Initializes default settings if missing")
    public ResponseEntity<ApiResponse<SettingDto>> initSettings() {
        log.info("REST request to initialize settings");
        SettingDto settings = settingService.initializeDefaultSettings();
        return ResponseEntity.ok(ApiResponse.success("Settings initialized successfully", settings));
    }
}
