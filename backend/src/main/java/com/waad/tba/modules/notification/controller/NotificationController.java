package com.waad.tba.modules.notification.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.notification.dto.NotificationResponse;
import com.waad.tba.modules.notification.service.NotificationService;
import com.waad.tba.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notifications management")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get user notifications")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getUserNotifications(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false, defaultValue = "false") Boolean unreadOnly,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<NotificationResponse> notifications = notificationService.getUserNotifications(
                currentUser.getId(), unreadOnly, pageable);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get count of unread notifications")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        long count = notificationService.getUnreadCount(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        notificationService.markAsRead(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        notificationService.markAllAsRead(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }
}
