package com.waad.tba.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.waad.tba.modules.auth.dto.LoginRequest;
import com.waad.tba.modules.auth.dto.LoginResponse;
import com.waad.tba.modules.auth.dto.RegisterRequest;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.security.JwtTokenProvider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.rbac.repository.PasswordResetTokenRepository;
import com.waad.tba.core.email.EmailService;

@ExtendWith(MockitoExtension.class)
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
    private ProviderRepository providerRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .fullName("Test User")
                .civilId("1234567890")
                .password("encoded_password")
                .active(true)
                .roles(Set.of())
                .build();
    }

    @Test
    void register_ShouldSaveUserWithCivilId() {
        // Arrange
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser")
                .password("password123")
                .fullName("New User")
                .email("new@example.com")
                .civilId("9876543210")
                .build();

        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        
        // Mocking login called inside register
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(userRepository.findByUsernameOrEmail(anyString(), anyString())).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("token");

        // Act
        LoginResponse response = authService.register(request);

        // Assert
        assertNotNull(response);
        verify(userRepository).save(argThat(user -> 
            "9876543210".equals(user.getCivilId()) &&
            "newuser".equals(user.getUsername())
        ));
    }

    @Test
    void login_ShouldReturnCivilIdInResponse() {
        // Arrange
        LoginRequest request = LoginRequest.builder()
                .identifier("testuser")
                .password("password123")
                .build();

        when(userRepository.findByUsernameOrEmail(anyString(), anyString())).thenReturn(Optional.of(testUser));
        
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        
        when(jwtTokenProvider.generateToken(any(User.class))).thenReturn("token");

        // Act
        LoginResponse response = authService.login(request);

        // Assert
        assertNotNull(response);
        assertEquals("1234567890", response.getUser().getCivilId());
        assertEquals("testuser", response.getUser().getUsername());
    }

    @Test
    void register_ShouldFailIfUsernameExists() {
        // Arrange
        RegisterRequest request = RegisterRequest.builder()
                .username("testuser")
                .build();
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
    }
}
