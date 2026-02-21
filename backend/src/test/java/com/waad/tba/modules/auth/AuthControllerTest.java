package com.waad.tba.modules.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.modules.auth.dto.LoginRequest;
import com.waad.tba.modules.auth.dto.LoginResponse;
import com.waad.tba.modules.auth.dto.TokenRefreshRequest;
import com.waad.tba.modules.auth.entity.RefreshToken;
import com.waad.tba.modules.auth.service.AuthService;
import com.waad.tba.modules.auth.service.RefreshTokenService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.service.UserSecurityService;
import com.waad.tba.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ══════════════════════════════════════════════════════════════════
 * AUTH CONTROLLER — WEB LAYER TEST SUITE (MockMvc)
 * ══════════════════════════════════════════════════════════════════
 * Tests HTTP contracts: status codes, response body, validation
 * WITHOUT starting a full Spring context.
 * ══════════════════════════════════════════════════════════════════
 */
@WebMvcTest(controllers = com.waad.tba.modules.auth.controller.AuthController.class)
@DisplayName("AuthController Web Layer Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;
    @MockBean
    private AuthenticationManager authenticationManager;
    @MockBean
    private UserSecurityService securityService;
    @MockBean
    private RefreshTokenService refreshTokenService;
    @MockBean
    private JwtTokenProvider tokenProvider;
    @MockBean
    private com.waad.tba.security.JwtAuthenticationFilter jwtFilter;
    @MockBean
    private com.waad.tba.security.CustomUserDetailsService userDetailsService;

    private String json(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/auth/login
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /api/auth/login")
    class LoginEndpointTests {

        @Test
        @DisplayName("TC-CTR-01: بيانات صحيحة → 200 OK + JWT في body")
        void givenValidCredentials_thenReturn200WithToken() throws Exception {
            LoginResponse.UserInfo userInfo = LoginResponse.UserInfo.builder()
                    .id(1L).username("admin").roles(List.of("ADMIN")).build();
            LoginResponse loginResp = LoginResponse.builder()
                    .token("jwt.access").user(userInfo).build();
            when(authService.login(any())).thenReturn(loginResp);
            when(refreshTokenService.createRefreshToken(1L)).thenReturn(
                    RefreshToken.builder().token("refresh.token")
                            .expiryDate(Instant.now().plusSeconds(3600)).build());

            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(LoginRequest.builder()
                            .identifier("admin").password("secret").build())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.token").value("jwt.access"))
                    .andExpect(jsonPath("$.status").value("success"));
        }

        @Test
        @DisplayName("TC-CTR-02: بيانات خاطئة → 401 Unauthorized (ليس 500)")
        void givenWrongCredentials_thenReturn401NotServerError() throws Exception {
            when(authService.login(any())).thenThrow(new BadCredentialsException("bad"));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(LoginRequest.builder()
                                    .identifier("admin").password("wrong").build())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-CTR-03: identifier فارغ → 400 Bad Request (bean validation)")
        void givenEmptyIdentifier_thenReturn400() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"identifier\":\"\",\"password\":\"secret\"}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-CTR-04: body فارغ كلياً → 400 Bad Request")
        void givenEmptyBody_thenReturn400() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-CTR-05: SQL Injection في identifier → 401 (لا 500)")
        void givenSqlInjectionInIdentifier_thenReturn401NotServerError() throws Exception {
            when(authService.login(any())).thenThrow(new BadCredentialsException("bad"));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(LoginRequest.builder()
                                    .identifier("' OR 1=1--").password("x").build())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-CTR-06: Content-Type خاطئ → 415 Unsupported Media Type")
        void givenWrongContentType_thenReturn415() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.TEXT_PLAIN)
                    .content("identifier=admin&password=secret"))
                    .andExpect(status().isUnsupportedMediaType());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/auth/refresh
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /api/auth/refresh")
    class RefreshEndpointTests {

        @Test
        @DisplayName("TC-CTR-07: refresh token صالح → 200 + access token جديد")
        void givenValidRefreshToken_thenReturn200WithNewAccessToken() throws Exception {
            User user = User.builder().id(1L).username("admin").roles(Set.of()).build();
            RefreshToken rt = RefreshToken.builder()
                    .token("valid-refresh")
                    .user(user)
                    .expiryDate(Instant.now().plusSeconds(3600))
                    .build();

            when(refreshTokenService.findByToken("valid-refresh")).thenReturn(Optional.of(rt));
            when(refreshTokenService.verifyExpiration(rt)).thenReturn(rt);
            when(tokenProvider.generateToken(user)).thenReturn("new.access.token");

            mockMvc.perform(post("/api/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(new TokenRefreshRequest("valid-refresh"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.accessToken").value("new.access.token"));
        }

        @Test
        @DisplayName("TC-CTR-08: refresh token غير موجود → 403 (TokenRefreshException)")
        void givenMissingRefreshToken_thenReturn403() throws Exception {
            when(refreshTokenService.findByToken("bad-token")).thenReturn(Optional.empty());

            mockMvc.perform(post("/api/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(new TokenRefreshRequest("bad-token"))))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-CTR-09: refreshToken فارغ في body → 400")
        void givenEmptyRefreshToken_thenReturn400() throws Exception {
            mockMvc.perform(post("/api/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"refreshToken\":\"\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /api/auth/me (JWT-based)
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /api/auth/me")
    class GetMeEndpointTests {

        @Test
        @DisplayName("TC-CTR-10: Authorization header صالح → 200 + بيانات المستخدم")
        void givenValidBearerToken_thenReturn200WithUserInfo() throws Exception {
            LoginResponse.UserInfo userInfo = LoginResponse.UserInfo.builder()
                    .id(1L).username("admin").build();
            when(authService.getCurrentUser("valid.jwt")).thenReturn(userInfo);

            mockMvc.perform(get("/api/auth/me")
                    .header("Authorization", "Bearer valid.jwt"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.username").value("admin"));
        }

        @Test
        @DisplayName("TC-CTR-11: بدون Authorization Header → 401")
        void givenNoAuthHeader_thenReturn401() throws Exception {
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-CTR-12: Authorization بدون Bearer prefix → 401")
        void givenInvalidAuthFormat_thenReturn401() throws Exception {
            mockMvc.perform(get("/api/auth/me")
                    .header("Authorization", "Token somethingelse"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-CTR-13: token منتهي → 401 (ليس 500)")
        void givenExpiredToken_thenReturn401NotServerError() throws Exception {
            when(authService.getCurrentUser("expired.jwt"))
                    .thenThrow(new RuntimeException("expired"));

            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer expired.jwt"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // POST /api/auth/forgot-password
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /api/auth/forgot-password")
    class ForgotPasswordEndpointTests {

        @Test
        @DisplayName("TC-CTR-14: بريد صحيح → 200 OK")
        void givenValidEmail_thenReturn200() throws Exception {
            doNothing().when(authService).sendResetOtp("user@test.com");

            mockMvc.perform(post("/api/auth/forgot-password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"user@test.com\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("success"));
        }

        @Test
        @DisplayName("TC-CTR-15: email غير صالح تنسيقاً → 400")
        void givenInvalidEmailFormat_thenReturn400() throws Exception {
            mockMvc.perform(post("/api/auth/forgot-password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"not-an-email\"}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-CTR-16: email فارغ → 400")
        void givenEmptyEmail_thenReturn400() throws Exception {
            mockMvc.perform(post("/api/auth/forgot-password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"\"}"))
                    .andExpect(status().isBadRequest());
        }
    }
}
