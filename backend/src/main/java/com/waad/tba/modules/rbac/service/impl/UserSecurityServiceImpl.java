package com.waad.tba.modules.rbac.service.impl;

import com.waad.tba.common.email.*;
import com.waad.tba.config.SecurityConfigurationProperties;
import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.entity.*;
import com.waad.tba.modules.rbac.exception.*;
import com.waad.tba.modules.rbac.repository.*;
import com.waad.tba.modules.rbac.service.UserSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * تنفيذ خدمة أمن المستخدمين (User Security Service Implementation).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSecurityServiceImpl implements UserSecurityService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final UserLoginAttemptRepository loginAttemptRepository;
    private final UserAuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecurityConfigurationProperties config;
    
    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordDto dto, String ipAddress, String userAgent) {
        log.info("Password change requested for user ID: {}", userId);
        
        if (!java.util.Objects.equals(dto.getNewPassword(), dto.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            auditLog(userId, UserAuditLog.ACTION_PASSWORD_CHANGE, 
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
        
        auditLog(userId, UserAuditLog.ACTION_PASSWORD_CHANGE, 
                "Success: Password changed by user", ipAddress, userAgent, userId);
    }
    
    @Override
    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        ChangePasswordDto dto = new ChangePasswordDto();
        dto.setCurrentPassword(currentPassword);
        dto.setNewPassword(newPassword);
        dto.setConfirmPassword(newPassword);
        
        changePassword(user.getId(), dto, null, null);
    }
    
    @Override
    @Transactional
    public void requestPasswordReset(ForgotPasswordDto dto, String ipAddress, String userAgent) {
        log.info("Password reset requested for email: {}", dto.getEmail());
        
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
        PasswordResetData emailData = new PasswordResetData(
                user.getEmail(),
                user.getFullName(),
                token,
                resetUrl
        );
        emailService.sendPasswordReset(emailData);
        
        auditLog(user.getId(), "PASSWORD_RESET_REQUESTED", 
                "Reset token generated", ipAddress, userAgent, null);
    }
    
    @Override
    @Transactional
    public void resetPassword(ResetPasswordDto dto, String ipAddress, String userAgent) {
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
        
        auditLog(user.getId(), UserAuditLog.ACTION_PASSWORD_RESET, 
                "Success: Password reset via token", ipAddress, userAgent, null);
    }
    
    @Override
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
        EmailVerificationData emailData = new EmailVerificationData(
                user.getEmail(),
                user.getFullName(),
                token,
                verificationUrl
        );
        emailService.sendEmailVerification(emailData);
    }
    
    @Override
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
        
        auditLog(user.getId(), UserAuditLog.ACTION_EMAIL_VERIFIED, 
                "Success: Email verified", ipAddress, userAgent, null);
    }
    
    @Override
    @Transactional
    public void resendEmailVerification(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (user.getEmailVerified()) {
            throw new IllegalArgumentException("Email already verified");
        }
        
        emailVerificationTokenRepository.markAllUserTokensAsVerified(userId);
        sendEmailVerification(user);
    }
    
    @Override
    @Transactional
    public void resendEmailVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        resendEmailVerification(user.getId());
    }
    
    @Override
    @Transactional
    public void recordFailedLogin(String username, String reason, String ipAddress, String userAgent) {
        User user = userRepository.findByUsername(username).orElse(null);
        
        UserLoginAttempt attempt = UserLoginAttempt.builder()
                .userId(user != null ? user.getId() : null)
                .username(username)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .success(false)
                .failedReason(reason)
                .build();
        
        loginAttemptRepository.save(attempt);
        
        if (user != null) {
            user.setFailedLoginCount(user.getFailedLoginCount() + 1);
            
            if (user.getFailedLoginCount() >= config.getSecurity().getMaxFailedLoginAttempts()) {
                int lockoutMinutes = config.getSecurity().getAccountLockoutDurationMinutes();
                user.setLockedUntil(LocalDateTime.now().plusMinutes(lockoutMinutes));
                userRepository.save(user);
                
                sendAccountLockedNotification(user);
                auditLog(user.getId(), UserAuditLog.ACTION_ACCOUNT_LOCKED, 
                        String.format("Account locked after %d failed attempts for %d minutes",
                                user.getFailedLoginCount(), lockoutMinutes),
                        ipAddress, userAgent, null);
            } else {
                userRepository.save(user);
            }
        }
    }
    
    @Override
    @Transactional
    public void recordFailedLogin(String username) {
        recordFailedLogin(username, "Bad credentials", null, null);
    }
    
    @Override
    @Transactional
    public void recordSuccessfulLogin(Long userId, String ipAddress, String userAgent) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        
        UserLoginAttempt attempt = UserLoginAttempt.builder()
                .userId(userId)
                .username(user.getUsername())
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .success(true)
                .build();
        
        loginAttemptRepository.save(attempt);
        
        user.resetFailedLoginCount();
        user.updateLastLogin();
        userRepository.save(user);
        
        auditLog(userId, UserAuditLog.ACTION_LOGIN_SUCCESS, 
                "Successful login", ipAddress, userAgent, userId);
    }
    
    @Override
    @Transactional
    public void recordSuccessfulLogin(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            recordSuccessfulLogin(user.getId(), null, null);
        }
    }
    
    @Override
    public void checkAccountLocked(User user) {
        if (user.isLocked()) {
            throw new AccountLockedException(user.getUsername(), user.getLockedUntil());
        }
    }
    
    @Override
    public void checkEmailVerified(User user) {
        if (config.getSecurity().isRequireEmailVerification() && !user.getEmailVerified()) {
            throw new EmailNotVerifiedException(user.getEmail());
        }
    }
    
    private void sendAccountLockedNotification(User user) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String lockedUntil = user.getLockedUntil().format(formatter);
        AccountLockedData emailData = new AccountLockedData(
                user.getEmail(),
                user.getFullName(),
                lockedUntil,
                user.getFailedLoginCount()
        );
        emailService.sendAccountLocked(emailData);
    }
    
    @Override
    @Transactional
    public void auditLog(Long userId, String action, String details, 
                        String ipAddress, String userAgent, Long performedBy) {
        UserAuditLog auditLog = UserAuditLog.builder()
                .userId(userId)
                .action(action)
                .details(details)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .performedBy(performedBy)
                .build();
        auditLogRepository.save(auditLog);
    }
    
    @Override
    @Transactional
    public void cleanupExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();
        int deletedResetTokens = passwordResetTokenRepository.deleteExpiredOrUsedTokens(now);
        int deletedVerificationTokens = emailVerificationTokenRepository.deleteExpiredOrVerifiedTokens(now);
        log.info("Cleanup: Deleted {} password reset tokens and {} verification tokens", 
                deletedResetTokens, deletedVerificationTokens);
    }
}
