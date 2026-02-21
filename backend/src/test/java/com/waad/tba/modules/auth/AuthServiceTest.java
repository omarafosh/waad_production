package com.waad.tba.modules.auth;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.core.email.EmailService;
import com.waad.tba.modules.auth.dto.LoginRequest;
import com.waad.tba.modules.auth.dto.RegisterRequest;
import com.waad.tba.modules.auth.service.AuthService;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.rbac.entity.PasswordResetToken;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PasswordResetTokenRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ══════════════════════════════════════════════════════════════════
 * AUTH SERVICE — UNIT TEST SUITE
 * ══════════════════════════════════════════════════════════════════
 * Covers: login, register, sendResetOtp, resetPassword,
 * validateRoleBindings, lockout logic, flattenPermissions
 * ══════════════════════════════════════════════════════════════════
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private EmailService emailService;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private ProviderRepository providerRepository;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        // Inject @Value fields via reflection
        ReflectionTestUtils.setField(authService, "maxFailedAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockoutDurationMinutes", 30);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER FACTORIES
    // ═══════════════════════════════════════════════════════════════

    private User buildActiveUser(String username, String email) {
        return User.builder()
                .id(1L)
                .username(username)
                .email(email)
                .password("encoded_pass")
                .active(true)
                .failedLoginCount(0)
                .roles(Set.of())
                .build();
    }

    private LoginRequest loginRequest(String identifier, String password) {
        return LoginRequest.builder()
                .identifier(identifier)
                .password(password)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // LOGIN TESTS
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("login()")
    class LoginTests {

        @Test
        @DisplayName("TC-AUTH-01: بيانات صحيحة → تسجيل دخول ناجح مع JWT token")
        void givenValidCredentials_whenLogin_thenReturnsJwtToken() {
            // Arrange
            User user = buildActiveUser("admin", "admin@test.com");
            when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(user));
            Authentication auth = mock(Authentication.class);
            when(auth.isAuthenticated()).thenReturn(true);
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(jwtTokenProvider.generateToken(user)).thenReturn("mock.jwt.token");

            // Act
            var result = authService.login(loginRequest("admin", "correct_password"));

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getToken()).isEqualTo("mock.jwt.token");
            verify(userRepository).save(user); // resets failedLoginCount
        }

        @Test
        @DisplayName("TC-AUTH-02: مستخدم غير موجود → BadCredentialsException (ليس 404)")
        void givenUnknownUser_whenLogin_thenThrowsBadCredentials() {
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(loginRequest("unknown", "pass")))
                    .isInstanceOf(BadCredentialsException.class);
        }

        @Test
        @DisplayName("TC-AUTH-03: حساب غير نشط → استثناء واضح")
        void givenInactiveUser_whenLogin_thenThrowsRuntimeException() {
            User user = buildActiveUser("inactive", "inactive@test.com");
            user.setActive(false);
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.login(loginRequest("inactive", "pass")))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not active");
        }

        @Test
        @DisplayName("TC-AUTH-04: حساب مقفل → استثناء يحتوي على وقت الإفراج")
        void givenLockedUser_whenLogin_thenThrowsWithLockTime() {
            User user = buildActiveUser("locked", "locked@test.com");
            user.setLockedUntil(LocalDateTime.now().plusMinutes(20));
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.login(loginRequest("locked", "pass")))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("locked until");
        }

        @Test
        @DisplayName("TC-AUTH-05: كلمة مرور خاطئة → يزداد failedLoginCount")
        void givenWrongPassword_whenLogin_thenIncrementsFailedCount() {
            User user = buildActiveUser("user", "user@test.com");
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("bad creds"));

            assertThatThrownBy(() -> authService.login(loginRequest("user", "wrong")))
                    .isInstanceOf(BadCredentialsException.class);

            assertThat(user.getFailedLoginCount()).isEqualTo(1);
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("TC-AUTH-06: 5 محاولات فاشلة → يُغلق الحساب تلقائياً")
        void given5FailedAttempts_whenLogin_thenAccountLocks() {
            User user = buildActiveUser("user", "user@test.com");
            user.setFailedLoginCount(4); // المحاولة الخامسة ستُغلق الحساب
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("bad creds"));

            assertThatThrownBy(() -> authService.login(loginRequest("user", "wrong")));

            assertThat(user.getLockedUntil()).isNotNull();
            assertThat(user.getLockedUntil()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("TC-AUTH-07: PROVIDER بدون providerId → BusinessRuleException قبل التحقق من كلمة المرور")
        void givenProviderRoleWithNoProviderId_whenLogin_thenThrowsBeforePasswordCheck() {
            Role providerRole = Role.builder().name("PROVIDER").build();
            User user = buildActiveUser("provider_user", "p@test.com");
            user.setRoles(Set.of(providerRole));
            user.setProviderId(null);
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.login(loginRequest("provider_user", "pass")))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("PROVIDER_NOT_LINKED");

            // يجب ألا يُستدعى authenticationManager أبداً
            verifyNoInteractions(authenticationManager);
        }

        @Test
        @DisplayName("TC-AUTH-08: PROVIDER مرتبط بمزود غير موجود → BusinessRuleException")
        void givenProviderRoleWithDeletedProvider_whenLogin_thenThrowsProviderNotFound() {
            Role providerRole = Role.builder().name("PROVIDER").build();
            User user = buildActiveUser("p_user", "pu@test.com");
            user.setRoles(Set.of(providerRole));
            user.setProviderId(999L);
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));
            when(providerRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(loginRequest("p_user", "pass")))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("PROVIDER_NOT_FOUND");
        }

        @Test
        @DisplayName("TC-AUTH-09: PROVIDER مرتبط بمزود غير نشط → BusinessRuleException")
        void givenProviderRoleWithInactiveProvider_whenLogin_thenThrowsProviderInactive() {
            Role providerRole = Role.builder().name("PROVIDER").build();
            User user = buildActiveUser("p_user", "pu@test.com");
            user.setRoles(Set.of(providerRole));
            user.setProviderId(10L);
            Provider inactiveProvider = Provider.builder().id(10L).name("Test").active(false).build();
            when(userRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.of(user));
            when(providerRepository.findById(10L)).thenReturn(Optional.of(inactiveProvider));

            assertThatThrownBy(() -> authService.login(loginRequest("p_user", "pass")))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("PROVIDER_INACTIVE");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // REGISTER TESTS
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("register()")
    class RegisterTests {

        @Test
        @DisplayName("TC-AUTH-10: تسجيل بيانات صحيحة → نجاح مع JWT token")
        void givenValidData_whenRegister_thenReturnsToken() {
            RegisterRequest req = RegisterRequest.builder()
                    .username("newuser")
                    .email("new@test.com")
                    .password("Secret@123")
                    .fullName("Test User")
                    .build();

            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
            when(passwordEncoder.encode(any())).thenReturn("encoded");

            User savedUser = buildActiveUser("newuser", "new@test.com");
            when(userRepository.save(any())).thenReturn(savedUser);

            // login call after register
            when(userRepository.findByUsernameOrEmail("newuser", "newuser"))
                    .thenReturn(Optional.of(savedUser));
            Authentication auth = mock(Authentication.class);
            when(auth.isAuthenticated()).thenReturn(true);
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(jwtTokenProvider.generateToken(savedUser)).thenReturn("jwt.token");

            var result = authService.register(req);
            assertThat(result.getToken()).isEqualTo("jwt.token");
        }

        @Test
        @DisplayName("TC-AUTH-11: username مكرر → IllegalArgumentException")
        void givenDuplicateUsername_whenRegister_thenThrows() {
            when(userRepository.existsByUsername("existing")).thenReturn(true);

            var req = RegisterRequest.builder()
                    .username("existing").email("e@test.com").password("p").build();

            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Username already exists");
        }

        @Test
        @DisplayName("TC-AUTH-12: email مكرر → IllegalArgumentException")
        void givenDuplicateEmail_whenRegister_thenThrows() {
            when(userRepository.existsByUsername("newuser")).thenReturn(false);
            when(userRepository.existsByEmail("dup@test.com")).thenReturn(true);

            var req = RegisterRequest.builder()
                    .username("newuser").email("dup@test.com").password("p").build();

            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Email already exists");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FORGOT PASSWORD / OTP TESTS
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("sendResetOtp()")
    class ForgotPasswordTests {

        @Test
        @DisplayName("TC-AUTH-13: بريد موجود → يُرسل OTP ويُحفظ في قاعدة البيانات")
        void givenExistingEmail_whenSendOtp_thenSavesAndSendsOtp() {
            User user = buildActiveUser("user", "user@test.com");
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            authService.sendResetOtp("user@test.com");

            verify(passwordResetTokenRepository).deleteByUserId(1L);
            verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
            verify(emailService).sendOtpTemplate(eq("user@test.com"), any(), any());
        }

        @Test
        @DisplayName("TC-AUTH-14: بريد غير موجود → ResourceNotFoundException (⚠️ يكشف وجود المستخدم)")
        void givenNonExistingEmail_whenSendOtp_thenThrowsResourceNotFound() {
            // هذا خطأ أمني: يجب أن تفشل بصمت (Fail Silently)
            when(userRepository.findByEmail("no@test.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.sendResetOtp("no@test.com"))
                    .isInstanceOf(ResourceNotFoundException.class);
            // TODO: يجب تحويل هذا السلوك لإرجاع success بدون إرسال email
            // لمنع User Enumeration Attack
        }

        @Test
        @DisplayName("TC-AUTH-15: OTP منتهي الصلاحية → IllegalArgumentException 'OTP has expired'")
        void givenExpiredOtp_whenReset_thenThrowsExpired() {
            User user = buildActiveUser("user", "user@test.com");
            PasswordResetToken expiredToken = PasswordResetToken.builder()
                    .userId(1L)
                    .token("123456")
                    .expiresAt(LocalDateTime.now().minusMinutes(15))
                    .build();

            when(passwordResetTokenRepository.findByToken("123456"))
                    .thenReturn(Optional.of(expiredToken));
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.resetPassword("user@test.com", "123456", "NewPass@1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("expired");
        }

        @Test
        @DisplayName("TC-AUTH-16: OTP صحيح غير منتهي → يُعيد تعيين كلمة المرور ويحذف OTP")
        void givenValidOtp_whenReset_thenUpdatesPasswordAndDeletesToken() {
            User user = buildActiveUser("user", "user@test.com");
            PasswordResetToken token = PasswordResetToken.builder()
                    .userId(1L)
                    .token("654321")
                    .expiresAt(LocalDateTime.now().plusMinutes(5))
                    .build();

            when(passwordResetTokenRepository.findByToken("654321")).thenReturn(Optional.of(token));
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.encode("NewPass@1")).thenReturn("encoded_new");

            authService.resetPassword("user@test.com", "654321", "NewPass@1");

            assertThat(user.getPassword()).isEqualTo("encoded_new");
            verify(userRepository).save(user);
            verify(passwordResetTokenRepository).delete(token);
        }

        @Test
        @DisplayName("TC-AUTH-17: OTP لمستخدم آخر → IllegalArgumentException 'Invalid OTP'")
        void givenOtpBelongingToOtherUser_whenReset_thenThrowsInvalidOtp() {
            User user = buildActiveUser("user", "user@test.com");
            // Token belongs to userId=99, not 1
            PasswordResetToken token = PasswordResetToken.builder()
                    .userId(99L)
                    .token("999999")
                    .expiresAt(LocalDateTime.now().plusMinutes(5))
                    .build();

            when(passwordResetTokenRepository.findByToken("999999")).thenReturn(Optional.of(token));
            when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.resetPassword("user@test.com", "999999", "NewPass@1"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Invalid OTP");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET CURRENT USER TESTS
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("getCurrentUser()")
    class GetCurrentUserTests {

        @Test
        @DisplayName("TC-AUTH-18: token صالح → يُعيد بيانات المستخدم الحالية من DB")
        void givenValidToken_whenGetCurrentUser_thenReturnsUserInfo() {
            when(jwtTokenProvider.getUsernameFromToken("valid.jwt"))
                    .thenReturn("admin");
            User user = buildActiveUser("admin", "admin@test.com");
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

            var info = authService.getCurrentUser("valid.jwt");

            assertThat(info.getUsername()).isEqualTo("admin");
        }

        @Test
        @DisplayName("TC-AUTH-19: مستخدم محذوف من DB لكن token لا يزال صالحاً → RuntimeException")
        void givenDeletedUserButValidToken_whenGetCurrentUser_thenThrows() {
            when(jwtTokenProvider.getUsernameFromToken("old.jwt")).thenReturn("deleted");
            when(userRepository.findByUsername("deleted")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.getCurrentUser("old.jwt"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("User not found");
        }
    }
}
