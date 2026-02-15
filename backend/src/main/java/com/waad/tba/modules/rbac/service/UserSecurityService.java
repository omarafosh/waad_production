package com.waad.tba.modules.rbac.service;

import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.entity.User;

/**
 * User Security Service Interface
 */
public interface UserSecurityService {

    void changePassword(Long userId, ChangePasswordDto dto, String ipAddress, String userAgent);
    
    void changePassword(String username, String currentPassword, String newPassword);
    
    void requestPasswordReset(ForgotPasswordDto dto, String ipAddress, String userAgent);
    
    void resetPassword(ResetPasswordDto dto, String ipAddress, String userAgent);
    
    void sendEmailVerification(User user);
    
    void verifyEmail(VerifyEmailDto dto, String ipAddress, String userAgent);
    
    void resendEmailVerification(Long userId);
    
    void resendEmailVerification(String email);
    
    void recordFailedLogin(String username, String reason, String ipAddress, String userAgent);
    
    void recordFailedLogin(String username);
    
    void recordSuccessfulLogin(Long userId, String ipAddress, String userAgent);
    
    void recordSuccessfulLogin(String username);
    
    void checkAccountLocked(User user);
    
    void checkEmailVerified(User user);
    
    void auditLog(Long userId, String action, String details, String ipAddress, String userAgent, Long performedBy);
    
    void cleanupExpiredTokens();
}
