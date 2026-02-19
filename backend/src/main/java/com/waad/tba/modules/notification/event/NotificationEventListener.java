package com.waad.tba.modules.notification.event;

import com.waad.tba.modules.notification.dto.NotificationRequest;
import com.waad.tba.modules.notification.entity.Notification;
import com.waad.tba.modules.notification.repository.NotificationRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    private final com.waad.tba.modules.notification.service.EmailService emailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleNotificationEvent(NotificationEvent event) {
        NotificationRequest request = event.getRequest();
        log.info("Handling notification event for user: {}", request.getUserId());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found for notification"));

        Notification notification = Notification.builder()
                .user(user)
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType())
                .referenceId(request.getReferenceId())
                .referenceType(request.getReferenceType())
                .read(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notification saved for user: {}", request.getUserId());

        // Send Email if user has an email address
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            // For now, sending simple text email. Future: Use Thymeleaf templates.
            emailService.sendSimpleMessage(
                    user.getEmail(),
                    request.getTitle(),
                    request.getMessage());
        }
    }
}
