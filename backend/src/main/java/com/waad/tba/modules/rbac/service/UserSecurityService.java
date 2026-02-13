package com.waad.tba.modules.rbac.service;

import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User Security Service Facade
 * 
 * Delegates security operations to specialized services:
 * - UserPasswordService: Password management
 * - UserVerificationService: Email verification
 * - UserAuthAuditService: Auditing and account locking
 * 
 * Refactored (2026-02-13) to comply with 350-line limit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSecurityService {

    private final UserPasswordService passwordService;
    private final UserVerificationService verificationService;
    private final UserAuthAuditService auditService;
    private final UserRepository userRepository;

    // PASSWORD MANAGEMENT
    @Transactional
    public void changePassword(Long userId, ChangePasswordDto dto, String ipAddress, String userAgent) {
        passwordService.changePassword(userId, dto, ipAddress, userAgent);
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new com.waad.tba.common.exception.ResourceNotFoundException("User", "username", username));
            
        ChangePasswordDto dto = new ChangePasswordDto();
        dto.setCurrentPassword(currentPassword);
        dto.setNewPassword(newPassword);
        dto.setConfirmPassword(newPassword);
        
        passwordService.changePassword(user.getId(), dto, null, null);
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordDto dto, String ipAddress, String userAgent) {
        passwordService.requestPasswordReset(dto, ipAddress, userAgent);
    }

    @Transactional
    public void resetPassword(ResetPasswordDto dto, String ipAddress, String userAgent) {
        passwordService.resetPassword(dto, ipAddress, userAgent);
    }

    // EMAIL VERIFICATION
    @Transactional
    public void sendEmailVerification(User user) {
        verificationService.sendEmailVerification(user);
    }

    @Transactional
    public void verifyEmail(VerifyEmailDto dto, String ipAddress, String userAgent) {
        verificationService.verifyEmail(dto, ipAddress, userAgent);
    }

    @Transactional
    public void resendEmailVerification(Long userId) {
        verificationService.resendEmailVerification(userId);
    }

    @Transactional
    public void resendEmailVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.waad.tba.common.exception.ResourceNotFoundException("User", "email", email));
        verificationService.resendEmailVerification(user.getId());
    }

    // ACCOUNT LOCKOUT & AUDIT
    @Transactional
    public void recordFailedLogin(String username, String reason, String ipAddress, String userAgent) {
        auditService.recordFailedLogin(username, reason, ipAddress, userAgent);
    }

    @Transactional
    public void recordFailedLogin(String username) {
        auditService.recordFailedLogin(username, "Bad credentials", null, null);
    }

    @Transactional
    public void recordSuccessfulLogin(Long userId, String ipAddress, String userAgent) {
        auditService.recordSuccessfulLogin(userId, ipAddress, userAgent);
    }

    @Transactional
    public void recordSuccessfulLogin(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            auditService.recordSuccessfulLogin(user.getId(), null, null);
        }
    }

    public void checkAccountLocked(User user) {
        auditService.checkAccountLocked(user);
    }

    public void checkEmailVerified(User user) {
        auditService.checkEmailVerified(user);
    }

    @Transactional
    public void auditLog(Long userId, String action, String details, 
                        String ipAddress, String userAgent, Long performedBy) {
        auditService.auditLog(userId, action, details, ipAddress, userAgent, performedBy);
    }

    @Transactional
    public void cleanupExpiredTokens() {
        auditService.cleanupExpiredTokens();
    }
}
