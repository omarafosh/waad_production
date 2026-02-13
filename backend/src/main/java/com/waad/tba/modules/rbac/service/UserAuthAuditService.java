package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.email.AccountLockedData;
import com.waad.tba.common.email.EmailService;
import com.waad.tba.config.SecurityConfigurationProperties;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.entity.UserAuditLog;
import com.waad.tba.modules.rbac.entity.UserLoginAttempt;
import com.waad.tba.modules.rbac.exception.AccountLockedException;
import com.waad.tba.modules.rbac.exception.EmailNotVerifiedException;
import com.waad.tba.modules.rbac.repository.EmailVerificationTokenRepository;
import com.waad.tba.modules.rbac.repository.PasswordResetTokenRepository;
import com.waad.tba.modules.rbac.repository.UserAuditLogRepository;
import com.waad.tba.modules.rbac.repository.UserLoginAttemptRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAuthAuditService {

    private final UserRepository userRepository;
    private final UserLoginAttemptRepository loginAttemptRepository;
    private final UserAuditLogRepository auditLogRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final SecurityConfigurationProperties config;

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
                        String.format("Account locked after %d failures for %d min", user.getFailedLoginCount(), lockoutMinutes),
                        ipAddress, userAgent, null);
            } else {
                userRepository.save(user);
            }
        }
    }

    @Transactional
    public void recordSuccessfulLogin(Long userId, String ipAddress, String userAgent) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        
        loginAttemptRepository.save(UserLoginAttempt.builder()
                .userId(userId).username(user.getUsername()).ipAddress(ipAddress).userAgent(userAgent).success(true).build());
        
        user.resetFailedLoginCount();
        user.updateLastLogin();
        userRepository.save(user);
        auditLog(userId, UserAuditLog.ACTION_LOGIN_SUCCESS, "Successful login", ipAddress, userAgent, userId);
    }

    public void checkAccountLocked(User user) {
        if (user.isLocked()) {
            throw new AccountLockedException(user.getUsername(), user.getLockedUntil());
        }
    }

    public void checkEmailVerified(User user) {
        if (config.getSecurity().isRequireEmailVerification() && !user.getEmailVerified()) {
            throw new EmailNotVerifiedException(user.getEmail());
        }
    }

    @Transactional
    public void auditLog(Long userId, String action, String details, String ipAddress, String userAgent, Long performedBy) {
        auditLogRepository.save(UserAuditLog.builder()
                .userId(userId).action(action).details(details).ipAddress(ipAddress).userAgent(userAgent).performedBy(performedBy).build());
    }

    private void sendAccountLockedNotification(User user) {
        String lockedUntil = user.getLockedUntil().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        emailService.sendAccountLocked(new AccountLockedData(user.getEmail(), user.getFullName(), lockedUntil, user.getFailedLoginCount()));
    }

    @Transactional
    public void cleanupExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();
        passwordResetTokenRepository.deleteExpiredOrUsedTokens(now);
        emailVerificationTokenRepository.deleteExpiredOrVerifiedTokens(now);
    }
}
