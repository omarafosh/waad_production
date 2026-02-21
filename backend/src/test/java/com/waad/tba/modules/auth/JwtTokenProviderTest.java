package com.waad.tba.modules.auth;

import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * ══════════════════════════════════════════════════════════════════
 * JWT TOKEN PROVIDER — UNIT TEST SUITE
 * ══════════════════════════════════════════════════════════════════
 * Covers: generateToken, validateToken, getUsernameFromToken, getUserIdFromJWT
 * ══════════════════════════════════════════════════════════════════
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtTokenProvider Unit Tests")
class JwtTokenProviderTest {

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    // Secret يجب أن يكون 32+ حرف لـ HMAC-SHA256
    private static final String TEST_SECRET = "test_secret_key_must_be_at_least_32chars_long!";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiration", 3600000L); // 1 hour
        jwtTokenProvider.init(); // @PostConstruct
    }

    private User buildUser(String username, String... roleNames) {
        Set<Role> roles = new java.util.HashSet<>();
        for (String rn : roleNames) {
            Permission perm = Permission.builder().name("PERM_" + rn).build();
            Role role = Role.builder().name(rn).permissions(Set.of(perm)).build();
            roles.add(role);
        }
        return User.builder()
                .id(42L)
                .username(username)
                .fullName("Test User")
                .email(username + "@test.com")
                .roles(roles)
                .build();
    }

    @Test
    @DisplayName("TC-JWT-01: generateToken → token صالح يحتوي username و userId و roles")
    void givenUser_whenGenerateToken_thenTokenContainsUserData() {
        User user = buildUser("admin", "ADMIN");

        String token = jwtTokenProvider.generateToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo("admin");
        assertThat(jwtTokenProvider.getUserIdFromJWT(token)).isEqualTo(42L);
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("TC-JWT-02: SUPER_ADMIN → يحصل على جميع الصلاحيات في الـ token")
    void givenSuperAdmin_whenGenerateToken_thenGetsAllPermissions() {
        User user = buildUser("superadmin", "SUPER_ADMIN");
        Permission allPerm = Permission.builder().name("ALL_PERM").build();
        when(permissionRepository.findAll()).thenReturn(List.of(allPerm));

        String token = jwtTokenProvider.generateToken(user);

        assertThat(token).isNotBlank();
        verify(permissionRepository).findAll(); // التحقق من أنه جلب كل الصلاحيات
    }

    @Test
    @DisplayName("TC-JWT-03: مستخدم عادي → لا يُستدعى permissionRepository.findAll")
    void givenRegularUser_whenGenerateToken_thenDoesNotFetchAllPermissions() {
        User user = buildUser("user", "EMPLOYER");

        jwtTokenProvider.generateToken(user);

        verify(permissionRepository, never()).findAll();
    }

    @Test
    @DisplayName("TC-JWT-04: validateToken → token صالح يعيد true")
    void givenValidToken_whenValidate_thenReturnsTrue() {
        User user = buildUser("user", "ADMIN");
        String token = jwtTokenProvider.generateToken(user);

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("TC-JWT-05: validateToken → token مزور يعيد false (ليس Exception)")
    void givenTamperedToken_whenValidate_thenReturnsFalse() {
        String tampered = "eyJhbGciOiJIUzI1NiJ9.INVALID.SIGNATURE";

        assertThat(jwtTokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    @DisplayName("TC-JWT-06: validateToken → token منتهي يعيد false")
    void givenExpiredToken_whenValidate_thenReturnsFalse() {
        // token صغير جداً (1ms)
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiration", 1L);
        jwtTokenProvider.init();
        User user = buildUser("user", "ADMIN");
        String token = jwtTokenProvider.generateToken(user);

        // انتظر 10ms ليصبح منتهياً
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        assertThat(jwtTokenProvider.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("TC-JWT-07: validateToken → token فارغ يعيد false (ليس exception)")
    void givenEmptyToken_whenValidate_thenReturnsFalse() {
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }

    @Test
    @DisplayName("TC-JWT-08: getUsernameFromToken → يستخرج username صحيح")
    void givenToken_whenGetUsername_thenReturnsCorrectUsername() {
        User user = buildUser("omar.admin", "ADMIN");
        String token = jwtTokenProvider.generateToken(user);

        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo("omar.admin");
    }

    @Test
    @DisplayName("TC-JWT-09: getUserIdFromJWT → يستخرج userId صحيح")
    void givenToken_whenGetUserId_thenReturnsCorrectId() {
        User user = buildUser("user", "ADMIN");
        String token = jwtTokenProvider.generateToken(user);

        assertThat(jwtTokenProvider.getUserIdFromJWT(token)).isEqualTo(42L);
    }
}
