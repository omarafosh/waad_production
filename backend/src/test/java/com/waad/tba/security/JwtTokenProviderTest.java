package com.waad.tba.security;

import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private final String secret = "This-is-a-Base64-encoded-secret-key-for-testing-purposes-only-and-should-be-long-enough";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiration", 3600000L);
        jwtTokenProvider.init();

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@waad.com");

        Role role = new Role();
        role.setName("USER");
        Set<Permission> permissions = new HashSet<>();
        Permission p = new Permission();
        p.setName("READ_USER");
        permissions.add(p);
        role.setPermissions(permissions);

        Set<Role> roles = new HashSet<>();
        roles.add(role);
        testUser.setRoles(roles);
    }

    @Test
    void generateToken_ShouldReturnValidToken() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("testuser", jwtTokenProvider.getUsernameFromToken(token));
    }

    @Test
    void validateToken_WithInvalidToken_ShouldReturnFalse() {
        assertFalse(jwtTokenProvider.validateToken("invalid-token"));
    }

    @Test
    void getUserIdFromJWT_ShouldReturnCorrectId() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertEquals(1L, jwtTokenProvider.getUserIdFromJWT(token));
    }
}
