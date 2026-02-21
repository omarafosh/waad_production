package com.waad.tba.modules.auth.repository;

import com.waad.tba.modules.auth.entity.RefreshToken;
import com.waad.tba.modules.rbac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM RefreshToken r WHERE r.user.id = :userId")
    java.util.Optional<RefreshToken> findByUserId(
            @org.springframework.data.repository.query.Param("userId") Long userId);

    java.util.Optional<RefreshToken> findByUser(User user);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "UPDATE refresh_tokens SET token = :token, expiry_date = :expiry, revoked = false WHERE users_id = :userId", nativeQuery = true)
    int updateTokenNative(@org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("token") String token,
            @org.springframework.data.repository.query.Param("expiry") java.time.Instant expiry);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "INSERT INTO refresh_tokens (users_id, token, expiry_date, revoked, created_at) VALUES (:userId, :token, :expiry, false, NOW())", nativeQuery = true)
    void insertTokenNative(@org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("token") String token,
            @org.springframework.data.repository.query.Param("expiry") java.time.Instant expiry);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM refresh_tokens WHERE users_id = :userId", nativeQuery = true)
    void deleteByUserIdNative(@org.springframework.data.repository.query.Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    int deleteByUser(User user);
}
