package com.waad.tba.modules.auth;

import com.waad.tba.common.exception.TokenRefreshException;
import com.waad.tba.modules.auth.entity.RefreshToken;
import com.waad.tba.modules.auth.repository.RefreshTokenRepository;
import com.waad.tba.modules.auth.service.RefreshTokenService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ══════════════════════════════════════════════════════════════════
 * REFRESH TOKEN SERVICE — UNIT TEST SUITE
 * ══════════════════════════════════════════════════════════════════
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService Unit Tests")
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenDurationMs", 604800000L);
    }

    @Test
    @DisplayName("TC-RT-01: createRefreshToken — مستخدم موجود → ينشئ token ويحفظه")
    void givenExistingUser_whenCreateToken_thenSavesNewToken() {
        when(refreshTokenRepository.updateTokenNative(eq(1L), any(), any())).thenReturn(1);
        RefreshToken saved = RefreshToken.builder()
                .token("uuid-token")
                .expiryDate(Instant.now().plusSeconds(604800))
                .build();
        when(refreshTokenRepository.findByUserId(1L)).thenReturn(Optional.of(saved));

        RefreshToken result = refreshTokenService.createRefreshToken(1L);

        assertThat(result.getToken()).isEqualTo("uuid-token");
    }

    @Test
    @DisplayName("TC-RT-02: createRefreshToken — لا يوجد token سابق → يُنشئ عبر native insert")
    void givenNoExistingToken_whenCreateToken_thenInsertsNatively() {
        when(refreshTokenRepository.updateTokenNative(eq(1L), any(), any())).thenReturn(0);
        RefreshToken inserted = RefreshToken.builder()
                .token("new-uuid")
                .expiryDate(Instant.now().plusSeconds(604800))
                .build();
        when(refreshTokenRepository.findByUserId(1L)).thenReturn(Optional.of(inserted));

        RefreshToken result = refreshTokenService.createRefreshToken(1L);

        verify(refreshTokenRepository).insertTokenNative(eq(1L), any(), any());
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("TC-RT-03: verifyExpiration — token صالح → يُعيده بدون تعديل")
    void givenValidToken_whenVerifyExpiration_thenReturnsToken() {
        RefreshToken token = RefreshToken.builder()
                .token("valid")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        RefreshToken result = refreshTokenService.verifyExpiration(token);
        assertThat(result).isSameAs(token);
    }

    @Test
    @DisplayName("TC-RT-04: verifyExpiration — token منتهي → يُحذف ويُطلق TokenRefreshException")
    void givenExpiredToken_whenVerifyExpiration_thenDeletesAndThrows() {
        RefreshToken token = RefreshToken.builder()
                .token("expired-token")
                .expiryDate(Instant.now().minusSeconds(10))
                .build();

        assertThatThrownBy(() -> refreshTokenService.verifyExpiration(token))
                .isInstanceOf(TokenRefreshException.class)
                .hasMessageContaining("expired");

        verify(refreshTokenRepository).delete(token);
    }

    @Test
    @DisplayName("TC-RT-05: findByToken — token موجود → يعيد Optional مملوء")
    void givenExistingToken_whenFind_thenReturnsFilled() {
        RefreshToken token = RefreshToken.builder().token("abc").build();
        when(refreshTokenRepository.findByToken("abc")).thenReturn(Optional.of(token));

        var result = refreshTokenService.findByToken("abc");
        assertThat(result).isPresent().contains(token);
    }

    @Test
    @DisplayName("TC-RT-06: findByToken — token غير موجود → يعيد Optional فارغ")
    void givenMissingToken_whenFind_thenReturnsEmpty() {
        when(refreshTokenRepository.findByToken("missing")).thenReturn(Optional.empty());

        var result = refreshTokenService.findByToken("missing");
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("TC-RT-07: deleteByUserId — يستدعي deleteByUser بالمستخدم الصحيح")
    void givenUserId_whenDeleteByUserId_thenDeletesCorrectly() {
        User user = User.builder().id(5L).build();
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(refreshTokenRepository.deleteByUser(user)).thenReturn(1);

        int deleted = refreshTokenService.deleteByUserId(5L);
        assertThat(deleted).isEqualTo(1);
    }
}
