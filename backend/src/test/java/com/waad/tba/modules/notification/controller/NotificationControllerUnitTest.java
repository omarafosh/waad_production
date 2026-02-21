package com.waad.tba.modules.notification.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.notification.dto.NotificationResponse;
import com.waad.tba.modules.notification.service.NotificationService;
import com.waad.tba.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationControllerUnitTest {

    @Mock
    private NotificationService notificationService;

    private NotificationController controller;

    @BeforeEach
    void setUp() {
        controller = new NotificationController(notificationService);
    }

    @Test
    void getUserNotifications_returnsOk() {
        UserPrincipal user = UserPrincipal.builder()
            .id(9L)
            .username("user")
            .password("pwd")
            .email("u@test.com")
            .authorities(List.of())
            .build();
        Page<NotificationResponse> page = new PageImpl<>(List.of(new NotificationResponse()));
        PageRequest pageable = PageRequest.of(0, 10);

        when(notificationService.getUserNotifications(9L, true, pageable)).thenReturn(page);

        ResponseEntity<ApiResponse<Page<NotificationResponse>>> response = controller.getUserNotifications(user, true, pageable);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(page, response.getBody().getData());
        verify(notificationService).getUserNotifications(9L, true, pageable);
    }

    @Test
    void markAsRead_returnsOk() {
        UserPrincipal user = UserPrincipal.builder()
            .id(3L)
            .username("user")
            .password("pwd")
            .email("u@test.com")
            .authorities(List.of())
            .build();

        ResponseEntity<ApiResponse<Void>> response = controller.markAsRead(55L, user);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(notificationService).markAsRead(55L, 3L);
    }
}
