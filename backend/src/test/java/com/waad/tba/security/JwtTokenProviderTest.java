package com.waad.tba.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtTokenProviderTest {

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    private final String secret = "ThisIsALongEnoughSecretKeyForTestingPurposesOnly123456";
    private final long expiration = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiration", expiration);
        
        // Initialize keys
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        ReflectionTestUtils.setField(jwtTokenProvider, "key", key);
    }

    @Test
    void generateToken_ShouldReturnValidToken() {
        UserPrincipal userPrincipal = mock(UserPrincipal.class);
        when(userPrincipal.getId()).thenReturn(1L);
        when(userPrincipal.getUsername()).thenReturn("testuser");
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
            .when(userPrincipal).getAuthorities();

        String token = jwtTokenProvider.generateToken(userPrincipal);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void getUserIdFromJWT_ShouldReturnCorrectId() {
        UserPrincipal userPrincipal = mock(UserPrincipal.class);
        when(userPrincipal.getId()).thenReturn(123L);
        when(userPrincipal.getUsername()).thenReturn("testuser");
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
            .when(userPrincipal).getAuthorities();

        String token = jwtTokenProvider.generateToken(userPrincipal);
        Long userId = jwtTokenProvider.getUserIdFromJWT(token);

        assertEquals(123L, userId);
    }
    
    @Test
    void validateToken_ShouldReturnFalse_WhenTokenIsInvalid() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.string"));
    }
}
