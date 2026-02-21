package com.waad.tba.common.lifecycle.controller;

import com.waad.tba.common.lifecycle.dto.*;
import com.waad.tba.common.lifecycle.service.LifecycleManagerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lifecycle")
@RequiredArgsConstructor
public class LifecycleController {

    private final LifecycleManagerService lifecycleManagerService;

    @GetMapping("/preview/{entityType}/{entityId}")
    public ResponseEntity<LifecyclePreviewDto> preview(
            @PathVariable String entityType,
            @PathVariable Long entityId) {

        return ResponseEntity.ok(lifecycleManagerService.preview(entityType, entityId));
    }

    @PostMapping("/execute/{entityType}/{entityId}")
    public ResponseEntity<LifecycleResult> execute(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @RequestBody @Valid LifecycleActionRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {

        LifecycleContext context = LifecycleContext.builder()
                .currentUser(currentUser)
                .reason(request.getReason() + (request.getNotes() != null ? " - " + request.getNotes() : ""))
                .metadata(request.getMetadata())
                .build();

        LifecycleResult result = lifecycleManagerService.execute(
                entityType,
                entityId,
                request.getAction(),
                context);

        return ResponseEntity.ok(result);
    }
}
