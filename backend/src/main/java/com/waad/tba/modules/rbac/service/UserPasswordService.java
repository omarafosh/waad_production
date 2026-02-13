package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.email.EmailService;
import com.waad.tba.common.email.PasswordResetData;
import com.waad.tba.config.SecurityConfigurationProperties;
import com.waad.tba.modules.rbac.dto.ChangePasswordDto;
import com.waad.tba.modules.rbac.dto.ForgotPasswordDto;
import com.waad.tba.modules.rbac.dto.ResetPasswordDto;
import com.waad.tba.modules.rbac.entity.PasswordResetToken;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.entity.UserAuditLog;
import com.waad.tba.modules.rbac.exception.InvalidResetTokenException;
import com.waad.tba.modules.rbac.exception.PasswordPolicyViolationException;
import com.waad.tba.modules.rbac.repository.PasswordResetTokenRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPasswordService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecurityConfigurationProperties config;
    private final UserAuthAuditService auditService;

    @Transactional
    public void changePassword(Long userId, ChangePasswordDto dto, String ipAddress, String userAgent) {
        if (!dto.getNewPassword().equals(dto.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            auditService.auditLog(userId, UserAuditLog.ACTION_PASSWORD_CHANGE, 
                    "Failed: Incorrect current password", ipAddress, userAgent, userId);
            throw new IllegalArgumentException("Current password is incorrect");
        }
        
        if (dto.getNewPassword().equalsIgnoreCase(user.getUsername())) {
            throw new PasswordPolicyViolationException("Password cannot be the same as username",
                    java.util.Collections.singletonList("PASSWORD_SAME_AS_USERNAME"));
        }
        
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);
        passwordResetTokenRepository.invalidateAllUserTokens(userId);
        
        auditService.auditLog(userId, UserAuditLog.ACTION_PASSWORD_CHANGE, 
                "Success: Password changed by user", ipAddress, userAgent, userId);
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordDto dto, String ipAddress, String userAgent) {
        User user = userRepository.findByEmail(dto.getEmail()).orElse(null);
        if (user == null) return;

        passwordResetTokenRepository.invalidateAllUserTokens(user.getId());
        
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(config.getSecurity().getPasswordResetTokenValidityHours());
        
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(expiresAt)
                .used(false)
                .build();
        
        passwordResetTokenRepository.save(resetToken);
        
        String resetUrl = config.getFrontend().getUrl() + "/auth/reset-password?token=" + token;
        emailService.sendPasswordReset(new PasswordResetData(user.getEmail(), user.getFullName(), token, resetUrl));
        
        auditService.auditLog(user.getId(), "PASSWORD_RESET_REQUESTED", "Reset token generated", ipAddress, userAgent, null);
    }

    @Transactional
    public void resetPassword(ResetPasswordDto dto, String ipAddress, String userAgent) {
        if (!dto.getNewPassword().equals(dto.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        
        PasswordResetToken token = passwordResetTokenRepository.findByToken(dto.getToken())
                .orElseThrow(() -> new InvalidResetTokenException("Invalid or expired reset token", dto.getToken()));
        
        if (!token.isValid()) {
            throw new InvalidResetTokenException("Reset token has expired or already been used", dto.getToken());
        }
        
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (dto.getNewPassword().equalsIgnoreCase(user.getUsername())) {
            throw new PasswordPolicyViolationException("Password cannot be the same as username", 
                    java.util.Collections.singletonList("PASSWORD_SAME_AS_USERNAME"));
        }
        
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.unlockAccount();
        userRepository.save(user);
        
        token.markAsUsed();
        passwordResetTokenRepository.save(token);
        
        auditService.auditLog(user.getId(), UserAuditLog.ACTION_PASSWORD_RESET, 
                "Success: Password reset via token", ipAddress, userAgent, null);
    }
}
