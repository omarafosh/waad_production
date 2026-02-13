package com.waad.tba.modules.auth.service;

import com.waad.tba.common.exception.TokenRefreshException;
import com.waad.tba.modules.auth.entity.RefreshToken;
import com.waad.tba.modules.auth.repository.RefreshTokenRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenDurationMs", 60000L);
    }

    @Test
    void findByToken_ShouldReturnToken() {
        String token = UUID.randomUUID().toString();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(token);

        when(refreshTokenRepository.findByToken(token)).thenReturn(Optional.of(refreshToken));

        Optional<RefreshToken> result = refreshTokenService.findByToken(token);
        assertTrue(result.isPresent());
        assertEquals(token, result.get().getToken());
    }

    @Test
    void createRefreshToken_ShouldReturnNewToken() {
        Long userId = 1L;
        User user = new User();
        user.setId(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArguments()[0]);

        RefreshToken result = refreshTokenService.createRefreshToken(userId);

        assertNotNull(result);
        assertNotNull(result.getToken());
        assertEquals(user, result.getUser());
    }

    @Test
    void verifyExpiration_ShouldThrowException_WhenTokenExpired() {
        RefreshToken token = new RefreshToken();
        token.setToken("expired-token");
        token.setExpiryDate(Instant.now().minusMillis(1000));

        assertThrows(TokenRefreshException.class, () -> refreshTokenService.verifyExpiration(token));
        verify(refreshTokenRepository, times(1)).delete(token);
    }

    @Test
    void verifyExpiration_ShouldReturnToken_WhenTokenValid() {
        RefreshToken token = new RefreshToken();
        token.setToken("valid-token");
        token.setExpiryDate(Instant.now().plusMillis(60000));

        RefreshToken result = refreshTokenService.verifyExpiration(token);
        assertEquals(token, result);
        verify(refreshTokenRepository, never()).delete(token);
    }
}
