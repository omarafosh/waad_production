package com.waad.tba.modules.auth.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.core.email.EmailService;
import com.waad.tba.modules.auth.dto.LoginRequest;
import com.waad.tba.modules.auth.dto.LoginResponse;
import com.waad.tba.modules.auth.dto.RegisterRequest;
import com.waad.tba.modules.rbac.entity.PasswordResetToken;
import com.waad.tba.modules.rbac.repository.PasswordResetTokenRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ProviderRepository providerRepository;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLE NAMES - for consistent checking
    // ═══════════════════════════════════════════════════════════════════════════
    private static final String ROLE_PROVIDER = "PROVIDER";
    private static final String ROLE_EMPLOYER_ADMIN = "EMPLOYER_ADMIN";

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String identifier = request.getIdentifier();
        log.info("Login attempt for identifier: {}", identifier);

        // Find user by username or email (identifier can be either)
        User user = userRepository.findByUsernameOrEmail(identifier, identifier)
                .orElseThrow(() -> {
                    log.error("User not found with identifier: {}", identifier);
                    return new RuntimeException("Invalid email or password");
                });

        if (!user.getActive()) {
            log.error("Inactive user attempted login: {}", user.getEmail());
            throw new RuntimeException("Account is not active");
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PROVIDER SECURITY HARDENING (2026-01-16):
        // Validate Provider binding BEFORE authentication
        // Prevent login if PROVIDER user has no valid providerId
        // ═══════════════════════════════════════════════════════════════════════════
        validateRoleBindingsBeforeLogin(user);

        // Authenticate
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
        );

        if (!authentication.isAuthenticated()) {
            log.error("Authentication failed for user: {}", user.getEmail());
            throw new RuntimeException("Invalid email or password");
        }

        // Extract roles and permissions
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());
        
        List<String> permissions = flattenPermissions(user);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user);

        // Fetch provider name if applicable
        String providerName = null;
        if (user.getProviderId() != null) {
            providerName = providerRepository.findById(user.getProviderId())
                    .map(Provider::getName)
                    .orElse(null);
        }

        log.info("Login successful for user: {}", user.getUsername());

        return LoginResponse.builder()
                .token(token)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .roles(roles)
                        .permissions(permissions)
                        .employerId(user.getEmployerId())
                        .providerId(user.getProviderId())
                        .providerName(providerName)
                        .build())
                .build();
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * ROLE BINDING VALIDATION (2026-01-16)
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * Validates that users with specific roles have the required bindings:
     * - PROVIDER users MUST have a valid providerId
     * - EMPLOYER_ADMIN users SHOULD have an employerId (warning only)
     * 
     * This validation runs BEFORE password check to prevent login for 
     * improperly configured accounts.
     * 
     * @param user User attempting to login
     * @throws BusinessRuleException if PROVIDER has no providerId
     */
    private void validateRoleBindingsBeforeLogin(User user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return;
        }

        boolean isProvider = user.getRoles().stream()
                .anyMatch(role -> ROLE_PROVIDER.equals(role.getName()));
        
        boolean isEmployerAdmin = user.getRoles().stream()
                .anyMatch(role -> ROLE_EMPLOYER_ADMIN.equals(role.getName()));

        // PROVIDER MUST have providerId
        if (isProvider) {
            if (user.getProviderId() == null) {
                log.error("❌ LOGIN_BLOCKED: PROVIDER user {} has no providerId binding", user.getUsername());
                throw new BusinessRuleException(
                    "حساب مقدم الخدمة غير مكتمل الإعداد. لم يتم ربط المستخدم بمقدم خدمة. " +
                    "يرجى التواصل مع مدير النظام. / " +
                    "Provider account setup incomplete. User is not linked to a provider. " +
                    "Please contact system administrator. [Error: PROVIDER_NOT_LINKED]"
                );
            }
            
            // Also validate that the provider exists and is active
            Provider provider = providerRepository.findById(user.getProviderId()).orElse(null);
            if (provider == null) {
                log.error("❌ LOGIN_BLOCKED: PROVIDER user {} linked to non-existent providerId={}", 
                    user.getUsername(), user.getProviderId());
                throw new BusinessRuleException(
                    "مقدم الخدمة المرتبط بالحساب غير موجود في النظام. " +
                    "يرجى التواصل مع مدير النظام. / " +
                    "The linked provider does not exist in the system. " +
                    "Please contact system administrator. [Error: PROVIDER_NOT_FOUND]"
                );
            }
            
            if (!provider.getActive()) {
                log.error("❌ LOGIN_BLOCKED: PROVIDER user {} linked to inactive provider {} (id={})", 
                    user.getUsername(), provider.getName(), user.getProviderId());
                throw new BusinessRuleException(
                    "مقدم الخدمة المرتبط بالحساب غير نشط. " +
                    "يرجى التواصل مع مدير النظام. / " +
                    "The linked provider is not active. " +
                    "Please contact system administrator. [Error: PROVIDER_INACTIVE]"
                );
            }
            
            log.info("✅ PROVIDER binding validated: user={}, providerId={}, providerName={}", 
                user.getUsername(), user.getProviderId(), provider.getName());
        }

        // EMPLOYER_ADMIN SHOULD have employerId (warning only, don't block)
        if (isEmployerAdmin && user.getEmployerId() == null) {
            log.warn("⚠️ LOGIN_WARNING: EMPLOYER_ADMIN user {} has no employerId binding", user.getUsername());
        }
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        log.info("Registration attempt for username: {}", request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .active(true)
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully: {}", user.getUsername());

        // Auto-login after registration
        LoginRequest loginRequest = LoginRequest.builder()
                .identifier(request.getUsername())
                .password(request.getPassword())
                .build();

        return login(loginRequest);
    }

    /**
     * Get current authenticated user info
     * Simplified - Role-based only (no permissions)
     */
    @Transactional(readOnly = true)
    public LoginResponse.UserInfo getCurrentUser(String token) {
        String username = jwtTokenProvider.getUsernameFromToken(token);
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        return LoginResponse.UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .roles(roles)
                .permissions(flattenPermissions(user))
                .employerId(user.getEmployerId())
                .providerId(user.getProviderId())
                .build();
    }

    /**
     * Get user info by username (for session-based auth)
     * Phase A - Session Auth Support
     * 
     * PROVIDER PORTAL (2026-01-14):
     * Now includes providerName for PROVIDER users to display in forms.
     */
    @Transactional(readOnly = true)
    public LoginResponse.UserInfo getUserInfo(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        // Fetch provider name if user is a PROVIDER
        String providerName = null;
        if (user.getProviderId() != null) {
            providerName = providerRepository.findById(user.getProviderId())
                    .map(Provider::getName) // Use unified name field
                    .orElse(null);
        }

        return LoginResponse.UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .roles(roles)
                .permissions(flattenPermissions(user))
                .employerId(user.getEmployerId())
                .providerId(user.getProviderId())
                .providerName(providerName)
                .build();
    }

    @Transactional
    public void sendResetOtp(String email) {
        log.info("Password reset OTP request for email: {}", email);

        // 1) Check if user exists by email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        // 2) Generate 6-digit OTP
        String otp = "%06d".formatted(new Random().nextInt(1_000_000));

        // 3) Compute expiry = now + 10 minutes
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        // 4) Remove any existing token for this user
        passwordResetTokenRepository.deleteByUserId(user.getId());

        // 5) Save new token
        PasswordResetToken token = PasswordResetToken.builder()
                .userId(user.getId())
                .token(otp)
                .expiresAt(expiry)
                .build();
        passwordResetTokenRepository.save(token);

        // 6) Send email using EmailService
        String subject = "TBA-WAAD Password Reset OTP";
        String body = String.format(
                """
                Dear %s,
                
                You have requested to reset your password.
                
                Your OTP code is: %s
                
                This code will expire in 10 minutes.
                
                If you did not request this, please ignore this email.
                
                Best regards,
                TBA-WAAD System""",
                user.getFullName(), otp
        );

        emailService.sendOtpTemplate(email, user.getFullName(), otp);
        log.info("Password reset OTP sent successfully to: {}", email);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        log.info("Password reset attempt for email: {}", email);

        // 1) Load token by OTP
        PasswordResetToken token = passwordResetTokenRepository.findByToken(otp)
                .orElseThrow(() -> new IllegalArgumentException("Invalid OTP")); // Generic message for security

        // 2) Load user by email to verify ownership
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        // 3) Validate ownership
        if (!token.getUserId().equals(user.getId())) {
             throw new IllegalArgumentException("Invalid OTP");
        }

        // 4) Validate expiry
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) { // corrected getter
             throw new IllegalArgumentException("OTP has expired");
        }

        // 5) Encode password and save user
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // 6) Delete token record
        passwordResetTokenRepository.delete(token);

        log.info("Password reset successfully for user: {}", user.getUsername());
    }

    /**
     * Flatten permissions from user roles.
     */
    private List<String> flattenPermissions(User user) {
        if (user.getRoles() == null) return List.of();
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(com.waad.tba.modules.rbac.entity.Permission::getName)
                .distinct()
                .collect(Collectors.toList());
    }
}
