package com.waad.tba.modules.auth.service;

import com.waad.tba.common.exception.TokenRefreshException;
import com.waad.tba.modules.auth.entity.RefreshToken;
import com.waad.tba.modules.auth.repository.RefreshTokenRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration:604800000}") // 7 days
    private Long refreshTokenDurationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        // 🚀 ULTIMATE FIX: Use Native SQL to bypass Hibernate's "Upsert" confusion
        String newToken = UUID.randomUUID().toString();
        Instant expiry = Instant.now().plusMillis(refreshTokenDurationMs);

        // Try to update existing token first
        int updatedRows = refreshTokenRepository.updateTokenNative(userId, newToken, expiry);

        if (updatedRows == 0) {
            // No existing token, perform native insert
            refreshTokenRepository.insertTokenNative(userId, newToken, expiry);
        }

        // Return the updated/inserted token (fetching it by userId to be sure)
        return refreshTokenRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Failed to create/update refresh token natively"));
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException(token.getToken(),
                    "Refresh token was expired. Please make a new signin request");
        }
        return token;
    }

    @Transactional
    public int deleteByUserId(Long userId) {
        return refreshTokenRepository.deleteByUser(userRepository.findById(userId).get());
    }
}
