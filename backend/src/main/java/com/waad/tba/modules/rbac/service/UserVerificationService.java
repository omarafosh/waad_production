package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.email.EmailService;
import com.waad.tba.common.email.EmailVerificationData;
import com.waad.tba.config.SecurityConfigurationProperties;
import com.waad.tba.modules.rbac.dto.VerifyEmailDto;
import com.waad.tba.modules.rbac.entity.EmailVerificationToken;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.entity.UserAuditLog;
import com.waad.tba.modules.rbac.exception.InvalidResetTokenException;
import com.waad.tba.modules.rbac.repository.EmailVerificationTokenRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserVerificationService {

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final SecurityConfigurationProperties config;
    private final UserAuthAuditService auditService;

    @Transactional
    public void sendEmailVerification(User user) {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(config.getSecurity().getEmailVerificationTokenValidityHours());
        
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(expiresAt)
                .verified(false)
                .build();
        
        emailVerificationTokenRepository.save(verificationToken);
        
        String verificationUrl = config.getFrontend().getUrl() + "/auth/verify-email?token=" + token;
        emailService.sendEmailVerification(new EmailVerificationData(user.getEmail(), user.getFullName(), token, verificationUrl));
    }

    @Transactional
    public void verifyEmail(VerifyEmailDto dto, String ipAddress, String userAgent) {
        EmailVerificationToken token = emailVerificationTokenRepository.findByToken(dto.getToken())
                .orElseThrow(() -> new InvalidResetTokenException("Invalid or expired verification token", dto.getToken()));
        
        if (!token.isValid()) {
            throw new InvalidResetTokenException("Verification token has expired or already been used", dto.getToken());
        }
        
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setEmailVerified(true);
        userRepository.save(user);
        
        token.markAsVerified();
        emailVerificationTokenRepository.save(token);
        
        auditService.auditLog(user.getId(), UserAuditLog.ACTION_EMAIL_VERIFIED, "Success: Email verified", ipAddress, userAgent, null);
    }

    @Transactional
    public void resendEmailVerification(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getEmailVerified()) {
            throw new IllegalArgumentException("Email already verified");
        }
        emailVerificationTokenRepository.markAllUserTokensAsVerified(userId);
        sendEmailVerification(user);
    }
}
