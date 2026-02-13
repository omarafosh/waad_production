package com.waad.tba.modules.notification.dto;

import com.waad.tba.modules.notification.entity.Notification.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private Long userId;
    private String title;
    private String message;
    private NotificationType type;
    private Long referenceId;
    private String referenceType;
}
