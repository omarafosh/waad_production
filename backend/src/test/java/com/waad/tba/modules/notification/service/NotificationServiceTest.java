package com.waad.tba.modules.notification.service;

import com.waad.tba.modules.notification.dto.NotificationRequest;
import com.waad.tba.modules.notification.entity.Notification;
import com.waad.tba.modules.notification.event.NotificationEvent;
import com.waad.tba.modules.notification.repository.NotificationRepository;
import com.waad.tba.modules.rbac.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void sendNotification_ShouldPublishEvent() {
        NotificationRequest request = NotificationRequest.builder()
                .userId(1L)
                .title("Test Notification")
                .message("Message")
                .type(Notification.NotificationType.INFO)
                .build();

        notificationService.sendNotification(request);

        verify(eventPublisher, times(1)).publishEvent(any(NotificationEvent.class));
    }

    @Test
    void getUserNotifications_ShouldReturnPage() {
        Long userId = 1L;
        Pageable pageable = PageRequest.of(0, 10);
        Notification notification = new Notification();
        notification.setId(1L);
        notification.setTitle("Title");
        notification.setMessage("Message");
        notification.setType(Notification.NotificationType.INFO);
        notification.setRead(false);
        
        Page<Notification> page = new PageImpl<>(Collections.singletonList(notification));
        
        when(notificationRepository.findByUserId(userId, pageable)).thenReturn(page);

        var result = notificationService.getUserNotifications(userId, false, pageable);

        assertNotNull(result);
        assertEquals(1, result.getSize());
        assertEquals("Title", result.getContent().get(0).getTitle());
    }

    @Test
    void markAsRead_ShouldUpdateNotification() {
        Long notificationId = 1L;
        Long userId = 1L;
        
        User user = new User();
        user.setId(userId);
        
        Notification notification = new Notification();
        notification.setId(notificationId);
        notification.setUser(user);
        notification.setRead(false);

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        notificationService.markAsRead(notificationId, userId);

        assertTrue(notification.isRead());
        verify(notificationRepository, times(1)).save(notification);
    }
    
    @Test
    void markAsRead_ShouldThrowException_WhenUnauthorized() {
        Long notificationId = 1L;
        Long userId = 1L;
        Long otherUserId = 2L;
        
        User user = new User();
        user.setId(otherUserId); // Notification belongs to user 2
        
        Notification notification = new Notification();
        notification.setId(notificationId);
        notification.setUser(user);

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        assertThrows(RuntimeException.class, () -> notificationService.markAsRead(notificationId, userId));
    }
}
