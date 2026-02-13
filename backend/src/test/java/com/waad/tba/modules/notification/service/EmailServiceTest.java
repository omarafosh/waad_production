package com.waad.tba.modules.notification.service;

import com.waad.tba.modules.notification.service.impl.SmtpEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

class EmailServiceTest {

    @Mock
    private JavaMailSender emailSender;

    @InjectMocks
    private SmtpEmailService emailService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(emailService, "fromEmail", "test@example.com");
    }

    @Test
    void sendSimpleMessage_ShouldSendEmail() {
        emailService.sendSimpleMessage("user@example.com", "Subject", "Body");
        verify(emailSender, times(1)).send(any(SimpleMailMessage.class));
    }
}
