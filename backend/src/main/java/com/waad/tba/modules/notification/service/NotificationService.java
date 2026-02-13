package com.waad.tba.modules.notification.service;

import com.waad.tba.modules.notification.dto.NotificationRequest;
import com.waad.tba.modules.notification.dto.NotificationResponse;
import com.waad.tba.modules.notification.entity.Notification;
import com.waad.tba.modules.notification.event.NotificationEvent;
import com.waad.tba.modules.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Publishes a notification event. This is non-blocking regarding the persistence
     * if the listener is async, but currently it's synchronous by default in Spring
     * unless @Async is used on the listener.
     */
    public void sendNotification(NotificationRequest request) {
        log.info("Publishing notification event: {}", request.getTitle());
        eventPublisher.publishEvent(new NotificationEvent(this, request));
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(Long userId, Boolean unreadOnly, Pageable pageable) {
        Page<Notification> page;
        if (Boolean.TRUE.equals(unreadOnly)) {
            page = notificationRepository.findByUserIdAndReadFalse(userId, pageable);
        } else {
            page = notificationRepository.findByUserId(userId, pageable);
        }
        return page.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .read(notification.isRead())
                .referenceId(notification.getReferenceId())
                .referenceType(notification.getReferenceType())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
